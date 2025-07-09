
// src/components/admin/analytics-charts.tsx
"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '@/hooks/use-language';

interface AnalyticsChartsProps {
  dateWiseSummary: Record<string, number>;
  clinicCodeWiseSummary: Record<string, number>;
  partnerWiseSummary: Record<string, number>;
  itemWiseSummary: Record<string, number>;
  userWiseSummary: Record<string, number>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#8884d8', '#82ca9d'];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ dateWiseSummary, clinicCodeWiseSummary, partnerWiseSummary, itemWiseSummary, userWiseSummary }) => {
  const { t } = useLanguage();

  const chartData = (summary: Record<string, number>) =>
    Object.entries(summary).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value); // Sort descending

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
        {`${payload.name.substring(0, 10)}... (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-center">{t('dateWiseSummary')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData(dateWiseSummary)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
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
              data={chartData(clinicCodeWiseSummary).slice(0, 8)} // Show top 8
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={110}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {chartData(clinicCodeWiseSummary).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => value.toFixed(2)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
       <div>
        <h3 className="text-lg font-semibold mb-4 text-center">{t('itemWiseSummary')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData(itemWiseSummary).slice(0, 8)} // Show top 8
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={110}
              fill="#82ca9d"
              dataKey="value"
              nameKey="name"
            >
              {chartData(itemWiseSummary).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS.slice(2)[index % COLORS.slice(2).length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => value.toFixed(2)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4 text-center">{t('userWiseSummary')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData(userWiseSummary)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
            <Tooltip formatter={(value: number) => value.toFixed(2)} />
            <Legend />
            <Bar dataKey="value" fill="#ffc658" name={t('totalAmount')} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4 text-center">{t('partnerWiseSummary')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData(partnerWiseSummary)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip formatter={(value: number) => value.toFixed(2)} />
            <Legend />
            <Bar dataKey="value" fill="#82ca9d" name={t('totalAmount')} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
