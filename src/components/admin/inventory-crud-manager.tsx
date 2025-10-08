// src/components/admin/inventory-crud-manager.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { getInventoryFS, getClinicsFS } from '@/lib/data';
import { addInventoryItemAction, updateInventoryItemAction, removeInventoryItemAction, deleteAllInventoryAction } from '@/lib/actions';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { InventoryItem } from '@/types';

const initialFormState: Partial<Omit<InventoryItem, 'id'>> = {
  clinicName: '',
  clinicType: '',
  "item name": '',
  quantity: 0,
  "approx price per unit": 0,
};

const InventoryCrudManager: React.FC = () => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [clinics, setClinics] = useState<{ id: string, name: string }[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [clinicSearchTerm, setClinicSearchTerm] = useState('');
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<Omit<InventoryItem, 'id'>>>(initialFormState);
  const [itemToRemove, setItemToRemove] = useState<InventoryItem | null>(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);

  const fetchInventoryAndClinics = async () => {
    setIsLoading(true);
    try {
      const [data, clinicList] = await Promise.all([getInventoryFS(), getClinicsFS()]);
      setInventoryData(data);
      setClinics(clinicList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Failed to fetch inventory data:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch inventory data." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryAndClinics();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleAddNew = () => {
    if (!selectedClinic) {
        toast({ variant: "destructive", title: "No Clinic Selected", description: "Please select a clinic before adding a new item." });
        return;
    }
    setEditingItem(null);
    setFormData({ ...initialFormState, clinicName: selectedClinic });
    setIsDialogOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      clinicName: item.clinicName,
      clinicType: item.clinicType || '',
      "item name": item["item name"],
      quantity: item.quantity,
      "approx price per unit": item["approx price per unit"],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = { ...formData, id: editingItem?.id };

      // Type assertion to satisfy the action's expected parameters
      const actionPayload = {
          ...payload,
          clinicName: payload.clinicName!,
          "item name": payload["item name"]!,
          quantity: payload.quantity!,
          "approx price per unit": payload["approx price per unit"]!,
      };

      const action = editingItem 
        ? updateInventoryItemAction(actionPayload as InventoryItem) 
        : addInventoryItemAction(actionPayload);
      
      const result = await action;
      if (result.success) {
        toast({ title: "Success", description: `Inventory item ${editingItem ? 'updated' : 'added'}.` });
        setIsDialogOpen(false);
        fetchInventoryAndClinics();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message || "An unknown error occurred." });
      }
    });
  };

  const handleDelete = async () => {
    if (!itemToRemove) return;
    startTransition(async () => {
      const result = await removeInventoryItemAction(itemToRemove.clinicName, itemToRemove.id);
      if (result.success) {
        toast({ title: "Success", description: `Item "${itemToRemove['item name']}" deleted.` });
        fetchInventoryAndClinics();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message || "Failed to delete item." });
      }
      setItemToRemove(null);
    });
  };

  const handleDeleteAll = async () => {
    startTransition(async () => {
        const result = await deleteAllInventoryAction();
        if (result.success) {
            toast({ title: "Success", description: "All inventory data has been deleted." });
            fetchInventoryAndClinics(); // Re-fetch to show the empty state
            setSelectedClinic(''); // Reset clinic selection
        } else {
            toast({ variant: "destructive", title: "Error", description: result.message || "Failed to delete inventory." });
        }
        setIsDeleteAllDialogOpen(false);
    });
  };
  
  const filteredClinics = clinics.filter(clinic => 
    clinic.name.toLowerCase().includes(clinicSearchTerm.toLowerCase())
  );

  const filteredItems = selectedClinic 
    ? inventoryData.filter(item => 
        item.clinicName === selectedClinic &&
        item["item name"].toLowerCase().includes(itemSearchTerm.toLowerCase())
      ) 
    : [];

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-2xl font-bold">Inventory Management</CardTitle>
              <CardDescription>Select a clinic to add, edit, or delete its inventory items.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleAddNew} size="sm" disabled={!selectedClinic}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Add New Item
                </Button>
                <Button onClick={() => setIsDeleteAllDialogOpen(true)} size="sm" variant="destructive" disabled={inventoryData.length === 0}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete All
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-1/2">
                 <Label htmlFor="clinic-select">Select Clinic</Label>
                <Select onValueChange={setSelectedClinic} value={selectedClinic} disabled={isLoading}>
                    <SelectTrigger id="clinic-select" className="w-full">
                        <SelectValue placeholder="Select a clinic..." />
                    </SelectTrigger>
                    <SelectContent>
                         <div className="p-2">
                             <div className="relative">
                                 <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                 <Input 
                                     placeholder="Search clinics..." 
                                     className="pl-8 w-full"
                                     value={clinicSearchTerm}
                                     onChange={(e) => setClinicSearchTerm(e.target.value)}
                                />
                             </div>
                        </div>
                        {filteredClinics.map(clinic => (
                            <SelectItem key={clinic.id} value={clinic.name}>{clinic.name}</SelectItem>
                        ))}
                        {filteredClinics.length === 0 && <div className="text-center text-sm text-muted-foreground p-2">No clinics found.</div>}
                    </SelectContent>
                </Select>
              </div>
            <div className="w-full sm:w-1/2">
                <Label htmlFor="item-search">Search Items</Label>
                <Input
                    id="item-search"
                    placeholder="Search by item name..."
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                    disabled={!selectedClinic}
                />
            </div>
          </div>
          <ScrollArea className="h-[60vh] border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Clinic Name</TableHead>
                  <TableHead>Clinic Type</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Approx Price</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.clinicName}</TableCell>
                      <TableCell>{item.clinicType || 'N/A'}</TableCell>
                      <TableCell>{item["item name"]}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item["approx price per unit"].toFixed(2)}</TableCell>
                      <TableCell className="text-center space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => setItemToRemove(item)} className="h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      {selectedClinic ? "No inventory items found for this clinic." : "Please select a clinic to view its inventory."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add New'} Inventory Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div>
              <Label htmlFor="clinicName">Clinic Name</Label>
              <Input
                id="clinicName"
                name="clinicName"
                value={formData.clinicName || ''}
                onChange={handleInputChange}
                placeholder="e.g., clinic 8"
                required
                disabled // Clinic name is determined by selection
              />
            </div>
            <div>
              <Label htmlFor="clinicType">Clinic Type</Label>
              <Input
                id="clinicType"
                name="clinicType"
                value={formData.clinicType || ''}
                onChange={handleInputChange}
                placeholder="e.g., Type A"
              />
            </div>
            <div>
              <Label htmlFor="item name">Item Name</Label>
              <Input
                id="item name"
                name="item name"
                value={formData["item name"] || ''}
                onChange={handleInputChange}
                placeholder="e.g., Syringe"
                required
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="approx price per unit">Approx Price Per Unit</Label>
              <Input
                id="approx price per unit"
                name="approx price per unit"
                type="number"
                step="0.01"
                value={formData["approx price per unit"]}
                onChange={handleInputChange}
                required
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToRemove} onOpenChange={(open) => !open && setItemToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item "{itemToRemove?.["item name"]}" from the "{itemToRemove?.clinicName}" inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all inventory data across all clinics.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsDeleteAllDialogOpen(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                    {isPending ? "Deleting..." : "Yes, delete all"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InventoryCrudManager;
