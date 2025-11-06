// src/app/requests/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RequestList } from '@/components/requests/request-list';
import { Loader2, PlusCircle, Package, CheckCircle, Clock, XCircle, User } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getRequestsByDCFS, getRequestStatsFS } from '@/lib/requests-data';
import { getUserSession, setDCSession, clearUserSession } from '@/lib/auth-helpers';
import type { RequestTicket } from '@/types';

export default function DCRequestsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [employeeCode, setEmployeeCode] = useState('');
  const [dcName, setDCName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<RequestTicket[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 });

  useEffect(() => {
    // Check if already logged in
    const session = getUserSession();
    if (session && session.role === 'dc') {
      setIsAuthenticated(true);
      setEmployeeCode(session.userId);
      setDCName(session.name);
      loadRequests(session.userId);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadRequests = async (dcId: string) => {
    setIsLoading(true);
    try {
      const [requestsData, statsData] = await Promise.all([
        getRequestsByDCFS(dcId),
        getRequestStatsFS(dcId)
      ]);
      setRequests(requestsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load requests" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    if (!employeeCode.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your employee code" });
      return;
    }

    if (!dcName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your name" });
      return;
    }

    // Set session
    setDCSession(employeeCode.trim(), dcName.trim());
    setIsAuthenticated(true);
    loadRequests(employeeCode.trim());
    toast({ title: "Success", description: `Welcome, ${dcName}!` });
  };

  const handleLogout = () => {
    clearUserSession();
    setIsAuthenticated(false);
    setEmployeeCode('');
    setDCName('');
    setRequests([]);
    setStats({ total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 });
    toast({ title: "Logged out", description: "You have been logged out successfully" });
  };

  const handleCreateNew = () => {
    router.push('/requests/new');
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-10 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">DC Requests Portal</CardTitle>
            <CardDescription className="text-center">
              Enter your employee code to view and manage your requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="employeeCode">Employee Code</Label>
              <Input
                id="employeeCode"
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g., DC-MH-001"
                className="text-base md:text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <Label htmlFor="dcName">Your Name</Label>
              <Input
                id="dcName"
                type="text"
                value={dcName}
                onChange={(e) => setDCName(e.target.value)}
                placeholder="e.g., Rajesh Kumar"
                className="text-base md:text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full bg-primary hover:bg-primary/90">
              Access Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard Screen
  return (
    <div className="container mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Requests</h1>
          <p className="text-muted-foreground">Welcome, {dcName} ({employeeCode})</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateNew} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Request
          </Button>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              <span className="text-3xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-yellow-500" />
              <span className="text-3xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <span className="text-3xl font-bold">{stats.approved}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-blue-500" />
              <span className="text-3xl font-bold">{stats.completed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-8 w-8 text-red-500" />
              <span className="text-3xl font-bold">{stats.rejected}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <RequestList
          requests={requests}
          showDCInfo={false}
          title="All Requests"
          emptyMessage="No requests found. Click 'New Request' to create your first request."
        />
      )}
    </div>
  );
}
