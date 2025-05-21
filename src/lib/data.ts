// src/lib/data.ts
import type { SelectOption, AdminManagedItem, Partner } from '@/types';

// Mock data - in a real app, this would come from a database
let employeeIds: SelectOption[] = [
  { value: 'E001', label: 'E001 - John Doe' },
  { value: 'E002', label: 'E002 - Jane Smith' },
  { value: 'E003', label: 'E003 - Robert Brown' },
];

let partnerNames: Partner[] = [
  { id: 'P001', name: 'Global Health Supplies' },
  { id: 'P002', name: 'MediQuick Partners' },
  { id: 'P003', name: 'PharmaSource Inc.' },
];

let itemNames: SelectOption[] = [
  { value: 'Syringe 10ml', label: 'Syringe 10ml' },
  { value: 'Gauze Pads (Box of 100)', label: 'Gauze Pads (Box of 100)' },
  { value: 'Antiseptic Wipes (Box of 50)', label: 'Antiseptic Wipes (Box of 50)' },
  { value: 'Medical Tape Roll', label: 'Medical Tape Roll' },
  { value: 'Examination Gloves (M)', label: 'Examination Gloves (M)' },
];

let printerNames: AdminManagedItem[] = [
  { id: 'PRN001', name: 'HP LaserJet Pro M404dn' },
  { id: 'PRN002', name: 'Brother HL-L2350DW' },
  { id: 'PRN003', name: 'Epson EcoTank ET-2720' },
];

// Functions to interact with mock data
export const getEmployeeIds = async (): Promise<SelectOption[]> => {
  return [...employeeIds];
};

export const addEmployeeId = async (id: string, label?: string): Promise<{success: boolean, message?: string}> => {
  if (employeeIds.find(e => e.value === id)) {
    return { success: false, message: 'idExists' };
  }
  employeeIds.push({ value: id, label: label || id });
  return { success: true };
};

export const removeEmployeeId = async (id: string): Promise<{success: boolean}> => {
  employeeIds = employeeIds.filter(e => e.value !== id);
  return { success: true };
};

export const getPartnerNames = async (): Promise<Partner[]> => {
  return [...partnerNames];
};

export const getItemNames = async (): Promise<SelectOption[]> => {
  return [...itemNames];
};

export const getPrinterNames = async (): Promise<AdminManagedItem[]> => {
  return [...printerNames];
};

export const addPrinterName = async (name: string): Promise<{success: boolean, message?: string}> => {
   if (printerNames.find(p => p.name.toLowerCase() === name.toLowerCase())) {
    return { success: false, message: 'nameExists' };
  }
  const newId = `PRN${String(Date.now()).slice(-3)}${Math.floor(Math.random()*100)}`;
  printerNames.push({ id: newId, name });
  return { success: true };
};

export const removePrinterName = async (id: string): Promise<{success: boolean}> => {
  printerNames = printerNames.filter(p => p.id !== id);
  return { success: true };
};

export const bulkAddEmployeeIds = async (ids: string[]): Promise<{success: boolean, count: number, errors: string[]}> => {
  let addedCount = 0;
  const errors: string[] = [];
  ids.forEach(id => {
    if (!employeeIds.find(e => e.value === id)) {
      employeeIds.push({ value: id, label: id });
      addedCount++;
    } else {
      errors.push(id);
    }
  });
  return { success: true, count: addedCount, errors };
};
