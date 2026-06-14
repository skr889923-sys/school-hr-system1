import { PDFDocument } from 'pdf-lib';
import { PdfField } from '../types';

function createTextCanvasImage(text: string, width: number, height: number, isLongText: boolean): string {
  const canvas = document.createElement('canvas');
  const scale = 2; // High resolution for sharpness
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);
  
  ctx.fillStyle = '#1e3a8a'; // A dark blue ink color
  ctx.font = 'bold 16px Arial, sans-serif'; 
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  if (isLongText) {
    // Basic word wrap
    const words = text.split(' ');
    let line = '';
    let y = 5;
    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > width - 10 && n > 0) {
        ctx.fillText(line, width - 5, y);
        line = words[n] + ' ';
        y += 24; // line height
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, width - 5, y);
  } else {
    // Vertically center
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width - 5, height / 2);
  }

  return canvas.toDataURL('image/png');
}

export async function fillPdfFields(
  originalPdfBytes: ArrayBuffer,
  fields: PdfField[],
  fieldValues: Record<string, string>,
  signatures: Record<string, string>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();

  for (const field of fields) {
    const pageIndex = Math.min(field.page - 1, pages.length - 1);
    if (pageIndex < 0) continue;
    
    const page = pages[pageIndex];
    
    // Pdf-lib coordinates have origin at bottom-left
    // Web coordinates have origin at top-left
    const { width: pdfPageWidth, height: pdfPageHeight } = page.getSize();
    
    // Scale factor from our web UI (800px) to actual PDF points
    const scaleX = pdfPageWidth / 800;
    
    // React-pdf usually scales height proportionally
    const webHeight = (800 / pdfPageWidth) * pdfPageHeight;
    const scaleY = pdfPageHeight / webHeight;

    const actualX = field.x * scaleX;
    const actualWidth = field.width * scaleX;
    const actualHeight = field.height * scaleY;
    
    // In pdf-lib, y=0 is bottom. In web, y=0 is top.
    const actualY = pdfPageHeight - ((field.y + field.height) * scaleY);

    if (field.type === 'signature') {
      const sigData = signatures[field.id];
      if (sigData) {
        const base64Data = sigData.split(',')[1] || sigData;
        try {
          const signatureImage = await pdfDoc.embedPng(base64Data);
          page.drawImage(signatureImage, {
            x: actualX,
            y: actualY,
            width: actualWidth,
            height: actualHeight,
          });
        } catch (e) {
          console.error('Failed to embed signature', e);
        }
      }
    } else {
      const val = fieldValues[field.id];
      if (val) {
        const dataUrl = createTextCanvasImage(val, field.width, field.height, field.type === 'long-text');
        const base64Data = dataUrl.split(',')[1];
        if (base64Data) {
          try {
            const textImage = await pdfDoc.embedPng(base64Data);
            page.drawImage(textImage, {
              x: actualX,
              y: actualY,
              width: actualWidth,
              height: actualHeight,
            });
          } catch (e) {
             console.error('Failed to embed text', e);
          }
        }
      }
    }
  }

  return await pdfDoc.save();
}
