import { PDFDocument } from 'pdf-lib';
import { SignatureBox } from '../types';

/**
 * Merges a base64 signature image onto an existing PDF buffer/URL at the specified box.
 */
export async function stampSignatureOnPdf(
  originalPdfBytes: ArrayBuffer,
  signatureBase64: string,
  box: SignatureBox
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  
  // Extract base64 part
  const base64Data = signatureBase64.split(',')[1] || signatureBase64;
  
  // Embed the signature image (assuming PNG from react-signature-canvas)
  let signatureImage;
  try {
    signatureImage = await pdfDoc.embedPng(base64Data);
  } catch (err) {
    // fallback if it's somehow jpeg
    signatureImage = await pdfDoc.embedJpg(base64Data);
  }

  const pages = pdfDoc.getPages();
  const pageIndex = Math.min(box.pageIndex, pages.length - 1);
  const page = pages[pageIndex];

  // pdf-lib coordinates are from bottom-left corner
  page.drawImage(signatureImage, {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  });

  return await pdfDoc.save();
}
