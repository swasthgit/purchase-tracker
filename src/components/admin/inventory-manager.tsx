// src/components/admin/inventory-manager.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { getInventoryFS } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InventoryItem {
  id: string;
  "item name": string;
  quantity: number;
  "approx price per unit": number;
}

interface ClinicInventory {
  [clinicName: string]: InventoryItem[];
}

const InventoryManager: React.FC = () => {
  const [inventoryData, setInventoryData] = useState<ClinicInventory>({});
  const [clinicNames, setClinicNames] = useState<string[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const data = await getInventoryFS();
        setInventoryData(data);
        const clinics = Object.keys(data);
        setClinicNames(clinics);
        if (clinics.length > 0) {
          setSelectedClinic(clinics[0]);
        }
      } catch (error) {
        console.error("Failed to fetch inventory:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const filteredClinics = clinicNames.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClinicInventory = selectedClinic ? inventoryData[selectedClinic] || [] : [];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Inventory Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search clinics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow"
          />
          <Select onValueChange={setSelectedClinic} value={selectedClinic} disabled={isLoading}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder={isLoading ? "Loading clinics..." : "Select a clinic"} />
            </SelectTrigger>
            <SelectContent>
              {filteredClinics.map(clinicName => (
                <SelectItem key={clinicName} value={clinicName}>
                  {clinicName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClinic && (
          <div>
            <h3 className="text-xl font-semibold mt-4 mb-2">Inventory for: <span className="text-primary">{selectedClinic}</span></h3>
            <ScrollArea className="h-[60vh] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Approx Price Per Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={3} className="text-center">Loading...</TableCell></TableRow>
                  ) : selectedClinicInventory.length > 0 ? (
                    selectedClinicInventory.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item["item name"]}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item["approx price per unit"]}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={3} className="text-center h-24">No inventory items found for {selectedClinic}.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryManager;
