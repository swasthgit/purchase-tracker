// src/components/admin/dc-mapping-uploader.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { bulkUploadDCMappingAction } from '@/lib/actions';
import { useLanguage } from '@/hooks/use-language';

export function DCMappingUploader() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
      const formData = new FormData();
      formData.append('dcMappingFile', selectedFile);
      const result = await bulkUploadDCMappingAction(formData);
      if (result.success) {
        toast({ title: t('operationSuccess'), description: result.message });
        setSelectedFile(null);
        // We don't need to refresh data here anymore as it's separate
      } else {
        toast({ variant: "destructive", title: t('errorOccurred'), description: result.message || t('errorOccurred') });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload DC Mapping Data</CardTitle>
        <CardDescription>Upload a CSV or Excel file with the DC mapping information. The data will be visible on the public DC Mapping page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input 
          type="file" 
          onChange={handleFileChange} 
          accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
        />
        {selectedFile && (
          <div className="text-sm text-muted-foreground">
            Selected: {selectedFile.name}
          </div>
        )}
        <Button onClick={handleUpload} disabled={isPending || !selectedFile}>
          <UploadCloud className="mr-2 h-4 w-4" />
          {isPending ? "Uploading..." : "Upload File"}
        </Button>
      </CardContent>
    </Card>
  );
}
