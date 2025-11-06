// src/app/manager-dashboard/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RequestList } from '@/components/requests/request-list';
import { Loader2, BarChart3, CheckCircle, XCircle, Clock, Package, AlertCircle, TrendingUp } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getAllRequestsFS, getRequestStatsFS } from '@/lib/requests-data';
import { getUserSession, validateLogin, clearUserSession } from '@/lib/auth-helpers';
import type { RequestTicket } from '@/types';

export default function ManagerDashboardPage() {
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
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    pendingOps: 0,
    pendingFinance: 0,
    pendingProcurement: 0,
    inProcurement: 0,
    infoRequested: 0
  });

  // State-wise breakdown
  const [stateBreakdown, setStateBreakdown] = useState<Record<string, number>>({});
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [priorityBreakdown, setPriorityBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    // Check if already logged in
    const userSession = getUserSession();
    if (userSession && userSession.role === 'admin') {
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
      const [allRequestsData, statsData] = await Promise.all([
        getAllRequestsFS(),
        getRequestStatsFS()
      ]);

      setAllRequests(allRequestsData);

      // Calculate detailed stats
      const pendingOps = allRequestsData.filter(req => req.status === 'pending_ops_review').length;
      const pendingFinance = allRequestsData.filter(req => req.status === 'pending_finance_review').length;
      const pendingProcurement = allRequestsData.filter(req => req.status === 'pending_procurement').length;
      const inProcurement = allRequestsData.filter(req => req.status === 'in_procurement').length;
      const infoRequested = allRequestsData.filter(req => req.status === 'info_requested').length;

      setStats({
        ...statsData,
        pendingOps,
        pendingFinance,
        pendingProcurement,
        inProcurement,
        infoRequested
      });

      // Calculate state-wise breakdown
      const stateCount: Record<string, number> = {};
      allRequestsData.forEach(req => {
        stateCount[req.stateName] = (stateCount[req.stateName] || 0) + 1;
      });
      setStateBreakdown(stateCount);

      // Calculate category breakdown
      const categoryCount: Record<string, number> = {};
      allRequestsData.forEach(req => {
        categoryCount[req.category] = (categoryCount[req.category] || 0) + 1;
      });
      setCategoryBreakdown(categoryCount);

      // Calculate priority breakdown
      const priorityCount: Record<string, number> = {};
      allRequestsData.forEach(req => {
        priorityCount[req.priority] = (priorityCount[req.priority] || 0) + 1;
      });
      setPriorityBreakdown(priorityCount);

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

    if (result.session?.role !== 'admin') {
      toast({ variant: "destructive", title: "Access Denied", description: "This dashboard is for Managers and Admins only" });
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
    setAllRequests([]);
    setStats({
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      pendingOps: 0,
      pendingFinance: 0,
      pendingProcurement: 0,
      inProcurement: 0,
      infoRequested: 0
    });
    setStateBreakdown({});
    setCategoryBreakdown({});
    setPriorityBreakdown({});
    toast({ title: "Logged out", description: "You have been logged out successfully" });
  };

  // Filter requests by status
  const getPendingRequests = () => allRequests.filter(req =>
    req.status === 'pending_ops_review' ||
    req.status === 'pending_finance_review' ||
    req.status === 'pending_procurement'
  );

  const getActiveRequests = () => allRequests.filter(req =>
    req.status !== 'completed' && req.status !== 'rejected'
  );

  const getCompletedRequests = () => allRequests.filter(req => req.status === 'completed');
  const getRejectedRequests = () => allRequests.filter(req => req.status === 'rejected');

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-10 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">Manager Dashboard</CardTitle>
            <CardDescription className="text-center">
              Login to access complete system overview and analytics
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
              Demo: admin / admin123
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
          <h1 className="text-3xl font-bold">Manager Dashboard</h1>
          <p className="text-muted-foreground">
            {session?.name} - Complete System Overview & Analytics
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline">
          Logout
        </Button>
      </div>

      {/* Primary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
              <span className="text-3xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
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

        <Card className="border-red-200 bg-red-50/50">
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

      {/* Secondary Stats - Workflow Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Ops Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-purple-500" />
              <span className="text-2xl font-bold">{stats.pendingOps}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Finance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              <span className="text-2xl font-bold">{stats.pendingFinance}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Procurement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-blue-500" />
              <span className="text-2xl font-bold">{stats.pendingProcurement}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Info Requested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              <span className="text-2xl font-bold">{stats.infoRequested}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* State Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Requests by State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stateBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([state, count]) => (
                  <div key={state} className="flex justify-between items-center">
                    <span className="text-sm">{state}</span>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                ))}
              {Object.keys(stateBreakdown).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Requests by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm">{category}</span>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                ))}
              {Object.keys(categoryBreakdown).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Requests by Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['Urgent', 'High', 'Medium', 'Low'].map(priority => {
                const count = priorityBreakdown[priority] || 0;
                return (
                  <div key={priority} className="flex justify-between items-center">
                    <span className="text-sm">{priority}</span>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                );
              })}
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pending">
              Pending ({getPendingRequests().length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({getActiveRequests().length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({getCompletedRequests().length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({getRejectedRequests().length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({allRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <RequestList
              requests={getPendingRequests()}
              showDCInfo={true}
              title="Requests Pending Approval"
              emptyMessage="No requests pending approval."
            />
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            <RequestList
              requests={getActiveRequests()}
              showDCInfo={true}
              title="Active Requests"
              emptyMessage="No active requests."
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <RequestList
              requests={getCompletedRequests()}
              showDCInfo={true}
              title="Completed Requests"
              emptyMessage="No completed requests."
            />
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            <RequestList
              requests={getRejectedRequests()}
              showDCInfo={true}
              title="Rejected Requests"
              emptyMessage="No rejected requests."
            />
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <RequestList
              requests={allRequests}
              showDCInfo={true}
              title="All Requests - Complete System View"
              emptyMessage="No requests found."
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
