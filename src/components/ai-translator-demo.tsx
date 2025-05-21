// src/components/ai-translator-demo.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/use-language';
import { translateEntry } from '@/ai/flows/translate-entry'; // Ensure this path is correct
import type { TranslateEntryInput, TranslateEntryOutput } from '@/ai/flows/translate-entry';
import { useToast } from "@/hooks/use-toast";
import { Wand2 } from 'lucide-react';

const supportedLanguages = [
    { value: 'Hindi', label: 'Hindi' },
    { value: 'Spanish', label: 'Spanish' },
    { value: 'French', label: 'French' },
    { value: 'German', label: 'German' },
    { value: 'Japanese', label: 'Japanese' },
    { value: 'Chinese', label: 'Chinese' },
];

export function AiTranslatorDemo() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [textToTranslate, setTextToTranslate] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('Hindi');
  const [translatedText, setTranslatedText] = useState('');

  const handleTranslate = async () => {
    if (!textToTranslate.trim()) {
      toast({ variant: "destructive", title: t('errorOccurred'), description: "Text to translate cannot be empty." });
      return;
    }

    startTransition(async () => {
      try {
        const input: TranslateEntryInput = {
          text: textToTranslate,
          targetLanguage: targetLanguage,
        };
        const result: TranslateEntryOutput = await translateEntry(input);
        setTranslatedText(result.translatedText);
        toast({ title: t('operationSuccess'), description: `Text translated to ${targetLanguage}.` });
      } catch (error) {
        console.error("Translation error:", error);
        toast({ variant: "destructive", title: t('errorOccurred'), description: "Failed to translate text." });
        setTranslatedText('');
      }
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto my-8 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold">
          <Wand2 className="mr-2 h-5 w-5 text-accent" />
          {t('translationDemo')}
        </CardTitle>
        <CardDescription>
          {`Use AI to translate text. This demonstrates the 'translateEntry' Genkit flow.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="textToTranslate">{t('textToTranslate')}</Label>
          <Textarea
            id="textToTranslate"
            value={textToTranslate}
            onChange={(e) => setTextToTranslate(e.target.value)}
            placeholder="Enter text here..."
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="targetLanguageDemo">{t('targetLanguage')}</Label>
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger id="targetLanguageDemo">
              <SelectValue placeholder={t('targetLanguage')} />
            </SelectTrigger>
            <SelectContent>
              {supportedLanguages.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleTranslate} disabled={isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          {isPending ? `${t('translate')}...` : t('translate')}
        </Button>
        {translatedText && (
          <div className="mt-4 p-4 border rounded-md bg-muted/50">
            <Label className="font-semibold">{t('translatedText')}:</Label>
            <p className="mt-1 text-sm">{translatedText}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
