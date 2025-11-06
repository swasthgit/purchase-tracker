// src/components/requests/request-card.tsx
import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './status-badge';
import { Clock, User, MapPin, Package, IndianRupee, ArrowRight, AlertCircle } from 'lucide-react';
import type { RequestTicket } from '@/types';

interface RequestCardProps {
  request: RequestTicket;
  showDCInfo?: boolean;
  showActions?: boolean;
  onClick?: () => void;
}

export function RequestCard({ request, showDCInfo = true, showActions = true, onClick }: RequestCardProps) {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Low': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono text-muted-foreground">{request.id}</span>
              <StatusBadge status={request.status} />
            </div>
            <CardTitle className="text-lg truncate">{request.title}</CardTitle>
          </div>
          <Badge variant="outline" className={`${getPriorityColor(request.priority)} flex-shrink-0`}>
            {request.priority}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {showDCInfo && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{request.dcName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{request.clinicCode}</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{request.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{formatDate(request.createdAt)}</span>
          </div>
        </div>

        {/* Items Summary */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {request.items.length} item{request.items.length !== 1 ? 's' : ''}
            </span>
          </div>
          {request.estimatedCost && request.estimatedCost > 0 && (
            <div className="flex items-center gap-1 font-semibold">
              <IndianRupee className="h-4 w-4" />
              <span>{request.estimatedCost.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

        {/* Urgent Indicator */}
        {request.priority === 'Urgent' && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">Urgent request - requires immediate attention</span>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="pt-3">
          <Link href={`/requests/${request.id}`} className="w-full">
            <Button variant="outline" className="w-full group">
              View Details
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
