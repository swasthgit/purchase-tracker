// src/lib/actions.ts
"use server";

import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  OTHER_ITEM_VALUE,
  addEmployeeIdFS as dbAddEmployeeIdFS,
  removeEmployeeIdFS as dbRemoveEmployeeIdFS,
  bulkAddEmployeeIdsFS as dbBulkAddEmployeeIdsFS,
  addPrinterNameFS as dbAddPrinterNameFS,
  removePrinterNameFS as dbRemovePrinterNameFS
} from '@/lib/data'; // Keep for OTHER_ITEM_VALUE
import type { PurchaseItem } from '@/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];


const PurchaseItemSchema = z.object({
  id: z.string(),
  clinicCode: z.string().min(1, "Clinic code is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0.01"),
  itemName: z.string().min(1, "Item name is required"),
  customItemName: z.string().optional(),
  itemNameDisplay: z.string(), // Added for storing the display name
}).superRefine((data, ctx) => {
  if (data.itemName === OTHER_ITEM_VALUE && (!data.customItemName || data.customItemName.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Custom item name is required when 'Other' is selected.",
      path: ['customItemName'],
    });
  }
});

const PurchaseFormSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  partnerName: z.string().min(1, "Partner name is required"),
  userName: z.string().min(1, "User name is required"),
  items: z.array(PurchaseItemSchema).min(1, "At least one item is required"),
  uploadedFile: z
    .custom<File | undefined>()
    .refine((file) => !file || file.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => !file || ALLOWED_FILE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png, .gif, .pdf, .doc, .docx files are allowed."
    ).optional(),
});


export async function submitPurchase(prevState: any, formData: FormData) {
  try {
    const rawItems = formData.get('items') as string;
    const itemsForValidation = JSON.parse(rawItems).map((item: any) => ({
        id: item.id,
        clinicCode: item.clinicCode,
        quantity: item.quantity,
        price: item.price,
        itemName: item.itemName,
        customItemName: item.customItemName,
        itemNameDisplay: item.itemNameDisplay, // Make sure this is passed from form
    })) as PurchaseItem[];
    
    const validatedFields = PurchaseFormSchema.safeParse({
      userId: formData.get('userId'),
      partnerName: formData.get('partnerName'),
      userName: formData.get('userName'),
      items: itemsForValidation,
      uploadedFile: formData.get('uploadedFile') as File | undefined,
    });

    if (!validatedFields.success) {
      console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
      return {
        success: false,
        message: "Validation failed. Please check your inputs.",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { userId, partnerName, userName, items, uploadedFile } = validatedFields.data;
    let fileUrl = '';

    if (uploadedFile) {
      try {
        const storageRef = ref(storage, `purchase_uploads/${userId}/${Date.now()}_${uploadedFile.name}`);
        const snapshot = await uploadBytes(storageRef, uploadedFile);
        fileUrl = await getDownloadURL(snapshot.ref);
      } catch (uploadError) {
        console.error("Error uploading file to Firebase Storage:", uploadError);
        return { success: false, message: "File upload failed.", errors: { uploadedFile: "File upload failed."} };
      }
    }

    const purchaseData = {
      userId,
      partnerName,
      userName,
      items: items.map(item => ({ // Store only necessary data, itemNameDisplay is already included
        clinicCode: item.clinicCode,
        quantity: item.quantity,
        price: item.price,
        itemName: item.itemName, // original value for "other" distinction
        customItemName: item.customItemName,
        itemNameDisplay: item.itemNameDisplay, // The name to show in bill/excel
      })),
      fileUrl,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'purchases'), purchaseData);

    return { success: true, message: "billGeneratedSuccess", data: validatedFields.data };
  } catch (error) {
    console.error("Error submitting purchase:", error);
    return { success: false, message: "errorOccurred" };
  }
}

// Server actions for Employee ID management using Firebase
export async function addEmployeeIdAction(id: string) {
  if (!id || id.trim() === "") {
    return { success: false, message: "Employee ID cannot be empty." };
  }
  return dbAddEmployeeIdFS(id.trim());
}

export async function removeEmployeeIdAction(id: string) {
  return dbRemoveEmployeeIdFS(id);
}

export async function bulkUploadEmployeeIdsAction(formData: FormData) {
  const file = formData.get('employeeIdFile') as File | null;

  if (!file) {
    return { success: false, message: 'No file uploaded.' };
  }

  const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  const allowedExtensions = ['.csv', '.xls', '.xlsx'];
  
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

  if (!allowedMimeTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
     return { success: false, message: 'Invalid file type. Please upload a CSV or Excel file.' };
  }
  
  try {
    const textContent = await file.text();
    // Normalize line endings and filter out empty lines
    const lines = textContent.split(/\r\n|\n|\r/).map(line => line.trim()).filter(line => line);
    
    let idsToUpload: string[] = [];

    if (lines.length > 0) {
      // Normalize header: remove all spaces and convert to lowercase for matching
      const header = lines[0].toLowerCase().replace(/\s+/g, '');
      // Check if header contains 'employeeid' (covers 'employee id', 'employee_id', 'employeeid')
      if (header.includes('employeeid')) {
         idsToUpload = lines.slice(1).map(id => id.trim()).filter(id => id); // Trim and filter empty IDs after header
      } else {
        // If no header matches, assume all lines are IDs
        idsToUpload = lines.map(id => id.trim()).filter(id => id); // Trim and filter empty IDs
      }
    }
    
    if (idsToUpload.length === 0) {
      return { success: false, message: 'No valid IDs found in the file or file format incorrect. Ensure header is "employee id" or "employee_id" or no header with one ID per line.' };
    }

    const result = await dbBulkAddEmployeeIdsFS(idsToUpload);
    
    let message = `Successfully added ${result.count} new IDs.`;
    if (result.errors.length > 0) {
      message += ` ${result.errors.length} IDs already existed or were duplicates/invalid: ${result.errors.slice(0,5).join(', ')}${result.errors.length > 5 ? '...' : ''}.`;
    }
    return { success: true, message };

  } catch (error) {
    console.error('Error processing bulk upload:', error);
    return { success: false, message: 'Failed to process file. Ensure it is plain text (CSV/Excel saved as CSV).' };
  }
}


// Server actions for Printer Name management using Firebase
export async function addPrinterNameAction(name: string) {
  if (!name || name.trim() === "") {
    return { success: false, message: "Printer name cannot be empty." };
  }
  return dbAddPrinterNameFS(name.trim());
}

export async function removePrinterNameAction(id: string) {
  return dbRemovePrinterNameFS(id);
}
