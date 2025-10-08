// src/components/admin/bulk-clinic-uploader.tsx
"use client";

import React, { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from "@/hooks/use-toast";
// The `bulkUploadClinicsAction` was removed but this import remained, causing the error. It's now removed.

export function BulkClinicUploader() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ variant: "destructive", title: t('errorOccurred'), description: "No file selected." });
      return;
    }

    startTransition(async () => {
      toast({ variant: "destructive", title: "Functionality Removed", description: "This functionality has been disabled."});
      // The original action was removed. The UI remains but the action does not.
      // The user can be tasked to remove this component fully later if requested.
    });
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>{t('bulkUploadClinics')}</CardTitle>
        <CardDescription>{t('uploadClinicFile')} ({t('clinicColumnHeaderNote')})</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="bulkClinicFile-input" className="sr-only">{t('uploadClinicFile')}</Label>
          <div className="flex items-center justify-center w-full">
            <label htmlFor="bulkClinicFile-input" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/70 border-primary/50 hover:border-primary">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-2">
                    <UploadCloud className="w-8 h-8 mb-2 text-primary" />
                    <p className="mb-1 text-sm text-foreground/80">
                      {selectedFile ? selectedFile.name : <><span className="font-semibold">{t('clickToUpload')}</span> {t('orDragAndDrop')}</>}
                    </p>
                    <p className="text-xs text-foreground/60">CSV, XLS, XLSX files</p>
                </div>
                <Input 
                  id="bulkClinicFile-input" 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange} 
                  accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  ref={fileInputRef}
                />
            </label>
          </div>
        </div>
        {selectedFile && (
          <div className="text-sm">
            {t('selectedFile')}: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </div>
        )}
        <Button onClick={handleUpload} disabled={isPending || !selectedFile} className="w-full">
          <UploadCloud className="h-4 w-4 mr-2" />
          {isPending ? `${t('upload')}...` : t('upload')}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t('clinicBulkUploadNote')}
        </p>
      </CardContent>
    </Card>
  );
}
