// src/ai/flows/translate-entry.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for translating text entries into a specified language.
 *
 * - translateEntry - A function to translate a given text to a specified language.
 * - TranslateEntryInput - The input type for the translateEntry function.
 * - TranslateEntryOutput - The output type for the translateEntry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateEntryInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  targetLanguage: z.string().describe('The target language for the translation (e.g., Hindi, Spanish).'),
});
export type TranslateEntryInput = z.infer<typeof TranslateEntryInputSchema>;

const TranslateEntryOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslateEntryOutput = z.infer<typeof TranslateEntryOutputSchema>;

export async function translateEntry(input: TranslateEntryInput): Promise<TranslateEntryOutput> {
  return translateEntryFlow(input);
}

const translateEntryPrompt = ai.definePrompt({
  name: 'translateEntryPrompt',
  input: {schema: TranslateEntryInputSchema},
  output: {schema: TranslateEntryOutputSchema},
  prompt: `Translate the following text to {{targetLanguage}}:\n\n{{{text}}}`, 
});

const translateEntryFlow = ai.defineFlow(
  {
    name: 'translateEntryFlow',
    inputSchema: TranslateEntryInputSchema,
    outputSchema: TranslateEntryOutputSchema,
  },
  async input => {
    const {output} = await translateEntryPrompt(input);
    return output!;
  }
);
