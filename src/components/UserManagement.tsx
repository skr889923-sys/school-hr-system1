import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, UserPlus, Search, Edit2, Trash2, Mail, Phone, BadgeInfo, X, Save
} from 'lucide-react';

interface Employee {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  national_id: string;
  department: string;
  job_title: string;
  email: string;
  phone: string;
  role: UserRole;
  created_at: string;
}

export default function UserManagement({ userRole }: { userRole: UserRole }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({
    full_name: '', national_id: '', department: '', job_title: '', email: '', phone: '', role: 'employee'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        full_name: employee.full_name,
        national_id: employee.national_id,
        department: employee.department,
        job_title: employee.job_title,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        full_name: '', national_id: '', department: '', job_title: '', email: '', phone: '', role: 'employee'
      });
    }
    setSaveError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    
    try {
      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update(formData)
          .eq('id', editingEmployee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employees')
          .insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      console.error('Error saving employee:', err);
      setSaveError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف حساب "${name}"؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      try {
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) throw error;
        setEmployees(employees.filter(emp => emp.id !== id));
      } catch (err) {
        console.error('Error deleting employee:', err);
        alert('حدث خطأ أثناء الحذف');
      }
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.includes(searchQuery) || 
    emp.email.includes(searchQuery) ||
    emp.national_id?.includes(searchQuery) ||
    emp.department?.includes(searchQuery)
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          إدارة الموظفين والمعلمين
        </h2>
        {userRole === 'hr_manager' && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            إضافة موظف جديد
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="ابحث بالاسم، الإيميل، السجل المدني، أو القسم..."
            className="bg-transparent border-none outline-none w-full text-sm text-slate-800 placeholder-slate-400 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">جاري تحميل بيانات الموظفين...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-bold">لم يتم العثور على موظفين</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 rounded-tr-xl">الاسم</th>
                  <th className="px-4 py-3">المسمى / القسم</th>
                  <th className="px-4 py-3">التواصل</th>
                  <th className="px-4 py-3">الصلاحية</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3 rounded-tl-xl text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{emp.full_name}</div>
                      <div className="text-xs text-slate-500">{emp.national_id || '---'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{emp.job_title}</div>
                      <div className="text-xs text-slate-500 bg-slate-200/60 inline-block px-2 py-0.5 rounded-md mt-1">{emp.department}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600 mb-1" dir="ltr">
                        <Mail className="w-3 h-3" />
                        <span className="text-xs">{emp.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600" dir="ltr">
                        <Phone className="w-3 h-3" />
                        <span className="text-xs">{emp.phone || '---'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        emp.role === 'hr_manager' || emp.role === 'it_support' || emp.role === 'principal' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {emp.role === 'employee' ? 'معلم / موظف' : 
                         emp.role === 'hr_manager' ? 'موارد بشرية' : 
                         emp.role === 'principal' ? 'مدير المدرسة' :
                         emp.role === 'it_support' ? 'دعم فني' : emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {emp.auth_user_id ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div> مسجل
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div> بانتظار التسجيل
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        {userRole === 'hr_manager' && (
                          <>
                            <button 
                              onClick={() => handleOpenModal(emp)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(emp.id, emp.full_name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="bg-slate-50 border-b border-slate-200 p-5 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800">
                  {editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full border border-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                {saveError && (
                  <div className="mb-4 bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-bold border border-rose-100">
                    {saveError}
                  </div>
                )}
                
                <form id="employee-form" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-1.5 text-slate-700">الاسم الرباعي <span className="text-rose-500">*</span></label>
                    <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-slate-700">رقم السجل المدني / الهوية</label>
                    <input type="text" value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm" dir="ltr" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-slate-700">البريد الإلكتروني <span className="text-rose-500">*</span></label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm" dir="ltr" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-slate-700">القسم / المرحلة <span className="text-rose-500">*</span></label>
                    <input required type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm" placeholder="مثال: الرياضيات، الإدارة..." />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-slate-700">المسمى الوظيفي <span className="text-rose-500">*</span></label>
                    <input required type="text" value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm" placeholder="مثال: معلم، وكيل..." />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-slate-700">رقم الجوال</label>
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm" dir="ltr" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-slate-700">الصلاحية في النظام <span className="text-rose-500">*</span></label>
                    <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm bg-white">
                      <option value="employee">معلم / موظف عادي</option>
                      <option value="hr_manager">موارد بشرية (إدارة)</option>
                      <option value="principal">مدير مدرسة</option>
                      <option value="it_support">دعم فني</option>
                    </select>
                  </div>
                </form>
                
                <div className="mt-6 bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex items-start gap-3">
                  <BadgeInfo className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed font-medium">
                    عند إضافة الموظف هنا، سيتمكن من تسجيل الدخول للنظام لاحقاً باستخدام البريد الإلكتروني المدخل. سيتم ربط حسابه بهذا الملف تلقائياً ولن يحتاج لإنشاء ملف جديد.
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit"
                  form="employee-form"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : <Save className="w-4 h-4" />}
                  حفظ البيانات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
