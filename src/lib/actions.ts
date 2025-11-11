// src/lib/actions.ts
"use server";

import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { OTHER_ITEM_VALUE } from '@/lib/data';
import type { UploadedFileMeta } from '@/types';


const MAX_TOTAL_FILES = 50;
const MAX_FILE_SIZE_PER_FILE = 20 * 1024 * 1024; // 20MB per file
const ALLOWED_FILE_TYPES_PURCHASE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];


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
