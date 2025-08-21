// src/components/admin/dc-mapping-dashboard.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { DCMapping } from '@/types';
import { getDCMappingsFS } from '@/lib/data';

export function DCMappingDashboard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [mappings, setMappings] = useState<DCMapping[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDcName, setSelectedDcName] = useState('all');

  const fetchMappings = async () => {
    setIsLoading(true);
    try {
      const data = await getDCMappingsFS();
      setMappings(data);
    } catch (error) {
      console.error("Failed to fetch DC mappings:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch DC mappings." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const dcNames = useMemo(() => {
    const names = new Set(mappings.map(m => m.dcName).filter(Boolean));
    return ['all', ...Array.from(names).sort()];
  }, [mappings]);

  const filteredMappings = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return mappings.filter(m => {
      const matchesDcName = selectedDcName === 'all' || m.dcName === selectedDcName;
      const matchesSearchTerm = lowercasedSearchTerm.trim() === '' || 
        Object.values(m).some(value => 
          String(value).toLowerCase().includes(lowercasedSearchTerm)
        );
      return matchesDcName && matchesSearchTerm;
    });
  }, [mappings, selectedDcName, searchTerm]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>DC Mapping Data</CardTitle>
          <CardDescription>View, search, and filter the uploaded DC mapping data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search all fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground"/>
              <Select value={selectedDcName} onValueChange={setSelectedDcName}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="Filter by DC Name..." />
                </SelectTrigger>
                <SelectContent>
                  {dcNames.map(name => (
                    <SelectItem key={name} value={name}>{name === 'all' ? 'All DC Names' : name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <ScrollArea className="h-[60vh] border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Old E-clinic</TableHead>
                  <TableHead>New E-clinic</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>DC Name</TableHead>
                  <TableHead>DC Employee Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredMappings.length > 0 ? (
                  filteredMappings.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{m.stateName}</TableCell>
                      <TableCell>{m.partnerName}</TableCell>
                      <TableCell>{m.oldEclinicCode}</TableCell>
                      <TableCell>{m.newEclinicCode}</TableCell>
                      <TableCell>{m.regionName}</TableCell>
                      <TableCell>{m.branchName}</TableCell>
                      <TableCell>{m.dcName}</TableCell>
                      <TableCell>{m.dcEmployeeCode}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                      No data found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
