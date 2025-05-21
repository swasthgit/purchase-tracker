// src/components/admin/employee-id-manager.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, PlusCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import type { SelectOption } from '@/types';
import { getEmployeeIds, addEmployeeIdAction, removeEmployeeIdAction } from '@/lib/actions-mimic'; // Using mimic for direct data interaction
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


// Mimicking actions for direct data interaction (replace with server actions if preferred)
const addEmployeeIdDirect = async (id: string) => {
  const { addEmployeeId } = await import('@/lib/data');
  return addEmployeeId(id);
}
const removeEmployeeIdDirect = async (id: string) => {
  const { removeEmployeeId } = await import('@/lib/data');
  return removeEmployeeId(id);
}
const getEmployeeIdsDirect = async () => {
  const { getEmployeeIds } = await import('@/lib/data');
  return getEmployeeIds();
}


export function EmployeeIdManager() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [employeeIds, setEmployeeIds] = useState<SelectOption[]>([]);
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);

  const fetchEmployeeIds = async () => {
    setEmployeeIds(await getEmployeeIdsDirect());
  };

  useEffect(() => {
    fetchEmployeeIds();
  }, []);

  const handleAddEmployeeId = async () => {
    if (!newEmployeeId.trim()) {
      toast({ variant: "destructive", title: t('errorOccurred'), description: "Employee ID cannot be empty." });
      return;
    }
    startTransition(async () => {
      const result = await addEmployeeIdDirect(newEmployeeId.trim());
      if (result.success) {
        toast({ title: t('operationSuccess'), description: `${t('employeeId')} "${newEmployeeId}" ${t('addNew')}d.` });
        setNewEmployeeId('');
        fetchEmployeeIds();
      } else {
        toast({ variant: "destructive", title: t('errorOccurred'), description: t(result.message || 'errorOccurred') });
      }
    });
  };

  const handleRemoveEmployeeId = async (id: string) => {
    startTransition(async () => {
      const result = await removeEmployeeIdDirect(id);
      if (result.success) {
        toast({ title: t('operationSuccess'), description: `${t('employeeId')} "${id}" removed.` });
        fetchEmployeeIds();
      } else {
        toast({ variant: "destructive", title: t('errorOccurred'), description: t('errorOccurred') });
      }
      setItemToRemove(null);
    });
  };
  

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>{t('manageEmployeeIds')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Input
            type="text"
            value={newEmployeeId}
            onChange={(e) => setNewEmployeeId(e.target.value)}
            placeholder={t('employeeId')}
            className="flex-grow"
          />
          <Button onClick={handleAddEmployeeId} disabled={isPending}>
            <PlusCircle className="h-4 w-4 mr-2" /> {t('addEmployeeId')}
          </Button>
        </div>
        <ScrollArea className="h-[300px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('employeeId')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeIds.length > 0 ? employeeIds.map((emp) => (
                <TableRow key={emp.value}>
                  <TableCell>{emp.label}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive" size="sm" onClick={() => setItemToRemove(emp.value)} disabled={isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">{t('noEmployeeIds')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
      <AlertDialog open={!!itemToRemove} onOpenChange={(open) => !open && setItemToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmRemove')}</AlertDialogTitle>
            <AlertDialogDescription>
              {`This action cannot be undone. This will permanently delete the employee ID: ${itemToRemove}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToRemove(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToRemove && handleRemoveEmployeeId(itemToRemove)} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending ? `${t('confirm')}...` : t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Create a dummy actions-mimic.ts if server actions are not used for direct data manipulation for admin panels
// For now, this component will use direct imports from lib/data.ts as defined above.
// If you create src/lib/actions-mimic.ts, it would look like:
/*
// src/lib/actions-mimic.ts
"use server"; // or not, if it's just calling local functions
import {
  getEmployeeIds as dbGetEmployeeIds,
  addEmployeeId as dbAddEmployeeId,
  removeEmployeeId as dbRemoveEmployeeId,
  // ... other data functions
} from '@/lib/data';

export const getEmployeeIds = dbGetEmployeeIds;
export const addEmployeeIdAction = dbAddEmployeeId; // Renamed to match action style
export const removeEmployeeIdAction = dbRemoveEmployeeId;
// ...
*/
// This component is adjusted to use direct calls to mock data functions for simplicity within client component context.
// If strict server actions are needed for these, they should be in `src/lib/actions.ts` and called accordingly.
