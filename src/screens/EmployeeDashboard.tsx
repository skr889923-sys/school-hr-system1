import React, { useState, useEffect } from 'react';
import { supabase, signOutUser } from '../supabase';
import { EmployeeRequest } from '../types';
import { LogOut, FileText, Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function EmployeeDashboard() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "بوابة الموظف | نظام الموارد البشرية";
    
    const fetchUserAndRequests = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData?.session?.user?.email;
      
      if (email) {
        setUserEmail(email);
        
        // Fetch requests assigned to this email
        const { data } = await supabase
          .from('hr_requests')
          .select('*')
          .eq('email', email)
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
            rejectionReason: d.rejection_reason,
            rejectedByRole: d.rejected_by_role
          })) as unknown as EmployeeRequest[]);
        }
      }
      setLoading(false);
    };

    fetchUserAndRequests();

    const channel = supabase
      .channel('employee_dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_requests' }, () => {
        fetchUserAndRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending_employee_response': return { text: 'بانتظار ردك', color: 'bg-amber-100 text-amber-800', icon: <AlertCircle size={14} /> };
      case 'submitted_by_employee': return { text: 'قيد مراجعة مشرف المتابعة', color: 'bg-blue-100 text-blue-800', icon: <Clock size={14} /> };
      case 'forwarded_to_principal': return { text: 'قيد مراجعة الإدارة', color: 'bg-indigo-100 text-indigo-800', icon: <Clock size={14} /> };
      case 'approved': return { text: 'معتمد', color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle2 size={14} /> };
      case 'rejected': return { text: 'مرفوض', color: 'bg-rose-100 text-rose-800', icon: <AlertCircle size={14} /> };
      default: return { text: status, color: 'bg-slate-100 text-slate-800', icon: <Clock size={14} /> };
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
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 pb-16 font-sans selection:bg-blue-100 selection:text-blue-900" dir="rtl">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 py-4 px-6 sm:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="School System Logo" className="h-10 object-contain" />
          <h1 className="text-xl font-black text-slate-800">School System</h1>
          <div className="h-6 w-px bg-slate-300 hidden sm:block"></div>
          <span className="font-bold text-slate-800 text-sm hidden sm:block">بوابة الموظف</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-bold hidden sm:block" dir="ltr">{userEmail}</span>
          <button 
            onClick={signOutUser}
            className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
          >
            <span>تسجيل الخروج</span>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900">الخطابات والمساءلات الواردة</h2>
          <p className="text-sm text-slate-500 mt-1">تجد هنا جميع الخطابات والمساءلات الموجهة لك من الإدارة.</p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">لا توجد خطابات حالياً</h3>
            <p className="text-sm text-slate-500">لم يتم توجيه أي خطابات أو مساءلات لك حتى الآن.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((req) => {
              const statusInfo = getStatusDisplay(req.status);
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={req.id} 
                  onClick={() => navigate(`/request/${req.id}`)}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{req.requestType || 'مساءلة / خطاب'}</h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{req.id}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 ${statusInfo.color}`}>
                      {statusInfo.icon}
                      {statusInfo.text}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      تاريخ الإصدار: <span className="font-bold">{new Date(req.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <div className="text-xs font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
                      عرض التفاصيل والرد &larr;
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
