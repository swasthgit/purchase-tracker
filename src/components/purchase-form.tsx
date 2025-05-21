// src/components/purchase-form.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, PlusCircle, Copy, UploadCloud } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import type { SelectOption, PurchaseItem as PurchaseItemType, Partner } from '@/types';
import { getEmployeeIds, getPartnerNames, getItemNames } from '@/lib/data';
import { submitPurchase } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const PurchaseItemSchema = z.object({
  id: z.string(), // Kept for client-side keying, not part of server validation directly here
  clinicCode: z.string().min(1, "Clinic code is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  itemName: z.string().min(1, "Item name is required"),
});

const FormSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  partnerName: z.string().min(1, "Partner name is required"),
  userName: z.string().min(1, "User name is required").max(100, "User name too long"),
  items: z.array(PurchaseItemSchema).min(1, "At least one item is required"),
  uploadedFile: z
    .custom<File | undefined>()
    .refine((file) => !file || file.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => !file || ALLOWED_FILE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png, .gif, .pdf, .doc, .docx files are allowed."
    ).optional(),
});

type PurchaseFormValues = z.infer<typeof FormSchema>;

export function PurchaseForm() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [employeeIds, setEmployeeIds] = useState<SelectOption[]>([]);
  const [partnerNames, setPartnerNames] = useState<Partner[]>([]);
  const [itemNames, setItemNames] = useState<SelectOption[]>([]);
  const [filePreview, setFilePreview] = useState<string | null>(null);


  const { register, control, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<PurchaseFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userId: '',
      partnerName: '',
      userName: '',
      items: [{ id: crypto.randomUUID(), clinicCode: '', quantity: 1, price: 0, itemName: '' }],
      uploadedFile: undefined,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items',
  });

  useEffect(() => {
    async function fetchData() {
      setEmployeeIds(await getEmployeeIds());
      setPartnerNames(await getPartnerNames());
      setItemNames(await getItemNames());
    }
    fetchData();
  }, []);
  
  // Reset form fields when language changes to re-evaluate dropdown labels if needed
  useEffect(() => {
    // This is a simple way to ensure dropdowns might re-render if their content depends on `t`
    // In this case, labels are from `data.ts` so not strictly needed but good for complex scenarios
  }, [language, t]);

  const onSubmit = (data: PurchaseFormValues) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('userId', data.userId);
      formData.append('partnerName', data.partnerName);
      formData.append('userName', data.userName);
      formData.append('items', JSON.stringify(data.items)); // Send items as JSON string
      if (data.uploadedFile) {
        formData.append('uploadedFile', data.uploadedFile);
      }

      const result = await submitPurchase(null, formData);
      if (result.success) {
        toast({ title: t('operationSuccess'), description: t(result.message as string) });
        reset();
        setFilePreview(null);
      } else {
        toast({ variant: "destructive", title: t('errorOccurred'), description: result.message || t('errorOccurred') });
        // Handle field errors if returned
        if (result.errors) {
          // You might want to map these errors to react-hook-form's setError
          console.error("Server validation errors:", result.errors);
        }
      }
    });
  };

  const addNewItem = () => {
    append({ id: crypto.randomUUID(), clinicCode: '', quantity: 1, price: 0, itemName: '' });
  };

  const duplicateLastItem = () => {
    if (fields.length > 0) {
      const lastItem = fields[fields.length - 1];
      // Create a new object, spread existing values, generate new ID
      append({ ...lastItem, id: crypto.randomUUID() });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setValue('uploadedFile', file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(file.name); // Show file name for non-images
      }
    } else {
      setValue('uploadedFile', undefined);
      setFilePreview(null);
    }
  };
  
  const currentFile = watch('uploadedFile');


  return (
    <Card className="w-full max-w-4xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary">{t('appName')}</CardTitle>
        <CardDescription className="text-center">{t('appDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="userId">{t('userId')}</Label>
              <Controller
                name="userId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="userId">
                      <SelectValue placeholder={t('selectUserId')} />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeIds.map(emp => (
                        <SelectItem key={emp.value} value={emp.value}>{emp.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.userId && <p className="text-sm text-destructive mt-1">{errors.userId.message}</p>}
            </div>
            <div>
              <Label htmlFor="partnerName">{t('partnerName')}</Label>
              <Controller
                name="partnerName"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="partnerName">
                      <SelectValue placeholder={t('selectPartnerName')} />
                    </SelectTrigger>
                    <SelectContent>
                      {partnerNames.map(partner => (
                        <SelectItem key={partner.id} value={partner.name}>{partner.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.partnerName && <p className="text-sm text-destructive mt-1">{errors.partnerName.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="userName">{t('userName')}</Label>
            <Input id="userName" {...register('userName')} placeholder={t('enterUserName')} />
            {errors.userName && <p className="text-sm text-destructive mt-1">{errors.userName.message}</p>}
          </div>

          <Separator />

          <h3 className="text-xl font-semibold text-secondary">{t('itemsPurchased')}</h3>
          {fields.map((item, index) => (
            <Card key={item.id} className="p-4 space-y-4 bg-muted/30">
               <CardHeader className="p-0 mb-2">
                <CardTitle className="text-lg">{t('itemDetails')} #{index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`items.${index}.clinicCode`}>{t('clinicCode')}</Label>
                      <Input id={`items.${index}.clinicCode`} {...register(`items.${index}.clinicCode`)} />
                      {errors.items?.[index]?.clinicCode && <p className="text-sm text-destructive mt-1">{errors.items?.[index]?.clinicCode?.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.itemName`}>{t('itemName')}</Label>
                      <Controller
                        name={`items.${index}.itemName`}
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id={`items.${index}.itemName`}>
                              <SelectValue placeholder={t('selectItemName')} />
                            </SelectTrigger>
                            <SelectContent>
                              {itemNames.map(name => (
                                <SelectItem key={name.value} value={name.value}>{name.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.items?.[index]?.itemName && <p className="text-sm text-destructive mt-1">{errors.items?.[index]?.itemName?.message}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`items.${index}.quantity`}>{t('quantity')}</Label>
                      <Input id={`items.${index}.quantity`} type="number" {...register(`items.${index}.quantity`)} />
                      {errors.items?.[index]?.quantity && <p className="text-sm text-destructive mt-1">{errors.items?.[index]?.quantity?.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.price`}>{t('price')}</Label>
                      <Input id={`items.${index}.price`} type="number" step="0.01" {...register(`items.${index}.price`)} />
                      {errors.items?.[index]?.price && <p className="text-sm text-destructive mt-1">{errors.items?.[index]?.price?.message}</p>}
                    </div>
                </div>
              </CardContent>
              <CardFooter className="p-0 pt-2">
                 <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} aria-label={t('removeItem')}>
                    <Trash2 className="h-4 w-4 mr-1" /> {t('removeItem')}
                  </Button>
              </CardFooter>
            </Card>
          ))}
           {errors.items && typeof errors.items === 'object' && !Array.isArray(errors.items) && (
            <p className="text-sm text-destructive mt-1">{errors.items.message || errors.items.root?.message}</p>
          )}

          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={addNewItem}>
              <PlusCircle className="h-4 w-4 mr-2" /> {t('addItem')}
            </Button>
            {fields.length > 0 && (
              <Button type="button" variant="outline" onClick={duplicateLastItem}>
                <Copy className="h-4 w-4 mr-2" /> {t('duplicateItem')}
              </Button>
            )}
          </div>
          
          <Separator />

          <div>
            <Label htmlFor="uploadedFile">{t('uploadFile')}</Label>
            <div className="mt-2 flex items-center justify-center w-full">
                <label htmlFor="uploadedFile-input" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/70 border-primary/50 hover:border-primary">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-2 text-primary" />
                        <p className="mb-1 text-sm text-foreground/80"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-foreground/60">Images, PDF, DOC (MAX. 5MB)</p>
                    </div>
                    <Input id="uploadedFile-input" type="file" className="hidden" onChange={handleFileChange} accept={ALLOWED_FILE_TYPES.join(',')} />
                </label>
            </div>
            {currentFile && (
              <div className="mt-2 text-sm text-foreground/80">
                {filePreview && filePreview.startsWith('data:image') ? (
                    <img src={filePreview} alt="File preview" className="max-h-32 rounded-md border object-contain" data-ai-hint="document preview"/>
                ) : (
                    <span>{filePreview || currentFile.name}</span>
                )}
              </div>
            )}
            {errors.uploadedFile && <p className="text-sm text-destructive mt-1">{errors.uploadedFile.message}</p>}
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isPending}>
            {isPending ? `${t('submit')}...` : t('submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
