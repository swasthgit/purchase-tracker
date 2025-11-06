// src/app/finance-dashboard/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RequestList } from '@/components/requests/request-list';
import { Loader2, DollarSign, CheckCircle, Clock, TrendingUp, Package } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getPendingRequestsForApproverFS, getRequestStatsFS, getAllRequestsFS } from '@/lib/requests-data';
import { getUserSession, validateLogin, clearUserSession } from '@/lib/auth-helpers';
import type { RequestTicket } from '@/types';

export default function FinanceDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Dashboard state
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<RequestTicket[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<RequestTicket[]>([]);
  const [allRequests, setAllRequests] = useState<RequestTicket[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    pendingFinance: 0,
    inProcurement: 0
  });

  useEffect(() => {
    // Check if already logged in
    const userSession = getUserSession();
    if (userSession && userSession.role === 'finance') {
      setSession(userSession);
      setIsAuthenticated(true);
      loadDashboardData();
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [pendingRequestsData, allRequestsData, statsData] = await Promise.all([
        getPendingRequestsForApproverFS('finance'),
        getAllRequestsFS(),
        getRequestStatsFS()
      ]);

      setPendingRequests(pendingRequestsData);
      setAllRequests(allRequestsData);

      // Filter approved requests that are in procurement
      const approvedRequestsData = allRequestsData.filter(
        req => req.status === 'pending_procurement' || req.status === 'in_procurement'
      );
      setApprovedRequests(approvedRequestsData);

      // Calculate finance-specific stats
      const pendingFinance = allRequestsData.filter(req => req.status === 'pending_finance_review').length;
      const inProcurement = allRequestsData.filter(req => req.status === 'in_procurement' || req.status === 'pending_procurement').length;

      setStats({
        ...statsData,
        pendingFinance,
        inProcurement
      });
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

    if (result.session?.role !== 'finance') {
      toast({ variant: "destructive", title: "Access Denied", description: "This dashboard is for Finance team only" });
      return;
    }

    setSession(result.session);
    setIsAuthenticated(true);
    loadDashboardData();
    toast({ title: "Success", description: `Welcome, ${result.session.name}!` });
  };

  const handleLogout = () => {
    clearUserSession();
    setIsAuthenticated(false);
    setSession(null);
    setUsername('');
    setPassword('');
    setPendingRequests([]);
    setApprovedRequests([]);
    setAllRequests([]);
    setStats({
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      pendingFinance: 0,
      inProcurement: 0
    });
    toast({ title: "Logged out", description: "You have been logged out successfully" });
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-10 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">Finance Dashboard</CardTitle>
            <CardDescription className="text-center">
              Login to manage budget approvals and procurement tracking
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
              Demo: finance / finance123
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
          <h1 className="text-3xl font-bold">Finance Dashboard</h1>
          <p className="text-muted-foreground">
            {session?.name} - Budget Approval & Procurement Tracking
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline">
          Logout
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
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

        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">All Pending Finance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-orange-500" />
              <span className="text-3xl font-bold">{stats.pendingFinance}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Procurement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <span className="text-3xl font-bold">{stats.inProcurement}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Approval Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
              </span>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending My Review ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved & In Procurement ({approvedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Requests ({allRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <RequestList
              requests={pendingRequests}
              showDCInfo={true}
              title="Requests Pending Budget Approval"
              emptyMessage="No requests pending your budget approval. Great job!"
            />
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            <RequestList
              requests={approvedRequests}
              showDCInfo={true}
              title="Approved Requests - In Procurement"
              emptyMessage="No requests in procurement stage."
            />
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <RequestList
              requests={allRequests}
              showDCInfo={true}
              title="All Requests - Complete Overview"
              emptyMessage="No requests found."
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
