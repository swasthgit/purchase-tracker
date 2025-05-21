// src/components/bill-preview.tsx
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { PurchaseFormValues } from "./purchase-form";
import type { ItemDefinition } from "@/types";
import { OTHER_ITEM_VALUE } from "@/lib/data";
import { Printer } from "lucide-react";

interface BillPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  billData: PurchaseFormValues | null;
  itemDefinitions: ItemDefinition[];
  t: (key: string) => string;
}

export function BillPreview({ isOpen, onClose, billData, itemDefinitions, t }: BillPreviewProps) {
  if (!billData) return null;

  const handlePrint = () => {
    const printableContent = document.getElementById('bill-printable-area');
    if (printableContent) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write('<html><head><title>Print Bill</title>');
      // Add basic styling for print
      printWindow?.document.write(`
        <style>
          body { font-family: sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total-row td { font-weight: bold; }
          .header-info p { margin: 5px 0; }
          .no-print { display: none; }
        </style>
      `);
      printWindow?.document.write('</head><body>');
      printWindow?.document.write(printableContent.innerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.print();
    }
  };

  const itemsWithDisplayNames = billData.items.map(item => {
    const definition = itemDefinitions.find(def => def.value === item.itemName);
    const displayName = item.itemName === OTHER_ITEM_VALUE 
      ? item.customItemName || t('other')
      : definition?.label || item.itemName;
    return { ...item, displayName };
  });

  const totalBillAmount = itemsWithDisplayNames.reduce((sum, item) => {
    return sum + (Number(item.quantity) * Number(item.price));
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('billDetails')}</DialogTitle>
          <DialogDescription>
            {t('appName')} - {new Date().toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div id="bill-printable-area" className="flex-grow overflow-y-auto pr-2 space-y-4 py-4">
          <div className="header-info grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <p><strong>{t('userId')}:</strong> {billData.userId}</p>
            <p><strong>{t('partnerName')}:</strong> {billData.partnerName}</p>
            <p><strong>{t('userName')}:</strong> {billData.userName}</p>
            {billData.uploadedFile && (
              <p><strong>{t('uploadFile')}:</strong> {billData.uploadedFile.name}</p>
            )}
          </div>
          
          <h4 className="font-semibold text-md mt-4 mb-2">{t('itemsPurchased')}:</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 border">{t('itemName')}</th>
                  <th className="p-2 border text-right">{t('quantity')}</th>
                  <th className="p-2 border text-right">{t('pricePerUnit')}</th>
                  <th className="p-2 border text-right">{t('itemLineTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {itemsWithDisplayNames.map((item) => (
                  <tr key={item.id}>
                    <td className="p-2 border">{item.displayName}</td>
                    <td className="p-2 border text-right">{item.quantity}</td>
                    <td className="p-2 border text-right">{Number(item.price).toFixed(2)}</td>
                    <td className="p-2 border text-right">{(Number(item.quantity) * Number(item.price)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <Separator className="my-4"/>
          <div className="text-right font-bold text-lg">
            {t('totalBill')}: {totalBillAmount.toFixed(2)}
          </div>
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            {t('printBill')}
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {t('closeBill')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
