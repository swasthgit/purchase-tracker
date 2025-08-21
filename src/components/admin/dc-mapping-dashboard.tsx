// src/components/admin/dc-mapping-dashboard.tsx
"use client";

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { UploadCloud, Search, Users } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { DCMapping } from '@/types';
import { getDCMappingsFS } from '@/lib/data';
import { bulkUploadDCMappingAction } from '@/lib/actions';
import { useLanguage } from '@/hooks/use-language';

export function DCMappingDashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [mappings, setMappings] = useState<DCMapping[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDcName, setSelectedDcName] = useState('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ variant: "destructive", title: t('errorOccurred'), description: "No file selected." });
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append('dcMappingFile', selectedFile);
      const result = await bulkUploadDCMappingAction(formData);
      if (result.success) {
        toast({ title: t('operationSuccess'), description: result.message });
        setSelectedFile(null);
        fetchMappings(); // Refresh data after upload
      } else {
        toast({ variant: "destructive", title: t('errorOccurred'), description: result.message || t('errorOccurred') });
      }
    });
  };

  const dcNames = useMemo(() => {
    const names = new Set(mappings.map(m => m.dcName));
    return ['all', ...Array.from(names).sort()];
  }, [mappings]);

  const filteredMappings = useMemo(() => {
    return mappings.filter(m => {
      const matchesDcName = selectedDcName === 'all' || m.dcName === selectedDcName;
      const matchesSearchTerm = searchTerm.trim() === '' || 
        Object.values(m).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchesDcName && matchesSearchTerm;
    });
  }, [mappings, selectedDcName, searchTerm]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload DC Mapping Data</CardTitle>
          <CardDescription>Upload a CSV or Excel file with the DC mapping information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input 
            type="file" 
            onChange={handleFileChange} 
            accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
          />
          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              Selected: {selectedFile.name}
            </div>
          )}
          <Button onClick={handleUpload} disabled={isPending || !selectedFile}>
            <UploadCloud className="mr-2 h-4 w-4" />
            {isPending ? "Uploading..." : "Upload File"}
          </Button>
        </CardContent>
      </Card>

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
