// src/lib/requests-actions.ts
"use server";

import { z } from 'zod';
import {
  createRequestFS,
  approveRequestFS,
  rejectRequestFS,
  addCommentToRequestFS,
  markRequestCompletedFS,
} from '@/lib/requests-data';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { RequestItem, UploadedFileMeta, UserRole } from '@/types';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/pdf', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

// ==================== VALIDATION SCHEMAS ====================

const RequestItemSchema = z.object({
  id: z.string(),
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  estimatedPrice: z.coerce.number().min(0).optional(),
  specifications: z.string().optional(),
});

const CreateRequestSchema = z.object({
  dcId: z.string().min(1, "DC ID is required"),
  dcName: z.string().min(1, "DC name is required"),
  dcEmail: z.string().email().optional(),
  clinicCode: z.string().min(1, "Clinic code is required"),
  stateName: z.string().min(1, "State name is required"),
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(['Equipment', 'Supplies', 'Maintenance', 'Infrastructure', 'Other']),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  items: z.array(RequestItemSchema).min(1, "At least one item is required"),
  estimatedCost: z.coerce.number().min(0).optional(),
  currentHandler: z.string().min(1, "Handler ID is required"),
});

const FileSchema = z
  .custom<File>()
  .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 20MB.`)
  .refine((file) => ALLOWED_FILE_TYPES.includes(file.type), "Invalid file type");

// ==================== UPLOAD FILE ====================

async function uploadFileToStorage(file: File, folder: string): Promise<UploadedFileMeta> {
  const uniqueFileName = `${Date.now()}-${file.name}`;
  const fileRef = storageRef(storage, `${folder}/${uniqueFileName}`);
  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);

  return {
    name: file.name,
    type: file.type,
    size: file.size,
    url: downloadURL,
  };
}

// ==================== CREATE REQUEST ACTION ====================

export async function createRequestAction(prevState: any, formData: FormData) {
  try {
    // Parse form data
    const parsedData = CreateRequestSchema.safeParse({
      dcId: formData.get('dcId'),
      dcName: formData.get('dcName'),
      dcEmail: formData.get('dcEmail'),
      clinicCode: formData.get('clinicCode'),
      stateName: formData.get('stateName'),
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      priority: formData.get('priority'),
      items: JSON.parse(formData.get('items') as string),
      estimatedCost: formData.get('estimatedCost'),
      currentHandler: formData.get('currentHandler'),
    });

    if (!parsedData.success) {
      return {
        success: false,
        message: 'Invalid form data',
        errors: parsedData.error.flatten().fieldErrors
      };
    }

    // Handle file uploads
    const uploadedFiles = formData.getAll('attachments').filter(f => (f as File).size > 0) as File[];
    const uploadedFileMetas: UploadedFileMeta[] = [];

    for (const file of uploadedFiles) {
      if (file.size > 0) {
        try {
          const meta = await uploadFileToStorage(file, 'request_attachments');
          uploadedFileMetas.push(meta);
        } catch (error) {
          console.error(`Failed to upload file ${file.name}:`, error);
        }
      }
    }

    // Calculate total estimated cost
    const totalEstimatedCost = parsedData.data.items.reduce(
      (sum, item) => sum + ((item.estimatedPrice || 0) * item.quantity),
      0
    );

    // Create request
    const result = await createRequestFS({
      ...parsedData.data,
      attachments: uploadedFileMetas,
      estimatedCost: totalEstimatedCost || parsedData.data.estimatedCost,
      status: 'pending_ops_review',
      currentStage: 'ops_manager',
      approvals: {},
      comments: [],
      history: [],
    } as any);

    if (result.success) {
      return {
        success: true,
        message: 'Request created successfully',
        requestId: result.requestId
      };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error('Error creating request:', error);
    return { success: false, message: 'Failed to create request' };
  }
}

// ==================== APPROVE REQUEST ACTION ====================

export async function approveRequestAction(
  requestId: string,
  approverId: string,
  approverName: string,
  approverEmail: string,
  approverRole: UserRole,
  comments: string,
  attachmentUrls?: UploadedFileMeta[]
) {
  try {
    const result = await approveRequestFS(
      requestId,
      approverId,
      approverName,
      approverEmail,
      approverRole,
      comments,
      attachmentUrls
    );

    return result;
  } catch (error) {
    console.error('Error approving request:', error);
    return { success: false, message: 'Failed to approve request' };
  }
}

// ==================== REJECT REQUEST ACTION ====================

export async function rejectRequestAction(
  requestId: string,
  approverId: string,
  approverName: string,
  approverEmail: string,
  approverRole: UserRole,
  reason: string
) {
  try {
    const result = await rejectRequestFS(
      requestId,
      approverId,
      approverName,
      approverEmail,
      approverRole,
      reason
    );

    return result;
  } catch (error) {
    console.error('Error rejecting request:', error);
    return { success: false, message: 'Failed to reject request' };
  }
}

// ==================== ADD COMMENT ACTION ====================

export async function addCommentAction(prevState: any, formData: FormData) {
  try {
    const requestId = formData.get('requestId') as string;
    const userId = formData.get('userId') as string;
    const userName = formData.get('userName') as string;
    const userRole = formData.get('userRole') as UserRole;
    const message = formData.get('message') as string;

    if (!requestId || !userId || !userName || !message) {
      return { success: false, message: 'Missing required fields' };
    }

    // Handle file uploads if any
    const uploadedFiles = formData.getAll('attachments').filter(f => (f as File).size > 0) as File[];
    const uploadedFileMetas: UploadedFileMeta[] = [];

    for (const file of uploadedFiles) {
      if (file.size > 0) {
        try {
          const meta = await uploadFileToStorage(file, 'comment_attachments');
          uploadedFileMetas.push(meta);
        } catch (error) {
          console.error(`Failed to upload file ${file.name}:`, error);
        }
      }
    }

    const result = await addCommentToRequestFS(
      requestId,
      userId,
      userName,
      userRole,
      message,
      uploadedFileMetas
    );

    return result;
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, message: 'Failed to add comment' };
  }
}

// ==================== MARK AS IN PROCUREMENT ====================

export async function markAsInProcurementAction(
  requestId: string,
  userId: string,
  userName: string,
  vendorName: string,
  orderNumber: string,
  expectedDeliveryDate: Date
) {
  try {
    // This would update the request status to in_procurement
    // Similar to the approve flow but specific for procurement stage
    // You can call a specialized function here
    return { success: true, message: 'Marked as in procurement' };
  } catch (error) {
    console.error('Error marking as in procurement:', error);
    return { success: false, message: 'Failed to mark as in procurement' };
  }
}

// ==================== MARK AS COMPLETED ACTION ====================

export async function markCompletedAction(
  requestId: string,
  userId: string,
  userName: string,
  resolutionNotes: string,
  vendorName?: string,
  orderNumber?: string,
  actualDeliveryDate?: Date
) {
  try {
    const result = await markRequestCompletedFS(
      requestId,
      userId,
      userName,
      resolutionNotes,
      vendorName,
      orderNumber,
      actualDeliveryDate
    );

    return result;
  } catch (error) {
    console.error('Error marking request as completed:', error);
    return { success: false, message: 'Failed to mark request as completed' };
  }
}

// ==================== REQUEST MORE INFO ACTION ====================

export async function requestMoreInfoAction(
  requestId: string,
  userId: string,
  userName: string,
  userRole: UserRole,
  infoNeeded: string
) {
  try {
    // Add comment with the info request
    const result = await addCommentToRequestFS(
      requestId,
      userId,
      userName,
      userRole,
      `ℹ️ More information needed: ${infoNeeded}`,
      []
    );

    // Could also update request status to 'info_requested'
    // and notify the DC

    return result;
  } catch (error) {
    console.error('Error requesting more info:', error);
    return { success: false, message: 'Failed to request more information' };
  }
}
