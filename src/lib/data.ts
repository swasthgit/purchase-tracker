// src/lib/data.ts
import type { SelectOption, AdminManagedItem, Partner, ItemDefinition, PurchaseData, UploadedFileMeta } from '@/types';
import { db } from './firebase';
import type { QuerySnapshot, Query } from 'firebase/firestore';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, writeBatch, updateDoc, serverTimestamp, orderBy, Timestamp, limit, startAfter, setDoc, getDoc } from 'firebase/firestore';

export const OTHER_ITEM_VALUE = "other_specify_item";

// --- Employee ID Management ---
export const getEmployeeIdsFS = async (): Promise<SelectOption[]> => {
  try {
    const employeeIdsCollection = collection(db, 'employee_ids');
    const q = query(employeeIdsCollection, orderBy("employeeId"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ value: doc.data().employeeId as string, label: doc.data().employeeId as string }));
  } catch (error) {
    console.error("Error fetching employee IDs from Firestore:", error);
    return [];
  }
};

export const addEmployeeIdFS = async (employeeIdValue: string): Promise<{success: boolean, message?: string}> => {
  try {
    const cleanedEmployeeId = employeeIdValue.trim().replace(/[^x20-x7E]/g, '');
    if (!cleanedEmployeeId) return { success: false, message: 'emptyId' };

    const employeeIdsCollection = collection(db, 'employee_ids');
    const snapshot = await getDocs(query(employeeIdsCollection, where("employeeId", "==", cleanedEmployeeId)));
    if (!snapshot.empty) {
      return { success: false, message: 'idExists' };
    }
    await addDoc(employeeIdsCollection, { employeeId: cleanedEmployeeId, createdAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error("Error adding employee ID to Firestore:", error);
    return { success: false, message: 'errorOccurred' };
  }
};

export const removeEmployeeIdFS = async (employeeIdValue: string): Promise<{success: boolean, message?: string}> => {
  try {
    const employeeIdsCollection = collection(db, 'employee_ids');
    const q = query(employeeIdsCollection, where("employeeId", "==", employeeIdValue));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { success: false, message: 'ID not found' };
    }
    const docId = snapshot.docs[0].id;
    await deleteDoc(doc(db, 'employee_ids', docId));
    return { success: true };
  } catch (error) {
    console.error("Error removing employee ID from Firestore:", error);
    return { success: false, message: 'errorOccurred' };
  }
};

export const bulkAddEmployeeIdsFS = async (ids: string[]): Promise<{success: boolean, count: number, errors: string[]}> => {
  let addedCount = 0;
  const errorIds: string[] = [];
  const employeeIdsCollection = collection(db, 'employee_ids');
  const existingIds = new Set<string>();
  let lastDoc = null;
  while (true) {
    const batchQuery = lastDoc ? query(employeeIdsCollection, orderBy("employeeId"), startAfter(lastDoc), limit(1000)) : query(employeeIdsCollection, orderBy("employeeId"), limit(1000));
    const snapshot: QuerySnapshot = await getDocs(batchQuery as Query);
    if (snapshot.empty) break;
    snapshot.docs.forEach(doc => existingIds.add(doc.data().employeeId as string));
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  const batch = writeBatch(db);
  const uniqueNewIds = new Set<string>();

  for (const id of ids) {
    const trimmedId = id.trim().replace(/[^x20-x7E]/g, '');
    if (trimmedId && !existingIds.has(trimmedId) && !uniqueNewIds.has(trimmedId)) {
      uniqueNewIds.add(trimmedId);
      const newDocRef = doc(collection(db, 'employee_ids'));
      batch.set(newDocRef, { employeeId: trimmedId, createdAt: serverTimestamp() });
      addedCount++;
    } else if (trimmedId) {
      errorIds.push(trimmedId);
    }
  }
  try {
    await batch.commit();
    return { success: true, count: addedCount, errors: errorIds };
  } catch (error) {
     console.error("Error bulk adding employee IDs to Firestore:", error);
     return { success: false, count: 0, errors: ids.filter(id => id.trim()) };
  }
};

// --- Printer Name Management ---
export const getPrinterNamesFS = async (): Promise<AdminManagedItem[]> => {
  try {
    const printerNamesCollection = collection(db, 'printer_names');
    const q = query(printerNamesCollection, orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, name: docSnapshot.data().name as string }));
  } catch (error) {
    console.error("Error fetching printer names from Firestore:", error);
    return [];
  }
};

export const addPrinterNameFS = async (name: string): Promise<{success: boolean, id?: string, message?: string}> => {
  try {
    const printerNamesCollection = collection(db, 'printer_names');
    const q = query(printerNamesCollection, where("name", "==", name));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { success: false, message: 'nameExists' };
    }
    const docRef = await addDoc(printerNamesCollection, { name, createdAt: serverTimestamp() });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding printer name to Firestore:", error);
    return { success: false, message: 'errorOccurred' };
  }
};

export const removePrinterNameFS = async (id: string): Promise<{success: boolean, message?: string}> => {
 try {
    await deleteDoc(doc(db, 'printer_names', id));
    return { success: true };
  } catch (error) {
    console.error("Error removing printer name from Firestore:", error);
    return { success: false, message: 'errorOccurred' };
  }
};

// --- Partner Management ---
export const getPartnersFS = async (): Promise<Partner[]> => {
  try {
    const partnersCollection = collection(db, 'partners');
    const q = query(partnersCollection, orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, name: docSnapshot.data().name as string }));
  } catch (error) {
    console.error("Error fetching partners from Firestore:", error);
    return [];
  }
};

export const addPartnerFS = async (name: string): Promise<{success: boolean, id?: string, message?: string}> => {
  try {
    const partnersCollection = collection(db, 'partners');
    const q = query(partnersCollection, where("name", "==", name));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { success: false, message: 'nameExists' };
    }
    const docRef = await addDoc(partnersCollection, { name, createdAt: serverTimestamp() });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding partner to Firestore:", error);
    return { success: false, message: 'errorOccurred' };
  }
};

export const updatePartnerFS = async (id: string, newName: string): Promise<{success: boolean, message?: string}> => {
  try {
    if (newName) {
        const partnersCollection = collection(db, 'partners');
        const q = query(partnersCollection, where("name", "==", newName));
        const snapshot = await getDocs(q);
        if (!snapshot.empty && snapshot.docs.some(d => d.id !== id)) {
            return { success: false, message: 'nameExists' };
        }
    }
    const partnerDocRef = doc(db, 'partners', id);
    await updateDoc(partnerDocRef, { name: newName, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error("Error updating partner in Firestore:", error);
    return { success: false, message: 'errorOccurred' };
  }
};

export const removePartnerFS = async (id: string): Promise<{success: boolean, message?: string}> => {
  try {
    await deleteDoc(doc(db, 'partners', id));
    return { success: true };
  } catch (error) {
    console.error("Error removing partner from Firestore:", error);
    return { success: false, message: 'errorOccurred' };
  }
};

// --- Item Definition Management ---
export const getItemDefinitionsFS = async (): Promise<ItemDefinition[]> => {
  try {
    const itemsCollection = collection(db, 'item_definitions');
    const q = query(itemsCollection, orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        name: data.name as string,
        value: docSnapshot.id,
        label: data.name as string,
        imageUrl: data.imageUrl as string,
        dataAiHint: data.dataAiHint as string | undefined,
      };
    });
  } catch (error) {
    console.error("Error fetching item definitions from Firestore:", error);
    return [];
  }
};

export const addItemDefinitionFS = async (itemData: Omit<ItemDefinition, 'id' | 'value' | 'label'> & { name: string }): Promise<{success: boolean, id?: string, message?: string}> => {
  try {
    const itemsCollection = collection(db, 'item_definitions');
    const q = query(itemsCollection, where("name", "==", itemData.name));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { success: false, message: 'nameExists' };
    }
    const docRef = await addDoc(itemsCollection, { ...itemData, createdAt: serverTimestamp() });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding item definition to Firestore:", error);
    return { success: false, message: 'errorOccurred' };
  }
};

export const updateItemDefinitionFS = async (id: string, itemData: Partial<Omit<ItemDefinition, 'id' | 'value' | 'label'>> & { name?: string }): Promise<{success: boolean, message?: string}> => {
  try {
    if (itemData.name) {
        const itemsCollection = collection(db, 'item_definitions');
        const q = query(itemsCollection, where("name", "==", itemData.name));
        const snapshot = await getDocs(q);
        if (!snapshot.empty && snapshot.docs.some(d => d.id !== id)) {
            return { success: false, message: 'nameExists' };
        }
    }
    const itemDocRef = doc(db, 'item_definitions', id);
    await updateDoc(itemDocRef, { ...itemData, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error("Error updating item definition in Firestore:", error);
    return { success: false, message: 'errorOccurred' };
  }
};

export const removeItemDefinitionFS = async (id: string): Promise<{success: boolean, message?: string}> => {
  try {
    await deleteDoc(doc(db, 'item_definitions', id));
    return { success: true };
  } catch (error) {
    console.error("Error removing item definition from Firestore:", error);
    return { success: false, message: 'errorOccurred' };
  }
};

// --- Public data getters for the form ---
export const getPartnerNames = async (): Promise<Partner[]> => {
  return getPartnersFS();
};

export const getItemNames = async (): Promise<ItemDefinition[]> => {
  const itemsFromDb = await getItemDefinitionsFS();
  return [
    ...itemsFromDb,
    {
      id: OTHER_ITEM_VALUE,
      name: 'Other (Specify)',
      value: OTHER_ITEM_VALUE,
      label: 'Other (Specify)',
      imageUrl: 'https://placehold.co/100x100.png?text=Other',
      dataAiHint: "custom item"
    }
  ];
};

// --- Get Purchases by Date Range ---
export const getPurchasesByDateRangeFS = async (startDate: Date, endDate: Date): Promise<PurchaseData[]> => {
  try {
    const purchasesCollection = collection(db, 'purchases');
    const endOfDayEndDate = new Date(endDate);
    endOfDayEndDate.setHours(23, 59, 59, 999);

    const q = query(
      purchasesCollection,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endOfDayEndDate)),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      const uploadedFiles: UploadedFileMeta[] = (data.uploadedFiles || []).map((file: any) => ({
        name: file.name || 'Unknown File',
        url: file.downloadURL || file.url || '', 
        type: file.type || 'application/octet-stream', 
        size: file.size || 0, 
      }));

      return {
        id: docSnapshot.id,
        userId: data.userId,
        partnerName: data.partnerName,
        userName: data.userName,
        items: data.items,
        uploadedFiles: uploadedFiles,
        createdAt: data.createdAt,
        totalAmount: data.totalAmount,
      } as PurchaseData;
    });
  } catch (error) {
    console.error("Error fetching purchases by date range from Firestore:", error);
    return [];
  }
};

// --- Get Last N Purchases ---
export const getLastNPurchasesFS = async (limitCount: number): Promise<PurchaseData[]> => {
  try {
    const purchasesCollection = collection(db, 'purchases');
    const q = query(
      purchasesCollection,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      const uploadedFiles: UploadedFileMeta[] = (data.uploadedFiles || []).map((file: any) => ({
        name: file.name || 'Unknown File',
        url: file.downloadURL || file.url || '',
        type: file.type || 'application/octet-stream',
        size: file.size || 0,
      }));

      return {
        id: docSnapshot.id,
        userId: data.userId,
        partnerName: data.partnerName,
        userName: data.userName,
        items: data.items,
        uploadedFiles: uploadedFiles, 
        createdAt: data.createdAt,
        totalAmount: data.totalAmount,
      } as PurchaseData;
    });
  } catch (error) {
    console.error(`Error fetching last ${limitCount} purchases from Firestore:`, error);
    return [];
  }
};

// --- Inventory Management (Read) ---
export const getInventoryFS = async () => {
  try {
    const inventoryCollection = collection(db, 'inventory');
    const snapshot = await getDocs(inventoryCollection);
    
    const inventoryData = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        clinicName: doc.id,
        "item name": data["item name"] || 'N/A',
        "quantity": data["quantity"] || 0,
        "approx price per unit": data["approx price per unit"] || 0,
      };
    });

    return inventoryData;
  } catch (error) {
    console.error("Error fetching inventory data from Firestore:", error);
    return [];
  }
};

export const getClinicsFS = async (): Promise<{id: string, name: string}[]> => {
  try {
    const inventoryCollection = collection(db, 'inventory');
    const snapshot = await getDocs(inventoryCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, name: doc.id }));
  } catch (error) {
    console.error("Error fetching clinic names from Firestore:", error);
    return [];
  }
};

// --- Inventory Management (CUD) ---
export const addInventoryItemFS = async (itemData: { clinicName: string; "item name": string; quantity: number; "approx price per unit": number; }): Promise<{success: boolean, message?: string}> => {
  try {
    // In our structure, the document ID is the clinic name.
    const docRef = doc(db, 'inventory', itemData.clinicName);
    const docSnap = await getDoc(docRef);

    // If the doc exists, it means we are adding a new item to an existing clinic concept, which is not how the DB is structured.
    // The logic is to set/overwrite the item for a given clinic.
    // If we want to add a *new* clinic with an item, we use setDoc.
    await setDoc(docRef, {
        "item name": itemData["item name"],
        quantity: itemData.quantity,
        "approx price per unit": itemData["approx price per unit"],
        createdAt: docSnap.exists() ? docSnap.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp()
    }, { merge: true }); // Use merge to avoid overwriting the entire doc if we add more fields later

    return { success: true };
  } catch (error) {
    console.error("Error adding inventory item to Firestore:", error);
    return { success: false, message: 'An error occurred while adding the item.' };
  }
};

export const updateInventoryItemFS = async (id: string, itemData: { "item name": string; quantity: number; "approx price per unit": number; }): Promise<{success: boolean, message?: string}> => {
  try {
    const docRef = doc(db, 'inventory', id);
    await updateDoc(docRef, { ...itemData, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error("Error updating inventory item in Firestore:", error);
    return { success: false, message: 'An error occurred while updating the item.' };
  }
};

export const removeInventoryItemFS = async (id: string): Promise<{success: boolean, message?: string}> => {
  try {
    const docRef = doc(db, 'inventory', id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error("Error removing inventory item from Firestore:", error);
    return { success: false, message: 'An error occurred while deleting the item.' };
  }
};

// --- Clinic Bulk Upload ---
export const bulkAddClinicsFS = async (clinicNames: string[]): Promise<{success: boolean, count: number, errors: string[]}> => {
  let addedCount = 0;
  const errorNames: string[] = [];
  
  // Fetch all existing clinic names to avoid duplicates
  const existingClinics = await getClinicsFS();
  const existingClinicNames = new Set(existingClinics.map(c => c.name.toLowerCase()));

  const batch = writeBatch(db);
  const uniqueNewNames = new Set<string>();

  for (const name of clinicNames) {
    const trimmedName = name.trim();
    if (trimmedName && !existingClinicNames.has(trimmedName.toLowerCase()) && !uniqueNewNames.has(trimmedName.toLowerCase())) {
      uniqueNewNames.add(trimmedName.toLowerCase());
      const newDocRef = doc(db, 'inventory', trimmedName); // Doc ID is the clinic name
      // Add a placeholder item, as the document can't be empty
      batch.set(newDocRef, {
          "item name": "Placeholder",
          quantity: 0,
          "approx price per unit": 0,
          createdAt: serverTimestamp()
      });
      addedCount++;
    } else if (trimmedName) {
      errorNames.push(trimmedName);
    }
  }

  try {
    await batch.commit();
    return { success: true, count: addedCount, errors: errorNames };
  } catch (error) {
     console.error("Error bulk adding clinics to Firestore:", error);
     return { success: false, count: 0, errors: clinicNames.filter(name => name.trim()) };
  }
};

// --- Data Cleanup ---
export const deleteNumericClinicsFS = async (): Promise<{success: boolean, count: number, message?: string}> => {
    try {
        const inventoryCollection = collection(db, 'inventory');
        const snapshot = await getDocs(inventoryCollection);
        
        const batch = writeBatch(db);
        let deleteCount = 0;

        const numericRegex = /^\d.*\d$|^\d+$/;

        snapshot.docs.forEach(doc => {
            const clinicName = doc.id;
            // Check if name starts and ends with a digit, or is purely numeric
            if (numericRegex.test(clinicName)) {
                batch.delete(doc.ref);
                deleteCount++;
            }
        });

        if (deleteCount > 0) {
            await batch.commit();
        }

        return { success: true, count: deleteCount };
    } catch (error) {
        console.error("Error deleting numeric clinics from Firestore:", error);
        return { success: false, count: 0, message: 'An error occurred during cleanup.' };
    }
};
