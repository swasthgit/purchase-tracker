// src/components/requests/approval-section.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { approveRequestAction, rejectRequestAction, requestMoreInfoAction } from '@/lib/requests-actions';
import type { UserRole, RequestTicket } from '@/types';

interface ApprovalSectionProps {
  request: RequestTicket;
  approverId: string;
  approverName: string;
  approverEmail: string;
  approverRole: UserRole;
  onActionComplete?: () => void;
}

export function ApprovalSection({
  request,
  approverId,
  approverName,
  approverEmail,
  approverRole,
  onActionComplete
}: ApprovalSectionProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<'approve' | 'reject' | 'info' | null>(null);
  const [comments, setComments] = useState('');

  // Check if this user can approve at current stage
  const canApprove = () => {
    if (approverRole === 'ops_manager' && request.currentStage === 'ops_manager') return true;
    if (approverRole === 'finance' && request.currentStage === 'finance') return true;
    if (approverRole === 'procurement' && request.currentStage === 'procurement') return true;
    if (approverRole === 'admin') return true; // Admin can approve at any stage
    return false;
  };

  const handleApprove = () => {
    if (!comments.trim()) {
      toast({ variant: "destructive", title: "Comments required", description: "Please add approval comments" });
      return;
    }

    startTransition(async () => {
      const result = await approveRequestAction(
        request.id,
        approverId,
        approverName,
        approverEmail,
        approverRole,
        comments
      );

      if (result.success) {
        toast({ title: "Success!", description: "Request approved successfully" });
        setComments('');
        setAction(null);
        if (onActionComplete) onActionComplete();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    });
  };

  const handleReject = () => {
    if (!comments.trim()) {
      toast({ variant: "destructive", title: "Reason required", description: "Please provide a rejection reason" });
      return;
    }

    startTransition(async () => {
      const result = await rejectRequestAction(
        request.id,
        approverId,
        approverName,
        approverEmail,
        approverRole,
        comments
      );

      if (result.success) {
        toast({ title: "Request Rejected", description: "Request has been rejected" });
        setComments('');
        setAction(null);
        if (onActionComplete) onActionComplete();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    });
  };

  const handleRequestInfo = () => {
    if (!comments.trim()) {
      toast({ variant: "destructive", title: "Message required", description: "Please specify what information is needed" });
      return;
    }

    startTransition(async () => {
      const result = await requestMoreInfoAction(
        request.id,
        approverId,
        approverName,
        approverRole,
        comments
      );

      if (result.success) {
        toast({ title: "Info Requested", description: "DC will be notified" });
        setComments('');
        setAction(null);
        if (onActionComplete) onActionComplete();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    });
  };

  if (!canApprove()) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You do not have permission to approve this request at its current stage.
        </AlertDescription>
      </Alert>
    );
  }

  // If request is already processed at this stage
  const stageApproval = request.currentStage === 'ops_manager' ? request.approvals.opsManager :
                        request.currentStage === 'finance' ? request.approvals.finance :
                        request.approvals.procurement;

  if (stageApproval) {
    return (
      <Alert className={stageApproval.action === 'approved' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
        {stageApproval.action === 'approved' ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <AlertDescription>
          <p className="font-medium">
            {stageApproval.action === 'approved' ? 'Approved' : 'Rejected'} by {stageApproval.approverName}
          </p>
          <p className="text-sm mt-1">{stageApproval.comments}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Your Action Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Stage Info */}
        <Alert>
          <AlertDescription>
            <p className="font-medium mb-1">Current Stage: {request.currentStage.replace('_', ' ').toUpperCase()}</p>
            <p className="text-sm text-muted-foreground">
              This request requires your approval to proceed to the next stage.
            </p>
          </AlertDescription>
        </Alert>

        {/* Action Selection */}
        {!action ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={() => setAction('approve')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              onClick={() => setAction('reject')}
              variant="destructive"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={() => setAction('info')}
              variant="outline"
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Request Info
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Comments Input */}
            <div>
              <Label htmlFor="approval-comments">
                {action === 'approve' ? 'Approval Comments *' :
                 action === 'reject' ? 'Rejection Reason *' :
                 'Information Needed *'}
              </Label>
              <Textarea
                id="approval-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  action === 'approve' ? 'Add your approval notes...' :
                  action === 'reject' ? 'Explain why this request is being rejected...' :
                  'Specify what additional information is needed...'
                }
                rows={4}
                className="mt-1"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setAction(null);
                  setComments('');
                }}
                variant="outline"
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (action === 'approve') handleApprove();
                  else if (action === 'reject') handleReject();
                  else handleRequestInfo();
                }}
                disabled={isPending || !comments.trim()}
                className={
                  action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  action === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  ''
                }
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {action === 'approve' && <CheckCircle className="mr-2 h-4 w-4" />}
                    {action === 'reject' && <XCircle className="mr-2 h-4 w-4" />}
                    {action === 'info' && <AlertCircle className="mr-2 h-4 w-4" />}
                    Confirm {action === 'approve' ? 'Approval' : action === 'reject' ? 'Rejection' : 'Request'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
