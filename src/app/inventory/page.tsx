// src/app/inventory/page.tsx
"use client";

import React, { useState } from 'react';
import InventoryManager from '@/components/admin/inventory-manager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert } from 'lucide-react';

const EMPLOYEE_USERNAME = process.env.NEXT_PUBLIC_ADMIN_USERNAME || "mswasth";
const EMPLOYEE_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "mswasth";

export default function InventoryPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === EMPLOYEE_USERNAME && password === EMPLOYEE_PASSWORD) {
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
            <CardTitle className="text-2xl text-center text-primary">Inventory Access Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">{t('usernameLabel')}</Label>
                <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="text-base md:text-sm"/>
              </div>
              <div>
                <Label htmlFor="password">{t('passwordLabel')}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="text-base md:text-sm"/>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-base md:text-sm">{t('loginButton')}</Button>
            </form>
             <CardDescription className="mt-4 text-xs text-muted-foreground text-center flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 mr-1 text-destructive" /> This login provides access to view and manage inventory items.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <InventoryManager />
    </div>
  );
}
