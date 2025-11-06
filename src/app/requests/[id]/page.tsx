// src/app/requests/[id]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/requests/status-badge';
import { RequestTimeline } from '@/components/requests/request-timeline';
import { CommentSection } from '@/components/requests/comment-section';
import { ApprovalSection } from '@/components/requests/approval-section';
import { ArrowLeft, User, MapPin, Package, Calendar, IndianRupee, FileText, Download, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getRequestByIdFS } from '@/lib/requests-data';
import { getUserSession, canApproveAtStage } from '@/lib/auth-helpers';
import type { RequestTicket } from '@/types';

export default function RequestDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [request, setRequest] = useState<RequestTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const userSession = getUserSession();
    if (!userSession) {
      toast({ variant: "destructive", title: "Unauthorized", description: "Please login to view requests" });
      router.push('/requests');
      return;
    }

    setSession(userSession);
    loadRequest();
  }, [params.id]);

  const loadRequest = async () => {
    setIsLoading(true);
    try {
      const requestData = await getRequestByIdFS(params.id);
      if (!requestData) {
        toast({ variant: "destructive", title: "Not Found", description: "Request not found" });
        router.push('/requests');
        return;
      }
      setRequest(requestData);
    } catch (error) {
      console.error('Error loading request:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load request" });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return <div className="container mx-auto py-10 px-4">Request not found</div>;
  }

  const canApprove = session && canApproveAtStage(session.role, request.currentStage);

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono text-muted-foreground">{request.id}</span>
                <StatusBadge status={request.status} />
              </div>
              <CardTitle className="text-2xl mb-2">{request.title}</CardTitle>
              <p className="text-muted-foreground">{request.description}</p>
            </div>
            <Badge variant="outline" className={`${getPriorityColor(request.priority)} flex-shrink-0`}>
              {request.priority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Requested By</p>
                <p className="font-medium">{request.dcName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Clinic / State</p>
                <p className="font-medium">{request.clinicCode} / {request.stateName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created On</p>
                <p className="font-medium">{formatDate(request.createdAt)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Items Requested ({request.items.length})
            </h3>
            <div className="space-y-2">
              {request.items.map((item, index) => (
                <Card key={item.id} className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{item.itemName}</p>
                      {item.specifications && (
                        <p className="text-sm text-muted-foreground mt-1">{item.specifications}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">Qty: <span className="font-medium text-foreground">{item.quantity}</span></span>
                        {item.estimatedPrice && item.estimatedPrice > 0 && (
                          <>
                            <span className="text-muted-foreground">
                              Price: <span className="font-medium text-foreground">₹{item.estimatedPrice.toFixed(2)}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Total: <span className="font-medium text-foreground">₹{(item.quantity * item.estimatedPrice).toFixed(2)}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Estimated Cost */}
          {request.estimatedCost && request.estimatedCost > 0 && (
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
              <span className="font-semibold flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Total Estimated Cost:
              </span>
              <span className="text-2xl font-bold text-primary">₹{request.estimatedCost.toLocaleString('en-IN')}</span>
            </div>
          )}

          {/* Attachments */}
          {request.attachments && request.attachments.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Supporting Documents ({request.attachments.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {request.attachments.map((file, index) => (
                  <a
                    key={index}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{file.name}</span>
                    <Download className="h-4 w-4 text-primary" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Section (if user can approve) */}
      {canApprove && session && request.status !== 'completed' && request.status !== 'rejected' && (
        <div className="mb-6">
          <ApprovalSection
            request={request}
            approverId={session.userId}
            approverName={session.name}
            approverEmail={session.email || ''}
            approverRole={session.role}
            onActionComplete={loadRequest}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <RequestTimeline history={request.history} />

        {/* Comments */}
        {session && (
          <CommentSection
            requestId={request.id}
            comments={request.comments}
            currentUserId={session.userId}
            currentUserName={session.name}
            currentUserRole={session.role}
            onCommentAdded={loadRequest}
          />
        )}
      </div>
    </div>
  );
}
