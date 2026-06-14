import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Rnd } from 'react-rnd';
import { Plus, Trash2, GripHorizontal } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { PdfField, PdfFieldType } from '../types';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Props {
  pdfUrl: string;
  fields: PdfField[];
  onChange: (fields: PdfField[]) => void;
}

export default function PdfFieldMapper({ pdfUrl, fields, onChange }: Props) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const PDF_WIDTH = 800;

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const addField = (type: PdfFieldType) => {
    let label = 'حقل جديد';
    if (type === 'text') label = 'نص قصير';
    if (type === 'long-text') label = 'نص طويل';
    if (type === 'date') label = 'تاريخ';
    if (type === 'signature') label = 'توقيع المعلم';

    const newField: PdfField = {
      id: uuidv4(),
      type,
      label,
      x: 50,
      y: 50,
      width: type === 'signature' ? 200 : 150,
      height: type === 'signature' ? 100 : (type === 'long-text' ? 80 : 40),
      page: currentPage,
    };
    onChange([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<PdfField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const currentPageFields = fields.filter(f => f.page === currentPage);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar Controls */}
      <div className="w-full md:w-64 flex flex-col gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">إضافة حقول</h3>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => addField('text')} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors text-sm text-right">
              <Plus size={16} /> نص (اسم، مسمى..)
            </button>
            <button type="button" onClick={() => addField('long-text')} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors text-sm text-right">
              <Plus size={16} /> مربع إفادة / رد
            </button>
            <button type="button" onClick={() => addField('date')} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors text-sm text-right">
              <Plus size={16} /> تاريخ
            </button>
            <button type="button" onClick={() => addField('signature')} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors text-sm text-right">
              <Plus size={16} /> مربع توقيع
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex-1 overflow-y-auto">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">الحقول في هذه الصفحة</h3>
          {currentPageFields.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">لا توجد حقول. اضغط أعلاه للإضافة.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {currentPageFields.map(field => (
                <div key={field.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                      {field.type === 'signature' ? 'توقيع' : field.type === 'date' ? 'تاريخ' : field.type === 'long-text' ? 'نص طويل' : 'نص قصير'}
                    </span>
                    <button type="button" onClick={() => removeField(field.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    className="text-sm border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none w-full"
                    placeholder="عنوان الحقل (يظهر للمعلم)"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDF View */}
      <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 p-4 flex flex-col items-center min-h-[600px] overflow-hidden">
        {/* Pagination */}
        {numPages && numPages > 1 && (
          <div className="flex items-center gap-4 mb-4 bg-white px-4 py-2 rounded-full shadow-sm">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="text-sm text-blue-600 disabled:text-slate-400"
            >
              السابق
            </button>
            <span className="text-sm font-medium text-slate-700">صفحة {currentPage} من {numPages}</span>
            <button
              type="button"
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="text-sm text-blue-600 disabled:text-slate-400"
            >
              التالي
            </button>
          </div>
        )}

        <div className="relative w-full max-w-[800px] bg-white shadow-lg mx-auto" ref={containerRef} style={{ direction: 'ltr' }}>
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="w-full flex justify-center"
            loading={<div className="p-12 text-slate-500">جاري تحميل القالب...</div>}
            error={<div className="p-12 text-red-500">حدث خطأ أثناء تحميل الـ PDF</div>}
          >
            <Page 
              pageNumber={currentPage} 
              width={PDF_WIDTH}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="w-full"
            />
          </Document>

          {/* Render draggable fields overlay */}
          {currentPageFields.map(field => (
            <Rnd
              key={field.id}
              bounds="parent"
              size={{ width: field.width, height: field.height }}
              position={{ x: field.x, y: field.y }}
              onDragStop={(e, d) => {
                updateField(field.id, { x: d.x, y: d.y });
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                updateField(field.id, {
                  width: parseInt(ref.style.width),
                  height: parseInt(ref.style.height),
                  ...position,
                });
              }}
              className={`absolute border-2 shadow-sm rounded flex flex-col overflow-hidden bg-white/80 backdrop-blur-sm group ${
                field.type === 'signature' ? 'border-indigo-500' : 'border-blue-500'
              }`}
            >
              <div className={`h-6 w-full flex items-center justify-between px-2 cursor-move ${
                field.type === 'signature' ? 'bg-indigo-500 text-white' : 'bg-blue-500 text-white'
              }`}>
                <div className="flex items-center gap-1">
                  <GripHorizontal size={14} />
                  <span className="text-xs font-medium truncate" style={{ direction: 'rtl' }}>{field.label}</span>
                </div>
              </div>
              <div className="flex-1 p-2 flex items-center justify-center pointer-events-none opacity-50" style={{ direction: 'rtl' }}>
                <span className="text-sm font-medium text-slate-700">
                  {field.type === 'signature' ? '[مكان التوقيع]' : field.type === 'date' ? '[التاريخ]' : field.type === 'long-text' ? '[مكان الإفادة]' : '[نص قصير]'}
                </span>
              </div>
            </Rnd>
          ))}
        </div>
      </div>
    </div>
  );
}
