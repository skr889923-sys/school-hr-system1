import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { uploadFile } from '../utils/storage';
import {
  EmployeeRequest,
  HRRequestType,
  REQUEST_TYPES,
  AttachmentFile,
  LetterTemplate,
} from '../types';
import ClientSuccessView from '../components/ClientSuccessView';
import { renderTemplateContent } from '../utils/templateFields';
import DOMPurify from 'dompurify';

import {
  Info,
  Upload,
  FileText,
  Loader2,
} from 'lucide-react';

export default function ClientForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<EmployeeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [template, setTemplate] = useState<LetterTemplate | null>(null);
  
  // Real files chosen by user for uploading
  const [additionalFileBlobs, setAdditionalFileBlobs] = useState<File[]>([]);

  // References for Canvas Signature Drawer
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    document.title = "نموذج شؤون الموظفين | مدرسة الأمير سعود";
  }, []);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) return;
      try {
        const { data } = await supabase
          .from('hr_requests')
          .select('*')
          .eq('id', id)
          .single();

        if (data) {
          setRequest({
            ...data,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            employeeName: data.employee_name || '',
            employeeId: data.employee_id || '',
            jobTitle: data.job_title || '',
            requestType: data.request_type || '',
            startDate: data.start_date,
            endDate: data.end_date,
            agreedToTerms: data.agreed_to_terms || false,
            signatureData: data.signature_data,
            adminNotes: data.admin_notes,
            adminAttachments: data.admin_attachments || [],
            templateId: data.template_id,
            templateData: data.template_data || {},
            finalPdfUrl: data.final_pdf_url,
            auditTrail: data.audit_trail || [],
            attachments: data.attachments || [],
          } as unknown as EmployeeRequest);
          
          if (data.template_id) {
            const { data: tData } = await supabase.from('hr_templates').select('*').eq('id', data.template_id).single();
            if (tData) {
              setTemplate({
                id: tData.id,
                name: tData.name,
                type: tData.type,
                content: tData.content,
                pdfUrl: tData.pdf_url,
                createdAt: tData.created_at || new Date().toISOString()
              });
            }
          }
        } else {
          // If the URL has an ID but not found in DB, show error
          setRequest({
            id: id,
            employeeName: '',
            employeeId: '',
            department: '',
            jobTitle: '',
            phone: '',
            email: '',
            requestType: '',
            justification: '',
            attachments: [],
            agreedToTerms: false,
            createdAt: new Date().toISOString(),
            status: 'pending_employee_response'
          });
        }
      } catch (err) {
        console.error("Error fetching request:", err);
        setError('حدث خطأ أثناء جلب تفاصيل الطلب.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [id]);

  // Form Fields Change handler
  const updateFormField = <K extends keyof EmployeeRequest>(
    key: K,
    value: EmployeeRequest[K]
  ) => {
    setRequest(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: value,
      };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files);

    setAdditionalFileBlobs(prev => [...prev, ...fileList]);
    
    const newFiles: AttachmentFile[] = fileList.map((file) => {
      const item: AttachmentFile = {
        name: file.name,
        size: file.size,
        type: file.type,
      };
      if (file.type.startsWith('image/')) {
        item.previewUrl = URL.createObjectURL(file);
      }
      return item;
    });

    const existing = request?.attachments || [];
    updateFormField('attachments', [...existing, ...newFiles]);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#2563eb'; // Blue color for signature
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 1;
    ctx.shadowColor = 'rgba(37, 99, 235, 0.3)';

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const signatureData = canvas.toDataURL();
    updateFormField('signatureData', signatureData);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateFormField('signatureData', undefined);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!request || !id) return;

    // Validations
    if (!request.employeeName.trim()) {
      setFormError('يرجى كتابة اسم الموظف.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!request.requestType) {
      setFormError('يرجى اختيار نوع الطلب.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!request.agreedToTerms) {
      setFormError('يجب الموافقة على صحة البيانات.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalAttachments = request.attachments;

      if (additionalFileBlobs.length > 0) {
        const uploadedAdditions = await Promise.all(additionalFileBlobs.map(async file => {
           const result = await uploadFile(file, id);
           return {
              name: file.name,
              size: file.size,
              type: file.type,
              downloadUrl: result.downloadUrl,
              storagePath: result.storagePath
           };
        }));
        // Filter out blobs without a download URL and replace with the real uploaded ones
        finalAttachments = [...(request.attachments?.filter(a => !!a.downloadUrl) || []), ...uploadedAdditions];
      }

      let finalPdfUrl = undefined;
      // Generate Template PDF if applicable
      if (request.templateId && request.signatureData) {
        try {
          const { data: tmpl } = await supabase
            .from('hr_templates')
            .select('*')
            .eq('id', request.templateId)
            .single();

          if (tmpl) {
            if (tmpl.type === 'pdf' && tmpl.pdf_url && tmpl.signature_box) {
              const response = await fetch(tmpl.pdf_url);
              const originalPdfBytes = await response.arrayBuffer();
              const { stampSignatureOnPdf } = await import('../utils/pdfService');
              const mergedPdfBytes = await stampSignatureOnPdf(originalPdfBytes, request.signatureData, tmpl.signature_box as any);
              
              const pdfBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
              const pdfFile = new File([pdfBlob], `signed_${id}.pdf`, { type: 'application/pdf' });
              
              const uploadResult = await uploadFile(pdfFile, id);
              finalPdfUrl = uploadResult.downloadUrl;
            }
          }
        } catch (err) {
          console.error("Error merging PDF template:", err);
        }
      }

      const updatedRequestData = {
        ...request,
        attachments: finalAttachments,
        ...(finalPdfUrl ? { finalPdfUrl } : {}),
        status: 'submitted_by_employee' as const,
        updatedAt: new Date().toISOString()
      };

      const updatedPayload = {
        employee_name: updatedRequestData.employeeName,
        employee_id: updatedRequestData.employeeId,
        department: updatedRequestData.department,
        job_title: updatedRequestData.jobTitle,
        phone: updatedRequestData.phone,
        email: updatedRequestData.email,
        request_type: updatedRequestData.requestType,
        start_date: updatedRequestData.startDate || null,
        end_date: updatedRequestData.endDate || null,
        justification: updatedRequestData.justification,
        attachments: updatedRequestData.attachments,
        agreed_to_terms: updatedRequestData.agreedToTerms,
        signature_data: updatedRequestData.signatureData || null,
        final_pdf_url: updatedRequestData.finalPdfUrl || null,
        status: updatedRequestData.status,
        updated_at: updatedRequestData.updatedAt
      };

      // Check if it exists to know whether to insert or update
      const { data: existing } = await supabase.from('hr_requests').select('id').eq('id', id).single();
      if (existing) {
        await supabase.from('hr_requests').update(updatedPayload).eq('id', id);
      } else {
        await supabase.from('hr_requests').insert({ id, ...updatedPayload, created_at: updatedRequestData.createdAt });
      }

      // Send Email Notification (stubbed or use emailjs)
      try {
        const { sendOrderConfirmationEmail } = await import('../emailService');
        await sendOrderConfirmationEmail(updatedRequestData as any);
      } catch (emailErr) {
        console.error('Error sending confirmation email:', emailErr);
      }

      setRequest(prev => prev ? { ...prev, status: 'submitted_by_employee', attachments: finalAttachments } : prev);
      
      // Clear blobs
      setAdditionalFileBlobs([]);
      
    } catch (err) {
      console.error("Error submitting request:", err);
      setFormError('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-600 font-bold text-sm">جاري تحميل الاستمارة...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center text-center px-4" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
          <h2 className="text-xl font-black text-slate-900 mb-2">عذراً</h2>
          <p className="text-slate-500">{error || 'لم يتم العثور على الطلب.'}</p>
        </div>
      </div>
    );
  }

  // If the request is already submitted, show the success and ClientSuccessView for the client
  if (request.status !== 'pending' && request.status !== 'pending_employee_response') {
    return (
      <div className="min-h-screen bg-[#FAF9F6]">
        <header className="no-print bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 py-4 px-6 sm:px-12 flex justify-between items-center">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            بوابة الموظف / تسجيل الدخول
          </button>
          <div className="flex items-center gap-3">
            <span className="font-black text-slate-800 text-lg">School System</span>
            <img src="/logo.png" alt="School System Logo" className="h-10 object-contain" />
          </div>
        </header>
        <ClientSuccessView request={request} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 pb-16 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <header className="no-print bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 py-4 px-6 sm:px-12 flex justify-between items-center">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
        >
          بوابة الموظف / تسجيل الدخول
        </button>
        <div className="flex items-center gap-3">
          <span className="font-black text-slate-800 text-lg">School System</span>
          <img src="/logo.png" alt="School System Logo" className="h-10 object-contain" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-10 py-8">
        <div className="animate-fade-in" dir="rtl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-slate-200 pb-5">
            <div>
              <h2 className="text-2xl font-black text-slate-950 flex items-center gap-2">
                <span>نموذج شؤون الموظفين (HR)</span>
                <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
                  {request.id}
                </span>
              </h2>
            </div>
          </div>

          {formError && (
            <div className="bg-rose-50 border-r-4 border-rose-600 p-4 rounded-xl mb-6 text-rose-900 text-xs flex items-start gap-2 animate-fade-in">
              <Info size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold mb-1">تنبيه:</h4>
                <p className="leading-relaxed font-semibold">{formError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-10 shadow-sm">
            
            {/* القسم 1: تفاصيل الطلب */}
            <div className="space-y-4">
              <div className="border-r-4 border-blue-600 pr-3">
                <h3 className="text-base font-extrabold text-[#1C1C1C]">القسم 1 — محتوى الخطاب / الإجراء</h3>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 sm:p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">نوع الطلب / الإجراء</label>
                  <div className="w-full text-sm border border-slate-200 bg-slate-100 px-4 py-3 rounded-xl font-bold text-blue-900 cursor-not-allowed">
                    {request.requestType || 'غير محدد'}
                  </div>
                </div>

                {(request.requestType === 'طلب إجازة عادية/مرضية' || request.requestType === 'طلب استئذان') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">تاريخ البدء</label>
                      <input
                        type="date"
                        value={request.startDate || ''}
                        onChange={(e) => updateFormField('startDate', e.target.value)}
                        className="w-full text-xs border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3.5 py-3 rounded-xl font-semibold bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">تاريخ الانتهاء</label>
                      <input
                        type="date"
                        value={request.endDate || ''}
                        onChange={(e) => updateFormField('endDate', e.target.value)}
                        className="w-full text-xs border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-3.5 py-3 rounded-xl font-semibold bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {template && (
                  <div className="mb-6 w-full overflow-x-auto py-2">
                    {template.type === 'text' && template.content ? (
                      <div id="pdf-content-wrapper" className="shadow-lg rounded-sm mx-auto w-full max-w-[210mm] min-h-auto sm:min-h-[297mm] relative bg-white border border-slate-300 p-6 sm:p-14 transition-transform origin-top" style={{ color: '#000000' }}>
                        {/* A4 Document Header */}
                        <div className="flex justify-between items-start pb-4 mb-8 border-b-2 border-slate-900 flex-wrap gap-4">
                          <div className="text-right space-y-1 order-2 sm:order-1">
                            <p className="font-bold text-xs sm:text-sm" style={{ color: '#000000' }}>المملكة العربية السعودية</p>
                            <p className="font-bold text-xs sm:text-sm" style={{ color: '#000000' }}>وزارة التعليم</p>
                            <p className="font-bold text-xs sm:text-sm" style={{ color: '#000000' }}>إدارة التعليم بالمنطقة الشرقية</p>
                            <p className="font-bold text-xs sm:text-sm" style={{ color: '#000000' }}>مدرسة الأمير سعود بن عبدالله بن جلوي المتوسطة</p>
                          </div>
                          <div className="text-center w-full sm:w-24 flex items-center justify-center order-1 sm:order-2">
                            <img src="/logo.png" alt="شعار الوزارة" className="w-16 sm:w-20 object-contain mx-auto" />
                          </div>
                          <div className="text-left space-y-1 order-3 w-full sm:w-auto mt-4 sm:mt-0">
                            <p className="text-xs font-bold" style={{ color: '#475569' }}>الرقم: {request.id}</p>
                            <p className="text-xs font-bold" style={{ color: '#475569' }}>التاريخ: {new Date(request.createdAt).toLocaleDateString('ar-SA')}</p>
                            <p className="text-xs font-bold" style={{ color: '#475569' }}>المرفقات: {request.attachments?.length || 'لا يوجد'}</p>
                          </div>
                        </div>

                        {/* Document Title */}
                        <div className="text-center mb-8">
                          <h2 className="text-xl sm:text-2xl font-black underline underline-offset-8 decoration-2" style={{ color: '#000000' }}>
                            {request.requestType}
                          </h2>
                        </div>

                        {/* Document Content */}
                        <div className="ql-editor px-0 py-0 overflow-visible h-auto font-medium leading-[2] sm:leading-[2.5] text-base sm:text-[17px] text-justify min-h-[200px] sm:min-h-[400px]" style={{ color: '#000000' }}
                             dangerouslySetInnerHTML={{
                               __html: (request.templateData as any)?.customContent 
                                 ? DOMPurify.sanitize(renderTemplateContent(
                                     (request.templateData as any).customContent,
                                     template.name,
                                     request.templateData || {},
                                     request.employeeName
                                   ))
                                 : template.content ? DOMPurify.sanitize(renderTemplateContent(
                                     template.content,
                                     template.name,
                                     request.templateData || {},
                                     request.employeeName
                                   )) : ''
                             }}
                        />

                        {/* Document Footer (Signatures) */}
                        <div className="mt-12 sm:mt-16 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div className="text-center space-y-4 sm:space-y-8">
                            <p className="font-bold text-sm sm:text-base" style={{ color: '#000000' }}>توقيع الموظف:</p>
                            {request.signatureData ? (
                              <img src={request.signatureData} alt="توقيع الموظف" className="h-20 mx-auto object-contain mix-blend-multiply" />
                            ) : (
                              <p className="text-xs italic" style={{ color: '#94a3b8' }}>سيتم إرفاق التوقيع إلكترونياً عند التقديم</p>
                            )}
                          </div>
                          <div className="text-center space-y-8">
                            <p className="font-bold text-base" style={{ color: '#000000' }}>مدير المدرسة:</p>
                            <div className="h-20 flex items-center justify-center">
                              <p className="text-xs italic border border-dashed p-2" style={{ color: '#94a3b8', borderColor: '#cbd5e1' }}>
                                (سيتم إرفاق توقيع مدير المدرسة من واجهة الإدارة لاحقاً)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : template.type === 'pdf' && template.pdfUrl ? (
                      <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4">
                        <span className="text-sm font-bold text-slate-700">هذا الإجراء مرفق كملف PDF رسمي.</span>
                        <a href={template.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md w-full sm:w-auto">
                          <FileText size={20} /> عرض و طباعة الخطاب
                        </a>
                      </div>
                    ) : null}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    {request.requestType === 'مساءلة غياب/تأخر' ? 'العذر / المبررات' : 
                     request.requestType === 'شكوى/تظلم' ? 'تفاصيل الشكوى' : 'ملاحظات / تفاصيل أخرى (رد الموظف)'}
                    <span className="text-rose-500 mr-1">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={request.justification}
                    placeholder="اكتب ردك أو عذرك هنا..."
                    onChange={(e) => updateFormField('justification', e.target.value)}
                    className="w-full text-sm border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-4 py-3 rounded-xl font-semibold resize-none focus:outline-none bg-white shadow-sm"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Section 2: Attachments */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="border-r-4 border-blue-600 pr-3">
                <h3 className="text-base font-extrabold text-[#1C1C1C]">القسم 2 — المرفقات</h3>
                <p className="text-[10px] text-slate-500 mt-1">مثل: تقارير طبية، إثباتات، أو خطابات PDF</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8">
                  <div className="border-2 border-dashed border-slate-300 hover:border-blue-600 bg-slate-50 rounded-xl p-6 text-center transition-all cursor-pointer relative group">
                    <input
                      type="file"
                      multiple
                      accept=".png,.pdf,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <Upload className="mx-auto text-slate-400 mb-2 group-hover:text-blue-600 transition-colors" size={24} />
                    <span className="block text-xs font-bold text-slate-700 mb-1">اضغط هنا لإرفاق ملفات الداعمة لطلبك</span>
                  </div>
                </div>

                <div className="sm:col-span-4 flex flex-col gap-2 max-h-32 overflow-y-auto">
                  {request.attachments?.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg">
                      <FileText className="text-slate-400 shrink-0" size={16} />
                      <span className="text-[10px] text-slate-600 truncate flex-1" title={file.name}>{file.name}</span>
                    </div>
                  ))}
                  {request.attachments?.length === 0 && (
                    <div className="text-center p-4 h-full flex items-center justify-center border border-slate-200 border-dashed rounded-lg text-[10px] text-slate-400">
                      لا توجد مرفقات
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Signature */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="border-r-4 border-blue-600 pr-3">
                <h3 className="text-base font-extrabold text-[#1C1C1C]">القسم 3 — التوقيع والإقرار</h3>
              </div>
              
              <label className="flex items-start gap-3 p-4 border border-slate-300 bg-white rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                <input
                  type="checkbox"
                  required
                  checked={request.agreedToTerms}
                  onChange={(e) => updateFormField('agreedToTerms', e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-600"
                />
                <span className="text-xs font-semibold text-slate-700 leading-relaxed">
                  أقر بأن جميع البيانات المدونة في هذا النموذج وجميع الردود والمرفقات صحيحة، وأتحمل المسؤولية الكاملة في حال ثبوت عكس ذلك.
                </span>
              </label>

              <div className="mt-4">
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-bold text-slate-700">التوقيع الإلكتروني <span className="text-slate-400 font-normal text-xs">(ارسم توقيعك في المربع أدناه)</span></label>
                  <button type="button" onClick={clearSignature} className="text-[10px] text-rose-600 hover:text-white font-bold px-3 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-600 rounded-lg transition-colors">
                    مسح وإعادة التوقيع
                  </button>
                </div>
                <div className="border-2 border-slate-300 bg-slate-50 rounded-xl overflow-hidden touch-none relative shadow-inner">
                  {!request.signatureData && !isDrawing && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <span className="text-slate-400 text-sm font-bold select-none border-2 border-dashed border-slate-300 px-6 py-2 rounded-xl">منطقة التوقيع الإلكتروني للموظف</span>
                    </div>
                  )}
                  <canvas
                    ref={signatureCanvasRef}
                    width={800}
                    height={200}
                    className="w-full h-32 sm:h-40 cursor-crosshair bg-transparent relative z-10"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseOut={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Employee Data */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="border-r-4 border-blue-600 pr-3">
                <h3 className="text-base font-extrabold text-[#1C1C1C]">القسم 4 — بيانات الموظف الأساسية</h3>
                <p className="text-xs font-bold text-rose-600 mt-1">الرجاء تحديث رقم الجوال أو البريد الإلكتروني في حال كانت غير مكتملة، للتواصل معك.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">اسم الموظف</label>
                  <input
                    type="text"
                    readOnly
                    value={request.employeeName}
                    className="w-full text-sm border border-slate-200 bg-slate-200 px-4 py-3 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">الرقم الوظيفي (السجل المدني)</label>
                  <input
                    type="text"
                    readOnly
                    value={request.employeeId}
                    className="w-full text-sm border border-slate-200 bg-slate-200 px-4 py-3 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">القسم / المرحلة</label>
                  <input
                    type="text"
                    readOnly
                    value={request.department}
                    className="w-full text-sm border border-slate-200 bg-slate-200 px-4 py-3 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">المسمى الوظيفي</label>
                  <input
                    type="text"
                    readOnly
                    value={request.jobTitle}
                    className="w-full text-sm border border-slate-200 bg-slate-200 px-4 py-3 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">الجوال <span className="text-rose-500">*</span></label>
                  <input
                    type="tel"
                    required
                    value={request.phone}
                    onChange={(e) => updateFormField('phone', e.target.value)}
                    className="w-full text-sm border border-blue-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 px-4 py-3 rounded-xl font-bold text-left outline-none bg-white transition-all"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={request.email}
                    onChange={(e) => updateFormField('email', e.target.value)}
                    className="w-full text-sm border border-blue-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 px-4 py-3 rounded-xl font-bold text-left outline-none bg-white transition-all"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row gap-4 items-center justify-end border-t border-slate-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-black text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    جاري الاعتماد والإرسال...
                  </>
                ) : (
                  'اعتماد وإرسال الطلب بشكل نهائي'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
