// src/lib/actions.ts
"use server";

import { z } from 'zod';
import {
  addEmployeeId as dbAddEmployeeId,
  removeEmployeeId as dbRemoveEmployeeId,
  addPrinterName as dbAddPrinterName,
  removePrinterName as dbRemovePrinterName,
  bulkAddEmployeeIds as dbBulkAddEmployeeIds,
  OTHER_ITEM_VALUE
} from '@/lib/data';
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
    // The items from formData are already processed in purchase-form.tsx to include itemNameDisplay
    // So we parse them as is.
    const itemsForValidation = JSON.parse(rawItems).map((item: any) => ({
        id: item.id,
        clinicCode: item.clinicCode,
        quantity: item.quantity,
        price: item.price,
        itemName: item.itemName, // original itemName for validation
        customItemName: item.customItemName,
    })) as PurchaseItem[];
    
    const validatedFields = PurchaseFormSchema.safeParse({
      userId: formData.get('userId'),
      partnerName: formData.get('partnerName'),
      userName: formData.get('userName'),
      items: itemsForValidation, // Use the specifically mapped items for validation
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
    // For logging or actual DB saving, you might want the display name
    const itemsToSave = parsedItems.map(item => {
        const displayName = item.itemName === OTHER_ITEM_VALUE ? item.customItemName : item.itemName;
        return { ...item, itemNameDisplay: displayName };
    });

    console.log("Purchase Submitted:", { userId, partnerName, userName, items: itemsToSave });

    if (uploadedFile) {
      console.log("Uploaded File:", uploadedFile.name, uploadedFile.type, uploadedFile.size);
      // In a real app, you would save the file to a storage service
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

  if (file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel' && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
     return { success: false, message: 'Invalid file type. Please upload a CSV or Excel file.' };
  }
  
  try {
    const textContent = await file.text();
    const lines = textContent.split(/\\r\\n|\\n|\\r/).map(line => line.trim()).filter(line => line !== ''); // Handles different line endings
    
    let idsToUpload: string[] = [];
    if (lines.length > 0) {
      const header = lines[0].toLowerCase().replace(/\s+/g, ''); // Normalize header
      if (header.includes('employeeid')) { // More robust check
         idsToUpload = lines.slice(1);
      } else {
        idsToUpload = lines;
      }
    }
    
    idsToUpload = idsToUpload.filter(id => id); // Ensure no empty strings from parsing

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
