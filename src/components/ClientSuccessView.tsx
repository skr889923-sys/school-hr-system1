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
        <h2 className="text-3xl font-black text-slate-900 mb-4 relative z-10">تم الاستلام بنجاح</h2>
        <p className="text-slate-600 font-medium text-lg mb-8 max-w-md relative z-10 leading-relaxed">
          الزميل المكرّم <span className="font-bold text-slate-900">{request.employeeName}</span>،<br />
          لقد تم استلام نموذجكم بنجاح (رقم الطلب: <span className="font-bold text-slate-900">{request.id}</span>).<br />
          نشكر لكم حرصكم وتعاونكم الدائم، ونتمنى لكم يوماً سعيداً.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full justify-center">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-8 py-4 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Printer size={20} />
            <span>طباعة</span>
          </button>
          
          {request.finalPdfUrl ? (
            <a
              href={request.finalPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-8 py-4 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <FileDown size={20} />
              <span>حفظ</span>
            </a>
          ) : (
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="flex items-center justify-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
              <span>حفظ</span>
            </button>
          )}
        </div>
      </div>

      {/* Hidden/Printable Receipt Area */}
      <div className="absolute -left-[9999px] top-0 w-[800px] print:static print:w-auto">
        <div id="client-receipt-print" className="p-10 font-sans shadow-sm rounded-xl" style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#e2e8f0', borderWidth: 1, borderStyle: 'solid' }} dir="rtl">
          <div className="pb-6 mb-8 flex justify-between items-end" style={{ borderBottomWidth: 2, borderColor: '#0f172a', borderStyle: 'solid' }}>
            <div>
              <h1 className="text-xl font-black mb-1" style={{ color: '#0f172a' }}>مدرسة الأمير سعود بن عبدالله بن جلوي المتوسطة</h1>
              <p className="text-[12px] font-bold" style={{ color: '#64748b' }}>إدارة شؤون الموظفين - إشعار استلام إلكتروني</p>
            </div>
            <div className="text-left" dir="ltr">
              <h2 className="text-lg font-black uppercase mb-1" style={{ color: '#0f172a' }}>HR Request</h2>
              <div className="text-sm font-mono" style={{ color: '#64748b' }}>
                ID: <span className="font-bold" style={{ color: '#0f172a' }}>{request.id}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1, borderStyle: 'solid' }}>
            <h3 className="font-bold text-lg mb-4 pb-2" style={{ borderBottomWidth: 1, borderColor: '#e2e8f0', borderStyle: 'solid' }}>تفاصيل الموظف والرد</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block mb-1" style={{ color: '#64748b' }}>اسم الموظف:</span>
                <span className="font-bold" style={{ color: '#0f172a' }}>{request.employeeName}</span>
              </div>
              <div>
                <span className="block mb-1" style={{ color: '#64748b' }}>الرقم الوظيفي:</span>
                <span className="font-bold" style={{ color: '#0f172a' }}>{request.employeeId}</span>
              </div>
              <div>
                <span className="block mb-1" style={{ color: '#64748b' }}>القسم / المرحلة:</span>
                <span className="font-bold" style={{ color: '#0f172a' }}>{request.department || '-'}</span>
              </div>
              <div>
                <span className="block mb-1" style={{ color: '#64748b' }}>تاريخ التقديم:</span>
                <span className="font-bold" style={{ color: '#0f172a' }}>{new Date(request.createdAt).toLocaleDateString('ar-SA')}</span>
              </div>
              <div className="col-span-2">
                <span className="block mb-1" style={{ color: '#64748b' }}>نوع الإجراء:</span>
                <span className="font-bold px-2 py-0.5 rounded text-xs" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>{request.requestType}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-6 mb-8" style={{ borderColor: '#e2e8f0', borderWidth: 1, borderStyle: 'solid' }}>
            <h3 className="font-bold text-lg mb-4 pb-2" style={{ borderBottomWidth: 1, borderColor: '#e2e8f0', borderStyle: 'solid' }}>البيانات الإضافية والمبررات</h3>
            <div className="text-sm">
              {request.startDate && (
                <div className="mb-3">
                  <span className="block mb-1" style={{ color: '#64748b' }}>تاريخ البدء:</span>
                  <span className="font-bold" style={{ color: '#0f172a' }}>{request.startDate}</span>
                </div>
              )}
              {request.endDate && (
                <div className="mb-3">
                  <span className="block mb-1" style={{ color: '#64748b' }}>تاريخ الانتهاء:</span>
                  <span className="font-bold" style={{ color: '#0f172a' }}>{request.endDate}</span>
                </div>
              )}
              <div>
                <span className="block mb-1" style={{ color: '#64748b' }}>المبررات / التفاصيل:</span>
                <span className="font-bold whitespace-pre-wrap" style={{ color: '#0f172a' }}>{request.justification}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-sm mt-12 pt-6" style={{ color: '#64748b', borderTopWidth: 1, borderColor: '#e2e8f0', borderStyle: 'solid' }}>
            <p>هذا إشعار إلكتروني لإثبات استلام الرد عبر البوابة الداخلية للمدرسة.</p>
            <p className="mt-2 font-mono text-xs">Generated via HR Portal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
