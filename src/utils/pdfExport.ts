import { PDFDocument } from 'pdf-lib';
import type { ScannedPage } from '../types';

export interface PdfExportOptions {
  pageSize?: 'a4' | 'fit';
  quality?: number; // 0.1 to 1.0
  title?: string;
}

export async function generatePdf(
  pages: ScannedPage[],
  options: PdfExportOptions = {}
): Promise<Uint8Array> {
  const { pageSize = 'a4' } = options;
  const pdfDoc = await PDFDocument.create();

  for (const page of pages) {
    const dataUrl = page.processedImageDataUrl || page.originalImageDataUrl;
    if (!dataUrl) continue;

    // Convert dataUrl to bytes
    const base64Data = dataUrl.split(',')[1];
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    let embeddedImage;
    if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    } else {
      embeddedImage = await pdfDoc.embedPng(imageBytes);
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    if (pageSize === 'a4') {
      // Standard A4 dimensions in points (72 DPI): 595.28 x 841.89
      const a4Width = 595.28;
      const a4Height = 841.89;
      const pdfPage = pdfDoc.addPage([a4Width, a4Height]);

      // Calculate scale to fit with 20pt margin
      const margin = 20;
      const availWidth = a4Width - margin * 2;
      const availHeight = a4Height - margin * 2;

      const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      const x = (a4Width - drawWidth) / 2;
      const y = (a4Height - drawHeight) / 2;

      pdfPage.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    } else {
      // Direct image fit
      const pdfPage = pdfDoc.addPage([imgWidth, imgHeight]);
      pdfPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: imgWidth,
        height: imgHeight,
      });
    }
  }

  return await pdfDoc.save();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
