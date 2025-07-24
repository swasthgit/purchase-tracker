// src/components/admin/inventory-crud-manager.tsx
"use client";

import React, {
  useState,
  useEffect,
  useTransition
} from 'react';
import {
  getInventoryFS
} from '@/lib/data';
import {
  addInventoryItemAction,
  updateInventoryItemAction,
  removeInventoryItemAction,
  deleteNumericClinicsAction
} from '@/lib/actions';
import {
  Input
} from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  ScrollArea
} from '@/components/ui/scroll-area';
import {
  Button
} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Label
} from '@/components/ui/label';
import {
  useToast
} from "@/hooks/use-toast";
import {
  PlusCircle,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import {
  Skeleton
} from '@/components/ui/skeleton';

interface InventoryItem {
  id: string;
  clinicName: string;
  "item name": string;
  quantity: number;
  "approx price per unit": number;
}

const initialFormState: Omit < InventoryItem, 'id' > = {
  clinicName: '',
  "item name": '',
  quantity: 0,
  "approx price per unit": 0,
};

const InventoryCrudManager: React.FC = () => {
  const {
    toast
  } = useToast();
  const [isPending, startTransition] = useTransition();
  const [inventoryData, setInventoryData] = useState < InventoryItem[] > ([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState < InventoryItem | null > (null);
  const [formData, setFormData] = useState < Omit < InventoryItem, 'id' >> (initialFormState);
  const [itemToRemove, setItemToRemove] = useState < InventoryItem | null > (null);
  const [isCleanupConfirmOpen, setIsCleanupConfirmOpen] = useState(false);


  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const data = await getInventoryFS();
      setInventoryData(data);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch inventory."
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleInputChange = (e: React.ChangeEvent < HTMLInputElement > ) => {
    const {
      name,
      value,
      type
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData(initialFormState);
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
      const action = editingItem ?
        updateInventoryItemAction(editingItem.id, formData) :
        addInventoryItemAction(formData);

      const result = await action;
      if (result.success) {
        toast({
          title: "Success",
          description: `Inventory item ${editingItem ? 'updated' : 'added'}.`
        });
        setIsDialogOpen(false);
        fetchInventory();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "An unknown error occurred."
        });
      }
    });
  };

  const handleDelete = async () => {
    if (!itemToRemove) return;
    startTransition(async () => {
      const result = await removeInventoryItemAction(itemToRemove.id);
      if (result.success) {
        toast({
          title: "Success",
          description: `Item "${itemToRemove['item name']}" deleted.`
        });
        fetchInventory();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to delete item."
        });
      }
      setItemToRemove(null);
    });
  };

  const handleCleanup = async () => {
    startTransition(async () => {
      const result = await deleteNumericClinicsAction();
      if (result.success) {
        toast({ title: "Success", description: `${result.count} clinics deleted.` });
        fetchInventory();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message || "Cleanup failed." });
      }
      setIsCleanupConfirmOpen(false);
    });
  };


  const filteredItems = inventoryData.filter(item =>
    item.clinicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item["item name"].toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-2xl font-bold">Inventory Management</CardTitle>
              <CardDescription>Add, edit, or delete inventory items.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setIsCleanupConfirmOpen(true)} size="sm" variant="destructive">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Delete Numeric Clinics
                </Button>
                <Button onClick={handleAddNew} size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add New Item
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Input
              placeholder="Search by clinic or item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <ScrollArea className="h-[60vh] border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Clinic Name</TableHead>
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
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.clinicName}</TableCell>
                      <TableCell>{item["item name"]}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item["approx price per unit"]}</TableCell>
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
                    <TableCell colSpan={5} className="text-center h-24">
                      No inventory items found.
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
                value={formData.clinicName}
                onChange={handleInputChange}
                placeholder="e.g., clinic 8"
                required
                disabled={!!editingItem}
              />
              {editingItem && <p className="text-xs text-muted-foreground mt-1">Clinic Name cannot be changed.</p>}
            </div>
            <div>
              <Label htmlFor="item name">Item Name</Label>
              <Input
                id="item name"
                name="item name"
                value={formData["item name"]}
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

      <AlertDialog open={isCleanupConfirmOpen} onOpenChange={setIsCleanupConfirmOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Data Cleanup</AlertDialogTitle>
                  <AlertDialogDescription>
                      Are you sure you want to delete all clinics where the name starts and ends with a number? This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCleanup} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                      {isPending ? "Deleting..." : "Confirm & Delete"}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InventoryCrudManager;
