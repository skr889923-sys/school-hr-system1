import React, { useState, useEffect } from 'react';
import { EmployeeRequest } from '../types';
import { CheckCircle, Download, Loader2, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FileDown } from 'lucide-react';

interface ClientSuccessViewProps {
  request: EmployeeRequest;
}

export default function ClientSuccessView({ request }: ClientSuccessViewProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [hasAutoDownloaded, setHasAutoDownloaded] = useState(false);

  useEffect(() => {
    if (!hasAutoDownloaded) {
      // Small timeout to allow DOM to render fully before generating PDF
      const timer = setTimeout(() => {
        handleDownloadPDF();
        setHasAutoDownloaded(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasAutoDownloaded]);

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const element = document.getElementById('client-receipt-print');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`HR-Request-Receipt-${request.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6" dir="rtl">
      <div className="bg-white border border-blue-200 rounded-3xl p-8 sm:p-12 mb-6 flex flex-col items-center justify-center text-center shadow-lg animate-fade-in no-print relative overflow-hidden">
        {/* Background decorative blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
        
        <div className="bg-blue-100 text-blue-600 rounded-full w-20 h-20 flex items-center justify-center mb-6 shadow-sm relative z-10">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4 relative z-10">تم إرسال طلبك بنجاح!</h2>
        <p className="text-slate-600 font-medium text-lg mb-8 max-w-md relative z-10">
          شكراً لك يا <span className="font-bold text-slate-900">{request.employeeName}</span>. لقد استلمنا طلبك (رقم <span className="font-bold text-slate-900">{request.id}</span>). سيقوم قسم الموارد البشرية بمراجعته والتواصل معك.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full justify-center">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-8 py-4 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Printer size={20} />
            <span>طباعة الإيصال</span>
          </button>
          
          {request.finalPdfUrl ? (
            <a
              href={request.finalPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-8 py-4 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <FileDown size={20} />
              <span>تحميل المستند (PDF)</span>
            </a>
          ) : (
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="flex items-center justify-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
              <span>تحميل الإيصال (PDF)</span>
            </button>
          )}
        </div>
      </div>

      {/* Hidden/Printable Receipt Area */}
      <div className="absolute -left-[9999px] top-0 w-[800px] print:static print:w-auto">
        <div id="client-receipt-print" className="bg-white p-10 font-sans text-slate-900 border border-slate-200 shadow-sm rounded-xl" dir="rtl">
          <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-xl font-black text-slate-900 mb-1">مدرسة الأمير سعود بن عبدالله بن جلوي المتوسطة</h1>
              <p className="text-[12px] text-slate-500 font-bold">إدارة شؤون الموظفين - إيصال طلب إلكتروني</p>
            </div>
            <div className="text-left" dir="ltr">
              <h2 className="text-lg font-black uppercase text-slate-900 mb-1">HR Request</h2>
              <div className="text-sm font-mono text-slate-500">
                ID: <span className="font-bold text-slate-900">{request.id}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
            <h3 className="font-bold text-lg mb-4 border-b border-slate-200 pb-2">تفاصيل الموظف والطلب</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-slate-500 mb-1">اسم الموظف:</span>
                <span className="font-bold text-slate-900">{request.employeeName}</span>
              </div>
              <div>
                <span className="block text-slate-500 mb-1">الرقم الوظيفي:</span>
                <span className="font-bold text-slate-900">{request.employeeId}</span>
              </div>
              <div>
                <span className="block text-slate-500 mb-1">القسم / المرحلة:</span>
                <span className="font-bold text-slate-900">{request.department || '-'}</span>
              </div>
              <div>
                <span className="block text-slate-500 mb-1">تاريخ تقديم الطلب:</span>
                <span className="font-bold text-slate-900">{new Date(request.createdAt).toLocaleDateString('ar-SA')}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-slate-500 mb-1">نوع الطلب:</span>
                <span className="font-bold text-slate-900 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">{request.requestType}</span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-6 mb-8">
            <h3 className="font-bold text-lg mb-4 border-b border-slate-200 pb-2">البيانات الإضافية والمبررات</h3>
            <div className="text-sm">
              {request.startDate && (
                <div className="mb-3">
                  <span className="block text-slate-500 mb-1">تاريخ البدء:</span>
                  <span className="font-bold text-slate-900">{request.startDate}</span>
                </div>
              )}
              {request.endDate && (
                <div className="mb-3">
                  <span className="block text-slate-500 mb-1">تاريخ الانتهاء:</span>
                  <span className="font-bold text-slate-900">{request.endDate}</span>
                </div>
              )}
              <div>
                <span className="block text-slate-500 mb-1">المبررات / التفاصيل:</span>
                <span className="font-bold text-slate-900 whitespace-pre-wrap">{request.justification}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-slate-500 mt-12 pt-6 border-t border-slate-200">
            <p>هذا إيصال إلكتروني لإثبات تقديم الطلب عبر البوابة الداخلية للمدرسة.</p>
            <p className="mt-2 font-mono text-xs">Generated via HR Portal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
