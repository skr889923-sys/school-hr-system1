import React, { useState } from 'react';
import { EmployeeRequest, UserRole } from '../types';
import { FileText, Plus, Trash2, Calendar, ClipboardList, Copy, Eye, MessageCircle, Mail, FolderDown, History, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface RequestHistoryProps {
  requests: EmployeeRequest[];
  onSelectRequest: (request: EmployeeRequest) => void;
  onDeleteRequest?: (id: string) => void;
  onDuplicateRequest?: (request: EmployeeRequest) => void;
  onAddNew?: () => void;
  onStatusChange?: (id: string, status: EmployeeRequest['status'], reason?: string) => void;
  onUploadAdminFiles?: (request: EmployeeRequest) => void;
  userRole: UserRole;
}

export default function RequestHistory({
  requests,
  onSelectRequest,
  onDeleteRequest,
  onDuplicateRequest,
  onAddNew,
  onStatusChange,
  onUploadAdminFiles,
  userRole,
}: RequestHistoryProps) {
  const [auditModalReq, setAuditModalReq] = useState<EmployeeRequest | null>(null);
  
  return (
    <div className="space-y-6 text-right RTL" dir="rtl">
      {/* Upper Action/Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-[#1C1C1C] flex items-center justify-end gap-2.5">
            <ClipboardList className="text-blue-600" size={22} strokeWidth={2.2} />
            <span>لوحة إدارة شؤون الموظفين</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            مرحباً بك في نظام الإدارة. يمكنك هنا إنشاء روابط طلبات جديدة، ومتابعة الطلبات المقدمة من الموظفين، واتخاذ الإجراءات اللازمة.
          </p>
        </div>

        {onAddNew && (
          <button
            onClick={onAddNew}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus size={16} />
            <span>إنشاء رابط لطلب جديد</span>
          </button>
        )}
      </div>

      {/* History Grid List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-500 block mb-2 px-1">
          سجل الطلبات الواردة والنشطة ({requests.length}):
        </h3>

        {requests.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <FileText className="text-slate-300 mb-3" size={50} />
            <h4 className="font-bold text-slate-800 text-sm mb-1">لا توجد طلبات!</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mb-6">
              لم يقم أي موظف بتقديم طلب حتى الآن، أو لم تقم بإنشاء روابط جديدة.
            </p>
            {onAddNew && (
              <button
                onClick={onAddNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>إنشاء رابط لطلب جديد</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((req) => {
              return (
                <div
                  key={req.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
                >
                  {/* Top Header Card */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <span className="inline-block text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-sm font-bold mb-1.5 border border-slate-200">
                        {req.id}
                      </span>
                      <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 text-base transition-colors duration-150">
                        {req.employeeName || "موظف لم يحدد اسمه"}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar size={12} />
                        <span>تاريخ الإنشاء: {new Date(req.createdAt).toLocaleDateString('ar-SA')}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md ${
                        req.status === 'pending_employee_response' ? 'bg-slate-100 text-slate-600' :
                        req.status === 'submitted_by_employee' ? 'bg-amber-100 text-amber-800' :
                        req.status === 'forwarded_to_principal' ? 'bg-indigo-100 text-indigo-800' :
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {req.status === 'pending_employee_response' ? 'بانتظار الموظف' :
                         req.status === 'submitted_by_employee' ? 'قيد المراجعة' :
                         req.status === 'forwarded_to_principal' ? 'لدى المدير' :
                         req.status === 'approved' ? 'معتمد' :
                         req.status === 'completed' ? 'مكتمل' : 'مرفوض'}
                      </span>
                      {req.status === 'rejected' && req.rejectionReason && (
                        <span className="text-[9px] text-rose-500 mt-1 max-w-[150px] truncate" title={req.rejectionReason}>
                          السبب: {req.rejectionReason}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middleware stats */}
                  <div className="border-t border-b border-slate-100 py-3 my-3 grid grid-cols-2 gap-2 text-xs text-center bg-slate-50 rounded-lg">
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">نوع الطلب:</span>
                      <span className="font-extrabold text-slate-800 text-[11px] bg-white px-2 py-1 rounded border border-slate-100 shadow-xs inline-block">
                        {req.requestType || 'غير محدد'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">القسم / الوظيفة:</span>
                      <span className="font-extrabold text-slate-800 text-[11px]">{req.department || req.jobTitle || 'غير محدد'}</span>
                    </div>
                  </div>

                  {/* Client Info & Status Control */}
                  <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-3">
                    <div className="flex flex-col gap-1 text-[11px]">
                      <span className="text-slate-500 font-bold mb-1">تواصل مع الموظف:</span>
                      {req.phone && (
                        <div className="flex items-center gap-2">
                          <a 
                            href={`https://wa.me/${req.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`مرحباً أ. ${req.employeeName}، بخصوص طلبك رقم ${req.id}...`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 font-mono text-emerald-700 hover:text-emerald-800 transition-colors bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold"
                            dir="ltr"
                          >
                            <MessageCircle size={14} className="text-emerald-500" />
                            تواصل واتساب ({req.phone})
                          </a>
                        </div>
                      )}
                      {req.email && (
                        <div className="flex items-center gap-2">
                          <a 
                            href={`mailto:${req.email}?subject=${encodeURIComponent(`بخصوص طلبك رقم ${req.id}`)}`}
                            className="flex items-center gap-1.5 text-blue-700 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold"
                          >
                            <Mail size={14} className="text-blue-500" />
                            إرسال إيميل ({req.email})
                          </a>
                        </div>
                      )}
                      {!req.phone && !req.email && (
                        <span className="text-slate-400 italic text-[10px]">لم يتم تقديم معلومات تواصل</span>
                      )}
                    </div>

                    {onStatusChange && (
                      <div className="pt-2 border-t border-slate-200">
                        <label className="block text-[10px] text-slate-500 mb-1.5 font-bold">اتخاذ قرار (الإدارة):</label>
                        <div className="flex flex-wrap gap-2">
                          {(userRole === 'hr_manager' || userRole === 'it_support') && req.status === 'submitted_by_employee' && (
                            <>
                              <button onClick={() => onStatusChange(req.id, 'approved')} className="text-[10px] px-3 py-1.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold transition-colors">اعتماد</button>
                              <button onClick={() => onStatusChange(req.id, 'forwarded_to_principal')} className="text-[10px] px-3 py-1.5 rounded bg-indigo-100 text-indigo-800 hover:bg-indigo-200 font-bold transition-colors">رفع لمدير المدرسة</button>
                              <button onClick={() => {
                                const reason = window.prompt('الرجاء إدخال سبب الرفض:');
                                if (reason) onStatusChange(req.id, 'rejected', reason);
                              }} className="text-[10px] px-3 py-1.5 rounded bg-rose-100 text-rose-800 hover:bg-rose-200 font-bold transition-colors">رفض</button>
                            </>
                          )}
                          
                          {userRole === 'principal' && req.status === 'forwarded_to_principal' && (
                            <>
                              <button onClick={() => onStatusChange(req.id, 'approved')} className="text-[10px] px-3 py-1.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold transition-colors">اعتماد (مدير المدرسة)</button>
                              <button onClick={() => {
                                const reason = window.prompt('الرجاء إدخال سبب الرفض:');
                                if (reason) onStatusChange(req.id, 'rejected', reason);
                              }} className="text-[10px] px-3 py-1.5 rounded bg-rose-100 text-rose-800 hover:bg-rose-200 font-bold transition-colors">رفض (مدير المدرسة)</button>
                            </>
                          )}
                          
                          {req.status === 'approved' && (userRole === 'hr_manager' || userRole === 'it_support') && (
                            <button onClick={() => onStatusChange(req.id, 'completed')} className="text-[10px] px-3 py-1.5 rounded bg-slate-200 text-slate-800 hover:bg-slate-300 font-bold transition-colors">إغلاق / حفظ في الأرشيف (مكتمل)</button>
                          )}

                          {['approved', 'completed', 'rejected'].includes(req.status) && (
                            <span className="text-[10px] text-slate-400 italic mt-1">تم اتخاذ القرار مسبقاً.</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attachments & Files */}
                  {req.attachments && req.attachments.length > 0 && (
                    <div className="mb-4 flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500">المرفقات ({req.attachments.length}):</span>
                      <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
                        {req.attachments.map((file, idx) => (
                          file.downloadUrl ? (
                            <a
                              key={idx}
                              href={file.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 py-1.5 px-2 rounded-lg transition-colors font-bold"
                            >
                              <FolderDown size={14} className="text-blue-500" />
                              <span className="truncate flex-1" title={file.name}>{file.name}</span>
                            </a>
                          ) : (
                            <span key={idx} className="text-xs text-slate-400">ملف غير مكتمل الرفع</span>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Footer Action triggers */}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectRequest(req)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-950 px-3.5 py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
                        title="عرض تفاصيل الطلب كاملة"
                      >
                        <Eye size={13} />
                        <span>فتح الطلب</span>
                      </button>

                      {onDuplicateRequest && (
                        <button
                          onClick={() => onDuplicateRequest(req)}
                          className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                          title="نسخ الرابط"
                        >
                          <Copy size={13} />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      {onUploadAdminFiles && (
                        <button
                          onClick={() => onUploadAdminFiles(req)}
                          className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-indigo-100 bg-white"
                          title="إرفاق ملفات إدارية"
                        >
                          <FileText size={13} />
                        </button>
                      )}

                      <button
                        onClick={() => setAuditModalReq(req)}
                        className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-amber-100 bg-white"
                        title="سجل الحركات (Audit Trail)"
                      >
                        <History size={13} />
                      </button>

                      {onDeleteRequest && (
                        <button
                          onClick={() => onDeleteRequest(req.id)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-rose-100 bg-white"
                          title="حذف الطلب نهائياً"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Audit Trail Modal */}
      <AnimatePresence>
        {auditModalReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" dir="rtl">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setAuditModalReq(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <History size={18} className="text-amber-600" />
                  سجل حركات الطلب ({auditModalReq.id})
                </h3>
                <button onClick={() => setAuditModalReq(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-4">
                {!auditModalReq.auditTrail || auditModalReq.auditTrail.length === 0 ? (
                  <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl">
                    <span className="text-sm font-bold text-slate-400">لا يوجد حركات مسجلة لهذا الطلب.</span>
                  </div>
                ) : (
                  <div className="relative border-r-2 border-slate-200 pr-4 space-y-6">
                    {auditModalReq.auditTrail.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((entry, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -right-[23px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white"></div>
                        <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm text-right">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-extrabold text-sm text-slate-800">{entry.details}</span>
                            <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                              {new Date(entry.timestamp).toLocaleString('ar-SA')}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <span className="font-bold">{entry.performedByName}</span>
                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{entry.action}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
