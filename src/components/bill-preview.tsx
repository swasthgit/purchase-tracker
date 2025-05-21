// src/components/bill-preview.tsx
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { PurchaseFormValues } from "./purchase-form"; // Make sure this aligns with actual type in purchase-form
import type { UploadedFileMeta } from "@/types";
import { Download, CheckCircle, Printer, FileText } from "lucide-react";
import Image from 'next/image';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface BillPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  billData: (PurchaseFormValues & { id?: string; uploadedFiles: UploadedFileMeta[]; totalAmount: number }) | null;
  t: (key: string) => string;
  onDownloadExcel: () => void;
}

export function BillPreview({ isOpen, onClose, billData, t, onDownloadExcel }: BillPreviewProps) {
  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!billData) return null;

  const handlePrint = () => {
    const printableContent = document.getElementById('bill-printable-area');
    if (printableContent) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write('<html><head><title>Print Bill</title>');
      printWindow?.document.write(`
        <style>
          body { font-family: sans-serif; margin: 20px; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.875rem; }
          th { background-color: #f2f2f2; font-weight: 600; }
          .total-row td { font-weight: bold; }
          .header-info p { margin: 5px 0; font-size: 0.875rem; }
          .no-print { display: none; }
          .bill-title { text-align: center; font-size: 1.5rem; margin-bottom: 1rem; color: #000; }
          .dialog-description { text-align: center; font-size: 0.8rem; margin-bottom: 1rem; color: #555;}
          .section-title { font-weight: 600; font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
          .total-amount { font-size: 1.125rem; font-weight: bold; text-align: right; margin-top: 1rem; }
          .uploaded-files-list { list-style: none; padding: 0; }
          .uploaded-files-list li { margin-bottom: 5px; font-size: 0.8rem; }
          .uploaded-files-list img { max-width: 50px; max-height: 50px; margin-right: 5px; vertical-align: middle; border: 1px solid #eee; }
        </style>
      `);
      printWindow?.document.write('</head><body>');
      printWindow?.document.write(`<h1 class="bill-title">${t('billDetails')}</h1>`);
      printWindow?.document.write(`<p class="dialog-description">${t('appName')} - ${new Date(billData.createdAt?.seconds ? billData.createdAt.seconds * 1000 : Date.now()).toLocaleString()}</p>`);
      
      // Clone the printable area and remove the buttons section for printing
      const contentToPrint = printableContent.cloneNode(true) as HTMLElement;
      const buttonsSection = contentToPrint.querySelector('.print-buttons-section');
      if (buttonsSection) buttonsSection.parentNode?.removeChild(buttonsSection);
      
      printWindow?.document.write(contentToPrint.innerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.print();
    }
  };
  

  const handleDownloadImagesAsPDF = async () => {
    if (!billData || !billData.uploadedFiles || billData.uploadedFiles.length === 0) {
      toast({ variant: "destructive", title: t('pdfGenerationFailed'), description: t('noImagesToConvertToPDF') });
      return;
    }

    const imageFiles = billData.uploadedFiles.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast({ variant: "destructive", title: t('pdfGenerationFailed'), description: t('noImagesToConvertToPDF') });
      return;
    }

    setIsGeneratingPdf(true);
    toast({ title: t('generatingPDF') });

    try {
      const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait, millimeters, A4
      const pageMargin = 10; // mm
      const pageWidth = pdf.internal.pageSize.getWidth() - 2 * pageMargin;
      const pageHeight = pdf.internal.pageSize.getHeight() - 2 * pageMargin;

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        if (i > 0) {
          pdf.addPage();
        }
        
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new window.Image();
          image.crossOrigin = "anonymous"; // Important for fetching images from other domains (like Firebase Storage)
          image.onload = () => resolve(image);
          image.onerror = (eventOrMessage) => { // Changed parameter name
            let reason = "Unknown error";
            if (typeof eventOrMessage === 'string') {
              reason = eventOrMessage;
            } else if (eventOrMessage instanceof Event) { // Check if it's an Event object
              reason = `Network error or CORS issue (event type: ${eventOrMessage.type})`;
            } else if (eventOrMessage instanceof Error) { // Check if it's an Error object
              reason = eventOrMessage.message;
            }
            console.error("Error loading image for PDF:", file.url, "Reason:", reason, "Details:", eventOrMessage);
            reject(new Error(`Failed to load image '${file.name}'. Ensure CORS is configured on Firebase Storage. Reason: ${reason}`));
          };
          image.src = file.url;
        });

        const imgWidth = img.width;
        const imgHeight = img.height;
        const aspectRatio = imgWidth / imgHeight;

        let pdfImgWidth = pageWidth;
        let pdfImgHeight = pageWidth / aspectRatio;

        if (pdfImgHeight > pageHeight) {
          pdfImgHeight = pageHeight;
          pdfImgWidth = pageHeight * aspectRatio;
        }
        
        // Center image
        const x = pageMargin + (pageWidth - pdfImgWidth) / 2;
        const y = pageMargin + (pageHeight - pdfImgHeight) / 2;

        pdf.addImage(img, file.type.split('/')[1].toUpperCase(), x, y, pdfImgWidth, pdfImgHeight);
      }
      pdf.save(`Uploaded_Images_${billData.userId || 'bill'}.pdf`);
      toast({ title: t('pdfGeneratedSuccess') });
    } catch (error) {
      console.error("Error generating PDF with images:", error);
      toast({ variant: "destructive", title: t('pdfGenerationFailed'), description: (error as Error).message || "Could not create PDF." });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const itemsWithDisplayNames = billData.items;
  const totalBillAmount = billData.totalAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center sm:text-left">{t('billDetails')}</DialogTitle>
          <DialogDescription className="text-center sm:text-left">
            {t('appName')} - {new Date(billData.createdAt?.seconds ? billData.createdAt.seconds * 1000 : Date.now()).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div id="bill-printable-area" className="flex-grow overflow-y-auto pr-2 space-y-4 py-4">
          <div className="header-info grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <p><strong>{t('userId')}:</strong> {billData.userId}</p>
            <p><strong>{t('partnerName')}:</strong> {billData.partnerName}</p>
            <p><strong>{t('userName')}:</strong> {billData.userName}</p>
          </div>
          
          {billData.uploadedFiles && billData.uploadedFiles.length > 0 && (
            <>
              <h4 className="font-semibold text-md mt-4 mb-2 section-title">{t('uploadedFilesLabel')}:</h4>
              <ul className="uploaded-files-list space-y-1 text-sm">
                {billData.uploadedFiles.map((file, index) => (
                  <li key={index} className="flex items-center">
                    {file.type.startsWith('image/') ? (
                       <Image src={file.url} alt={file.name} width={30} height={30} className="mr-2 rounded object-cover border" data-ai-hint="uploaded image" />
                    ) : (
                      <FileText className="w-5 h-5 mr-2 text-muted-foreground" />
                    )}
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                      {file.name}
                    </a>
                    <span className="text-xs text-muted-foreground ml-2">({(file.size / 1024).toFixed(1)} KB)</span>
                  </li>
                ))}
              </ul>
              <Separator className="my-3"/>
            </>
          )}
          
          <h4 className="font-semibold text-md mt-4 mb-2 section-title">{t('itemsPurchased')}:</h4>
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
                    <td className="p-2 border">{item.itemNameDisplay}</td>
                    <td className="p-2 border text-right">{item.quantity}</td>
                    <td className="p-2 border text-right">{Number(item.price).toFixed(2)}</td>
                    <td className="p-2 border text-right">{(Number(item.quantity) * Number(item.price)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <Separator className="my-4"/>
          <div className="text-right font-bold text-lg total-amount">
            {t('totalBill')}: {Number(totalBillAmount).toFixed(2)}
          </div>
        </div>
        <DialogFooter className="mt-auto pt-4 border-t flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2 print-buttons-section">
          <Button variant="outline" onClick={handlePrint} className="w-full sm:w-auto">
            <Printer className="mr-2 h-4 w-4" />
            {t('printBill')}
          </Button>
          <Button variant="secondary" onClick={onDownloadExcel} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            {t('downloadExcel')}
          </Button>
          {billData.uploadedFiles && billData.uploadedFiles.some(f => f.type.startsWith('image/')) && (
            <Button 
              variant="secondary" 
              onClick={handleDownloadImagesAsPDF} 
              className="w-full sm:w-auto"
              disabled={isGeneratingPdf}
            >
              <FileText className="mr-2 h-4 w-4" />
              {isGeneratingPdf ? t('generatingPDF') : t('downloadUploadedImagesPDF')}
            </Button>
          )}
          <Button type="button" onClick={onClose} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            <CheckCircle className="mr-2 h-4 w-4" />
            {t('finishBill')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

