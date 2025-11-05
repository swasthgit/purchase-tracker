// src/components/simple-header.tsx
"use client";

import { PackagePlus } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useLanguage } from '@/hooks/use-language';

export function SimpleHeader() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-6 flex items-center space-x-2">
          <PackagePlus className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">
            {t('appName')}
          </span>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center space-x-2">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
