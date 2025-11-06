// src/components/requests/request-timeline.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertCircle, User, ArrowRight } from 'lucide-react';
import type { HistoryEntry, UserRole } from '@/types';

interface RequestTimelineProps {
  history: HistoryEntry[];
}

export function RequestTimeline({ history }: RequestTimelineProps) {
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('created')) return <AlertCircle className="h-5 w-5 text-blue-500" />;
    if (actionLower.includes('approved')) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (actionLower.includes('rejected')) return <XCircle className="h-5 w-5 text-red-500" />;
    if (actionLower.includes('comment')) return <User className="h-5 w-5 text-purple-500" />;
    if (actionLower.includes('completed')) return <CheckCircle className="h-5 w-5 text-green-600" />;
    return <ArrowRight className="h-5 w-5 text-gray-500" />;
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'dc': return 'bg-blue-100 text-blue-800';
      case 'ops_manager': return 'bg-purple-100 text-purple-800';
      case 'finance': return 'bg-green-100 text-green-800';
      case 'procurement': return 'bg-orange-100 text-orange-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'dc': return 'DC';
      case 'ops_manager': return 'Ops Manager';
      case 'finance': return 'Finance';
      case 'procurement': return 'Procurement';
      case 'admin': return 'Admin';
      default: return role;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Request Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6">
          {/* Vertical Line */}
          <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-border" />

          {/* Timeline Items */}
          {history.map((entry, index) => (
            <div key={index} className="relative flex gap-4 pb-0">
              {/* Icon */}
              <div className="relative z-10 flex-shrink-0 w-9 h-9 bg-background border-2 border-border rounded-full flex items-center justify-center">
                {getActionIcon(entry.action)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{entry.action}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">{entry.performedBy}</span>
                      <Badge variant="outline" className={`text-xs ${getRoleColor(entry.performedByRole)}`}>
                        {getRoleLabel(entry.performedByRole)}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
                {entry.details && entry.details !== entry.action && (
                  <p className="text-sm text-muted-foreground mt-2">{entry.details}</p>
                )}
              </div>
            </div>
          ))}

          {history.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No history available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
