// src/lib/data.ts
import type { SelectOption, AdminManagedItem, Partner, ItemDefinition } from '@/types';
import { db } from './firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';

// Static data - these could also be moved to Firebase if dynamic management is needed
const partnerNames: Partner[] = [
  { id: 'P001', name: 'Global Health Supplies' },
  { id: 'P002', name: 'MediQuick Partners' },
  { id: 'P003', name: 'PharmaSource Inc.' },
  { id: 'P004', name: "Cashpor" },
  { id: 'P005', name: "Muthoot" },
  { id: 'P006', name: "Svatantra" },
  { id: 'P007', name: "Namra Finance" },
  { id: 'P008', name: "Utkarsh SFB" },
  { id: 'P009', name: "TATA Capital" },
  { id: 'P010', name: "North East Small Finance Bank" },
  { id: 'P011', name: "Pahal Finance" },
  { id: 'P012', name: "Adi Chitragupta Finance Limited" },
  { id: 'P013', name: "Bangia Gramin Vikas Bank" },
  { id: 'P014', name: "Uttrayan" },
  { id: 'P015', name: "Satya Microcapital" },
  { id: 'P016', name: "Humana Financial Services" },
  { id: 'P017', name: "VFS" },
  { id: 'P018', name: "Swarnodhayam Credits Pvt Ltd" },
  { id: 'P019', name: "NABFINS Limited" },
  { id: 'P020', name: "Paschim Banga Gramin Bank" },
  { id: 'P021', name: "Share India Fincap" },
  { id: 'P022', name: "SEBA RAHARA" },
  { id: 'P023', name: "Uttar Banga Kshetriya Garmin Bank" },
  { id: 'P024', name: "Annapurna" },
  { id: 'P025', name: "Bank of India" },
  { id: 'P026', name: "Uttar Bihar Gramin Bank" },
  { id: 'P027', name: "Servitium Micro Finance Pvt Ltd" },
  { id: 'P028', name: "Sonata Finance" },
  { id: 'P029', name: "ESAF HEALTH CARE SERVICES PVT LTD" },
  { id: 'P030', name: "CCFID" },
  { id: 'P031', name: "Mitrata" },
  { id: 'P032', name: "M-INSURE CHANNEL" },
  { id: 'P033', name: "Maharashtra Gramin Bank" },
  { id: 'P034', name: "ASA International" },
  { id: 'P035', name: "Arohan Financial Services Limited" },
  { id: 'P036', name: "APGVB" },
  { id: 'P037', name: "Sugamya" },
  { id: 'P038', name: "Midland Microfin" },
  { id: 'P039', name: "Chhattisgarh Rajya Gramin Bank" },
  { id: 'P040', name: "Sampurna Training and Entrepreneurship Programme" },
  { id: 'P041', name: "DCBS" },
  { id: 'P042', name: "Hirbandh Ramkrishna Sarada Sevashrama" },
  { id: 'P043', name: "Indiabulls Housing Finance" },
  { id: 'P044', name: "Sindhuja Microcredit" },
  { id: 'P045', name: "Muthoot Capital" },
  { id: 'P046', name: "Sarala Development & Microfinance Pvt Ltd" },
  { id: 'P047', name: "Madhyanchal Gramin Bank" },
  { id: 'P048', name: "Baghat Urban Co-op Bank Ltd" },
  { id: 'P049', name: "People's Forum" },
  { id: 'P050', name: "KBS Local Bank" },
  { id: 'P051', name: "Janakalyan" },
  { id: 'P052', name: "Your Global Money" },
  { id: 'P053', name: "Agora Microfinance" },
  { id: 'P054', name: "Ambitions Services" },
  { id: 'P055', name: "Kamal Fincap Private Limited" },
  { id: 'P056', name: "Maddox Consultancy Services Pvt Ltd" },
  { id: 'P057', name: "AISSHPRA" },
  { id: 'P058', name: "Rohtak Central Cooperative Bank" },
  { id: 'P059', name: "Projects" },
  { id: 'P060', name: "Swabhimaan Sales & Services Pvt Ltd" },
  { id: 'P061', name: "South India Finvest Pvt Ltd" },
  { id: 'P062', name: "Panchawati" },
  { id: 'P063', name: "Pune District Central Co-op bank" },
  { id: 'P064', name: "APGVB Pensioners Association" },
  { id: 'P065', name: "IFFCO Bazar" },
  { id: 'P066', name: "Aviral Finance" },
  { id: 'P067', name: "Shepays Financial Services Pvt Ltd" },
  { id: 'P068', name: "DULAL NGO" },
  { id: 'P069', name: "Adhikosh Financial Advisory Pvt Ltd" },
  { id: 'P070', name: "Aishwarya MACC Society Ltd" },
  { id: 'P071', name: "Sudhir HUF" },
  { id: 'P072', name: "CBC" },
  { id: 'P073', name: "North East Small Finance Bank - SHG" },
];

export const OTHER_ITEM_VALUE = "other_specify_item";

const itemNames: ItemDefinition[] = [
  { value: 'Cells', label: 'Cells', imageUrl: 'https://placehold.co/100x100.png?text=Cells', dataAiHint: "battery cells" },
  { value: 'Shelf', label: 'Shelf', imageUrl: 'https://placehold.co/100x100.png?text=Shelf', dataAiHint: "storage shelf" },
  { value: 'Chair', label: 'Chair', imageUrl: 'https://placehold.co/100x100.png?text=Chair', dataAiHint: "office chair" },
  { value: 'Tablet Charger', label: 'Tablet Charger', imageUrl: 'https://placehold.co/100x100.png?text=Tablet+Charger', dataAiHint: "tablet charger" },
  { value: 'BM Machine Charger Cable', label: 'BM Machine Charger Cable', imageUrl: 'https://placehold.co/100x100.png?text=BM+Charger', dataAiHint: "medical device charger" },
  { value: 'Tablet Charging Cable', label: 'Tablet Charging Cable', imageUrl: 'https://placehold.co/100x100.png?text=Tablet+Cable', dataAiHint: "usb cable" },
  { value: 'Stationary Item', label: 'Stationary Item', imageUrl: 'https://placehold.co/100x100.png?text=Stationary', dataAiHint: "pens pencils" },
  { value: 'First-Aid Kit Item', label: 'First-Aid Kit Item', imageUrl: 'https://placehold.co/100x100.png?text=First+Aid+Item', dataAiHint: "bandage antiseptic" },
  { value: 'BP Kit', label: 'BP Kit', imageUrl: 'https://placehold.co/100x100.png?text=BP+Kit', dataAiHint: "blood pressure monitor" },
  { value: 'Power Bank', label: 'Power Bank', imageUrl: 'https://placehold.co/100x100.png?text=Power+Bank', dataAiHint: "portable charger" },
  { value: 'Earphone', label: 'Earphone', imageUrl: 'https://placehold.co/100x100.png?text=Earphone', dataAiHint: "headphones earbuds" },
  { value: 'Stand', label: 'Stand', imageUrl: 'https://placehold.co/100x100.png?text=Stand', dataAiHint: "display stand" },
  { value: 'Certificate', label: 'Certificate', imageUrl: 'https://placehold.co/100x100.png?text=Certificate', dataAiHint: "document award" },
  { value: 'First-Aid KIT', label: 'First-Aid KIT', imageUrl: 'https://placehold.co/100x100.png?text=First+Aid+KIT', dataAiHint: "first aid box" },
  { value: 'Bags', label: 'Bags', imageUrl: 'https://placehold.co/100x100.png?text=Bags', dataAiHint: "medical bag" },
  { value: 'Tube Light', label: 'Tube Light', imageUrl: 'https://placehold.co/100x100.png?text=Tube+Light', dataAiHint: "fluorescent light" },
  { value: 'Extension', label: 'Extension', imageUrl: 'https://placehold.co/100x100.png?text=Extension', dataAiHint: "power strip" },
  { value: 'Sanitizer', label: 'Sanitizer', imageUrl: 'https://placehold.co/100x100.png?text=Sanitizer', dataAiHint: "hand sanitizer" },
  { value: 'Doctor Certificate', label: 'Doctor Certificate', imageUrl: 'https://placehold.co/100x100.png?text=Doc+Certificate', dataAiHint: "medical certificate" },
  { value: 'Fan', label: 'Fan', imageUrl: 'https://placehold.co/100x100.png?text=Fan', dataAiHint: "electric fan" },
  { value: 'Curtain', label: 'Curtain', imageUrl: 'https://placehold.co/100x100.png?text=Curtain', dataAiHint: "window curtain" },
  { value: 'Counter-Table', label: 'Counter-Table', imageUrl: 'https://placehold.co/100x100.png?text=Counter', dataAiHint: "reception desk" },
  { value: 'Labour Cost', label: 'Labour Cost', imageUrl: 'https://placehold.co/100x100.png?text=Labour', dataAiHint: "workers construction" },
  { value: 'Branding', label: 'Branding', imageUrl: 'https://placehold.co/100x100.png?text=Branding', dataAiHint: "logo sign" },
  { value: 'Cleanliness', label: 'Cleanliness', imageUrl: 'https://placehold.co/100x100.png?text=Clean', dataAiHint: "cleaning supplies" },
  { value: 'Infrassets', label: 'Infrassets', imageUrl: 'https://placehold.co/100x100.png?text=Infra', dataAiHint: "infrastructure building" },
  { value: 'Medical Instruments', label: 'Medical Instruments', imageUrl: 'https://placehold.co/100x100.png?text=Instruments', dataAiHint: "surgical tools" },
  { value: 'Live Consultation', label: 'Live Consultation', imageUrl: 'https://placehold.co/100x100.png?text=Consult', dataAiHint: "video call" },
  { value: 'Medicines', label: 'Medicines', imageUrl: 'https://placehold.co/100x100.png?text=Medicines', dataAiHint: "pills pharmacy" },
  { value: 'Establishment Compliance', label: 'Establishment Compliance', imageUrl: 'https://placehold.co/100x100.png?text=Compliance', dataAiHint: "legal document" },
  { value: 'Field Operations', label: 'Field Operations', imageUrl: 'https://placehold.co/100x100.png?text=Field+Ops', dataAiHint: "outdoor work" },
  { value: 'Nurses Check', label: 'Nurses Check', imageUrl: 'https://placehold.co/100x100.png?text=Nurse+Check', dataAiHint: "nurse patient" },
  { value: 'Repairing Charges', label: 'Repairing Charges', imageUrl: 'https://placehold.co/100x100.png?text=Repair', dataAiHint: "tools fixing" },
  { value: 'Transport Cost', label: 'Transport Cost', imageUrl: 'https://placehold.co/100x100.png?text=Transport', dataAiHint: "truck delivery" },
  { value: OTHER_ITEM_VALUE, label: 'Other (Specify)', imageUrl: 'https://placehold.co/100x100.png?text=Other', dataAiHint: "custom item" },
];

// Functions to interact with Firebase for Employee IDs
export const getEmployeeIdsFS = async (): Promise<SelectOption[]> => {
  try {
    const employeeIdsCollection = collection(db, 'employee_ids');
    const snapshot = await getDocs(employeeIdsCollection);
    return snapshot.docs.map(doc => ({ value: doc.data().employeeId, label: doc.data().employeeId as string }));
  } catch (error) {
    console.error("Error fetching employee IDs from Firestore:", error);
    return [];
  }
};

export const addEmployeeIdFS = async (employeeIdValue: string): Promise<{success: boolean, message?: string}> => {
  try {
    const employeeIdsCollection = collection(db, 'employee_ids');
    const q = query(employeeIdsCollection, where("employeeId", "==", employeeIdValue));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { success: false, message: 'idExists' };
    }
    await addDoc(employeeIdsCollection, { employeeId: employeeIdValue, createdAt: new Date() });
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
  const batch = writeBatch(db);

  for (const id of ids) {
    const q = query(employeeIdsCollection, where("employeeId", "==", id));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      const newDocRef = doc(employeeIdsCollection); // Auto-generate ID
      batch.set(newDocRef, { employeeId: id, createdAt: new Date() });
      addedCount++;
    } else {
      errorIds.push(id);
    }
  }
  try {
    await batch.commit();
    return { success: true, count: addedCount, errors: errorIds };
  } catch (error) {
     console.error("Error bulk adding employee IDs to Firestore:", error);
     return { success: false, count: 0, errors: ids }; // All failed in case of batch error
  }
};


// Functions to interact with Firebase for Printer Names
export const getPrinterNamesFS = async (): Promise<AdminManagedItem[]> => {
  try {
    const printerNamesCollection = collection(db, 'printer_names');
    const snapshot = await getDocs(printerNamesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
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
    const docRef = await addDoc(printerNamesCollection, { name, createdAt: new Date() });
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

// Static data getters (could be refactored to fetch from Firebase if needed in future)
export const getPartnerNames = async (): Promise<Partner[]> => {
  return [...partnerNames];
};

export const getItemNames = async (): Promise<ItemDefinition[]> => {
  return [...itemNames];
};
