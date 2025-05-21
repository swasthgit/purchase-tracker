// src/lib/actions.ts
"use server";

import { z } from 'zod';
import {
  addEmployeeId as dbAddEmployeeId,
  removeEmployeeId as dbRemoveEmployeeId,
  addPrinterName as dbAddPrinterName,
  removePrinterName as dbRemovePrinterName,
  bulkAddEmployeeIds as dbBulkAddEmployeeIds,
} from '@/lib/data';
import type { PurchaseItem } from '@/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];


const PurchaseItemSchema = z.object({
  id: z.string(),
  clinicCode: z.string().min(1, "Clinic code is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  itemName: z.string().min(1, "Item name is required"),
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
    const items = JSON.parse(rawItems) as PurchaseItem[];
    
    const validatedFields = PurchaseFormSchema.safeParse({
      userId: formData.get('userId'),
      partnerName: formData.get('partnerName'),
      userName: formData.get('userName'),
      items: items,
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

    const { userId, partnerName, userName, items: parsedItems, uploadedFile } = validatedFields.data;

    // Simulate saving data
    console.log("Purchase Submitted:", { userId, partnerName, userName, items: parsedItems });
    if (uploadedFile) {
      console.log("Uploaded File:", uploadedFile.name, uploadedFile.type, uploadedFile.size);
      // In a real app, you would save the file to a storage service (e.g., Firebase Storage, S3)
      // const fileBuffer = await uploadedFile.arrayBuffer();
      // Then save fileBuffer
    }

    return { success: true, message: "dataSubmittedSuccess" };
  } catch (error) {
    console.error("Error submitting purchase:", error);
    return { success: false, message: "errorOccurred" };
  }
}

export async function addEmployeeIdAction(id: string) {
  if (!id || id.trim() === "") {
    return { success: false, message: "Employee ID cannot be empty." };
  }
  const result = await dbAddEmployeeId(id.trim());
  return result;
}

export async function removeEmployeeIdAction(id: string) {
  const result = await dbRemoveEmployeeId(id);
  return result;
}

export async function addPrinterNameAction(name: string) {
  if (!name || name.trim() === "") {
    return { success: false, message: "Printer name cannot be empty." };
  }
  const result = await dbAddPrinterName(name.trim());
  return result;
}

export async function removePrinterNameAction(id: string) {
  const result = await dbRemovePrinterName(id);
  return result;
}

export async function bulkUploadEmployeeIdsAction(formData: FormData) {
  const file = formData.get('employeeIdFile') as File | null;

  if (!file) {
    return { success: false, message: 'No file uploaded.' };
  }

  // Basic validation for file type (example: allow only CSV)
  if (file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel' && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
     return { success: false, message: 'Invalid file type. Please upload a CSV or Excel file.' };
  }
  
  // In a real app, you would parse the Excel/CSV file here.
  // For simplicity, we'll simulate reading lines from a CSV.
  // This requires a library like 'papaparse' or 'xlsx' for robust parsing.
  // Here, we'll just pretend it's a CSV and extract IDs.
  // This is a placeholder for actual file processing logic.
  try {
    const textContent = await file.text();
    const lines = textContent.split('\\n').map(line => line.trim()).filter(line => line !== '');
    
    // Assuming the first line is a header "employee id"
    let idsToUpload: string[] = [];
    if (lines.length > 0) {
      const header = lines[0].toLowerCase();
      if (header.includes('employee id') || header.includes('employeeid')) {
         idsToUpload = lines.slice(1);
      } else {
        // If no header or unknown header, assume all lines are IDs
        idsToUpload = lines;
      }
    }
    
    if (idsToUpload.length === 0) {
      return { success: false, message: 'No IDs found in the file or file format incorrect.' };
    }

    const result = await dbBulkAddEmployeeIds(idsToUpload);
    
    let message = `Successfully added ${result.count} new IDs.`;
    if (result.errors.length > 0) {
      message += ` ${result.errors.length} IDs already existed or were duplicates: ${result.errors.slice(0,5).join(', ')}${result.errors.length > 5 ? '...' : ''}.`;
    }
    return { success: true, message };

  } catch (error) {
    console.error('Error processing bulk upload:', error);
    return { success: false, message: 'Failed to process file.' };
  }
}
