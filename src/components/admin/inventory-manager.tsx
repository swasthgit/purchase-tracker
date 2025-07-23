import React, { useState, useEffect } from 'react';
import { getInventoryFS } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchInventory = async () => {
      const data = await getInventoryFS();
      setInventoryData(data);
    };
    fetchInventory();
  }, []);

  const clinicNames = Object.keys(inventoryData);

  const filteredClinics = clinicNames.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClinicInventory = selectedClinic ? inventoryData[selectedClinic] : [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Inventory Management</h2>
      <Input
        placeholder="Search clinics..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Select onValueChange={setSelectedClinic}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a clinic" />
        </SelectTrigger>
        <SelectContent>
          {filteredClinics.map(clinicName => (
            <SelectItem key={clinicName} value={clinicName}>
              {clinicName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedClinic && (
        <div>
          <h3 className="text-xl font-semibold mt-4">Inventory for {selectedClinic}</h3>
          {selectedClinicInventory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Approx Price Per Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedClinicInventory.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item["item name"]}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item["approx price per unit"]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No inventory items found for {selectedClinic}.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
