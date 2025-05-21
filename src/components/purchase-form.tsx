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
import { Trash2, PlusCircle, Copy, UploadCloud, Eye, Printer } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import type { SelectOption, PurchaseItem as PurchaseItemType, Partner, ItemDefinition } from '@/types';
import { getEmployeeIds, getPartnerNames, getItemNames, OTHER_ITEM_VALUE } from '@/lib/data';
import { submitPurchase } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { BillPreview } from '@/components/bill-preview'; 

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const PurchaseItemSchema = z.object({
  id: z.string(), 
  clinicCode: z.string().min(1, "Clinic code is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0.01"),
  itemName: z.string().min(1, "Item name is required"),
  customItemName: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.itemName === OTHER_ITEM_VALUE && (!data.customItemName || data.customItemName.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Custom item name is required when 'Other' is selected.",
      path: ['customItemName'],
    });
  }
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

export type PurchaseFormValues = z.infer<typeof FormSchema>;

export function PurchaseForm() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [employeeIdOptions, setEmployeeIdOptions] = useState<SelectOption[]>([]);
  const [partnerNames, setPartnerNames] = useState<Partner[]>([]);
  const [itemDefinitions, setItemDefinitions] = useState<ItemDefinition[]>([]);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [itemImagePreviews, setItemImagePreviews] = useState<Record<string, string | null>>({});
  
  const [totalBill, setTotalBill] = useState(0);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [billData, setBillData] = useState<PurchaseFormValues | null>(null);


  const { register, control, handleSubmit, reset, formState: { errors }, setValue, watch, getValues } = useForm<PurchaseFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userId: '',
      partnerName: '',
      userName: '',
      items: [{ id: crypto.randomUUID(), clinicCode: '', quantity: 1, price: 0.01, itemName: '', customItemName: '' }],
      uploadedFile: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');

  useEffect(() => {
    const currentTotal = watchedItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      return sum + (quantity * price);
    }, 0);
    setTotalBill(currentTotal);
  }, [watchedItems]);

  useEffect(() => {
    async function fetchData() {
      const ids = await getEmployeeIds();
      setEmployeeIdOptions(ids.map(id => ({ value: id, label: id })));
      setPartnerNames(await getPartnerNames());
      setItemDefinitions(await getItemNames());
    }
    fetchData();
  }, []);
  
  useEffect(() => {
    const newPreviews: Record<string, string | null> = {};
    fields.forEach((field, index) => {
        const currentItemValue = watch(`items.${index}.itemName`);
        if (currentItemValue && currentItemValue !== OTHER_ITEM_VALUE) {
            const def = itemDefinitions.find(i => i.value === currentItemValue);
            newPreviews[field.id] = def ? def.imageUrl : null;
        } else {
            newPreviews[field.id] = null;
        }
    });
    setItemImagePreviews(newPreviews);
  }, [fields, itemDefinitions, watch]);

  const onSubmit = (data: PurchaseFormValues) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('userId', data.userId);
      formData.append('partnerName', data.partnerName);
      formData.append('userName', data.userName);
      formData.append('items', JSON.stringify(data.items.map(item => ({
        ...item,
        // Use customItemName if "Other" is selected
        itemNameDisplay: item.itemName === OTHER_ITEM_VALUE ? item.customItemName : itemDefinitions.find(def => def.value === item.itemName)?.label || item.itemName,
      }))));
      if (data.uploadedFile) {
        formData.append('uploadedFile', data.uploadedFile);
      }

      const result = await submitPurchase(null, formData);
      if (result.success) {
        toast({ title: t('operationSuccess'), description: t('billGeneratedSuccess')});
        setBillData(data); // Save data for bill preview
        setShowBillPreview(true); // Show bill preview trigger
        reset();
        setFilePreview(null);
        setItemImagePreviews({});
        setTotalBill(0);
      } else {
        toast({ variant: "destructive", title: t('errorOccurred'), description: result.message || t('errorOccurred') });
        if (result.errors) {
          console.error("Server validation errors:", result.errors);
        }
      }
    });
  };

  const addNewItem = () => {
    const newItemId = crypto.randomUUID();
    append({ id: newItemId, clinicCode: '', quantity: 1, price: 0.01, itemName: '', customItemName: '' });
    setItemImagePreviews(prev => ({...prev, [newItemId]: null}));
  };

  const duplicateLastItem = () => {
    if (fields.length > 0) {
      const lastItem = fields[fields.length - 1];
      const newItemId = crypto.randomUUID();
      append({ ...lastItem, id: newItemId });
      const lastItemDef = itemDefinitions.find(i => i.value === lastItem.itemName && i.value !== OTHER_ITEM_VALUE);
      setItemImagePreviews(prev => ({...prev, [newItemId]: lastItemDef ? lastItemDef.imageUrl : null}));
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
        setFilePreview(file.name); 
      }
    } else {
      setValue('uploadedFile', undefined);
      setFilePreview(null);
    }
  };
  
  const currentFile = watch('uploadedFile');

  const handleItemNameChange = (itemId: string, newItemNameValue: string, index: number) => {
    setValue(`items.${index}.itemName`, newItemNameValue);
    if (newItemNameValue !== OTHER_ITEM_VALUE) {
      setValue(`items.${index}.customItemName`, ''); // Clear custom name if not "Other"
      const selectedItemDefinition = itemDefinitions.find(i => i.value === newItemNameValue);
      setItemImagePreviews(prev => ({
        ...prev,
        [itemId]: selectedItemDefinition ? selectedItemDefinition.imageUrl : null,
      }));
    } else {
      setItemImagePreviews(prev => ({ ...prev, [itemId]: null })); // No preview for "Other"
    }
  };


  return (
    <>
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
                      {employeeIdOptions.map(emp => (
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
          {fields.map((item, index) => {
            const currentItemName = watch(`items.${index}.itemName`);
            return (
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
                    <div className="flex flex-col">
                      <Label htmlFor={`items.${index}.itemName`}>{t('itemName')}</Label>
                       <Controller
                        name={`items.${index}.itemName`}
                        control={control}
                        render={({ field }) => (
                          <Select 
                            onValueChange={(value) => handleItemNameChange(item.id, value, index)}
                            value={field.value}
                          >
                            <SelectTrigger id={`items.${index}.itemName`}>
                              <SelectValue placeholder={t('selectItemName')} />
                            </SelectTrigger>
                            <SelectContent>
                              {itemDefinitions.map(def => (
                                <SelectItem key={def.value} value={def.value}>
                                  <div className="flex items-center">
                                    {def.value !== OTHER_ITEM_VALUE && (
                                      <Image 
                                        src={def.imageUrl} 
                                        alt={def.label} 
                                        width={24} 
                                        height={24} 
                                        className="mr-2 rounded-sm object-cover" 
                                        data-ai-hint={def.dataAiHint || def.label.toLowerCase().replace(' ', '')} 
                                      />
                                    )}
                                    {def.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {currentItemName !== OTHER_ITEM_VALUE && itemImagePreviews[item.id] && (
                        <div className="mt-2">
                           <Image 
                            src={itemImagePreviews[item.id]!} 
                            alt="Selected item preview" 
                            width={64} 
                            height={64} 
                            className="rounded-md border object-cover"
                            data-ai-hint="item preview"
                          />
                        </div>
                      )}
                      {errors.items?.[index]?.itemName && <p className="text-sm text-destructive mt-1">{errors.items?.[index]?.itemName?.message}</p>}
                    </div>
                </div>
                {currentItemName === OTHER_ITEM_VALUE && (
                  <div>
                    <Label htmlFor={`items.${index}.customItemName`}>{t('customItemName')}</Label>
                    <Input id={`items.${index}.customItemName`} {...register(`items.${index}.customItemName`)} placeholder={t('enterCustomItemName')} />
                    {errors.items?.[index]?.customItemName && <p className="text-sm text-destructive mt-1">{errors.items?.[index]?.customItemName?.message}</p>}
                  </div>
                )}
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
          )})}
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
                    <Image src={filePreview} alt="File preview" width={128} height={128} className="max-h-32 rounded-md border object-contain" data-ai-hint="document preview"/>
                ) : (
                    <span>{filePreview || currentFile.name}</span>
                )}
              </div>
            )}
            {errors.uploadedFile && <p className="text-sm text-destructive mt-1">{errors.uploadedFile.message}</p>}
          </div>

          <Separator />
          <div className="text-right">
            <h3 className="text-xl font-semibold">{t('totalBill')}: <span className="text-primary">{totalBill.toFixed(2)}</span></h3>
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isPending}>
            {isPending ? `${t('submit')}...` : t('submit')}
          </Button>

          {billData && showBillPreview && (
            <div className="mt-4 text-center">
              <Button type="button" variant="secondary" onClick={() => setShowBillPreview(true)}>
                <Eye className="mr-2 h-4 w-4" /> {t('viewBill')}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
    {billData && (
      <BillPreview
        isOpen={showBillPreview}
        onClose={() => setShowBillPreview(false)}
        billData={billData}
        itemDefinitions={itemDefinitions}
        t={t}
      />
    )}
    </>
  );
}
