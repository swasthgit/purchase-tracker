// src/lib/data.ts
import type { SelectOption, AdminManagedItem, Partner, ItemDefinition, PurchaseData, UploadedFileMeta, InventoryItem, DCMapping } from '@/types';
import { db } from './firebase';
import type { QuerySnapshot, Query } from 'firebase/firestore';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, writeBatch, updateDoc, serverTimestamp, orderBy, Timestamp, limit, startAfter, setDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';


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
    const cleanedEmployeeId = employeeIdValue.trim();
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
    const trimmedId = id.trim().replace(/[^ -~]/g, '');
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
        feedback: data.feedback,
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
        feedback: data.feedback,
      } as PurchaseData;
    });
  } catch (error) {
    console.error(`Error fetching last ${limitCount} purchases from Firestore:`, error);
    return [];
  }
};

// --- Inventory Management (Read) ---
export const getInventoryFS = async (): Promise<InventoryItem[]> => {
  try {
    const inventoryCollection = collection(db, 'inventory');
    const snapshot = await getDocs(inventoryCollection);

    const inventoryData: InventoryItem[] = snapshot.docs.flatMap(doc => {
      const clinicData = doc.data();
      const clinicName = doc.id;
      
      if (Array.isArray(clinicData.items)) {
        return clinicData.items.map((item: any) => ({
          id: item.id,
          clinicName: clinicName,
          "item name": item["item name"] || 'N/A',
          quantity: item.quantity || 0,
          "approx price per unit": item["approx price per unit"] || 0,
        }));
      }
      return []; // Return empty array if no items field or items is not an array
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
    // The document ID is the clinic name. We return it for both id and name.
    return snapshot.docs.map(doc => ({ id: doc.id, name: doc.id }));
  } catch (error) {
    console.error("Error fetching clinic names from Firestore:", error);
    return [];
  }
};

// --- Inventory Management (CUD) ---
export const addInventoryItemFS = async (itemData: Omit<InventoryItem, 'id'>): Promise<{success: boolean, message?: string}> => {
  try {
    const clinicDocRef = doc(db, 'inventory', itemData.clinicName);
    const newItem = {
        ...itemData,
        id: uuidv4(), // Generate a unique ID for the new item
    };
    // Atomically add a new item to the "items" array field.
    await updateDoc(clinicDocRef, {
        items: arrayUnion(newItem)
    });
    return { success: true };
  } catch (error: any) {
    // If the document does not exist, Firestore throws an error. We can catch it and create the document.
    if (error.code === 'not-found' || error.message.includes('No document to update')) {
        try {
            const clinicDocRef = doc(db, 'inventory', itemData.clinicName);
            const newItem = {
                ...itemData,
                id: uuidv4(),
            };
            await setDoc(clinicDocRef, { items: [newItem], createdAt: serverTimestamp() });
            return { success: true };
        } catch (createError) {
             console.error("Error creating new clinic document in inventory:", createError);
             return { success: false, message: 'An error occurred while creating the clinic.' };
        }
    }
    console.error("Error adding inventory item to Firestore:", error);
    return { success: false, message: 'An error occurred while adding the item.' };
  }
};

export const updateInventoryItemFS = async (itemData: InventoryItem): Promise<{success: boolean, message?: string}> => {
  try {
    const clinicDocRef = doc(db, 'inventory', itemData.clinicName);
    const clinicDoc = await getDoc(clinicDocRef);

    if (!clinicDoc.exists()) {
      return { success: false, message: 'Clinic not found.' };
    }

    const clinicData = clinicDoc.data();
    const items: InventoryItem[] = clinicData.items || [];
    
    // Find the item to update and remove it first. This is how you update an element in an array in Firestore.
    const itemToUpdate = items.find(item => item.id === itemData.id);
    if (!itemToUpdate) {
        return { success: false, message: "Item to update not found in clinic's inventory."};
    }

    // Create the updated item
    const updatedItem = {
      ...itemToUpdate,
      "item name": itemData["item name"],
      quantity: itemData.quantity,
      "approx price per unit": itemData["approx price per unit"],
    };
    
    const batch = writeBatch(db);
    // Atomically remove the old item and add the updated one.
    batch.update(clinicDocRef, { items: arrayRemove(itemToUpdate) });
    batch.update(clinicDocRef, { items: arrayUnion(updatedItem) });
    
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error("Error updating inventory item in Firestore:", error);
    return { success: false, message: 'An error occurred while updating the item.' };
  }
};

export const removeInventoryItemFS = async (clinicName: string, itemId: string): Promise<{success: boolean, message?: string}> => {
  try {
    const clinicDocRef = doc(db, 'inventory', clinicName);
    const clinicDoc = await getDoc(clinicDocRef);

    if (!clinicDoc.exists()) {
      return { success: false, message: 'Clinic not found.' };
    }

    const items: InventoryItem[] = clinicDoc.data().items || [];
    const itemToRemove = items.find(item => item.id === itemId);

    if (!itemToRemove) {
      return { success: false, message: "Item not found in clinic's inventory." };
    }

    await updateDoc(clinicDocRef, {
      items: arrayRemove(itemToRemove)
    });
    
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
  
  const existingClinics = await getClinicsFS();
  const existingClinicNames = new Set(existingClinics.map(c => c.name.toLowerCase()));

  const batch = writeBatch(db);
  const uniqueNewNames = new Set<string>();

  for (const name of clinicNames) {
    const trimmedName = name.trim();
    if (trimmedName && !existingClinicNames.has(trimmedName.toLowerCase()) && !uniqueNewNames.has(trimmedName.toLowerCase())) {
      uniqueNewNames.add(trimmedName.toLowerCase());
      const newDocRef = doc(db, 'inventory', trimmedName);
      // Initialize with an empty items array and a creation timestamp
      batch.set(newDocRef, {
          items: [],
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

// --- DC Mapping Data Management ---
export const getDCMappingsFS = async (): Promise<DCMapping[]> => {
  try {
    const mappingsCollection = collection(db, 'dc_mappings');
    const snapshot = await getDocs(query(mappingsCollection, orderBy("dcName")));
    
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DCMapping));

    // Sort in-memory to achieve the desired order without a composite index
    return data.sort((a, b) => {
      if (a.dcName && b.dcName) {
          const dcNameCompare = a.dcName.localeCompare(b.dcName);
          if (dcNameCompare !== 0) return dcNameCompare;
      }
      if (a.stateName && b.stateName) {
          return a.stateName.localeCompare(b.stateName);
      }
      return 0;
    });

  } catch (error) {
    console.error("Error fetching DC mappings from Firestore:", error);
    return [];
  }
};

export const bulkAddDCMappingsFS = async (mappings: Omit<DCMapping, 'id'>[]): Promise<{success: boolean, count: number, errors: number}> => {
  const BATCH_SIZE = 450; // Firestore batch limit is 500, use a safe size
  let processedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = mappings.slice(i, i + BATCH_SIZE);

    for (const mapping of chunk) {
        try {
            // Use addDoc to auto-generate a unique document ID
            const newDocRef = doc(collection(db, 'dc_mappings'));
            batch.set(newDocRef, { ...mapping, id: newDocRef.id, updatedAt: serverTimestamp() });
            processedCount++;
        } catch (e) {
            console.error("Error processing a mapping row:", mapping, e);
            errorCount++;
        }
    }
    
    try {
        await batch.commit();
    } catch (error) {
        console.error("Error committing a batch of DC mappings to Firestore:", error);
        errorCount += chunk.length;
        processedCount -= chunk.length; 
    }
  }

  return { success: errorCount === 0, count: processedCount, errors: errorCount };
};

// --- Inventory Bulk Upload ---
export const bulkAddInventoryFS = async (items: Omit<InventoryItem, 'id'>[]): Promise<{ success: boolean; added: number; updated: number; errors: number; }> => {
    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    const itemsByClinic: Record<string, Omit<InventoryItem, 'id' | 'clinicName'>[]> = {};

    // Group items by clinic
    for (const item of items) {
        if (!itemsByClinic[item.clinicName]) {
            itemsByClinic[item.clinicName] = [];
        }
        itemsByClinic[item.clinicName].push({
            "item name": item["item name"],
            quantity: item.quantity,
            "approx price per unit": item["approx price per unit"],
        });
    }

    for (const clinicName in itemsByClinic) {
        try {
            const clinicDocRef = doc(db, 'inventory', clinicName);
            const clinicDoc = await getDoc(clinicDocRef);
            const itemsToAdd = itemsByClinic[clinicName];

            if (clinicDoc.exists()) {
                // Clinic exists, update its items
                const existingItems: InventoryItem[] = clinicDoc.data().items || [];
                const itemsToUpdate: any[] = [];
                
                for (const newItem of itemsToAdd) {
                    const existingItemIndex = existingItems.findIndex(ei => ei["item name"].toLowerCase() === newItem["item name"].toLowerCase());
                    
                    if (existingItemIndex > -1) {
                        // Item exists, update it
                        const existingItem = existingItems[existingItemIndex];
                        const updatedItem = {
                            ...existingItem,
                            quantity: newItem.quantity,
                            "approx price per unit": newItem["approx price per unit"],
                        };
                        // To update an array element, we remove the old and add the new
                        await updateDoc(clinicDocRef, { items: arrayRemove(existingItem) });
                        await updateDoc(clinicDocRef, { items: arrayUnion(updatedItem) });
                        updatedCount++;
                    } else {
                        // Item is new for this clinic
                        itemsToUpdate.push({ id: uuidv4(), ...newItem });
                        addedCount++;
                    }
                }
                if (itemsToUpdate.length > 0) {
                     await updateDoc(clinicDocRef, { items: arrayUnion(...itemsToUpdate) });
                }
            } else {
                // Clinic doesn't exist, create it with all its items
                const newItemsWithIds = itemsToAdd.map(item => ({ id: uuidv4(), ...item }));
                await setDoc(clinicDocRef, {
                    items: newItemsWithIds,
                    createdAt: serverTimestamp(),
                });
                addedCount += newItemsWithIds.length;
            }
        } catch (error) {
            console.error(`Error processing inventory for clinic ${clinicName}:`, error);
            errorCount += itemsByClinic[clinicName].length;
        }
    }

    return { success: errorCount === 0, added: addedCount, updated: updatedCount, errors: errorCount };
};

    