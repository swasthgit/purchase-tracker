// src/components/admin/bulk-inventory-uploader.tsx
"use client";

import React, { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { bulkUploadInventoryAction } from '@/lib/actions';

export function BulkInventoryUploader() {
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
      toast({ variant: "destructive", title: "Error", description: "No file selected." });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('inventoryFile', selectedFile);

      const result = await bulkUploadInventoryAction(formData);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message || "An error occurred." });
      }
    });
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Bulk Upload Inventory</CardTitle>
        <CardDescription>
          Upload a CSV or Excel file to add or update multiple inventory items at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="bulkInventoryFile-input" className="sr-only">Upload Inventory File</Label>
          <div className="flex items-center justify-center w-full">
            <label htmlFor="bulkInventoryFile-input" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/70 border-primary/50 hover:border-primary">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-2">
                    <UploadCloud className="w-8 h-8 mb-2 text-primary" />
                    <p className="mb-1 text-sm text-foreground/80">
                      {selectedFile ? selectedFile.name : <><span className="font-semibold">Click to upload</span> or drag and drop</>}
                    </p>
                    <p className="text-xs text-foreground/60">CSV, XLS, XLSX files</p>
                </div>
                <Input 
                  id="bulkInventoryFile-input" 
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
            Selected File: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </div>
        )}
        <Button onClick={handleUpload} disabled={isPending || !selectedFile} className="w-full">
          <UploadCloud className="h-4 w-4 mr-2" />
          {isPending ? "Uploading..." : "Upload File"}
        </Button>
        <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Required Headers:</strong> `clinic_name`, `item_name`, `quantity`, `price`.</p>
            <p><strong>Note:</strong> If an item already exists for a clinic, its quantity and price will be updated. Otherwise, a new item will be created. If the clinic does not exist, it will be created automatically.</p>
        </div>
      </CardContent>
    </Card>
  );
}

    