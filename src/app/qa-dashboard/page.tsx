// src/app/qa-dashboard/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RequestList } from '@/components/requests/request-list';
import { Loader2, AlertCircle, CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getRequestsByStateFS, getPendingRequestsForApproverFS, getRequestStatsFS } from '@/lib/requests-data';
import { getUserSession, validateLogin, clearUserSession } from '@/lib/auth-helpers';
import type { RequestTicket } from '@/types';

export default function QADashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Dashboard state
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allRequests, setAllRequests] = useState<RequestTicket[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RequestTicket[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 });

  useEffect(() => {
    // Check if already logged in
    const userSession = getUserSession();
    if (userSession && userSession.role === 'ops_manager') {
      setSession(userSession);
      setIsAuthenticated(true);
      loadDashboardData(userSession);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadDashboardData = async (userSession: any) => {
    setIsLoading(true);
    try {
      const stateName = userSession.stateName;
      const [allRequestsData, pendingRequestsData, statsData] = await Promise.all([
        getRequestsByStateFS(stateName),
        getPendingRequestsForApproverFS('ops_manager', stateName),
        getRequestStatsFS(undefined, stateName)
      ]);

      setAllRequests(allRequestsData);
      setPendingRequests(pendingRequestsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load dashboard data" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    const result = validateLogin(username, password);

    if (!result.success) {
      toast({ variant: "destructive", title: "Login Failed", description: result.message });
      return;
    }

    if (result.session?.role !== 'ops_manager') {
      toast({ variant: "destructive", title: "Access Denied", description: "This dashboard is for QA Managers only" });
      return;
    }

    setSession(result.session);
    setIsAuthenticated(true);
    loadDashboardData(result.session);
    toast({ title: "Success", description: `Welcome, ${result.session.name}!` });
  };

  const handleLogout = () => {
    clearUserSession();
    setIsAuthenticated(false);
    setSession(null);
    setUsername('');
    setPassword('');
    setAllRequests([]);
    setPendingRequests([]);
    setStats({ total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 });
    toast({ title: "Logged out", description: "You have been logged out successfully" });
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-10 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">QA Manager Dashboard</CardTitle>
            <CardDescription className="text-center">
              Login to access your state's requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="text-base md:text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="text-base md:text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full bg-primary hover:bg-primary/90">
              Login
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Demo: qa_mh / qa123 or qa_ka / qa123
            </p>
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
          <h1 className="text-3xl font-bold">QA Manager Dashboard</h1>
          <p className="text-muted-foreground">
            {session?.name} - {session?.stateName} State
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline">
          Logout
        </Button>
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

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-yellow-500" />
              <span className="text-3xl font-bold">{pendingRequests.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending (All)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <span className="text-3xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
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

      {/* Tabs */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">
              Pending My Review ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Requests ({allRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <RequestList
              requests={pendingRequests}
              showDCInfo={true}
              title="Requests Pending Your Review"
              emptyMessage="No requests pending your review. Great job!"
            />
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <RequestList
              requests={allRequests}
              showDCInfo={true}
              title={`All Requests - ${session?.stateName} State`}
              emptyMessage="No requests found for your state."
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
