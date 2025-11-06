# 🚀 DC Request System - Implementation Plan

## 📋 Summary

This document outlines the complete implementation plan for building the DC Request Management System that will replace the WhatsApp-based approval workflow.

---

## 🎯 What We're Building

### **Current Process** (WhatsApp-Based)
```
DC sends WhatsApp → Ops Manager sees → Mansi checks → Vinod fulfills
❌ No tracking
❌ No accountability
❌ Messages get lost
❌ No visibility into status
❌ Manual, slow, error-prone
```

### **New System** (Web-Based Request Management)
```
DC creates request → System routes → Approval workflow → Fulfillment → Completion
✅ Full tracking
✅ Clear accountability
✅ Nothing gets lost
✅ Real-time status visibility
✅ Automated, fast, accurate
```

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├────────────────────────────────────────────────────────────────┤
│  DC Portal     │  Ops Dashboard  │  Finance Dashboard  │ Admin │
│  - Create Req  │  - Review Req   │  - Approve Budget   │ Panel │
│  - View Status │  - Approve/Rej  │  - Track Spend      │       │
│  - Add Comment │  - Comment      │  - Generate Reports │       │
└────────────────────────────────────────────────────────────────┘
                              ↕
┌────────────────────────────────────────────────────────────────┐
│                    FIREBASE BACKEND                             │
├────────────────────────────────────────────────────────────────┤
│  Firestore Database:                                            │
│  - /requests         (All request tickets)                      │
│  - /users            (User profiles & roles)                    │
│  - /states           (State & clinic mappings)                  │
│  - /notifications    (User notifications)                       │
│                                                                  │
│  Firebase Storage:                                              │
│  - /request_attachments  (Supporting documents)                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 📁 Files & Components to Create

### **1. New Pages**

```
src/app/
├── requests/
│   ├── page.tsx                    # DC Request Dashboard (view all own requests)
│   ├── new/
│   │   └── page.tsx                # Create New Request Form
│   ├── [id]/
│   │   └── page.tsx                # View/Edit Single Request
│   └── loading.tsx                 # Loading state
│
├── ops-dashboard/
│   └── page.tsx                    # State Ops Manager Dashboard
│
├── finance-dashboard/
│   └── page.tsx                    # Finance (Mansi) Dashboard
│
├── procurement-dashboard/
│   └── page.tsx                    # Procurement (Vinod) Dashboard
│
└── manager-dashboard/
    └── page.tsx                    # Admin/Manager Overview Dashboard
```

### **2. New Components**

```
src/components/requests/
├── request-form.tsx                # Form to create new request
├── request-card.tsx                # Card showing request summary
├── request-list.tsx                # List of requests with filters
├── request-details.tsx             # Full request details view
├── approval-section.tsx            # Approve/Reject interface
├── comment-section.tsx             # Comments & feedback
├── status-badge.tsx                # Status indicator
├── timeline.tsx                    # Request history timeline
├── request-stats.tsx               # Statistics/metrics widgets
└── file-upload-zone.tsx            # Document upload component
```

### **3. Data Layer**

```
src/lib/
├── requests-data.ts                # Firestore CRUD operations for requests
│   - createRequest()
│   - getRequestById()
│   - getRequestsByUser()
│   - getRequestsByState()
│   - getPendingRequestsForApprover()
│   - updateRequestStatus()
│   - addComment()
│   - etc.
│
└── requests-actions.ts             # Server Actions for request operations
    - submitNewRequest()
    - approveRequest()
    - rejectRequest()
    - requestMoreInfo()
    - addCommentToRequest()
    - etc.
```

### **4. Utilities**

```
src/lib/
├── request-utils.ts                # Helper functions
│   - generateRequestId()
│   - calculateNextStage()
│   - canUserApprove()
│   - getStatusColor()
│   - formatRequestDate()
│   - etc.
│
└── notifications.ts                # Notification helpers
    - sendNotificationToUser()
    - createNotification()
    - markNotificationAsRead()
```

### **5. Types** ✅ (Already Created)
```
src/types/index.ts
- RequestTicket
- RequestItem
- ApprovalRecord
- RequestComment
- UserProfile
- NotificationItem
- etc.
```

---

## 🔄 Workflow Implementation

### **Step 1: DC Creates Request**

**Page**: `/requests/new`

**Flow**:
1. DC fills form:
   - Title
   - Description
   - Category (Equipment/Supplies/etc.)
   - Priority (Low/Medium/High/Urgent)
   - Items list (name, quantity, estimated price)
   - Upload documents (receipts, specs, quotes)
2. Submit button → Server Action
3. Server Action:
   ```typescript
   - Generate unique ID: REQ-2025-0001
   - Create request in Firestore
   - Set status: 'pending_ops_review'
   - Set currentStage: 'ops_manager'
   - Determine State Ops Manager from stateName
   - Set currentHandler: ops_manager_id
   - Add to history: "Request created by {dcName}"
   - Send notification to Ops Manager
   - Return success → Redirect to request details page
   ```

---

### **Step 2: Ops Manager Reviews**

**Page**: `/ops-dashboard`

**What Ops Manager Sees**:
```
┌────────────────────────────────────────────┐
│  Pending Your Review (5)                   │
├────────────────────────────────────────────┤
│  REQ-2025-0025  │  BP Monitors (Urgent)    │
│  DC: Rajesh     │  Est. ₹25,000           │
│  [View Details] [Quick Approve] [Reject]   │
└────────────────────────────────────────────┘
```

**Actions**:
1. **Approve** →
   ```typescript
   - Update status: 'pending_finance_review'
   - Update currentStage: 'finance'
   - Set currentHandler: 'mansi' (finance user)
   - Add approval record
   - Add to history
   - Send notification to Finance (Mansi)
   - Send status update notification to DC
   ```

2. **Reject** →
   ```typescript
   - Update status: 'rejected'
   - Update currentStage: 'rejected'
   - Add rejection reason
   - Add to history
   - Send notification to DC
   - Close request
   ```

3. **Request More Info** →
   ```typescript
   - Update status: 'info_requested'
   - Add comment with questions
   - Add to history
   - Send notification to DC
   - Wait for DC response
   ```

---

### **Step 3: Finance Reviews**

**Page**: `/finance-dashboard`

**What Mansi (Finance) Sees**:
```
┌────────────────────────────────────────────┐
│  Awaiting Budget Approval (3)              │
├────────────────────────────────────────────┤
│  REQ-2025-0025  │  BP Monitors             │
│  Amount: ₹25,000  │  State: Maharashtra    │
│  Approved by: Ramesh (Ops)                 │
│  [View Details] [Approve] [Reject]         │
└────────────────────────────────────────────┘
```

**Actions**:
1. **Approve** →
   ```typescript
   - Update status: 'pending_procurement'
   - Update currentStage: 'procurement'
   - Set currentHandler: 'vinod' (procurement user)
   - Add approval record
   - Add to history
   - Send notification to Procurement (Vinod)
   - Send status update to DC
   ```

2. **Reject** (similar to ops rejection)

---

### **Step 4: Procurement Fulfills**

**Page**: `/procurement-dashboard`

**What Vinod (Procurement) Sees**:
```
┌────────────────────────────────────────────┐
│  Ready to Order (8)                        │
├────────────────────────────────────────────┤
│  REQ-2025-0025  │  BP Monitors (5 units)   │
│  Budget: ₹25,000  │  Priority: Urgent      │
│  [View Details] [Mark as Ordered]          │
└────────────────────────────────────────────┘
```

**Actions**:
1. **Mark as Ordered** →
   ```typescript
   - Update status: 'in_procurement'
   - Add vendor details
   - Add order number
   - Add expected delivery date
   - Add to history
   - Send notification to DC & Ops Manager
   ```

2. **Mark as Completed** →
   ```typescript
   - Update status: 'completed'
   - Update currentStage: 'completed'
   - Set resolvedAt timestamp
   - Add actual delivery date
   - Add to history
   - Send completion notification to DC
   - Archive/close request
   ```

---

## 📊 Dashboard Implementations

### **DC Dashboard** (`/requests`)

**Features**:
- List of all own requests
- Filter by status, priority, date
- Search by title/ID
- Quick stats (pending/approved/completed)
- Create new request button

**Key Components**:
```tsx
<RequestStats userId={dcId} />
<RequestFilters />
<RequestList requests={dcRequests} />
<Button onClick={goToNewRequest}>+ New Request</Button>
```

---

### **Ops Manager Dashboard** (`/ops-dashboard`)

**Features**:
- Pending review section (top priority)
- State overview stats
- Filter by clinic, priority, date
- Bulk actions (approve multiple)
- Search requests

**Key Components**:
```tsx
<PendingReviewSection requests={pending} />
<StateStatsWidget stateName={opsManager.stateName} />
<RequestList requests={allStateRequests} />
```

---

### **Finance Dashboard** (`/finance-dashboard`)

**Features**:
- Pending budget approval section
- Budget utilization stats
- Monthly spend tracker
- Approve/reject with budget notes

**Key Components**:
```tsx
<BudgetStatsWidget />
<PendingFinanceApprovals requests={pendingFinance} />
<MonthlySpendChart />
```

---

### **Procurement Dashboard** (`/procurement-dashboard`)

**Features**:
- Ready to order section
- In-progress orders
- Vendor management
- Delivery tracking

**Key Components**:
```tsx
<ReadyToOrderSection requests={readyForProcurement} />
<InProgressOrders requests={inProcurement} />
<VendorQuickAdd />
```

---

### **Manager/Admin Dashboard** (`/manager-dashboard`)

**Features**:
- Complete overview of all requests
- Real-time metrics (pending at each stage)
- Search & advanced filters
- Export reports
- Analytics charts

**Key Components**:
```tsx
<OverallStatsWidget />
<StageBreakdownChart />
<SearchAndFilters />
<AllRequestsTable />
<ExportButton />
```

---

## 🔐 Security & Permissions

### **Firebase Security Rules**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Requests collection
    match /requests/{requestId} {
      // DC can read their own requests
      allow read: if request.auth.uid != null &&
                     resource.data.dcId == request.auth.uid;

      // DC can create requests
      allow create: if request.auth.uid != null &&
                       request.resource.data.dcId == request.auth.uid;

      // Ops Manager can read requests from their state
      allow read: if request.auth.token.role == 'ops_manager' &&
                     resource.data.stateName == request.auth.token.stateName;

      // Finance can read requests pending_finance_review
      allow read: if request.auth.token.role == 'finance' &&
                     resource.data.status == 'pending_finance_review';

      // Admin can read all
      allow read: if request.auth.token.role == 'admin';

      // Approvers can update based on stage
      allow update: if canApproveAtCurrentStage(resource, request);
    }

    // Users collection
    match /users/{userId} {
      allow read: if request.auth.uid == userId ||
                     request.auth.token.role == 'admin';
      allow write: if request.auth.token.role == 'admin';
    }
  }
}
```

---

## 📈 Analytics & Reports

### **Available Reports**

1. **Request Volume Report**
   - Requests created per day/week/month
   - Breakdown by state, category, priority

2. **Approval Timeline Report**
   - Average time at each stage
   - Bottleneck identification
   - SLA compliance

3. **Budget Utilization Report**
   - Total spend by category
   - State-wise breakdown
   - Monthly trends

4. **DC Performance Report**
   - Requests per DC
   - Completion rate
   - Common rejection reasons

5. **Procurement Report**
   - Vendors used
   - Order fulfillment time
   - Delivery delays

---

## 🚀 Development Phases

### **Phase 1: Foundation (CURRENT)** ✅
- [x] Design document
- [x] Data models & types
- [x] Implementation plan
- [ ] Commit and document

### **Phase 2: Core Features** (Next Steps)
- [ ] Request creation form
- [ ] Request viewing/listing
- [ ] Basic approval workflow
- [ ] Firebase data layer
- [ ] Comments system

### **Phase 3: Dashboards** (After Core)
- [ ] DC dashboard
- [ ] Ops Manager dashboard
- [ ] Finance dashboard
- [ ] Procurement dashboard
- [ ] Manager dashboard

### **Phase 4: Enhancements** (Polish)
- [ ] Notifications
- [ ] Search & filters
- [ ] Reports & analytics
- [ ] Mobile optimization
- [ ] Performance tuning

### **Phase 5: Testing & Launch** (Final)
- [ ] End-to-end testing
- [ ] User acceptance testing
- [ ] Training materials
- [ ] Launch & migration
- [ ] Monitor & iterate

---

## 🎨 UI/UX Mockups

### **Request Creation Form**
```
┌─────────────────────────────────────────────┐
│  Create New Request                          │
├─────────────────────────────────────────────┤
│  Title: [________________]                   │
│  Description: [__________________________]   │
│  Category: [Equipment ▼]                     │
│  Priority: [Medium ▼]                        │
│                                              │
│  Items Requested:                            │
│  ┌────────────────────────────────────────┐ │
│  │ 1. BP Monitor  │  Qty: 5  │  ₹25,000  │ │
│  │    [Remove]                             │ │
│  └────────────────────────────────────────┘ │
│  [+ Add Item]                                │
│                                              │
│  Upload Documents: [Drop files here...]      │
│                                              │
│  [Cancel]  [Save Draft]  [Submit Request]   │
└─────────────────────────────────────────────┘
```

### **Approval Interface**
```
┌─────────────────────────────────────────────┐
│  REQ-2025-0025: BP Monitors                  │
├─────────────────────────────────────────────┤
│  DC: Rajesh Kumar  │  State: Maharashtra    │
│  Priority: Urgent  │  Created: 2 hours ago  │
│                                              │
│  Status: ⏳ Pending Your Review              │
│  Current Stage: Ops Manager Review           │
│                                              │
│  Description:                                │
│  Need 5 BP monitors for new clinic...       │
│                                              │
│  Items:                                      │
│  1. BP Monitor (Omron) - 5 units - ₹25,000  │
│                                              │
│  Attachments: [quotation.pdf]               │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │ Your Decision:                      │    │
│  │ Comments: [__________________]      │    │
│  │                                     │    │
│  │ [✓ Approve] [✗ Reject] [? Info]   │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## ✅ Next Steps

1. **Review this implementation plan**
2. **Start building Phase 2**:
   - Create request form
   - Firebase data operations
   - Basic viewing/listing
3. **Test each feature as we build**
4. **Iterate based on feedback**

---

**Ready to start coding?** Let me know if you want me to proceed with building the actual components! 🚀
