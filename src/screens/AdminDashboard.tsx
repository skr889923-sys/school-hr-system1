import React, { useState, useEffect } from 'react';
import { supabase, signOutUser } from '../supabase';
import { EmployeeRequest } from '../types';
import RequestHistory from '../components/RequestHistory';
import { generateRequestId } from '../utils/helpers';
import { Plus, Copy, Check, LogOut, Loader2, X, Upload, Trash2, Settings, Mail, CheckCircle2, ChevronLeft, Calendar, FileText, User, Users, Clock, AlertCircle, Eye, Share2, FileUp, Download, Menu, LayoutDashboard, FileStack } from 'lucide-react';
import { uploadFile } from '../utils/storage';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, LetterTemplate } from '../types';
import ProfileSettings from '../components/ProfileSettings';
import TemplateManager from '../components/TemplateManager';
import UserManagement from '../components/UserManagement';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { getFieldsForTemplate, TemplateField } from '../utils/templateFields';

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'direction': 'rtl' }, { 'align': [] }],
    ['link', 'clean']
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'script',
  'list', 'indent',
  'direction', 'align',
  'link'
];

interface Employee {
  id: string;
  full_name: string;
  national_id: string;
  department: string;
  job_title: string;
  email: string;
  phone: string;
}

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
  const [newReqData, setNewReqData] = useState({ employeeName: '', employeeId: '', email: '', department: '', jobTitle: '', phone: '' });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [copied, setCopied] = useState(false);
  const [adminFilesModal, setAdminFilesModal] = useState<{ isOpen: boolean; request: EmployeeRequest | null; uploading: boolean }>({ isOpen: false, request: null, uploading: false });
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'templates' | 'employees'>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [templateFieldData, setTemplateFieldData] = useState<Record<string, string>>({});
  const [currentTemplateFields, setCurrentTemplateFields] = useState<TemplateField[]>([]);
  const [customTemplateContent, setCustomTemplateContent] = useState<string>('');

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

    const fetchEmployees = async () => {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setEmployees(data);
    };

    fetchRequests();
    fetchTemplates();
    fetchEmployees();

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
    setNewReqData({ employeeName: '', employeeId: '', email: '', department: '', jobTitle: '', phone: '' });
    setTemplateFieldData({});
    setCurrentTemplateFields([]);
    setCustomTemplateContent('');
    setCreateReqModalOpen(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setTemplateFieldData({});
    if (templateId) {
      const tmpl = templates.find(t => t.id === templateId);
      if (tmpl) {
        setCustomTemplateContent(tmpl.content || '');
        const fields = getFieldsForTemplate(tmpl.name);
        setCurrentTemplateFields(fields);
      } else {
        setCustomTemplateContent('');
        setCurrentTemplateFields([]);
      }
    } else {
      setCustomTemplateContent('');
      setCurrentTemplateFields([]);
    }
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
      department: newReqData.department,
      jobTitle: newReqData.jobTitle,
      phone: newReqData.phone,
      email: newReqData.email,
      requestType: (templates.find(t => t.id === selectedTemplateId)?.name as any) || 'خطابات',
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
        performedByName: userRole === 'hr_manager' ? 'مشرف المتابعة' : userRole === 'principal' ? 'مدير المدرسة' : 'الدعم الفني',
        timestamp: new Date().toISOString()
      }]
    };

    try {
      await supabase.from('hr_requests').insert({
        id: docId,
        status: newReq.status,
        employee_name: newReq.employeeName,
        employee_id: newReq.employeeId,
        department: newReq.department,
        job_title: newReq.jobTitle,
        phone: newReq.phone,
        email: newReq.email,
        request_type: newReq.requestType,
        justification: '',
        attachments: [],
        agreed_to_terms: false,
        template_id: selectedTemplateId || null,
        template_data: {
          ...templateFieldData,
          customContent: customTemplateContent
        },
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
        performedByName: userRole === 'hr_manager' ? 'مشرف المتابعة' : userRole === 'principal' ? 'مدير المدرسة' : 'الدعم الفني',
        timestamp: new Date().toISOString()
      };

      const newAuditTrail = [...(req?.auditTrail || []), auditEntry];
      
      const updatePayload: any = { 
        status: newStatus, 
        audit_trail: newAuditTrail,
        updated_at: new Date().toISOString()
      };
      
      // If rejected, the reason is already tracked in the audit_trail
      // We can also optionally append it to adminNotes if we want, but audit_trail is sufficient.

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
        performedByName: userRole === 'hr_manager' ? 'مشرف المتابعة' : userRole === 'principal' ? 'مدير المدرسة' : 'الدعم الفني',
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
        performedByName: userRole === 'hr_manager' ? 'مشرف المتابعة' : userRole === 'principal' ? 'مدير المدرسة' : 'الدعم الفني',
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
    <div className="flex h-screen bg-[#FAF9F6] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900" dir="rtl">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 right-0 z-50 w-72 bg-white border-l border-slate-200 transform transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="School System Logo" className="h-10 object-contain" />
            <h1 className="text-xl font-black text-slate-800">School System</h1>
          </div>
          <button className="lg:hidden text-slate-500" onClick={() => setIsMobileSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="px-4 text-[11px] font-black text-slate-400 mb-2 uppercase tracking-wider">القائمة الرئيسية</p>
          <button
            onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <LayoutDashboard size={20} className={activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'} />
            لوحة المعلومات
          </button>
          
          <button
            onClick={() => { setActiveTab('requests'); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'requests' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <FileText size={20} className={activeTab === 'requests' ? 'text-blue-600' : 'text-slate-400'} />
            الطلبات والخطابات
          </button>

          {(userRole === 'hr_manager' || userRole === 'it_support') && (
            <button
              onClick={() => { setActiveTab('templates'); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'templates' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <FileStack size={20} className={activeTab === 'templates' ? 'text-blue-600' : 'text-slate-400'} />
              إدارة القوالب
            </button>
          )}

          <button
            onClick={() => { setActiveTab('employees'); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'employees' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Users size={20} className={activeTab === 'employees' ? 'text-blue-600' : 'text-slate-400'} />
            إدارة الموظفين
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => setProfileModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all mb-2"
          >
            <Settings size={20} className="text-slate-400" />
            الإعدادات الشخصية
          </button>
          <button 
            onClick={signOutUser}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-rose-600 hover:bg-rose-50 transition-all"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 py-4 px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-600 p-2 hover:bg-slate-100 rounded-xl" onClick={() => setIsMobileSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-black text-slate-800 hidden sm:block">
              {activeTab === 'dashboard' && 'لوحة المعلومات'}
              {activeTab === 'requests' && 'إدارة الطلبات والخطابات'}
              {activeTab === 'templates' && 'إدارة قوالب النظام'}
              {activeTab === 'employees' && 'إدارة الموظفين والصلاحيات'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-600 hidden sm:block">
              {userRole === 'hr_manager' ? 'مشرف المتابعة' : userRole === 'it_support' ? 'الدعم الفني' : 'مسؤول'}
            </span>
            <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-black">
              {userRole === 'hr_manager' ? 'HR' : 'IT'}
            </div>
          </div>
        </header>

        <ProfileSettings isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div>
                <h1 className="text-2xl font-black text-slate-900">مرحباً بك في لوحة المعلومات 👋</h1>
                <p className="text-sm text-slate-500 mt-1">نظرة عامة على نشاط النظام وحالة الطلبات.</p>
              </div>
              
              {/* Analytics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-800">{requests.length}</span>
                  <span className="text-xs text-slate-500 font-bold mt-2">إجمالي الطلبات</span>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-600">{requests.filter(r => r.status === 'pending_employee_response').length}</span>
                  <span className="text-xs text-slate-500 font-bold mt-2">بانتظار الموظف</span>
                </div>
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-amber-600">{requests.filter(r => r.status === 'submitted_by_employee' || r.status === 'forwarded_to_principal').length}</span>
                  <span className="text-xs text-amber-700 font-bold mt-2">قيد المراجعة</span>
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-emerald-600">{requests.filter(r => r.status === 'approved').length}</span>
                  <span className="text-xs text-emerald-700 font-bold mt-2">مقبول</span>
                </div>
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 shadow-sm flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-blue-600">{requests.filter(r => r.status === 'completed').length}</span>
                  <span className="text-xs text-blue-700 font-bold mt-2">مكتمل</span>
                </div>
                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 shadow-sm flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-rose-600">{requests.filter(r => r.status === 'rejected').length}</span>
                  <span className="text-xs text-rose-700 font-bold mt-2">مرفوض</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">إدارة الطلبات والخطابات</h1>
                  <p className="text-sm text-slate-500 mt-1">تتبع الحالات، المراجعة، إصدار النماذج، ومتابعة الردود.</p>
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

              <RequestHistory 
                requests={requests}
                userRole={userRole}
                onSelectRequest={handleSelectRequest}
                onDeleteRequest={(userRole === 'hr_manager' || userRole === 'it_support') ? handleDeleteRequest : undefined}
                onAddNew={(userRole === 'hr_manager' || userRole === 'it_support') ? openCreateModal : undefined}
                onStatusChange={(userRole === 'hr_manager' || userRole === 'it_support' || userRole === 'principal') ? handleStatusChange : undefined}
                onUploadAdminFiles={(userRole === 'hr_manager' || userRole === 'it_support') ? handleOpenAdminFiles : undefined}
              />
            </div>
          )}

          {activeTab === 'templates' && (userRole === 'hr_manager' || userRole === 'it_support') && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900">إدارة قوالب الخطابات والنماذج</h1>
                <p className="text-sm text-slate-500 mt-1">إنشاء وتحرير وتخصيص قوالب النظام للاستخدام السريع.</p>
              </div>
              <TemplateManager />
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <UserManagement userRole={userRole} />
            </div>
          )}
        </main>
      </div>

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
              className="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-black text-slate-900">إنشاء طلب جديد</h3>
                <button onClick={() => setCreateReqModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto">
                <p className="text-sm text-slate-600 font-bold">يرجى تحديد القالب وإدخال بيانات الموظف لتوجيه المساءلة.</p>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">اختر موظف من القائمة (لتعبئة البيانات تلقائياً)</label>
                  <select 
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50"
                    onChange={(e) => {
                      const emp = employees.find(emp => emp.id === e.target.value);
                      if (emp) {
                        setNewReqData({
                          employeeName: emp.full_name,
                          employeeId: emp.national_id || '',
                          email: emp.email,
                          department: emp.department || '',
                          jobTitle: emp.job_title || '',
                          phone: emp.phone || ''
                        });
                      } else {
                        setNewReqData({ employeeName: '', employeeId: '', email: '', department: '', jobTitle: '', phone: '' });
                      }
                    }}
                  >
                    <option value="">-- اختر موظف مسجل --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.job_title})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الموظف</label>
                    <input type="text" value={newReqData.employeeName} onChange={e => setNewReqData({...newReqData, employeeName: e.target.value})} className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600" placeholder="اسم الموظف الثلاثي" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">البريد الإلكتروني للموظف (مهم)</label>
                    <input type="email" value={newReqData.email} onChange={e => setNewReqData({...newReqData, email: e.target.value})} className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600" placeholder="example@moe.gov.sa" dir="ltr" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">الرقم الوظيفي (اختياري)</label>
                    <input type="text" value={newReqData.employeeId} onChange={e => setNewReqData({...newReqData, employeeId: e.target.value})} className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">القسم (اختياري)</label>
                    <input type="text" value={newReqData.department} onChange={e => setNewReqData({...newReqData, department: e.target.value})} className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">المسمى الوظيفي (اختياري)</label>
                    <input type="text" value={newReqData.jobTitle} onChange={e => setNewReqData({...newReqData, jobTitle: e.target.value})} className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">قالب الخطاب/المساءلة</label>
                  <select 
                    value={selectedTemplateId} 
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">-- بدون قالب (خطاب فارغ) --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.type === 'pdf' ? 'PDF' : 'نص'})</option>
                    ))}
                  </select>
                </div>

                {/* Editor for Template Content */}
                {selectedTemplateId && templates.find(t => t.id === selectedTemplateId)?.type === 'text' && (
                  <div className="pt-4 border-t border-slate-100 mt-4">
                    <label className="block text-xs font-black text-blue-700 mb-1.5 flex items-center gap-1.5">📝 تحرير محتوى الخطاب المخصص لهذا الطلب</label>
                    <p className="text-[10px] text-slate-500 mb-3">يمكنك تعديل النص قبل إرساله للموظف. ستبقى المتغيرات مثل <code className="bg-slate-100 px-1 rounded">[اسم الموظف]</code> أو تعبئة الحقول أدناه لتعمل تلقائياً.</p>
                    <div className="quill-a4-wrapper" dir="rtl">
                      <div className="quill-a4-editor bg-white rounded-lg">
                        <ReactQuill 
                          theme="snow" 
                          value={customTemplateContent} 
                          onChange={setCustomTemplateContent} 
                          modules={quillModules}
                          formats={quillFormats}
                          style={{ direction: 'rtl', textAlign: 'right' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* حقول القالب الديناميكية */}
                {currentTemplateFields.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 mt-4">
                    <p className="text-xs font-black text-blue-700 mb-3 flex items-center gap-1.5">📋 حقول النموذج المطلوب تعبئتها:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentTemplateFields.map((field) => (
                        <div key={field.key} className={field.fullWidth ? 'sm:col-span-2' : ''}>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            {field.label}
                            {field.required && <span className="text-rose-500 mr-0.5">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              required={field.required}
                              value={templateFieldData[field.key] || ''}
                              onChange={(e) => setTemplateFieldData(prev => ({...prev, [field.key]: e.target.value}))}
                              placeholder={field.placeholder}
                              rows={3}
                              className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                          ) : field.type === 'select' ? (
                            <select
                              required={field.required}
                              value={templateFieldData[field.key] || ''}
                              onChange={(e) => setTemplateFieldData(prev => ({...prev, [field.key]: e.target.value}))}
                              className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="">-- اختر --</option>
                              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : (
                            <input
                              type={field.type}
                              required={field.required}
                              value={templateFieldData[field.key] || ''}
                              onChange={(e) => setTemplateFieldData(prev => ({...prev, [field.key]: e.target.value}))}
                              placeholder={field.placeholder}
                              className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                              dir={field.type === 'date' || field.type === 'time' ? 'ltr' : 'rtl'}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
