// src/components/admin/inventory-manager.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { getInventoryFS, getClinicsFS } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Search } from 'lucide-react';
import type { InventoryItem } from '@/types';

const InventoryManager: React.FC = () => {
  const { toast } = useToast();
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [clinics, setClinics] = useState<{ id: string, name: string }[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredClinics = clinics
    .filter(clinic => clinic.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const st = searchTerm.toLowerCase();

      const aIsExact = aName === st;
      const bIsExact = bName === st;

      const aStartsWith = aName.startsWith(st);
      const bStartsWith = bName.startsWith(st);

      if (aIsExact && !bIsExact) return -1;
      if (!aIsExact && bIsExact) return 1;

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      return a.name.localeCompare(b.name);
    });

  const filteredItems = selectedClinic ? inventoryData.filter(item => item.clinicName === selectedClinic) : [];

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Inventory Viewer</CardTitle>
          <CardDescription>View inventory items for a specific clinic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="w-full sm:w-auto flex-grow">
                 <Label htmlFor="clinic-select">Select Clinic</Label>
                <Select onValueChange={setSelectedClinic} value={selectedClinic} disabled={isLoading}>
                    <SelectTrigger id="clinic-select" className="w-full">
                        <SelectValue placeholder="Select a clinic to view inventory..." />
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
                            <SelectItem key={clinic.id} value={clinic.name}>{clinic.name}</SelectItem>
                        ))}
                        {filteredClinics.length === 0 && <div className="text-center text-sm text-muted-foreground p-2">No clinics found.</div>}
                    </SelectContent>
                </Select>
            </div>
          </div>

          <ScrollArea className="h-[60vh] border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Approx Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item["item name"]}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item["approx price per unit"].toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                      {selectedClinic ? "No inventory items found for this clinic." : "Please select a clinic to view items."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
};

export default InventoryManager;
