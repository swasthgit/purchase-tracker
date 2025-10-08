// src/lib/actions.ts
"use server";

import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, where, Timestamp, writeBatch } from 'firebase/firestore'; 
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
  getPurchasesByDateRangeFS,
  addInventoryItemFS,
  updateInventoryItemFS,
  removeInventoryItemFS,
  bulkAddClinicsFS,
  bulkAddDCMappingsFS,
  bulkAddInventoryFS,
} from '@/lib/data';
import type { PurchaseItem, ItemDefinition, Partner, UploadedFileMeta, PurchaseData, InventoryItem, DCMapping } from '@/types';
import * as XLSX from 'xlsx';


const MAX_TOTAL_FILES = 50;
const MAX_FILE_SIZE_PER_FILE = 20 * 1024 * 1024; // 20MB per file
const ALLOWED_FILE_TYPES_PURCHASE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
const ALLOWED_IMAGE_TYPES_ITEM_DEF = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];


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

const FileSchema = z
  .custom<File>()
  .refine((file) => file.size <= MAX_FILE_SIZE_PER_FILE, `Max file size is 20MB per file.`)
  .refine(
    (file) => ALLOWED_FILE_TYPES_PURCHASE.includes(file.type),
    "Only JPG, PNG, GIF, WEBP, PDF, and Excel files are allowed."
  );

const FormSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  partnerName: z.string().min(1, "Partner name is required"),
  userName: z.string().min(1, "User name is required").max(100, "User name too long"),
  items: z.array(PurchaseItemSchema).min(1, "At least one item is required"),
  uploadedFiles: z.array(FileSchema)
    .max(MAX_TOTAL_FILES, `You can upload a maximum of ${MAX_TOTAL_FILES} files.`)
    .optional()
    .default([]),
  feedback: z.string().optional(),
});


const uploadFileToStorage = async (file: File, folder: string): Promise<UploadedFileMeta> => {
    const uniqueFileName = `${Date.now()}-${file.name}`;
    const fileRef = storageRef(storage, `${folder}/${uniqueFileName}`);
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: downloadURL
    };
};

export async function submitPurchase(prevState: any, formData: FormData) {
  const parsedData = FormSchema.safeParse({
    userId: formData.get('userId'),
    partnerName: formData.get('partnerName'),
    userName: formData.get('userName'),
    items: JSON.parse(formData.get('items') as string),
    uploadedFiles: formData.getAll('uploadedFiles').filter(f => (f as File).size > 0),
    feedback: formData.get('feedback'),
  });

  if (!parsedData.success) {
    return { success: false, message: 'Invalid form data.', errors: parsedData.error.flatten().fieldErrors };
  }

  const { userId, partnerName, userName, items, uploadedFiles, feedback } = parsedData.data;

  try {
    const uploadedFileMetas: UploadedFileMeta[] = [];
    if (uploadedFiles && uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        if (file instanceof File) {
            const meta = await uploadFileToStorage(file, 'purchase_documents');
            uploadedFileMetas.push(meta);
        }
      }
    }
    
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const docRef = await addDoc(collection(db, 'purchases'), {
      userId,
      partnerName,
      userName,
      items,
      uploadedFiles: uploadedFileMetas,
      createdAt: serverTimestamp(),
      totalAmount,
      feedback: feedback || '',
    });
    
    const returnData = {
        id: docRef.id,
        userId,
        partnerName,
        userName,
        items,
        uploadedFiles: uploadedFileMetas,
        totalAmount,
        feedback: feedback || '',
    };

    return { success: true, message: 'Purchase submitted successfully.', data: returnData };
  } catch (error) {
    console.error("Error submitting purchase:", error);
    return { success: false, message: 'Failed to submit purchase.' };
  }
}

// --- Admin Actions ---

export async function addEmployeeIdAction(id: string) { return dbAddEmployeeIdFS(id); }
export async function removeEmployeeIdAction(id: string) { return dbRemoveEmployeeIdFS(id); }

export async function bulkUploadEmployeeIdsAction(formData: FormData) {
  const file = formData.get('employeeIdFile') as File | null;
  if (!file) {
    return { success: false, message: 'No file uploaded.' };
  }
  
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

     if (!data || data.length === 0) {
        return { success: false, message: "File is empty." };
    }
    
    const headerRow = data[0] as string[];
    const header = headerRow[0]?.toString().toLowerCase().trim().replace(/_/g, " ").replace(/\s+/, " ");

    let idsToUpload: string[] = [];
    if (header === 'employee id') {
       idsToUpload = (data.slice(1) as string[][]).map(row => row[0]?.toString().trim()).filter(Boolean);
    } else {
       idsToUpload = (data as string[][]).map(row => row[0]?.toString().trim()).filter(Boolean);
    }

    if (idsToUpload.length === 0) {
      return { success: false, message: 'No valid employee IDs found in the file. Ensure the header is "employee_id" or "employee id" or provide a list of IDs.' };
    }

    const result = await dbBulkAddEmployeeIdsFS(idsToUpload);
    let message = `Successfully added ${result.count} new IDs.`;
    if (result.errors.length > 0) {
      message += ` ${result.errors.length} IDs already existed or were duplicates/invalid: ${result.errors.slice(0,5).join(', ')}${result.errors.length > 5 ? '...' : ''}.`;
    }
    return { success: true, message };
  } catch (error) {
    console.error('Error processing bulk upload:', error);
    return { success: false, message: 'Failed to process file. Ensure it is a valid CSV or Excel file.' };
  }
}

export async function addPrinterNameAction(name: string) { return dbAddPrinterNameFS(name); }
export async function removePrinterNameAction(id: string) { return dbRemovePrinterNameFS(id); }

export async function addPartnerAction(name: string) { return dbAddPartnerFS(name); }
export async function updatePartnerAction(id: string, newName: string) { return dbUpdatePartnerFS(id, newName); }
export async function removePartnerAction(id: string) { return dbRemovePartnerFS(id); }


const ItemDefinitionPayloadSchema = z.object({
  name: z.string().min(1, "Item name is required."),
  imageUrl: z.string().url("A valid URL for the image is required."),
  dataAiHint: z.string().optional(),
});

export async function addItemDefinitionAction(itemData: z.infer<typeof ItemDefinitionPayloadSchema>) {
  const validation = ItemDefinitionPayloadSchema.safeParse(itemData);
  if (!validation.success) {
      return { success: false, message: validation.error.errors[0].message };
  }
  return dbAddItemDefinitionFS(validation.data);
}

export async function updateItemDefinitionAction(id: string, itemData: z.infer<typeof ItemDefinitionPayloadSchema>) {
  const validation = ItemDefinitionPayloadSchema.safeParse(itemData);
  if (!validation.success) {
      return { success: false, message: validation.error.errors[0].message };
  }
  return dbUpdateItemDefinitionFS(id, validation.data);
}

export async function removeItemDefinitionAction(id: string) { return dbRemoveItemDefinitionFS(id); }

export async function uploadItemImageAction(formData: FormData) {
  const file = formData.get('itemImage') as File | null;
  if (!file) {
    return { success: false, message: 'No image file uploaded.' };
  }

  // Validate file type
  if (!ALLOWED_IMAGE_TYPES_ITEM_DEF.includes(file.type)) {
    return { success: false, message: 'Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.' };
  }

  try {
    const uploadedFileMeta = await uploadFileToStorage(file, 'item_images');
    return { success: true, url: uploadedFileMeta.url };
  } catch (error) {
    console.error("Error uploading item image:", error);
    return { success: false, message: 'Failed to upload image to storage.' };
  }
}

export async function downloadPurchasesByDateRangeAction(prevState: any, formData: FormData) {
  const startDateStr = formData.get('startDate') as string;
  const endDateStr = formData.get('endDate') as string;

  if (!startDateStr || !endDateStr) {
    return { success: false, message: 'invalidDates' };
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  try {
    const purchases = await getPurchasesByDateRangeFS(startDate, endDate);
    if (purchases.length === 0) {
      return { success: false, message: 'noDataFoundForDateRange' };
    }

    const reportData = purchases.flatMap(p => 
        p.items.map(item => ({
            "Purchase ID": p.id,
            "Purchase Date": p.createdAt.toDate ? p.createdAt.toDate().toISOString().split('T')[0] : 'N/A',
            "User ID": p.userId,
            "User Name": p.userName,
            "Partner Name": p.partnerName,
            "Clinic Code": item.clinicCode,
            "Item Name": item.itemNameDisplay,
            "Quantity": item.quantity,
            "Price per Unit": item.price,
            "Line Total": item.quantity * item.price,
            "Feedback": p.feedback || "N/A",
            "Files": p.uploadedFiles?.map(f => f.url).join(', ') ?? 'None'
        }))
    );
    
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchases Report");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

    return { 
        success: true, 
        message: 'reportGeneratedSuccess', 
        excelData: excelBuffer,
        fileName: `Purchases_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.xlsx`
    };

  } catch (error) {
    console.error("Error generating purchase report:", error);
    return { success: false, message: 'errorGeneratingReport' };
  }
}

// --- Inventory Actions ---
const InventoryItemPayloadSchema = z.object({
  clinicName: z.string().min(1, "Clinic name is required"),
  id: z.string().optional(), // For updates, potentially undefined for new items
  "item name": z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  "approx price per unit": z.coerce.number().min(0, "Price cannot be negative"),
});

export async function addInventoryItemAction(itemData: z.infer<typeof InventoryItemPayloadSchema>) {
    const validation = InventoryItemPayloadSchema.safeParse(itemData);
    if (!validation.success) {
        return { success: false, message: validation.error.errors[0].message };
    }
    return addInventoryItemFS(validation.data);
}

export async function updateInventoryItemAction(itemData: z.infer<typeof InventoryItemPayloadSchema>) {
    const validation = InventoryItemPayloadSchema.safeParse(itemData);
    if (!validation.success) {
        return { success: false, message: validation.error.errors[0].message };
    }

    if (!validation.data.id) {
        return { success: false, message: "Item ID is required for updates." };
    }

    return updateInventoryItemFS(validation.data as InventoryItem);
}

export async function removeInventoryItemAction(clinicName: string, itemId: string) {
    if (!clinicName || !itemId) {
        return { success: false, message: "Clinic name and Item ID are required for this operation." };
    }
    return removeInventoryItemFS(clinicName, itemId);
}

// --- Clinic Bulk Upload ---
export async function bulkUploadClinicsAction(formData: FormData) {
  const file = formData.get('clinicFile') as File | null;
  if (!file) {
    return { success: false, message: 'No file uploaded.' };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

     if (!data || data.length === 0) {
        return { success: false, message: "File is empty." };
    }

    const headerRow = data[0] as string[];
    const header = headerRow[0]?.toString().toLowerCase().trim().replace(/_/g, " ").replace(/\s+/, " ");
    
    let clinicsToUpload: string[] = [];

    if (header === 'clinic' || header === 'clinic name') { 
       clinicsToUpload = (data.slice(1) as string[][]).map(row => row[0]?.toString().trim()).filter(Boolean);
    } else {
      clinicsToUpload = (data as string[][]).map(row => row[0]?.toString().trim()).filter(Boolean);
    }
    
    if (clinicsToUpload.length === 0) {
      return { success: false, message: 'No valid clinic names found in the file. Ensure the header is "clinic" or "clinic name" or provide a list of names.' };
    }

    const result = await bulkAddClinicsFS(clinicsToUpload);
    
    let message = `Successfully added ${result.count} new clinics.`;
    if (result.errors.length > 0) {
      message += ` ${result.errors.length} clinics already existed or were duplicates/invalid: ${result.errors.slice(0,5).join(', ')}${result.errors.length > 5 ? '...' : ''}.`;
    }
    return { success: true, message };

  } catch (error) {
    console.error('Error processing bulk clinic upload:', error);
    return { success: false, message: 'Failed to process file. Ensure it is a valid CSV or Excel file.' };
  }
}

// --- DC Mapping Actions ---
function normalizeHeader(header: string): string {
    if (typeof header !== 'string') return '';
    return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function bulkUploadDCMappingAction(formData: FormData) {
  const file = formData.get('dcMappingFile') as File | null;
  if (!file) {
    return { success: false, message: 'No file uploaded.' };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return { success: false, message: 'File is empty or has no data.' };
    }

    const headers = Object.keys(data[0]);
    const normalizedHeaderMap: { [key: string]: string } = {};
    const expectedHeaders: { [key: string]: keyof DCMapping } = {
        statename: 'stateName',
        partnername: 'partnerName',
        oldecliniccode: 'oldEclinicCode',
        newecliniccode: 'newEclinicCode',
        regionname: 'regionName',
        branchname: 'branchName',
        dcname: 'dcName',
        dcemployeecode: 'dcEmployeeCode',
    };

    headers.forEach(h => {
        const normalized = normalizeHeader(h);
        if (expectedHeaders[normalized]) {
            normalizedHeaderMap[h] = expectedHeaders[normalized];
        }
    });

    const expectedKeys = Object.keys(expectedHeaders);
    const foundKeys = Object.values(normalizedHeaderMap).map(v => expectedKeys.find(k => expectedHeaders[k] === v));
    
    if (foundKeys.length < expectedKeys.length) {
         const missingKeys = expectedKeys.filter(eh => !foundKeys.includes(eh));
         const missingHeaders = missingKeys.map(k => Object.keys(expectedHeaders).find(key => expectedHeaders[key] === k));
         return { success: false, message: `File is missing required columns. Missing: ${missingHeaders.join(', ')}` };
    }

    const mappingsToUpload: Omit<DCMapping, 'id'>[] = data.map(row => {
        const mapping: any = {};
        for (const header in normalizedHeaderMap) {
            const key = normalizedHeaderMap[header];
            mapping[key] = row[header]?.toString().trim() || '';
        }
        return mapping as Omit<DCMapping, 'id'>;
    });

    if (mappingsToUpload.length === 0) {
        return { success: false, message: 'No valid data rows found to upload.' };
    }

    const result = await bulkAddDCMappingsFS(mappingsToUpload);
    
    let message = `Successfully processed ${result.count} of ${mappingsToUpload.length} mapping entries.`;
    if (result.errors > 0) {
      message += ` ${result.errors} entries were skipped due to issues.`;
    }
    return { success: true, message };

  } catch (error) {
    console.error('Error processing DC Mapping upload:', error);
    return { success: false, message: 'Failed to process file. Ensure it is a valid and correctly formatted CSV or Excel file.' };
  }
}

export async function bulkUploadInventoryAction(formData: FormData) {
  const file = formData.get('inventoryFile') as File | null;
  if (!file) {
    return { success: false, message: 'No file uploaded.' };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return { success: false, message: 'File is empty or has no data rows.' };
    }

    const headers = Object.keys(data[0]);
    const headerMap: { [key: string]: string } = {};
    const expectedHeaders = ['clinic_name', 'clinic name', 'item_name', 'item name', 'quantity', 'price', 'approx_price_per_unit'];
    
    headers.forEach(h => {
        const normalized = h.toLowerCase().trim();
        if (expectedHeaders.includes(normalized)) {
            if (normalized === 'clinic_name' || normalized === 'clinic name') headerMap[h] = 'clinicName';
            else if (normalized === 'item_name' || normalized === 'item name') headerMap[h] = 'itemName';
            else if (normalized === 'quantity') headerMap[h] = 'quantity';
            else if (normalized === 'price' || normalized === 'approx_price_per_unit') headerMap[h] = 'price';
        }
    });
    
    const requiredMappedHeaders = ['clinicName', 'itemName', 'quantity', 'price'];
    const foundMappedHeaders = Object.values(headerMap);
    if (!requiredMappedHeaders.every(h => foundMappedHeaders.includes(h))) {
        return { success: false, message: 'File is missing required columns. Required headers are: clinic_name, item_name, quantity, price.' };
    }

    const inventoryItems: Omit<InventoryItem, 'id'>[] = data.map(row => {
      const item: any = {};
      for (const originalHeader in headerMap) {
        const mappedKey = headerMap[originalHeader];
        let value = row[originalHeader];
        if (mappedKey === 'quantity' || mappedKey === 'price') {
            value = parseFloat(value) || 0;
        } else {
            value = value?.toString().trim() || '';
        }
        if (mappedKey === 'price') {
          item['approx price per unit'] = value;
        } else if (mappedKey === 'itemName') {
          item['item name'] = value;
        }
        else {
          item[mappedKey] = value;
        }
      }
      return item as Omit<InventoryItem, 'id'>;
    }).filter(item => item.clinicName && item['item name']); // Ensure mandatory fields are present

    if (inventoryItems.length === 0) {
      return { success: false, message: 'No valid inventory items found in the file.' };
    }
    
    const result = await bulkAddInventoryFS(inventoryItems);

    let message = `Successfully processed ${result.added} new inventory items.`;
    if (result.updated > 0) {
      message += ` Updated ${result.updated} existing items.`;
    }
    if (result.errors > 0) {
      message += ` Failed to process ${result.errors} items.`;
    }
    return { success: true, message };
    
  } catch (error) {
    console.error('Error processing bulk inventory upload:', error);
    return { success: false, message: 'Failed to process file. Ensure it is a valid and correctly formatted Excel/CSV file.' };
  }
}

    