// src/components/requests/status-badge.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { TicketStatus } from '@/types';

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: TicketStatus) => {
    switch (status) {
      case 'pending_ops_review':
        return { label: 'Pending Ops Review', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' };
      case 'pending_finance_review':
        return { label: 'Pending Finance Review', variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' };
      case 'pending_procurement':
        return { label: 'Pending Procurement', variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800' };
      case 'in_procurement':
        return { label: 'In Procurement', variant: 'default' as const, color: 'bg-indigo-100 text-indigo-800' };
      case 'completed':
        return { label: 'Completed', variant: 'default' as const, color: 'bg-green-100 text-green-800' };
      case 'rejected':
        return { label: 'Rejected', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' };
      case 'info_requested':
        return { label: 'Info Requested', variant: 'outline' as const, color: 'bg-orange-100 text-orange-800' };
      case 'on_hold':
        return { label: 'On Hold', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' };
      default:
        return { label: status, variant: 'default' as const, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} className={`${config.color} ${className}`}>
      {config.label}
    </Badge>
  );
}
