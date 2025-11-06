// src/components/header.tsx
"use client";

import Link from 'next/link';
import { PackagePlus, ChevronDown, FileText, Users, DollarSign, ShoppingCart, BarChart3 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher'; // New
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <PackagePlus className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">
            {t('appName')}
          </span>
        </Link>
        <nav className="flex flex-1 items-center space-x-2 sm:space-x-4">
          <Button variant="ghost" asChild className="text-xs sm:text-sm px-2 sm:px-3">
            <Link href="/">{t('home')}</Link>
          </Button>
          <Button variant="ghost" asChild className="text-xs sm:text-sm px-2 sm:px-3">
            <Link href="/admin">{t('admin')}</Link>
          </Button>
          <Button variant="ghost" asChild className="text-xs sm:text-sm px-2 sm:px-3">
            <Link href="/inventory">Inventory</Link>
          </Button>
          <Button variant="ghost" asChild className="text-xs sm:text-sm px-2 sm:px-3">
            <Link href="/inventory-admin">Inventory Admin</Link>
          </Button>
          <Button variant="ghost" asChild className="text-xs sm:text-sm px-2 sm:px-3">
            <Link href="/dc-mapping">DC Mapping</Link>
          </Button>

          {/* DC Request System Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-xs sm:text-sm px-2 sm:px-3">
                Request System
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>DC Request System</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/requests" className="flex items-center cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  DC Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/qa-dashboard" className="flex items-center cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  QA Manager
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/finance-dashboard" className="flex items-center cursor-pointer">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Finance
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/procurement-dashboard" className="flex items-center cursor-pointer">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Procurement
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/manager-dashboard" className="flex items-center cursor-pointer">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Manager Dashboard
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="flex items-center space-x-2">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
