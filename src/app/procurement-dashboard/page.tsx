// src/app/procurement-dashboard/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RequestList } from '@/components/requests/request-list';
import { Loader2, ShoppingCart, CheckCircle, Clock, TrendingUp, Package, Truck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getPendingRequestsForApproverFS, getRequestStatsFS, getAllRequestsFS } from '@/lib/requests-data';
import { getUserSession, validateLogin, clearUserSession } from '@/lib/auth-helpers';
import type { RequestTicket } from '@/types';

export default function ProcurementDashboardPage() {
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
  const [inProgressRequests, setInProgressRequests] = useState<RequestTicket[]>([]);
  const [completedRequests, setCompletedRequests] = useState<RequestTicket[]>([]);
  const [allRequests, setAllRequests] = useState<RequestTicket[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    readyToOrder: 0,
    inProgress: 0
  });

  useEffect(() => {
    // Check if already logged in
    const userSession = getUserSession();
    if (userSession && userSession.role === 'procurement') {
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
        getPendingRequestsForApproverFS('procurement'),
        getAllRequestsFS(),
        getRequestStatsFS()
      ]);

      setPendingRequests(pendingRequestsData);
      setAllRequests(allRequestsData);

      // Filter in-progress requests
      const inProgressRequestsData = allRequestsData.filter(
        req => req.status === 'in_procurement'
      );
      setInProgressRequests(inProgressRequestsData);

      // Filter completed requests (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const completedRequestsData = allRequestsData.filter(
        req => req.status === 'completed' &&
        req.completedAt &&
        new Date(req.completedAt.seconds * 1000) >= thirtyDaysAgo
      );
      setCompletedRequests(completedRequestsData);

      // Calculate procurement-specific stats
      const readyToOrder = allRequestsData.filter(req => req.status === 'pending_procurement').length;
      const inProgress = allRequestsData.filter(req => req.status === 'in_procurement').length;

      setStats({
        ...statsData,
        readyToOrder,
        inProgress
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

    if (result.session?.role !== 'procurement') {
      toast({ variant: "destructive", title: "Access Denied", description: "This dashboard is for Procurement team only" });
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
    setInProgressRequests([]);
    setCompletedRequests([]);
    setAllRequests([]);
    setStats({
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      readyToOrder: 0,
      inProgress: 0
    });
    toast({ title: "Logged out", description: "You have been logged out successfully" });
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-10 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">Procurement Dashboard</CardTitle>
            <CardDescription className="text-center">
              Login to manage orders and vendor coordination
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
              Demo: procurement / procurement123
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
          <h1 className="text-3xl font-bold">Procurement Dashboard</h1>
          <p className="text-muted-foreground">
            {session?.name} - Order Management & Vendor Coordination
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

        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready to Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-8 w-8 text-orange-500" />
              <span className="text-3xl font-bold">{stats.readyToOrder}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <span className="text-3xl font-bold">{stats.inProgress}</span>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Truck className="h-8 w-8 text-gray-500" />
              <span className="text-3xl font-bold">{completedRequests.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-500" />
              <span className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
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
        <Tabs defaultValue="ready" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ready">
              Ready to Order ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="progress">
              In Progress ({inProgressRequests.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Recently Completed ({completedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Requests ({allRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ready" className="mt-6">
            <RequestList
              requests={pendingRequests}
              showDCInfo={true}
              title="Requests Ready to Order"
              emptyMessage="No requests ready to order. All caught up!"
            />
          </TabsContent>

          <TabsContent value="progress" className="mt-6">
            <RequestList
              requests={inProgressRequests}
              showDCInfo={true}
              title="Orders In Progress"
              emptyMessage="No orders in progress."
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <RequestList
              requests={completedRequests}
              showDCInfo={true}
              title="Recently Completed Orders (Last 30 Days)"
              emptyMessage="No completed orders in the last 30 days."
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
