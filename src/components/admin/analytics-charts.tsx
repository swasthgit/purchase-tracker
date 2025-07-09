// src/components/admin/analytics-charts.tsx
"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '@/hooks/use-language';

interface AnalyticsChartsProps {
  dateWiseSummary: Record<string, number>;
  clinicCodeWiseSummary: Record<string, number>;
  partnerWiseSummary: Record<string, number>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ dateWiseSummary, clinicCodeWiseSummary, partnerWiseSummary }) => {
  const { t } = useLanguage();

  const chartData = (summary: Record<string, number>) =>
    Object.entries(summary).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-center">{t('dateWiseSummary')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData(dateWiseSummary)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" name={t('totalAmount')} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4 text-center">{t('clinicCodeWiseSummary')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData(clinicCodeWiseSummary)}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={(entry) => `${entry.name}: ${entry.value.toFixed(2)}`}
            >
              {chartData(clinicCodeWiseSummary).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="md:col-span-2">
        <h3 className="text-lg font-semibold mb-4 text-center">{t('partnerWiseSummary')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData(partnerWiseSummary)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#82ca9d" name={t('totalAmount')} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
