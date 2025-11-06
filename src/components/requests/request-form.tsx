// src/components/requests/request-form.tsx
"use client";

import React, { useState, useTransition, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, PlusCircle, UploadCloud, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { createRequestAction } from '@/lib/requests-actions';
import type { RequestCategory, RequestPriority } from '@/types';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const RequestItemSchema = z.object({
  id: z.string(),
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  estimatedPrice: z.coerce.number().min(0).optional(),
  specifications: z.string().optional(),
});

const RequestFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(['Equipment', 'Supplies', 'Maintenance', 'Infrastructure', 'Other'] as const),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent'] as const),
  items: z.array(RequestItemSchema).min(1, "At least one item is required"),
});

type RequestFormValues = z.infer<typeof RequestFormSchema>;

interface RequestFormProps {
  dcId: string;
  dcName: string;
  dcEmail?: string;
  clinicCode: string;
  stateName: string;
  qaManagerId: string; // The QA manager who handles this state
  onSuccess?: (requestId: string) => void;
}

export function RequestForm({ dcId, dcName, dcEmail, clinicCode, stateName, qaManagerId, onSuccess }: RequestFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, control, handleSubmit, formState: { errors }, watch } = useForm<RequestFormValues>({
    resolver: zodResolver(RequestFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'Equipment',
      priority: 'Medium',
      items: [{ id: crypto.randomUUID(), itemName: '', quantity: 1, estimatedPrice: 0, specifications: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const totalEstimatedCost = watchedItems.reduce((sum, item) => {
    return sum + (item.quantity * (item.estimatedPrice || 0));
  }, 0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    const validFiles: File[] = [];

    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast({ variant: "destructive", title: "File too large", description: `${file.name} exceeds 20MB limit` });
        continue;
      }
      validFiles.push(file);
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (indexToRemove: number) => {
    setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const onSubmit = (data: RequestFormValues) => {
    startTransition(async () => {
      toast({ title: "Submitting request..." });

      const formData = new FormData();
      formData.append('dcId', dcId);
      formData.append('dcName', dcName);
      if (dcEmail) formData.append('dcEmail', dcEmail);
      formData.append('clinicCode', clinicCode);
      formData.append('stateName', stateName);
      formData.append('currentHandler', qaManagerId);
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('category', data.category);
      formData.append('priority', data.priority);
      formData.append('items', JSON.stringify(data.items));
      formData.append('estimatedCost', totalEstimatedCost.toString());

      uploadedFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const result = await createRequestAction(null, formData);

      if (result.success) {
        toast({ title: "Success!", description: `Request ${result.requestId} created successfully` });
        if (onSuccess && result.requestId) {
          onSuccess(result.requestId);
        }
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto overflow-visible">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Create New Request</CardTitle>
        <CardDescription>
          Submit a material or equipment request for approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* DC Info (Read-only display) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">DC Name</p>
              <p className="font-medium">{dcName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clinic Code</p>
              <p className="font-medium">{clinicCode}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">State</p>
              <p className="font-medium">{stateName}</p>
            </div>
          </div>

          <Separator />

          {/* Title */}
          <div className="w-full">
            <Label htmlFor="title">Request Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="e.g., Need 5 Blood Pressure Monitors"
              className="w-full"
            />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div className="w-full min-w-0">
              <Label htmlFor="category">Category *</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="Supplies">Supplies</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
            </div>

            <div className="w-full min-w-0">
              <Label htmlFor="priority">Priority *</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">🔴 Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.priority && <p className="text-sm text-destructive mt-1">{errors.priority.message}</p>}
            </div>
          </div>

          {/* Description */}
          <div className="w-full">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Provide detailed description of what you need and why..."
              rows={4}
              className="w-full"
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <Separator />

          {/* Items Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Items Requested *</h3>
            {fields.map((item, index) => (
              <Card key={item.id} className="mb-4 overflow-visible">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Item #{index + 1}</CardTitle>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="w-full">
                    <Label htmlFor={`items.${index}.itemName`}>Item Name *</Label>
                    <Input
                      id={`items.${index}.itemName`}
                      {...register(`items.${index}.itemName`)}
                      placeholder="e.g., Blood Pressure Monitor"
                      className="w-full"
                    />
                    {errors.items?.[index]?.itemName && (
                      <p className="text-sm text-destructive mt-1">{errors.items[index]?.itemName?.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`items.${index}.quantity`}>Quantity *</Label>
                      <Input
                        id={`items.${index}.quantity`}
                        type="number"
                        min="1"
                        {...register(`items.${index}.quantity`)}
                        className="w-full"
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="text-sm text-destructive mt-1">{errors.items[index]?.quantity?.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`items.${index}.estimatedPrice`}>Estimated Price per Unit (₹)</Label>
                      <Input
                        id={`items.${index}.estimatedPrice`}
                        type="number"
                        min="0"
                        step="0.01"
                        {...register(`items.${index}.estimatedPrice`)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="w-full">
                    <Label htmlFor={`items.${index}.specifications`}>Specifications/Details</Label>
                    <Textarea
                      id={`items.${index}.specifications`}
                      {...register(`items.${index}.specifications`)}
                      placeholder="Model number, brand, specific requirements..."
                      rows={2}
                      className="w-full"
                    />
                  </div>

                  {watchedItems[index]?.quantity && watchedItems[index]?.estimatedPrice ? (
                    <div className="text-sm font-medium text-right">
                      Line Total: ₹{(watchedItems[index].quantity * (watchedItems[index].estimatedPrice || 0)).toFixed(2)}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => append({ id: crypto.randomUUID(), itemName: '', quantity: 1, estimatedPrice: 0, specifications: '' })}
              className="w-full"
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Add Another Item
            </Button>
          </div>

          <Separator />

          {/* File Upload */}
          <div>
            <Label htmlFor="attachments">Supporting Documents</Label>
            <div className="mt-2 flex items-center justify-center w-full">
              <label htmlFor="attachments" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/70 border-primary/50 hover:border-primary">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-2">
                  <UploadCloud className="w-8 h-8 mb-2 text-primary" />
                  <p className="mb-1 text-sm text-foreground/80">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-foreground/60">PDF, Images, Excel (Max 20MB per file)</p>
                </div>
                <Input
                  id="attachments"
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                  ref={fileInputRef}
                />
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium">Attached Files ({uploadedFiles.length})</h4>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Total Estimated Cost */}
          {totalEstimatedCost > 0 && (
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Estimated Cost:</span>
                <span className="text-2xl font-bold text-primary">₹{totalEstimatedCost.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isPending}
          >
            {isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
