# 🎫 DC Request Management System - Complete Design

## 📋 Overview

A comprehensive ticket/request management system to replace WhatsApp-based material requests with a structured approval workflow.

---

## 🔄 Approval Workflow

### Current Process (WhatsApp)
```
DC → WhatsApp → State Ops Manager → Mansi (Finance) → Vinod (Procurement)
```

### New Process (System)
```
┌─────────────────────────────────────────────────────────────┐
│                    DC RAISES REQUEST                        │
│                  (Material/Requirement)                     │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              STATE OPS MANAGER REVIEW                       │
│         (Approve/Reject/Request More Info)                  │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              MANSI (FINANCE) APPROVAL                       │
│         (Approve Budget/Reject/Request Changes)             │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│           VINOD (PROCUREMENT) FINAL ACTION                  │
│              (Fulfill/Order/Complete)                       │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
                   ✅ COMPLETED
```

---

## 👥 User Roles & Permissions

### 1. **DC (Distribution Center Staff)**
- ✅ Create new requests
- ✅ View own requests
- ✅ Add comments/feedback
- ✅ Upload supporting documents
- ❌ Cannot approve/reject
- ❌ Cannot see other DCs' requests

### 2. **State Ops Manager**
- ✅ View all requests from their state
- ✅ Approve/Reject requests at Level 1
- ✅ Request more information
- ✅ Add comments
- ✅ View dashboard with pending requests
- ❌ Cannot skip to finance approval

### 3. **Mansi (Finance)**
- ✅ View all requests approved by Ops Managers
- ✅ Approve/Reject for budget
- ✅ Request budget changes
- ✅ Add finance comments
- ✅ View finance dashboard
- ❌ Cannot bypass ops manager approval

### 4. **Vinod (Procurement)**
- ✅ View all finance-approved requests
- ✅ Mark as fulfilled/ordered
- ✅ Add procurement notes
- ✅ Complete requests
- ✅ View procurement dashboard
- ✅ Generate procurement reports

### 5. **Manager/Admin (Oversight)**
- ✅ View ALL requests across all states
- ✅ See real-time status of every ticket
- ✅ Filter by DC, state, status, approver
- ✅ Generate analytics reports
- ✅ Override/escalate if needed
- ✅ View complete audit trail

---

## 🗂️ Ticket/Request Structure

### Ticket Fields

```typescript
interface RequestTicket {
  // Basic Info
  id: string;                      // Auto-generated ticket ID (e.g., REQ-2025-0001)
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // DC Information
  dcId: string;                    // DC's employee ID
  dcName: string;                  // DC's name
  clinicCode: string;              // Which clinic this is for
  stateName: string;               // State (for routing to correct ops manager)

  // Request Details
  title: string;                   // Brief title (e.g., "Need 5 Blood Pressure Monitors")
  description: string;             // Detailed description
  category: 'Equipment' | 'Supplies' | 'Maintenance' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  items: RequestItem[];            // List of items requested
  estimatedCost?: number;          // Optional estimated cost

  // Supporting Documents
  attachments: {
    name: string;
    url: string;
    type: string;
    uploadedAt: Timestamp;
  }[];

  // Workflow Status
  status: TicketStatus;
  currentStage: 'ops_manager' | 'finance' | 'procurement' | 'completed' | 'rejected';
  currentHandler: string;          // Who should act on this now

  // Approval Chain
  approvals: {
    opsManager?: ApprovalRecord;
    finance?: ApprovalRecord;
    procurement?: ApprovalRecord;
  };

  // Comments & Feedback
  comments: Comment[];

  // Timeline/History
  history: HistoryEntry[];

  // Resolution
  resolvedAt?: Timestamp;
  resolutionNotes?: string;
}

interface RequestItem {
  id: string;
  itemName: string;
  quantity: number;
  estimatedPrice?: number;
  specifications?: string;
}

interface ApprovalRecord {
  approverName: string;
  approverEmail: string;
  action: 'approved' | 'rejected' | 'requested_info';
  actionDate: Timestamp;
  comments: string;
  attachments?: string[];
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  timestamp: Timestamp;
  attachments?: string[];
}

interface HistoryEntry {
  timestamp: Timestamp;
  action: string;
  performedBy: string;
  details: string;
}

type TicketStatus =
  | 'pending_ops_review'       // Waiting for State Ops Manager
  | 'pending_finance_review'   // Waiting for Mansi (Finance)
  | 'pending_procurement'      // Waiting for Vinod (Procurement)
  | 'in_procurement'           // Being fulfilled
  | 'completed'                // Request fulfilled
  | 'rejected'                 // Rejected at any stage
  | 'info_requested'           // More information needed
  | 'on_hold';                 // Temporarily paused
```

---

## 📊 Dashboard Views

### **1. DC Dashboard** (`/dc-requests`)
```
┌─────────────────────────────────────────────┐
│  My Requests                                │
├─────────────────────────────────────────────┤
│  [+ New Request]   [Filter: All ▼]          │
├─────────────────────────────────────────────┤
│  REQ-2025-0015  │ Blood Pressure Monitors   │
│  Status: Pending Finance Review             │
│  Created: 2 days ago  │  Priority: High     │
│  ────────────────────────────────────────   │
│  REQ-2025-0012  │ Clinic Supplies           │
│  Status: In Procurement                     │
│  Created: 1 week ago  │  Priority: Medium   │
│  ────────────────────────────────────────   │
│  [View All]                                 │
└─────────────────────────────────────────────┘
```

### **2. Ops Manager Dashboard** (`/ops-dashboard`)
```
┌─────────────────────────────────────────────┐
│  Pending My Review (8)                      │
├─────────────────────────────────────────────┤
│  REQ-2025-0020  │ Urgent: Generator Repair  │
│  DC: Rajesh Kumar  │  Clinic: MH-001        │
│  [Approve] [Reject] [Request Info]          │
│  ────────────────────────────────────────   │
│  REQ-2025-0019  │ Office Supplies           │
│  DC: Priya Shah   │  Clinic: MH-005         │
│  [Approve] [Reject] [Request Info]          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  My State Overview (Maharashtra)            │
├─────────────────────────────────────────────┤
│  Pending: 8  │  Approved: 45  │  Rejected: 3│
│  Total Budget: ₹2,50,000                    │
└─────────────────────────────────────────────┘
```

### **3. Finance Dashboard** (`/finance-dashboard`)
```
┌─────────────────────────────────────────────┐
│  Pending Budget Approval (5)                │
├─────────────────────────────────────────────┤
│  REQ-2025-0018  │ Medical Equipment         │
│  Amount: ₹85,000  │  State: Maharashtra     │
│  Approved by: Ramesh (Ops)                  │
│  [Approve] [Reject] [Request Changes]       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Budget Summary                             │
├─────────────────────────────────────────────┤
│  This Month: ₹12,50,000                     │
│  Pending: ₹2,80,000                         │
│  Available: ₹7,20,000                       │
└─────────────────────────────────────────────┘
```

### **4. Procurement Dashboard** (`/procurement-dashboard`)
```
┌─────────────────────────────────────────────┐
│  Ready for Procurement (12)                 │
├─────────────────────────────────────────────┤
│  REQ-2025-0015  │ Blood Pressure Monitors   │
│  Quantity: 5  │  Budget: ₹25,000           │
│  [Mark as Ordered] [Add Vendor Details]     │
│  ────────────────────────────────────────   │
│  REQ-2025-0013  │ Lab Equipment             │
│  Quantity: 10  │  Budget: ₹1,50,000         │
│  [Mark as Ordered] [Add Vendor Details]     │
└─────────────────────────────────────────────┘
```

### **5. Manager/Admin Dashboard** (`/manager-dashboard`)
```
┌─────────────────────────────────────────────┐
│  Real-Time Overview                         │
├─────────────────────────────────────────────┤
│  Pending Ops: 25  │  Pending Finance: 8     │
│  In Procurement: 15  │  Completed: 156      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Status by Stage                            │
├─────────────────────────────────────────────┤
│  [Chart: Requests at each approval stage]   │
│  [Chart: Average resolution time]           │
│  [Chart: Requests by state]                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  All Requests (Search & Filter)             │
├─────────────────────────────────────────────┤
│  [Search...] [State ▼] [Status ▼] [DC ▼]   │
│  [Export Report]                            │
└─────────────────────────────────────────────┘
```

---

## 🔔 Notifications System

### Email/In-App Notifications

**For DCs:**
- ✉️ Request created confirmation
- ✉️ Status change notifications
- ✉️ When more info is requested
- ✉️ When request is approved/rejected
- ✉️ When order is placed
- ✉️ When fulfilled/completed

**For Ops Managers:**
- ✉️ New request from their state
- ✉️ Reminder for pending reviews (daily)
- ✉️ When DC responds to info request

**For Finance (Mansi):**
- ✉️ New request approved by Ops Manager
- ✉️ Reminder for pending approvals
- ✉️ Budget threshold alerts

**For Procurement (Vinod):**
- ✉️ New request approved by Finance
- ✉️ Reminder for pending orders
- ✉️ Urgent requests notification

---

## 📈 Reports & Analytics

### Available Reports

1. **Request Volume Report**
   - Requests per day/week/month
   - By state, clinic, DC

2. **Approval Time Report**
   - Average time at each stage
   - Bottleneck identification
   - Performance metrics

3. **Budget Report**
   - Total spend by category
   - State-wise budget utilization
   - Forecast for next month

4. **DC Performance Report**
   - Request completion rate
   - Most active DCs
   - Rejection reasons

5. **Vendor/Procurement Report**
   - Orders placed
   - Vendors used
   - Delivery timelines

---

## 🔐 Security & Access Control

### Role-Based Access
```typescript
const roles = {
  dc: {
    canCreate: true,
    canViewOwn: true,
    canViewAll: false,
    canApprove: false,
    canComment: true,
  },
  ops_manager: {
    canCreate: false,
    canViewOwn: false,
    canViewState: true,
    canApprove: true,
    canComment: true,
  },
  finance: {
    canCreate: false,
    canViewOwn: false,
    canViewFinanceLevel: true,
    canApprove: true,
    canComment: true,
  },
  procurement: {
    canCreate: false,
    canViewOwn: false,
    canViewProcurementLevel: true,
    canFulfill: true,
    canComment: true,
  },
  admin: {
    canCreate: true,
    canViewAll: true,
    canApprove: true,
    canOverride: true,
    canComment: true,
  },
};
```

---

## 🗄️ Firebase Database Structure

```
/requests
  /{requestId}
    - id
    - dcId
    - dcName
    - clinicCode
    - stateName
    - title
    - description
    - category
    - priority
    - items[]
    - attachments[]
    - status
    - currentStage
    - currentHandler
    - approvals{}
    - comments[]
    - history[]
    - createdAt
    - updatedAt

/users
  /{userId}
    - name
    - email
    - role: 'dc' | 'ops_manager' | 'finance' | 'procurement' | 'admin'
    - stateName (for ops_managers)
    - permissions{}

/states
  /{stateName}
    - name
    - opsManagerId
    - opsManagerName
    - activeDCs[]
    - clinics[]

/notifications
  /{notificationId}
    - userId
    - requestId
    - type
    - message
    - read: boolean
    - createdAt
```

---

## 🚀 Implementation Plan

### Phase 1: Core System (Week 1-2)
1. ✅ Create data models & types
2. ✅ Build DC request form
3. ✅ Create basic workflow engine
4. ✅ Implement Firebase structure
5. ✅ Build request listing/viewing

### Phase 2: Approval Workflows (Week 2-3)
1. ✅ Ops Manager approval interface
2. ✅ Finance approval interface
3. ✅ Procurement fulfillment interface
4. ✅ Status tracking & updates
5. ✅ Comments & feedback system

### Phase 3: Dashboards (Week 3-4)
1. ✅ DC dashboard
2. ✅ Ops Manager dashboard
3. ✅ Finance dashboard
4. ✅ Procurement dashboard
5. ✅ Manager/Admin dashboard

### Phase 4: Enhancements (Week 4-5)
1. ✅ Notifications system
2. ✅ Reports & analytics
3. ✅ Search & filtering
4. ✅ Export functionality
5. ✅ Mobile optimization

---

## 📱 Mobile Considerations

- Fully responsive design
- Quick actions (approve/reject) on mobile
- Push notifications support
- Offline capability for viewing requests
- Mobile-optimized forms

---

## ✅ Success Metrics

1. **Efficiency**: Reduce average approval time from 3-5 days to 1-2 days
2. **Transparency**: 100% visibility into request status
3. **Accountability**: Clear audit trail of all actions
4. **Satisfaction**: DC satisfaction score > 8/10
5. **Volume**: Handle 500+ requests per month smoothly

---

**Ready to start implementation?** This system will completely replace your WhatsApp-based process with a professional, trackable, and efficient request management platform! 🚀
