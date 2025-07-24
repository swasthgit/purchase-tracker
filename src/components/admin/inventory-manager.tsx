// src/components/admin/inventory-manager.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { getInventoryFS, getClinicsFS } from '@/lib/data';
import { addInventoryItemAction, updateInventoryItemAction } from '@/lib/actions';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Search } from 'lucide-react';

interface InventoryItem {
  id: string;
  clinicName: string;
  "item name": string;
  quantity: number;
  "approx price per unit": number;
}

interface Clinic {
    id: string;
    name: string;
}

const initialFormState: Omit<InventoryItem, 'id'> = {
  clinicName: '',
  "item name": '',
  quantity: 0,
  "approx price per unit": 0,
};

const InventoryManager: React.FC = () => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>(initialFormState);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInventoryAndClinics = async () => {
    setIsLoading(true);
    try {
      const [data, clinicList] = await Promise.all([getInventoryFS(), getClinicsFS()]);
      setInventoryData(data);
      setClinics(clinicList);
      if (clinicList.length > 0) {
          // Do not automatically select a clinic
      }
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
        toast({ variant: "destructive", title: "Error", description: "Please select a clinic first." });
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
      "item name": item["item name"],
      quantity: item.quantity,
      "approx price per unit": item["approx price per unit"],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const action = editingItem 
        ? updateInventoryItemAction(editingItem.id, formData)
        : addInventoryItemAction(formData);

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

  const filteredClinics = clinics.filter(clinic => clinic.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredItems = selectedClinic ? inventoryData.filter(item => item.clinicName === selectedClinic) : [];

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Inventory Management</CardTitle>
          <CardDescription>View, add, or edit items for a specific clinic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="w-full sm:w-auto flex-grow">
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
                                     value={searchTerm}
                                     onChange={(e) => setSearchTerm(e.target.value)}
                                />
                             </div>
                        </div>
                        {filteredClinics.map(clinic => (
                            <SelectItem key={clinic.id} value={clinic.id}>{clinic.name}</SelectItem>
                        ))}
                        {filteredClinics.length === 0 && <div className="text-center text-sm text-muted-foreground p-2">No clinics found.</div>}
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={handleAddNew} size="sm" disabled={!selectedClinic || isLoading} className="w-full sm:w-auto self-end">
              <PlusCircle className="h-4 w-4 mr-2" /> Add New Item to Clinic
            </Button>
          </div>

          <ScrollArea className="h-[60vh] border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
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
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item["item name"]}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item["approx price per unit"]}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      {selectedClinic ? "No inventory items found for this clinic." : "Please select a clinic to view items."}
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
            <DialogTitle>{editingItem ? 'Edit' : 'Add New'} Item in {formData.clinicName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div>
              <Label htmlFor="clinicName">Clinic Name</Label>
              <Input id="clinicName" name="clinicName" value={formData.clinicName} readOnly disabled />
            </div>
            <div>
              <Label htmlFor="item name">Item Name</Label>
              <Input id="item name" name="item name" value={formData["item name"]} onChange={handleInputChange} placeholder="e.g., Syringe" required />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" name="quantity" type="number" value={formData.quantity} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="approx price per unit">Approx Price Per Unit</Label>
              <Input id="approx price per unit" name="approx price per unit" type="number" step="0.01" value={formData["approx price per unit"]} onChange={handleInputChange} required />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InventoryManager;
