// src/app/requests/new/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RequestForm } from '@/components/requests/request-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { getUserSession, getQAManagerForState } from '@/lib/auth-helpers';
import { useToast } from "@/hooks/use-toast";

export default function NewRequestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [qaManagerId, setQAManagerId] = useState<string>('');

  useEffect(() => {
    const userSession = getUserSession();

    if (!userSession || userSession.role !== 'dc') {
      toast({ variant: "destructive", title: "Unauthorized", description: "Please login as DC to create requests" });
      router.push('/requests');
      return;
    }

    setSession(userSession);

    // For demo purposes, we'll use a mock state
    // In production, fetch from user profile in Firestore
    const dcState = 'Maharashtra'; // This should come from DC's profile
    const qaManager = getQAManagerForState(dcState);

    if (!qaManager) {
      toast({ variant: "destructive", title: "Error", description: "No QA manager assigned to your state" });
      setQAManagerId('admin'); // Fallback to admin
    } else {
      setQAManagerId(qaManager);
    }
  }, [router, toast]);

  const handleSuccess = (requestId: string) => {
    toast({ title: "Success!", description: `Request ${requestId} created successfully` });
    router.push(`/requests/${requestId}`);
  };

  if (!session) {
    return <div className="container mx-auto py-10 px-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/requests')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Requests
        </Button>
      </div>

      <RequestForm
        dcId={session.userId}
        dcName={session.name}
        dcEmail={session.email}
        clinicCode="MH-001" // This should come from DC's profile
        stateName="Maharashtra" // This should come from DC's profile
        qaManagerId={qaManagerId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
