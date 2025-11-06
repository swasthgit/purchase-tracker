// src/lib/auth-helpers.ts
"use client";

import type { UserRole } from '@/types';

export interface UserSession {
  userId: string;
  name: string;
  email?: string;
  role: UserRole;
  stateName?: string; // For ops_manager
  employeeCode?: string;
}

// LocalStorage keys
const SESSION_KEY = 'dc_request_session';
const DC_SESSION_KEY = 'dc_employee_code';

// ==================== SESSION MANAGEMENT ====================

export function setUserSession(session: UserSession): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function getUserSession(): UserSession | null {
  if (typeof window !== 'undefined') {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        return JSON.parse(session);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function clearUserSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(DC_SESSION_KEY);
  }
}

export function isAuthenticated(): boolean {
  return getUserSession() !== null;
}

export function hasRole(role: UserRole | UserRole[]): boolean {
  const session = getUserSession();
  if (!session) return false;

  if (Array.isArray(role)) {
    return role.includes(session.role);
  }
  return session.role === role;
}

// ==================== DC SESSION (Simple Employee Code) ====================

export function setDCSession(employeeCode: string, dcName: string): void {
  if (typeof window !== 'undefined') {
    const session: UserSession = {
      userId: employeeCode,
      name: dcName,
      role: 'dc',
      employeeCode,
    };
    setUserSession(session);
    localStorage.setItem(DC_SESSION_KEY, employeeCode);
  }
}

export function getDCEmployeeCode(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(DC_SESSION_KEY);
  }
  return null;
}

// ==================== ROLE-BASED LOGIN (QA, Finance, Procurement, Admin) ====================

// This is a simple implementation - in production, you'd validate against a database
// For now, we'll use environment variables or hardcoded credentials

export interface LoginCredentials {
  username: string;
  password: string;
  role: UserRole;
}

// Sample users - in production, fetch from Firestore
const SAMPLE_USERS: Record<string, { password: string; name: string; email: string; role: UserRole; stateName?: string }> = {
  // QA Managers
  'qa_mh': { password: 'qa123', name: 'Ramesh Kumar', email: 'ramesh@example.com', role: 'ops_manager', stateName: 'Maharashtra' },
  'qa_ka': { password: 'qa123', name: 'Priya Sharma', email: 'priya@example.com', role: 'ops_manager', stateName: 'Karnataka' },

  // Finance
  'finance': { password: 'finance123', name: 'Mansi Gupta', email: 'mansi@example.com', role: 'finance' },

  // Procurement
  'procurement': { password: 'proc123', name: 'Vinod Singh', email: 'vinod@example.com', role: 'procurement' },

  // Admin
  'admin': { password: 'admin123', name: 'Super Admin', email: 'admin@example.com', role: 'admin' },
};

export function validateLogin(username: string, password: string): { success: boolean; session?: UserSession; message?: string } {
  const user = SAMPLE_USERS[username];

  if (!user) {
    return { success: false, message: 'Invalid username or password' };
  }

  if (user.password !== password) {
    return { success: false, message: 'Invalid username or password' };
  }

  const session: UserSession = {
    userId: username,
    name: user.name,
    email: user.email,
    role: user.role,
    stateName: user.stateName,
  };

  setUserSession(session);

  return { success: true, session };
}

// ==================== ROLE-SPECIFIC HELPERS ====================

export function canApproveAtStage(userRole: UserRole, requestStage: string): boolean {
  if (userRole === 'admin') return true; // Admin can approve at any stage

  if (userRole === 'ops_manager' && requestStage === 'ops_manager') return true;
  if (userRole === 'finance' && requestStage === 'finance') return true;
  if (userRole === 'procurement' && requestStage === 'procurement') return true;

  return false;
}

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case 'dc': return '/requests';
    case 'ops_manager': return '/qa-dashboard';
    case 'finance': return '/finance-dashboard';
    case 'procurement': return '/procurement-dashboard';
    case 'admin': return '/manager-dashboard';
    default: return '/';
  }
}

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'dc': return 'DC Staff';
    case 'ops_manager': return 'QA Manager';
    case 'finance': return 'Finance';
    case 'procurement': return 'Procurement';
    case 'admin': return 'Administrator';
    default: return role;
  }
}

// ==================== STATE-TO-QA MAPPING ====================

// This should be fetched from Firestore in production
// For now, we'll use a static mapping

export const STATE_QA_MAPPING: Record<string, string> = {
  'Maharashtra': 'qa_mh',
  'Karnataka': 'qa_ka',
  'Tamil Nadu': 'qa_tn',
  'Gujarat': 'qa_gj',
  'Rajasthan': 'qa_rj',
  // Add more states as needed
};

export function getQAManagerForState(stateName: string): string | null {
  return STATE_QA_MAPPING[stateName] || null;
}

export function getAllStates(): string[] {
  return Object.keys(STATE_QA_MAPPING);
}
