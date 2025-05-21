// src/app/admin/page.tsx
"use client";

import { EmployeeIdManager } from '@/components/admin/employee-id-manager';
import { PrinterManager } from '@/components/admin/printer-manager';
import { BulkIdUploader } from '@/components/admin/bulk-id-uploader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/use-language';
import { Users, Printer, UploadCloudIcon } from 'lucide-react';

export default function AdminPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center text-primary">{t('adminPage')}</h1>
      
      <Tabs defaultValue="employee_ids" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-6">
          <TabsTrigger value="employee_ids" className="py-3 text-base">
            <Users className="w-5 h-5 mr-2"/> {t('manageEmployeeIds')}
          </TabsTrigger>
          <TabsTrigger value="printer_names" className="py-3 text-base">
            <Printer className="w-5 h-5 mr-2"/> {t('managePrinterNames')}
          </TabsTrigger>
          <TabsTrigger value="bulk_upload" className="py-3 text-base">
            <UploadCloudIcon className="w-5 h-5 mr-2"/> {t('bulkUploadEmployeeIds')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="employee_ids">
          <EmployeeIdManager />
        </TabsContent>
        <TabsContent value="printer_names">
          <PrinterManager />
        </TabsContent>
        <TabsContent value="bulk_upload">
          <BulkIdUploader />
        </TabsContent>
      </Tabs>
    </div>
  );
}
