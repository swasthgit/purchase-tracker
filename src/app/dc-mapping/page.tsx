// src/app/dc-mapping/page.tsx
"use client";

import React from 'react';
import { DCMappingDashboard } from '@/components/admin/dc-mapping-dashboard';
import { useLanguage } from '@/hooks/use-language';

export default function DcMappingPage() {
    const { t } = useLanguage();
  return (
    <div className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center text-primary">DC Mapping Portal</h1>
      <DCMappingDashboard />
    </div>
  );
}
