// src/app/admin/page.tsx
"use client";

import React, { useState } from 'react';
import { EmployeeIdManager } from '@/components/admin/employee-id-manager';
import { PrinterManager } from '@/components/admin/printer-manager';
import { BulkIdUploader } from '@/components/admin/bulk-id-uploader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { Users, Printer, UploadCloudIcon, ShieldAlert } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const ADMIN_USERNAME = "mswasth";
const ADMIN_PASSWORD = "mswasth";

export default function AdminPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      toast({ title: t('operationSuccess'), description: "Logged in successfully." });
    } else {
      toast({ variant: "destructive", title: t('loginFailedMessage') });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-10 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">{t('adminLoginTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">{t('usernameLabel')}</Label>
                <Input 
                  id="username" 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="password">{t('passwordLabel')}</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                {t('loginButton')}
              </Button>
            </form>
            <CardDescription className="mt-4 text-xs text-muted-foreground text-center flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 mr-1 text-destructive" /> {t('adminAuthDisclaimer')}
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

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
