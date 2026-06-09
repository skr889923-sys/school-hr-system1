import React, { useState, useEffect } from 'react';
import { supabase, signOutUser } from '../supabase';
import { EmployeeRequest } from '../types';
import RequestHistory from '../components/RequestHistory';
import { generateRequestId } from '../utils/helpers';
import { Plus, Copy, Check, LogOut, Loader2, X, Upload, Trash2, Settings } from 'lucide-react';
import { uploadFile } from '../utils/storage';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, LetterTemplate } from '../types';
import ProfileSettings from '../components/ProfileSettings';
import TemplateManager from '../components/TemplateManager';

interface AdminDashboardProps {
  userRole: UserRole;
}

export default function AdminDashboard({ userRole }: AdminDashboardProps) {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLinkModal, setNewLinkModal] = useState<{ isOpen: boolean; link: string | null }>({ isOpen: false, link: null });
  const [createReqModalOpen, setCreateReqModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [newReqData, setNewReqData] = useState({ employeeName: '', employeeId: '', email: '' });
  const [copied, setCopied] = useState(false);
  const [adminFilesModal, setAdminFilesModal] = useState<{ isOpen: boolean; request: EmployeeRequest | null; uploading: boolean }>({ isOpen: false, request: null, uploading: false });
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    document.title = "لوحة التحكم | نظام الموارد البشرية";
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase
        .from('hr_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        setRequests(data.map(d => ({
          ...d,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          employeeName: d.employee_name,
          employeeId: d.employee_id,
          jobTitle: d.job_title,
          requestType: d.request_type,
          startDate: d.start_date,
          endDate: d.end_date,
          agreedToTerms: d.agreed_to_terms,
          signatureData: d.signature_data,
          adminNotes: d.admin_notes,
          adminAttachments: d.admin_attachments || [],
          templateId: d.template_id,
          finalPdfUrl: d.final_pdf_url,
          auditTrail: d.audit_trail || [],
          attachments: d.attachments || [],
        })) as unknown as EmployeeRequest[]);
      }
      setLoading(false);
    };

    const fetchTemplates = async () => {
      const { data } = await supabase
        .from('hr_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) {
        setTemplates(data.map(d => ({
          ...d,
          createdAt: d.created_at,
          pdfUrl: d.pdf_url,
          signatureBox: d.signature_box
        })) as unknown as LetterTemplate[]);
      }
    };

    fetchRequests();
    fetchTemplates();

    const channel = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_requests' }, () => {
        fetchRequests();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_templates' }, () => {
        fetchTemplates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openCreateModal = () => {
    setSelectedTemplateId('');
    setNewReqData({ employeeName: '', employeeId: '', email: '' });
    setCreateReqModalOpen(true);
  };

  const handleCreateNewRequest = async () => {
    if (!newReqData.email || !newReqData.employeeName) {
      alert('يرجى إدخال اسم الموظف وبريده الإلكتروني على الأقل.');
      return;
    }
    const docId = generateRequestId(); // e.g. HR-XXXX
    const newReq: EmployeeRequest = {
      id: docId,
      status: 'pending_employee_response',
      employeeName: newReqData.employeeName,
      employeeId: newReqData.employeeId,
      department: '',
      jobTitle: '',
      phone: '',
      email: newReqData.email,
      requestType: templates.find(t => t.id === selectedTemplateId)?.name || 'مساءلة',
      justification: '',
      attachments: [],
      agreedToTerms: false,
      templateId: selectedTemplateId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditTrail: [{
        id: Math.random().toString(36).substr(2, 9),
        action: 'CREATED',
        details: 'تم إصدار مساءلة/خطاب وتوجيهه للموظف' + (selectedTemplateId ? ` (مع قالب)` : ''),
        performedByRole: userRole,
        performedByName: userRole === 'hr_manager' ? 'مدير الموارد البشرية' : userRole === 'principal' ? 'مدير المدرسة' : 'الدعم الفني',
        timestamp: new Date().toISOString()
      }]
    };

    try {
      await supabase.from('hr_requests').insert({
        id: docId,
        status: newReq.status,
        employee_name: newReq.employeeName,
        employee_id: newReq.employeeId,
        department: '',
        job_title: '',
        phone: '',
        email: newReq.email,
        request_type: newReq.requestType,
        justification: '',
        attachments: [],
        agreed_to_terms: false,
        template_id: selectedTemplateId || null,
        created_at: newReq.createdAt,
        updated_at: newReq.updatedAt,
        audit_trail: newReq.auditTrail
      });
      setCreateReqModalOpen(false);
      const link = `${window.location.origin}/request/${docId}`;
      setNewLinkModal({ isOpen: true, link });
    } catch (error) {
      console.error("Error creating request:", error);
      alert('حدث خطأ أثناء إنشاء الطلب.');
    }
  };

  const copyToClipboard = () => {
    if (newLinkModal.link) {
      navigator.clipboard.writeText(newLinkModal.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطلب بشكل نهائي؟')) {
      try {
        await supabase.from('hr_requests').delete().eq('id', id);
      } catch (error) {
        console.error("Error deleting request:", error);
      }
    }
  };

  const handleSelectRequest = (req: EmployeeRequest) => {
    // Navigate to a view for the request (if we had one) or open the request link directly
    window.open(`/request/${req.id}`, '_blank');
  };

  const handleStatusChange = async (reqId: string, newStatus: EmployeeRequest['status'], rejectionReason?: string) => {
    try {
      const req = requests.find(r => r.id === reqId);
      
      const statusLabels: Record<string, string> = {
        'pending_employee_response': 'بانتظار رد الموظف ⏳',
        'submitted_by_employee': 'تم الرد (قيد مراجعة الموارد) 🔧',
        'forwarded_to_principal': 'مرفوع لمدير المدرسة ↗️',
        'approved': 'معتمد ✅',
        'completed': 'مكتمل 📁',
        'rejected': 'مرفوض ❌'
      };

      const auditEntry = {
        id: Math.random().toString(36).substr(2, 9),
        action: 'STATUS_CHANGE',
        details: `تم تغيير الحالة إلى: ${statusLabels[newStatus] || newStatus}${rejectionReason ? ` - السبب: ${rejectionReason}` : ''}`,
        performedByRole: userRole,
        performedByName: userRole === 'hr_manager' ? 'مدير الموارد البشرية' : userRole === 'principal' ? 'مدير المدرسة' : 'الدعم الفني',
        timestamp: new Date().toISOString()
      };

      const newAuditTrail = [...(req?.auditTrail || []), auditEntry];
      
      const updatePayload: any = { 
        status: newStatus, 
        audit_trail: newAuditTrail,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'rejected') {
        updatePayload.rejection_reason = rejectionReason || 'بدون سبب';
        updatePayload.rejected_by_role = userRole;
      }

      await supabase.from('hr_requests').update(updatePayload).eq('id', reqId);
      
      // Send email if needed
      setRequests(prev => {
        const req = prev.find(r => r.id === reqId);
        if (req) {
          import('../emailService').then(({ sendOrderStatusUpdateEmail }) => {
            sendOrderStatusUpdateEmail(req as any, statusLabels[newStatus] || newStatus);
          }).catch(err => console.error('Error sending update email:', err));
        }
        return prev.map(r => r.id === reqId ? { ...r, status: newStatus, auditTrail: newAuditTrail } : r);
      });
    } catch (err) {
      console.error('Error updating status:', err);
      alert('حدث خطأ أثناء تحديث حالة الطلب.');
    }
  };

  const handleOpenAdminFiles = (req: EmployeeRequest) => {
    setAdminFilesModal({ isOpen: true, request: req, uploading: false });
  };

  const handleUploadAdminFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const req = adminFilesModal.request;
    if (!file || !req) return;

    setAdminFilesModal(prev => ({ ...prev, uploading: true }));
    try {
      const uploadResult = await uploadFile(file, `admin_files/${req.id}`);
      const uploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        downloadUrl: uploadResult.downloadUrl,
        storagePath: uploadResult.storagePath
      };
      
      const currentFiles = req.adminAttachments || [];
      const newFiles = [...currentFiles, uploadedFile];
      
      const auditEntry = {
        id: Math.random().toString(36).substr(2, 9),
        action: 'FILE_UPLOAD',
        details: `تم إرفاق ملف إداري: ${file.name}`,
        performedByRole: userRole,
        performedByName: userRole === 'hr_manager' ? 'مدير الموارد البشرية' : userRole === 'principal' ? 'مدير المدرسة' : 'الدعم الفني',
        timestamp: new Date().toISOString()
      };
      const newAuditTrail = [...(req.auditTrail || []), auditEntry];
      
      await supabase.from('hr_requests').update({ 
        admin_attachments: newFiles, 
        audit_trail: newAuditTrail,
        updated_at: new Date().toISOString()
      }).eq('id', req.id);
      
      setAdminFilesModal(prev => ({ 
        ...prev, 
        uploading: false,
        request: { ...req, adminAttachments: newFiles, auditTrail: newAuditTrail }
      }));
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('فشل رفع الملف.');
      setAdminFilesModal(prev => ({ ...prev, uploading: false }));
    }
  };

  const handleDeleteAdminFile = async (fileUrl: string) => {
    const req = adminFilesModal.request;
    if (!req) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا الملف؟')) return;

    try {
      const currentFiles = req.adminAttachments || [];
      const newFiles = currentFiles.filter(f => f.downloadUrl !== fileUrl);
      
      const auditEntry = {
        id: Math.random().toString(36).substr(2, 9),
        action: 'FILE_DELETE',
        details: `تم حذف ملف إداري`,
        performedByRole: userRole,
        performedByName: userRole === 'hr_manager' ? 'مدير الموارد البشرية' : userRole === 'principal' ? 'مدير المدرسة' : 'الدعم الفني',
        timestamp: new Date().toISOString()
      };
      const newAuditTrail = [...(req.auditTrail || []), auditEntry];

      await supabase.from('hr_requests').update({ 
        admin_attachments: newFiles, 
        audit_trail: newAuditTrail,
        updated_at: new Date().toISOString()
      }).eq('id', req.id);
      
      setAdminFilesModal(prev => ({ 
        ...prev,
        request: { ...req, adminAttachments: newFiles, auditTrail: newAuditTrail }
      }));
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 pb-16 font-sans selection:bg-blue-100 selection:text-blue-900">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 py-4 px-6 sm:px-12 flex justify-between items-center flex-row-reverse">
        <div className="flex items-center gap-4 flex-row-reverse">
          <h1 className="text-xl font-black text-slate-800">شؤون الموظفين</h1>
          <div className="h-6 w-px bg-slate-300 hidden sm:block"></div>
          <span className="font-bold text-slate-800 text-sm hidden sm:block">لوحة التحكم</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-2 p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
            title="الإعدادات الشخصية"
          >
            <Settings size={18} />
          </button>
          
          <button 
            onClick={signOutUser}
            className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
          >
            <span>تسجيل الخروج</span>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <ProfileSettings isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir="rtl">
        {/* Analytics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-slate-800">{requests.length}</span>
            <span className="text-[11px] text-slate-500 font-bold mt-1">إجمالي الطلبات</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-slate-600">{requests.filter(r => r.status === 'pending_employee_response').length}</span>
            <span className="text-[11px] text-slate-500 font-bold mt-1">بانتظار الموظف</span>
          </div>
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-amber-600">{requests.filter(r => r.status === 'submitted_by_employee' || r.status === 'forwarded_to_principal').length}</span>
            <span className="text-[11px] text-amber-700 font-bold mt-1">قيد المراجعة</span>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-emerald-600">{requests.filter(r => r.status === 'approved').length}</span>
            <span className="text-[11px] text-emerald-700 font-bold mt-1">مقبول</span>
          </div>
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-blue-600">{requests.filter(r => r.status === 'completed').length}</span>
            <span className="text-[11px] text-blue-700 font-bold mt-1">مكتمل</span>
          </div>
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-rose-600">{requests.filter(r => r.status === 'rejected').length}</span>
            <span className="text-[11px] text-rose-700 font-bold mt-1">مرفوض</span>
          </div>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">إدارة الطلبات</h1>
            <p className="text-sm text-slate-500 mt-1">قم بإنشاء روابط طلبات جديدة للموظفين ومتابعة الحالات.</p>
          </div>
          
          {(userRole === 'hr_manager' || userRole === 'it_support') && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              <Plus size={18} />
              <span>إصدار مساءلة/خطاب جديد</span>
            </button>
          )}
        </div>

        {(userRole === 'hr_manager' || userRole === 'it_support') && (
          <TemplateManager />
        )}

        <RequestHistory 
          requests={requests}
          userRole={userRole}
          onSelectRequest={handleSelectRequest}
          onDeleteRequest={(userRole === 'hr_manager' || userRole === 'it_support') ? handleDeleteRequest : undefined}
          onAddNew={(userRole === 'hr_manager' || userRole === 'it_support') ? openCreateModal : undefined}
          onStatusChange={(userRole === 'hr_manager' || userRole === 'it_support' || userRole === 'principal') ? handleStatusChange : undefined}
          onUploadAdminFiles={(userRole === 'hr_manager' || userRole === 'it_support') ? handleOpenAdminFiles : undefined}
        />
      </main>

      {/* Select Template Modal before generating link */}
      <AnimatePresence>
        {createReqModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" dir="rtl">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setCreateReqModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-black text-slate-900">إنشاء طلب جديد</h3>
                <button onClick={() => setCreateReqModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-slate-600 font-bold">يرجى تحديد القالب وإدخال بيانات الموظف لتوجيه المساءلة.</p>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الموظف</label>
                  <input type="text" value={newReqData.employeeName} onChange={e => setNewReqData({...newReqData, employeeName: e.target.value})} className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600" placeholder="اسم الموظف الثلاثي" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">البريد الإلكتروني للموظف (مهم)</label>
                  <input type="email" value={newReqData.email} onChange={e => setNewReqData({...newReqData, email: e.target.value})} className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600" placeholder="example@moe.gov.sa" dir="ltr" />
                  <p className="text-[10px] text-slate-500 mt-1">سيرتبط الخطاب بهذا البريد ليظهر في حساب الموظف.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">الرقم الوظيفي (اختياري)</label>
                  <input type="text" value={newReqData.employeeId} onChange={e => setNewReqData({...newReqData, employeeId: e.target.value})} className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600" />
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">قالب الخطاب/المساءلة</label>
                  <select 
                    value={selectedTemplateId} 
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">-- بدون قالب (خطاب فارغ) --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.type === 'pdf' ? 'PDF' : 'نص'})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                <button onClick={() => setCreateReqModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors">إلغاء</button>
                <button onClick={handleCreateNewRequest} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md">
                  إصدار الخطاب
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for new link */}
      <AnimatePresence>
        {newLinkModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" dir="rtl">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setNewLinkModal({ isOpen: false, link: null })}
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900">تم إنشاء الرابط بنجاح</h3>
                <p className="text-xs text-slate-500 mt-1">قم بنسخ الرابط التالي وإرساله للموظف لتعبئة الطلب.</p>
              </div>
              
              <div className="p-6 space-y-4 bg-slate-50">
                <div className="relative">
                  <div className="w-full bg-white border border-slate-200 rounded-xl p-3 pr-4 pl-12 text-sm text-slate-700 font-mono text-left break-all shadow-sm flex items-center">
                    {newLinkModal.link}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    title="نسخ الرابط"
                  >
                    {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              
              <div className="p-4 border-t border-slate-100 flex justify-between">
                <div className="flex gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`نأمل منك تعبئة نموذج الموارد البشرية عبر الرابط التالي:\n${newLinkModal.link}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl transition-colors"
                  >
                    واتساب
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent('رابط نموذج الموارد البشرية')}&body=${encodeURIComponent(`السلام عليكم،\nنأمل منك تعبئة النموذج عبر الرابط التالي:\n${newLinkModal.link}`)}`}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl transition-colors"
                  >
                    إيميل
                  </a>
                </div>
                <button
                  onClick={() => setNewLinkModal({ isOpen: false, link: null })}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Files Modal */}
      <AnimatePresence>
        {adminFilesModal.isOpen && adminFilesModal.request && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" dir="rtl">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setAdminFilesModal({ isOpen: false, request: null, uploading: false })}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Upload size={18} className="text-blue-600" />
                  مرفقات إدارية
                </h3>
                <button onClick={() => setAdminFilesModal({ isOpen: false, request: null, uploading: false })} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              
              <div className="p-6 space-y-4 overflow-y-auto">
                <p className="text-xs text-slate-500 mb-4">هذه الملفات خاصة بالإدارة ولن تظهر للموظف مقدم الطلب.</p>
                
                <div className="space-y-3">
                  {adminFilesModal.request.adminAttachments?.map((file, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {file.type?.startsWith('image/') ? (
                          <img src={file.downloadUrl} alt="file" className="w-10 h-10 object-cover rounded-lg" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500">PDF</div>
                        )}
                        <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                      </div>
                      <button onClick={() => handleDeleteAdminFile(file.downloadUrl || '')} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  
                  {(!adminFilesModal.request.adminAttachments || adminFilesModal.request.adminAttachments.length === 0) && (
                    <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl">
                      <span className="text-xs text-slate-400">لا يوجد ملفات مرفقة حالياً.</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="flex items-center justify-center gap-2 w-full cursor-pointer bg-slate-900 hover:bg-slate-950 text-white py-3 rounded-xl transition-colors text-xs font-bold">
                    {adminFilesModal.uploading ? (
                      <><Loader2 size={16} className="animate-spin" /> جاري الرفع...</>
                    ) : (
                      <><Plus size={16} /> رفع ملف جديد</>
                    )}
                    <input type="file" accept="image/*,.pdf,.docx,.doc" className="hidden" onChange={handleUploadAdminFile} disabled={adminFilesModal.uploading} />
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
