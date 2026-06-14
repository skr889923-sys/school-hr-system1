import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import SignatureCanvas from 'react-signature-canvas';
import { PdfField } from '../types';
import { Trash2, PenTool } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  pdfUrl: string;
  fields: PdfField[];
  fieldValues: Record<string, string>;
  onFieldChange: (id: string, value: string) => void;
  signatures: Record<string, string>;
  onSignatureChange: (id: string, dataUrl: string | null) => void;
}

export default function PdfFormFiller({
  pdfUrl,
  fields,
  fieldValues,
  onFieldChange,
  signatures,
  onSignatureChange
}: Props) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PDF_WIDTH = 800;
  
  // Refs for signature pads mapped by field id
  const sigPads = useRef<{ [id: string]: SignatureCanvas | null }>({});

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleSignatureEnd = (id: string) => {
    const pad = sigPads.current[id];
    if (pad && !pad.isEmpty()) {
      onSignatureChange(id, pad.toDataURL('image/png'));
    }
  };

  const clearSignature = (id: string) => {
    const pad = sigPads.current[id];
    if (pad) pad.clear();
    onSignatureChange(id, null);
  };

  const currentPageFields = fields.filter(f => f.page === currentPage);

  return (
    <div className="flex flex-col items-center bg-slate-50 p-4 rounded-xl border border-slate-200 min-h-[600px] overflow-hidden">
      {/* Pagination */}
      {numPages && numPages > 1 && (
        <div className="flex items-center gap-4 mb-4 bg-white px-4 py-2 rounded-full shadow-sm">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="text-sm text-blue-600 disabled:text-slate-400 font-bold"
          >
            السابق
          </button>
          <span className="text-sm font-medium text-slate-700">صفحة {currentPage} من {numPages}</span>
          <button
            type="button"
            disabled={currentPage >= numPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="text-sm text-blue-600 disabled:text-slate-400 font-bold"
          >
            التالي
          </button>
        </div>
      )}

      {/* PDF Container */}
      <div 
        className="relative bg-white shadow-lg overflow-x-auto w-full max-w-full flex justify-center" 
        style={{ direction: 'ltr' }}
      >
        <div className="relative" style={{ width: PDF_WIDTH }}>
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="p-12 text-center text-slate-500">جاري تحميل النموذج...</div>}
            error={<div className="p-12 text-center text-red-500">حدث خطأ أثناء تحميل الـ PDF</div>}
          >
            <Page 
              pageNumber={currentPage} 
              width={PDF_WIDTH}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>

          {/* Render inputs overlay */}
          {currentPageFields.map(field => {
            const isSignature = field.type === 'signature';
            const isLongText = field.type === 'long-text';
            
            return (
              <div
                key={field.id}
                className="absolute"
                style={{
                  left: field.x,
                  top: field.y,
                  width: field.width,
                  height: field.height,
                  direction: 'rtl'
                }}
              >
                {isSignature ? (
                  <div className="relative w-full h-full bg-blue-50/50 border-2 border-dashed border-blue-400 rounded group flex items-center justify-center">
                    {!signatures[field.id] && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-blue-500 opacity-50">
                        <PenTool size={24} className="mb-1" />
                        <span className="text-xs font-bold">{field.label}</span>
                      </div>
                    )}
                    <SignatureCanvas
                      ref={(ref) => { sigPads.current[field.id] = ref; }}
                      penColor="blue"
                      canvasProps={{
                        className: 'w-full h-full cursor-crosshair relative z-10',
                      }}
                      onEnd={() => handleSignatureEnd(field.id)}
                    />
                    {signatures[field.id] && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); clearSignature(field.id); }}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm hover:bg-rose-600"
                        title="مسح التوقيع"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ) : isLongText ? (
                  <textarea
                    value={fieldValues[field.id] || ''}
                    onChange={(e) => onFieldChange(field.id, e.target.value)}
                    placeholder={field.label}
                    className="w-full h-full bg-blue-50/80 border border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded p-2 text-sm outline-none resize-none backdrop-blur-sm"
                  />
                ) : (
                  <input
                    type={field.type === 'date' ? 'date' : 'text'}
                    value={fieldValues[field.id] || ''}
                    onChange={(e) => onFieldChange(field.id, e.target.value)}
                    placeholder={field.label}
                    className="w-full h-full bg-blue-50/80 border border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 text-sm outline-none backdrop-blur-sm"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
