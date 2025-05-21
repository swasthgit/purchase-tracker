// src/lib/actions.ts
"use server";

import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore'; 
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  OTHER_ITEM_VALUE,
  addEmployeeIdFS as dbAddEmployeeIdFS,
  removeEmployeeIdFS as dbRemoveEmployeeIdFS,
  bulkAddEmployeeIdsFS as dbBulkAddEmployeeIdsFS,
  addPrinterNameFS as dbAddPrinterNameFS,
  removePrinterNameFS as dbRemovePrinterNameFS,
  addPartnerFS as dbAddPartnerFS,
  updatePartnerFS as dbUpdatePartnerFS,
  removePartnerFS as dbRemovePartnerFS,
  addItemDefinitionFS as dbAddItemDefinitionFS,
  updateItemDefinitionFS as dbUpdateItemDefinitionFS,
  removeItemDefinitionFS as dbRemoveItemDefinitionFS,
} from '@/lib/data';
import type { PurchaseItem, ItemDefinition, Partner } from '@/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];


const PurchaseItemSchema = z.object({
  id: z.string(),
  clinicCode: z.string().min(1, "Clinic code is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0.01"),
  itemName: z.string().min(1, "Item name is required"), 
  customItemName: z.string().optional(),
  itemNameDisplay: z.string(), 
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
        itemNameDisplay: item.itemNameDisplay, 
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
        const sRef = storageRef(storage, `purchase_uploads/${userId}/${Date.now()}_${uploadedFile.name}`);
        const snapshot = await uploadBytes(sRef, uploadedFile);
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
      items: items.map(item => ({ 
        clinicCode: item.clinicCode,
        quantity: item.quantity,
        price: item.price,
        itemName: item.itemName, 
        customItemName: item.customItemName,
        itemNameDisplay: item.itemNameDisplay, 
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

// --- Employee ID Management Actions ---
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
    const lines = textContent.split(/\r\n|\n|\r/).map(line => line.trim()).filter(line => line);
    
    let idsToUpload: string[] = [];

    if (lines.length > 0) {
      const header = lines[0].toLowerCase().replace(/\s+/g, '');
      if (header.includes('employeeid')) {
         idsToUpload = lines.slice(1).map(id => id.trim()).filter(id => id);
      } else {
        idsToUpload = lines.map(id => id.trim()).filter(id => id);
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


// --- Printer Name Management Actions ---
export async function addPrinterNameAction(name: string) {
  if (!name || name.trim() === "") {
    return { success: false, message: "Printer name cannot be empty." };
  }
  return dbAddPrinterNameFS(name.trim());
}

export async function removePrinterNameAction(id: string) {
  return dbRemovePrinterNameFS(id);
}

// --- Partner Management Actions ---
const PartnerNameSchema = z.string().min(1, "Partner name cannot be empty.").max(100, "Partner name too long.");

export async function addPartnerAction(name: string) {
  const validation = PartnerNameSchema.safeParse(name);
  if (!validation.success) {
    return { success: false, message: validation.error.errors[0].message };
  }
  return dbAddPartnerFS(validation.data);
}

export async function updatePartnerAction(id: string, name: string) {
  const validation = PartnerNameSchema.safeParse(name);
  if (!validation.success) {
    return { success: false, message: validation.error.errors[0].message };
  }
  return dbUpdatePartnerFS(id, validation.data);
}

export async function removePartnerAction(id: string) {
  return dbRemovePartnerFS(id);
}

// --- Item Definition Management Actions ---
const ItemDefinitionSchema = z.object({
  name: z.string().min(1, "Item name is required.").max(100, "Item name too long."),
  imageUrl: z.string().url("Image URL must be a valid URL.").min(1, "Image URL is required."),
  dataAiHint: z.string().max(50, "AI hint too long.").optional(),
});

export async function addItemDefinitionAction(itemData: { name: string; imageUrl: string; dataAiHint?: string }) {
  const validation = ItemDefinitionSchema.safeParse(itemData);
  if (!validation.success) {
    const fieldErrors = validation.error.flatten().fieldErrors;
    const message = fieldErrors.name?.[0] || fieldErrors.imageUrl?.[0] || fieldErrors.dataAiHint?.[0] || "Validation failed.";
    return { success: false, message };
  }
  return dbAddItemDefinitionFS(validation.data);
}

export async function updateItemDefinitionAction(id: string, itemData: { name?: string; imageUrl?: string; dataAiHint?: string }) {
  const partialSchema = ItemDefinitionSchema.partial().refine(data => Object.keys(data).length > 0, {message: "At least one field must be provided for update."});
  const validation = partialSchema.safeParse(itemData);
  if (!validation.success) {
     const fieldErrors = validation.error.flatten().fieldErrors;
     const message = fieldErrors.name?.[0] || fieldErrors.imageUrl?.[0] || fieldErrors.dataAiHint?.[0] || "Validation failed.";
     return { success: false, message };
  }
  // Ensure that if name is being updated, it's not empty or just whitespace
  if (itemData.name !== undefined && itemData.name.trim() === "") {
    return { success: false, message: "Item name cannot be empty." };
  }
  // Ensure that if imageUrl is being updated, it's not empty or just whitespace and is a valid URL
  if (itemData.imageUrl !== undefined) {
    if (itemData.imageUrl.trim() === "") {
      return { success: false, message: "Image URL cannot be empty." };
    }
    const urlValidation = z.string().url().safeParse(itemData.imageUrl);
    if (!urlValidation.success) {
      return { success: false, message: "Invalid Image URL format."};
    }
  }

  // Prepare data for Firestore, ensuring only defined fields are passed and names are trimmed
  const updatePayload: any = {};
  if (itemData.name !== undefined) updatePayload.name = itemData.name.trim();
  if (itemData.imageUrl !== undefined) updatePayload.imageUrl = itemData.imageUrl.trim();
  if (itemData.dataAiHint !== undefined) updatePayload.dataAiHint = itemData.dataAiHint.trim();


  return dbUpdateItemDefinitionFS(id, updatePayload);
}

export async function removeItemDefinitionAction(id: string) {
  return dbRemoveItemDefinitionFS(id);
}

// --- Item Image Upload Action ---
export async function uploadItemImageAction(formData: FormData): Promise<{success: boolean, url?: string, message?: string}> {
  const imageFile = formData.get('itemImage') as File | null;

  if (!imageFile) {
    return { success: false, message: "No image file provided." };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
    return { success: false, message: "Invalid file type. Please upload an image (JPEG, PNG, GIF, WEBP)." };
  }
  if (imageFile.size > MAX_FILE_SIZE) { 
    return { success: false, message: `File is too large. Max size is ${MAX_FILE_SIZE / (1024*1024)}MB.`};
  }

  try {
    const sRef = storageRef(storage, `item_definition_images/${Date.now()}_${imageFile.name}`);
    const snapshot = await uploadBytes(sRef, imageFile);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return { success: true, url: downloadUrl };
  } catch (error) {
    console.error("Error uploading item image to Firebase Storage:", error);
    const errorMessage = error instanceof Error ? error.message : "Firebase Storage upload failed.";
    return { success: false, message: errorMessage };
  }
}
