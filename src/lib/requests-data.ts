// src/lib/requests-data.ts
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
  limit,
  startAfter,
  QueryConstraint,
} from 'firebase/firestore';
import type {
  RequestTicket,
  RequestComment,
  ApprovalRecord,
  HistoryEntry,
  UserRole,
  ApprovalAction,
  TicketStatus,
  ApprovalStage,
} from '@/types';

// ==================== GENERATE REQUEST ID ====================

export async function generateRequestId(): Promise<string> {
  const year = new Date().getFullYear();
  const requestsRef = collection(db, 'requests');
  const q = query(requestsRef, orderBy('createdAt', 'desc'), limit(1));
  const snapshot = await getDocs(q);

  let nextNumber = 1;
  if (!snapshot.empty) {
    const lastRequest = snapshot.docs[0].data() as RequestTicket;
    const lastId = lastRequest.id; // e.g., "REQ-2025-0015"
    const lastNumber = parseInt(lastId.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `REQ-${year}-${String(nextNumber).padStart(4, '0')}`;
}

// ==================== CREATE REQUEST ====================

export async function createRequestFS(
  requestData: Omit<RequestTicket, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; message: string; requestId?: string }> {
  try {
    const requestId = await generateRequestId();

    const newRequest: RequestTicket = {
      ...requestData,
      id: requestId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'pending_ops_review',
      currentStage: 'ops_manager',
      comments: [],
      history: [
        {
          timestamp: serverTimestamp(),
          action: 'Request Created',
          performedBy: requestData.dcName,
          performedByRole: 'dc',
          details: `Request created: ${requestData.title}`,
        },
      ],
    };

    const docRef = await addDoc(collection(db, 'requests'), newRequest);

    // Create notification for ops manager
    await createNotificationFS({
      userId: requestData.currentHandler,
      requestId: requestId,
      requestTitle: requestData.title,
      type: 'approval_needed',
      message: `New request from ${requestData.dcName} requires your review`,
      actionUrl: `/requests/${requestId}`,
    });

    return { success: true, message: 'Request created successfully', requestId };
  } catch (error) {
    console.error('Error creating request:', error);
    return { success: false, message: 'Failed to create request' };
  }
}

// ==================== GET REQUESTS ====================

export async function getRequestByIdFS(requestId: string): Promise<RequestTicket | null> {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(requestsRef, where('id', '==', requestId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as RequestTicket;
  } catch (error) {
    console.error('Error fetching request:', error);
    return null;
  }
}

export async function getRequestsByDCFS(dcId: string): Promise<RequestTicket[]> {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(
      requestsRef,
      where('dcId', '==', dcId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => doc.data() as RequestTicket);
  } catch (error) {
    console.error('Error fetching DC requests:', error);
    return [];
  }
}

export async function getRequestsByStateFS(stateName: string): Promise<RequestTicket[]> {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(
      requestsRef,
      where('stateName', '==', stateName),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => doc.data() as RequestTicket);
  } catch (error) {
    console.error('Error fetching state requests:', error);
    return [];
  }
}

export async function getPendingRequestsForApproverFS(
  stage: ApprovalStage,
  stateName?: string
): Promise<RequestTicket[]> {
  try {
    const requestsRef = collection(db, 'requests');
    const constraints: QueryConstraint[] = [
      where('currentStage', '==', stage),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'desc'),
    ];

    // If ops_manager, filter by state
    if (stage === 'ops_manager' && stateName) {
      constraints.unshift(where('stateName', '==', stateName));
    }

    const q = query(requestsRef, ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => doc.data() as RequestTicket);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }
}

export async function getAllRequestsFS(filters?: {
  status?: TicketStatus;
  priority?: string;
  stateName?: string;
  category?: string;
}): Promise<RequestTicket[]> {
  try {
    const requestsRef = collection(db, 'requests');
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

    if (filters?.status) {
      constraints.unshift(where('status', '==', filters.status));
    }
    if (filters?.stateName) {
      constraints.unshift(where('stateName', '==', filters.stateName));
    }
    if (filters?.priority) {
      constraints.unshift(where('priority', '==', filters.priority));
    }
    if (filters?.category) {
      constraints.unshift(where('category', '==', filters.category));
    }

    const q = query(requestsRef, ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => doc.data() as RequestTicket);
  } catch (error) {
    console.error('Error fetching all requests:', error);
    return [];
  }
}

// ==================== UPDATE REQUEST ====================

export async function updateRequestStatusFS(
  requestId: string,
  newStatus: TicketStatus,
  newStage: ApprovalStage,
  newHandler: string,
  performedBy: string,
  performedByRole: UserRole,
  details: string
): Promise<{ success: boolean; message: string }> {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(requestsRef, where('id', '==', requestId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, message: 'Request not found' };
    }

    const docRef = snapshot.docs[0].ref;
    const currentRequest = snapshot.docs[0].data() as RequestTicket;

    const newHistoryEntry: HistoryEntry = {
      timestamp: serverTimestamp(),
      action: details,
      performedBy,
      performedByRole,
      details,
    };

    await updateDoc(docRef, {
      status: newStatus,
      currentStage: newStage,
      currentHandler: newHandler,
      updatedAt: serverTimestamp(),
      history: [...currentRequest.history, newHistoryEntry],
    });

    // Create notification for new handler
    await createNotificationFS({
      userId: newHandler,
      requestId: requestId,
      requestTitle: currentRequest.title,
      type: 'status_change',
      message: `Request ${requestId} status changed to ${newStatus}`,
      actionUrl: `/requests/${requestId}`,
    });

    return { success: true, message: 'Request updated successfully' };
  } catch (error) {
    console.error('Error updating request status:', error);
    return { success: false, message: 'Failed to update request' };
  }
}

// ==================== APPROVE REQUEST ====================

export async function approveRequestFS(
  requestId: string,
  approverId: string,
  approverName: string,
  approverEmail: string,
  approverRole: UserRole,
  comments: string,
  attachments?: any[]
): Promise<{ success: boolean; message: string }> {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(requestsRef, where('id', '==', requestId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, message: 'Request not found' };
    }

    const docRef = snapshot.docs[0].ref;
    const currentRequest = snapshot.docs[0].data() as RequestTicket;

    const approvalRecord: ApprovalRecord = {
      approverName,
      approverEmail,
      approverId,
      action: 'approved',
      actionDate: serverTimestamp(),
      comments,
      attachments: attachments || [],
    };

    // Determine next stage and handler
    let nextStage: ApprovalStage;
    let nextStatus: TicketStatus;
    let nextHandler: string;

    if (currentRequest.currentStage === 'ops_manager') {
      nextStage = 'finance';
      nextStatus = 'pending_finance_review';
      nextHandler = 'FINANCE_USER_ID'; // Replace with actual finance user ID
    } else if (currentRequest.currentStage === 'finance') {
      nextStage = 'procurement';
      nextStatus = 'pending_procurement';
      nextHandler = 'PROCUREMENT_USER_ID'; // Replace with actual procurement user ID
    } else {
      nextStage = 'completed';
      nextStatus = 'completed';
      nextHandler = '';
    }

    const approvalKey = currentRequest.currentStage === 'ops_manager' ? 'opsManager' :
                        currentRequest.currentStage === 'finance' ? 'finance' : 'procurement';

    const newHistoryEntry: HistoryEntry = {
      timestamp: serverTimestamp(),
      action: 'Approved',
      performedBy: approverName,
      performedByRole: approverRole,
      details: `Request approved by ${approverName} (${approverRole})`,
    };

    await updateDoc(docRef, {
      [`approvals.${approvalKey}`]: approvalRecord,
      status: nextStatus,
      currentStage: nextStage,
      currentHandler: nextHandler,
      updatedAt: serverTimestamp(),
      history: [...currentRequest.history, newHistoryEntry],
    });

    // Notify DC
    await createNotificationFS({
      userId: currentRequest.dcId,
      requestId: requestId,
      requestTitle: currentRequest.title,
      type: 'status_change',
      message: `Your request ${requestId} has been approved by ${approverName}`,
      actionUrl: `/requests/${requestId}`,
    });

    // Notify next handler
    if (nextHandler) {
      await createNotificationFS({
        userId: nextHandler,
        requestId: requestId,
        requestTitle: currentRequest.title,
        type: 'approval_needed',
        message: `Request ${requestId} requires your approval`,
        actionUrl: `/requests/${requestId}`,
      });
    }

    return { success: true, message: 'Request approved successfully' };
  } catch (error) {
    console.error('Error approving request:', error);
    return { success: false, message: 'Failed to approve request' };
  }
}

// ==================== REJECT REQUEST ====================

export async function rejectRequestFS(
  requestId: string,
  approverId: string,
  approverName: string,
  approverEmail: string,
  approverRole: UserRole,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(requestsRef, where('id', '==', requestId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, message: 'Request not found' };
    }

    const docRef = snapshot.docs[0].ref;
    const currentRequest = snapshot.docs[0].data() as RequestTicket;

    const approvalRecord: ApprovalRecord = {
      approverName,
      approverEmail,
      approverId,
      action: 'rejected',
      actionDate: serverTimestamp(),
      comments: reason,
    };

    const approvalKey = currentRequest.currentStage === 'ops_manager' ? 'opsManager' :
                        currentRequest.currentStage === 'finance' ? 'finance' : 'procurement';

    const newHistoryEntry: HistoryEntry = {
      timestamp: serverTimestamp(),
      action: 'Rejected',
      performedBy: approverName,
      performedByRole: approverRole,
      details: `Request rejected by ${approverName}: ${reason}`,
    };

    await updateDoc(docRef, {
      [`approvals.${approvalKey}`]: approvalRecord,
      status: 'rejected',
      currentStage: 'rejected',
      updatedAt: serverTimestamp(),
      resolvedAt: serverTimestamp(),
      resolutionNotes: reason,
      history: [...currentRequest.history, newHistoryEntry],
    });

    // Notify DC
    await createNotificationFS({
      userId: currentRequest.dcId,
      requestId: requestId,
      requestTitle: currentRequest.title,
      type: 'rejected',
      message: `Your request ${requestId} has been rejected: ${reason}`,
      actionUrl: `/requests/${requestId}`,
    });

    return { success: true, message: 'Request rejected' };
  } catch (error) {
    console.error('Error rejecting request:', error);
    return { success: false, message: 'Failed to reject request' };
  }
}

// ==================== ADD COMMENT ====================

export async function addCommentToRequestFS(
  requestId: string,
  userId: string,
  userName: string,
  userRole: UserRole,
  message: string,
  attachments?: any[]
): Promise<{ success: boolean; message: string }> {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(requestsRef, where('id', '==', requestId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, message: 'Request not found' };
    }

    const docRef = snapshot.docs[0].ref;
    const currentRequest = snapshot.docs[0].data() as RequestTicket;

    const newComment: RequestComment = {
      id: crypto.randomUUID(),
      userId,
      userName,
      userRole,
      message,
      timestamp: serverTimestamp(),
      attachments: attachments || [],
    };

    const newHistoryEntry: HistoryEntry = {
      timestamp: serverTimestamp(),
      action: 'Comment Added',
      performedBy: userName,
      performedByRole: userRole,
      details: `${userName} added a comment`,
    };

    await updateDoc(docRef, {
      comments: [...currentRequest.comments, newComment],
      history: [...currentRequest.history, newHistoryEntry],
      updatedAt: serverTimestamp(),
    });

    return { success: true, message: 'Comment added successfully' };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, message: 'Failed to add comment' };
  }
}

// ==================== MARK AS COMPLETED ====================

export async function markRequestCompletedFS(
  requestId: string,
  userId: string,
  userName: string,
  resolutionNotes: string,
  vendorName?: string,
  orderNumber?: string,
  actualDeliveryDate?: Date
): Promise<{ success: boolean; message: string }> {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(requestsRef, where('id', '==', requestId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, message: 'Request not found' };
    }

    const docRef = snapshot.docs[0].ref;
    const currentRequest = snapshot.docs[0].data() as RequestTicket;

    const newHistoryEntry: HistoryEntry = {
      timestamp: serverTimestamp(),
      action: 'Completed',
      performedBy: userName,
      performedByRole: 'procurement',
      details: `Request fulfilled and completed: ${resolutionNotes}`,
    };

    await updateDoc(docRef, {
      status: 'completed',
      currentStage: 'completed',
      updatedAt: serverTimestamp(),
      resolvedAt: serverTimestamp(),
      resolutionNotes,
      vendorName: vendorName || currentRequest.vendorName,
      orderNumber: orderNumber || currentRequest.orderNumber,
      actualDeliveryDate: actualDeliveryDate ? Timestamp.fromDate(actualDeliveryDate) : null,
      history: [...currentRequest.history, newHistoryEntry],
    });

    // Notify DC
    await createNotificationFS({
      userId: currentRequest.dcId,
      requestId: requestId,
      requestTitle: currentRequest.title,
      type: 'completed',
      message: `Your request ${requestId} has been completed and fulfilled`,
      actionUrl: `/requests/${requestId}`,
    });

    return { success: true, message: 'Request marked as completed' };
  } catch (error) {
    console.error('Error marking request as completed:', error);
    return { success: false, message: 'Failed to complete request' };
  }
}

// ==================== NOTIFICATIONS ====================

interface NotificationData {
  userId: string;
  requestId: string;
  requestTitle: string;
  type: 'new_request' | 'status_change' | 'approval_needed' | 'info_requested' | 'completed' | 'rejected';
  message: string;
  actionUrl?: string;
}

export async function createNotificationFS(data: NotificationData): Promise<void> {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...data,
      id: crypto.randomUUID(),
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export async function getNotificationsFS(userId: string): Promise<any[]> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markNotificationAsReadFS(notificationId: string): Promise<void> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('id', '==', notificationId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      await updateDoc(snapshot.docs[0].ref, { read: true });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

// ==================== STATISTICS ====================

export async function getRequestStatsFS(dcId?: string, stateName?: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
}> {
  try {
    const requestsRef = collection(db, 'requests');
    let q;

    if (dcId) {
      q = query(requestsRef, where('dcId', '==', dcId));
    } else if (stateName) {
      q = query(requestsRef, where('stateName', '==', stateName));
    } else {
      q = query(requestsRef);
    }

    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => doc.data() as RequestTicket);

    return {
      total: requests.length,
      pending: requests.filter(r => r.status.includes('pending')).length,
      approved: requests.filter(r => r.status === 'pending_procurement' || r.status === 'in_procurement').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      completed: requests.filter(r => r.status === 'completed').length,
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 };
  }
}
