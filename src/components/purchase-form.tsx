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
import { Trash2, PlusCircle, Copy, UploadCloud, Info } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import type { SelectOption, PurchaseItem as PurchaseItemType, Partner, ItemDefinition } from '@/types';
import { getEmployeeIdsFS, getPartnerNames, getItemNames, OTHER_ITEM_VALUE } from '@/lib/data';
import { submitPurchase } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { BillPreview } from '@/components/bill-preview'; 
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const PurchaseItemSchema = z.object({
  id: z.string(), 
  clinicCode: z.string().min(1, "Clinic code is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0.01"),
  itemName: z.string().min(1, "Item name is required"), // This will be the ID from ItemDefinition or OTHER_ITEM_VALUE
  customItemName: z.string().optional(),
  itemNameDisplay: z.string(), // To store the final name for display/excel
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
  partnerName: z.string().min(1, "Partner name is required"), // This will be the Partner's name
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
  const { t, language } = useLanguage(); // Added language for "Other" option translation
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [employeeIdOptions, setEmployeeIdOptions] = useState<SelectOption[]>([]);
  const [partnerOptions, setPartnerOptions] = useState<Partner[]>([]);
  const [itemDefinitionOptions, setItemDefinitionOptions] = useState<ItemDefinition[]>([]);
  
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [itemImagePreviews, setItemImagePreviews] = useState<Record<string, string | null>>({});
  
  const [totalBill, setTotalBill] = useState(0);
  const [showBillPreviewDialog, setShowBillPreviewDialog] = useState(false);
  const [submittedBillData, setSubmittedBillData] = useState<PurchaseFormValues | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);


  const { register, control, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<PurchaseFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userId: '',
      partnerName: '',
      userName: '',
      items: [{ id: crypto.randomUUID(), clinicCode: '', quantity: 1, price: 0.01, itemName: '', customItemName: '', itemNameDisplay: '' }],
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
      setIsLoadingData(true);
      try {
        setEmployeeIdOptions(await getEmployeeIdsFS());
        setPartnerOptions(await getPartnerNames()); // Fetches Partner[]
        setItemDefinitionOptions(await getItemNames()); // Fetches ItemDefinition[]
      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast({ variant: "destructive", title: t('errorOccurred'), description: "Could not load required data."});
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, [t, toast]);
  
  useEffect(() => {
    const newPreviews: Record<string, string | null> = {};
    fields.forEach((field, index) => {
        const currentItemValue = watch(`items.${index}.itemName`); // This is item ID or OTHER_ITEM_VALUE
        if (currentItemValue && currentItemValue !== OTHER_ITEM_VALUE) {
            const def = itemDefinitionOptions.find(i => i.id === currentItemValue);
            newPreviews[field.id] = def ? def.imageUrl : null;
        } else {
            newPreviews[field.id] = null;
        }
    });
    setItemImagePreviews(newPreviews);
  }, [fields, itemDefinitionOptions, watch]);

  const onSubmit = (data: PurchaseFormValues) => {
    startTransition(async () => {
      toast({ title: t('submittingPurchase') });
      const formData = new FormData();
      formData.append('userId', data.userId);
      formData.append('partnerName', data.partnerName); // partnerName is already string
      formData.append('userName', data.userName);
      
      const itemsWithDisplayNames = data.items.map(item => ({
        ...item,
        itemNameDisplay: item.itemName === OTHER_ITEM_VALUE 
          ? item.customItemName || t('other') 
          : itemDefinitionOptions.find(def => def.id === item.itemName)?.name || item.itemName,
      }));
      formData.append('items', JSON.stringify(itemsWithDisplayNames));

      if (data.uploadedFile) {
        formData.append('uploadedFile', data.uploadedFile);
      }

      const result = await submitPurchase(null, formData);
      if (result.success && result.data) {
        toast({ title: t('operationSuccess'), description: t('billGeneratedSuccess')});
        // Ensure submittedBillData has the items with correct itemNameDisplay
        const processedDataForBill = {
          ...result.data,
          items: itemsWithDisplayNames
        } as PurchaseFormValues;
        setSubmittedBillData(processedDataForBill); 
        setShowBillPreviewDialog(true);
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
    append({ id: newItemId, clinicCode: '', quantity: 1, price: 0.01, itemName: '', customItemName: '', itemNameDisplay: '' });
    setItemImagePreviews(prev => ({...prev, [newItemId]: null}));
  };

  const duplicateLastItem = () => {
    if (fields.length > 0) {
      const lastItem = fields[fields.length - 1];
      const newItemId = crypto.randomUUID();
      append({ ...lastItem, id: newItemId, itemNameDisplay: lastItem.itemNameDisplay }); // itemNameDisplay is already set
      const lastItemDef = itemDefinitionOptions.find(i => i.id === lastItem.itemName && i.id !== OTHER_ITEM_VALUE);
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

  const handleItemNameChange = (fieldId: string, selectedItemId: string, index: number) => {
    setValue(`items.${index}.itemName`, selectedItemId); // selectedItemId is the ID of the item_definition or OTHER_ITEM_VALUE
    if (selectedItemId !== OTHER_ITEM_VALUE) {
      setValue(`items.${index}.customItemName`, ''); 
      const selectedItemDefinition = itemDefinitionOptions.find(i => i.id === selectedItemId);
      setValue(`items.${index}.itemNameDisplay`, selectedItemDefinition?.name || selectedItemId);
      setItemImagePreviews(prev => ({
        ...prev,
        [fieldId]: selectedItemDefinition ? selectedItemDefinition.imageUrl : null,
      }));
    } else {
      setValue(`items.${index}.itemNameDisplay`, watch(`items.${index}.customItemName`) || t('other'));
      setItemImagePreviews(prev => ({ ...prev, [fieldId]: null })); 
    }
  };

  const handleCustomItemNameChange = (index: number, customName: string) => {
    setValue(`items.${index}.customItemName`, customName);
    if (watch(`items.${index}.itemName`) === OTHER_ITEM_VALUE) {
      setValue(`items.${index}.itemNameDisplay`, customName || t('other'));
    }
  };

  const handleDownloadExcel = () => {
    if (!submittedBillData) return;
    toast({ title: t('generatingExcel') });

    try {
      const wb = XLSX.utils.book_new();
      
      const summaryData = [
        [t('userId'), submittedBillData.userId],
        [t('partnerName'), submittedBillData.partnerName],
        [t('userName'), submittedBillData.userName],
        [t('uploadFile'), submittedBillData.uploadedFile ? submittedBillData.uploadedFile.name : t('noFileUploaded')],
        [], 
        [t('totalBill'), totalBill.toFixed(2)]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Bill Summary");

      const itemsHeader = [t('clinicCode'), t('itemName'), t('quantity'), t('pricePerUnit'), t('itemLineTotal')];
      const itemsData = submittedBillData.items.map(item => [
        item.clinicCode,
        item.itemNameDisplay, // Use the pre-calculated itemNameDisplay
        item.quantity,
        Number(item.price).toFixed(2),
        (Number(item.quantity) * Number(item.price)).toFixed(2)
      ]);
      const wsItems = XLSX.utils.aoa_to_sheet([itemsHeader, ...itemsData]);
      XLSX.utils.book_append_sheet(wb, wsItems, "Item Details");

      XLSX.writeFile(wb, `PurchaseBill_${submittedBillData.userId}_${Date.now()}.xlsx`);
      toast({ title: t('excelDownloadSuccess')});
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({ variant: "destructive", title: t('excelDownloadFailed')});
    }
  };

  // Translate "Other (Specify)" based on current language for the item dropdown
  const translatedItemDefinitions = itemDefinitionOptions.map(item => ({
    ...item,
    label: item.value === OTHER_ITEM_VALUE ? t('other') : item.label,
  }));


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
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingData || employeeIdOptions.length === 0}>
                    <SelectTrigger id="userId" className="text-base md:text-sm">
                      <SelectValue placeholder={t('selectUserId')} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingData ? (
                        <SelectItem value="loading" disabled>{t('loading')}</SelectItem>
                      ) : employeeIdOptions.length > 0 ? (
                        employeeIdOptions.map(emp => (
                          <SelectItem key={emp.value} value={emp.value}>{emp.label}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_ids" disabled>{t('noEmployeeIds')}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {!isLoadingData && employeeIdOptions.length === 0 && (
                <Alert variant="default" className="mt-2 text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {t('noUserIdsAvailableAdminPrompt')}
                  </AlertDescription>
                </Alert>
              )}
              {errors.userId && <p className="text-sm text-destructive mt-1">{errors.userId.message}</p>}
            </div>
            <div>
              <Label htmlFor="partnerName">{t('partnerName')}</Label>
              <Controller
                name="partnerName"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingData || partnerOptions.length === 0}>
                    <SelectTrigger id="partnerName" className="text-base md:text-sm">
                      <SelectValue placeholder={t('selectPartnerName')} />
                    </SelectTrigger>
                    <SelectContent>
                       {isLoadingData ? (
                        <SelectItem value="loading" disabled>{t('loading')}</SelectItem>
                      ) : partnerOptions.length > 0 ? (
                        partnerOptions.map(partner => (
                           <SelectItem key={partner.id} value={partner.name}>{partner.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_partners" disabled>{t('noPartners')}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
               {!isLoadingData && partnerOptions.length === 0 && (
                <Alert variant="default" className="mt-2 text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {t('noPartners')} {/* Create this translation */}
                  </AlertDescription>
                </Alert>
              )}
              {errors.partnerName && <p className="text-sm text-destructive mt-1">{errors.partnerName.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="userName">{t('userName')}</Label>
            <Input id="userName" {...register('userName')} placeholder={t('enterUserName')} className="text-base md:text-sm" />
            {errors.userName && <p className="text-sm text-destructive mt-1">{errors.userName.message}</p>}
          </div>

          <Separator />

          <h3 className="text-xl font-semibold text-secondary">{t('itemsPurchased')}</h3>
          {fields.map((item, index) => {
            const currentItemValueForLogic = watch(`items.${index}.itemName`); // This is the ID of the item
            return (
            <Card key={item.id} className="p-4 space-y-4 bg-muted/30">
               <CardHeader className="p-0 mb-2">
                <CardTitle className="text-lg">{t('itemDetails')} #{index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`items.${index}.clinicCode`}>{t('clinicCode')}</Label>
                      <Input id={`items.${index}.clinicCode`} {...register(`items.${index}.clinicCode`)} className="text-base md:text-sm" />
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
                            value={field.value} // field.value should be item ID
                            disabled={isLoadingData || translatedItemDefinitions.length === 0}
                          >
                            <SelectTrigger id={`items.${index}.itemName`} className="text-base md:text-sm">
                              <SelectValue placeholder={t('selectItemName')} />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingData ? (
                                <SelectItem value="loading" disabled>{t('loading')}</SelectItem>
                              ) : translatedItemDefinitions.length > 0 ? (
                                translatedItemDefinitions.map(def => (
                                <SelectItem key={def.id} value={def.id}> {/* Use def.id as value */}
                                  <div className="flex items-center">
                                    {def.id !== OTHER_ITEM_VALUE && def.imageUrl && (
                                      <Image 
                                        src={def.imageUrl} 
                                        alt={def.name} // Use def.name (original name)
                                        width={24} 
                                        height={24} 
                                        className="mr-2 rounded-sm object-cover" 
                                        data-ai-hint={def.dataAiHint || def.name.toLowerCase().replace(/\s+/g, '')} 
                                      />
                                    )}
                                    {def.label} {/* Use def.label (potentially translated "Other") */}
                                  </div>
                                </SelectItem>
                              ))) : (
                                 <SelectItem value="no_items" disabled>{t('noItemDefinitions')}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {currentItemValueForLogic !== OTHER_ITEM_VALUE && itemImagePreviews[item.id] && (
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
                {currentItemValueForLogic === OTHER_ITEM_VALUE && (
                  <div>
                    <Label htmlFor={`items.${index}.customItemName`}>{t('customItemName')}</Label>
                    <Input 
                      id={`items.${index}.customItemName`} 
                      {...register(`items.${index}.customItemName`)} 
                      placeholder={t('enterCustomItemName')} 
                      onChange={(e) => handleCustomItemNameChange(index, e.target.value)}
                      className="text-base md:text-sm"
                    />
                    {errors.items?.[index]?.customItemName && <p className="text-sm text-destructive mt-1">{errors.items?.[index]?.customItemName?.message}</p>}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`items.${index}.quantity`}>{t('quantity')}</Label>
                      <Input id={`items.${index}.quantity`} type="number" {...register(`items.${index}.quantity`)} className="text-base md:text-sm"/>
                      {errors.items?.[index]?.quantity && <p className="text-sm text-destructive mt-1">{errors.items?.[index]?.quantity?.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`items.${index}.price`}>{t('pricePerUnit')}</Label>
                      <Input id={`items.${index}.price`} type="number" step="0.01" {...register(`items.${index}.price`)} className="text-base md:text-sm"/>
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
          {!isLoadingData && itemDefinitionOptions.filter(i => i.id !== OTHER_ITEM_VALUE).length === 0 && (
              <Alert variant="default" className="mt-2 text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {t('noItemDefinitions')}
                  </AlertDescription>
              </Alert>
          )}

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button type="button" variant="outline" onClick={addNewItem} className="w-full sm:w-auto text-base md:text-sm">
              <PlusCircle className="h-4 w-4 mr-2" /> {t('addItem')}
            </Button>
            {fields.length > 0 && (
              <Button type="button" variant="outline" onClick={duplicateLastItem} className="w-full sm:w-auto text-base md:text-sm">
                <Copy className="h-4 w-4 mr-2" /> {t('duplicateItem')}
              </Button>
            )}
          </div>
          
          <Separator />

          <div>
            <Label htmlFor="uploadedFile">{t('uploadFile')}</Label>
            <div className="mt-2 flex items-center justify-center w-full">
                <label htmlFor="uploadedFile-input" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/70 border-primary/50 hover:border-primary">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-2">
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
                    <Image src={filePreview} alt="File preview" width={128} height={128} className="max-h-32 rounded-md border object-contain mx-auto sm:mx-0" data-ai-hint="document preview"/>
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

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-base md:text-sm" disabled={isPending || isLoadingData}>
            {isPending ? `${t('submittingPurchase')}...` : t('submit')}
          </Button>

        </form>
      </CardContent>
    </Card>
    {submittedBillData && (
      <BillPreview
        isOpen={showBillPreviewDialog}
        onClose={() => {
          setShowBillPreviewDialog(false);
          // Optionally clear submittedBillData if form reset is desired immediately after closing preview
          // setSubmittedBillData(null); 
        }}
        billData={submittedBillData}
        // itemDefinitions={itemDefinitionOptions} // No longer strictly needed if billData.items has itemNameDisplay
        t={t}
        onDownloadExcel={handleDownloadExcel}
      />
    )}
    </>
  );
}
