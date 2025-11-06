// src/types/index.ts
export interface SelectOption {
  value: string;
  label: string;
}

export interface ItemDefinition {
  id: string; // Firestore document ID
  name: string; // This will be the label
  value: string; // This can be the same as 'name' or a unique code, typically maps to 'id' for SelectOption
  label: string; // Explicit label for SelectOption
  imageUrl: string;
  dataAiHint?: string;
}

export interface PurchaseItem {
  id: string; // Unique ID for the item in the list (e.g., UUID)
  clinicCode: string;
  quantity: number;
  price: number;
  itemName: string; // This will be the 'value' (or 'id') from ItemDefinition
  customItemName?: string; // For "Other" items
  itemNameDisplay: string; // The final display name (either item.label or customItemName)
}

export interface AdminManagedItem {
  id: string; // Firestore document ID
  name: string;
}

export interface Partner {
  id: string; // Firestore document ID
  name: string;
}

export interface UploadedFileMeta {
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface PurchaseData {
  id?: string; // Firestore document ID, optional for new data
  userId: string;
  partnerName: string;
  userName: string;
  items: PurchaseItem[];
  uploadedFiles?: UploadedFileMeta[]; // Array of uploaded file metadata
  createdAt: any; // Firestore Timestamp or Date
  totalAmount?: number; // Optional, can be calculated
  feedback?: string;
}

export interface InventoryItem {
  id: string;
  clinicName: string;
  clinicType?: string;
  "item name": string;
  quantity: number;
  "approx price per unit": number;
}

export interface DCMapping {
  id?: string;
  stateName: string;
  partnerName: string;
  oldEclinicCode: string;
  newEclinicCode: string;
  regionName: string;
  branchName: string;
  dcName: string;
  dcEmployeeCode: string;
}

// ==================== DC REQUEST SYSTEM TYPES ====================

export type UserRole = 'dc' | 'ops_manager' | 'finance' | 'procurement' | 'admin';

export type RequestCategory = 'Equipment' | 'Supplies' | 'Maintenance' | 'Infrastructure' | 'Other';

export type RequestPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TicketStatus =
  | 'pending_ops_review'       // Waiting for State Ops Manager
  | 'pending_finance_review'   // Waiting for Finance approval
  | 'pending_procurement'      // Waiting for Procurement
  | 'in_procurement'           // Being fulfilled/ordered
  | 'completed'                // Request fulfilled
  | 'rejected'                 // Rejected at any stage
  | 'info_requested'           // More information needed
  | 'on_hold';                 // Temporarily paused

export type ApprovalStage = 'ops_manager' | 'finance' | 'procurement' | 'completed' | 'rejected';

export type ApprovalAction = 'approved' | 'rejected' | 'requested_info';

export interface RequestItem {
  id: string;
  itemName: string;
  quantity: number;
  estimatedPrice?: number;
  specifications?: string;
}

export interface ApprovalRecord {
  approverName: string;
  approverEmail: string;
  approverId: string;
  action: ApprovalAction;
  actionDate: any; // Firestore Timestamp
  comments: string;
  attachments?: UploadedFileMeta[];
}

export interface RequestComment {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  message: string;
  timestamp: any; // Firestore Timestamp
  attachments?: UploadedFileMeta[];
}

export interface HistoryEntry {
  timestamp: any; // Firestore Timestamp
  action: string;
  performedBy: string;
  performedByRole: UserRole;
  details: string;
}

export interface RequestTicket {
  // Basic Info
  id: string;                      // Auto-generated ticket ID (e.g., REQ-2025-0001)
  createdAt: any;                  // Firestore Timestamp
  updatedAt: any;                  // Firestore Timestamp

  // DC Information
  dcId: string;                    // DC's employee ID
  dcName: string;                  // DC's name
  dcEmail?: string;                // DC's email
  clinicCode: string;              // Which clinic this is for
  stateName: string;               // State (for routing to correct ops manager)

  // Request Details
  title: string;                   // Brief title
  description: string;             // Detailed description
  category: RequestCategory;
  priority: RequestPriority;
  items: RequestItem[];            // List of items requested
  estimatedCost?: number;          // Optional estimated total cost

  // Supporting Documents
  attachments: UploadedFileMeta[];

  // Workflow Status
  status: TicketStatus;
  currentStage: ApprovalStage;
  currentHandler: string;          // Who should act on this now (userId or role)

  // Approval Chain
  approvals: {
    opsManager?: ApprovalRecord;
    finance?: ApprovalRecord;
    procurement?: ApprovalRecord;
  };

  // Comments & Feedback
  comments: RequestComment[];

  // Timeline/History
  history: HistoryEntry[];

  // Resolution
  resolvedAt?: any;                // Firestore Timestamp
  resolutionNotes?: string;

  // Procurement Details
  vendorName?: string;
  orderNumber?: string;
  expectedDeliveryDate?: any;      // Firestore Timestamp
  actualDeliveryDate?: any;        // Firestore Timestamp
}

export interface UserProfile {
  id: string;                      // Employee ID
  name: string;
  email: string;
  role: UserRole;
  stateName?: string;              // For ops_managers
  permissions: {
    canCreate: boolean;
    canViewOwn: boolean;
    canViewAll: boolean;
    canViewState?: boolean;
    canApprove: boolean;
    canComment: boolean;
    canOverride?: boolean;
  };
  createdAt: any;                  // Firestore Timestamp
  lastLogin?: any;                 // Firestore Timestamp
}

export interface NotificationItem {
  id: string;
  userId: string;
  requestId: string;
  requestTitle: string;
  type: 'new_request' | 'status_change' | 'approval_needed' | 'info_requested' | 'completed' | 'rejected';
  message: string;
  read: boolean;
  createdAt: any;                  // Firestore Timestamp
  actionUrl?: string;              // Link to the request
}
