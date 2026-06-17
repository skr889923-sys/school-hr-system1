import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { LetterTemplate, SignatureBox } from '../types';
import { officialTemplates } from '../utils/officialTemplates';
import { uploadFile } from '../utils/storage';
import { Plus, Trash2, Edit2, FileText, Upload, Loader2, X, Settings, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import mammoth from 'mammoth';
import PdfFieldMapper from './PdfFieldMapper';
import { PdfField } from '../types';

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

export default function TemplateManager() {
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
  
  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<'text' | 'pdf'>('text');
  const [textContent, setTextContent] = useState('السلام عليكم ورحمة الله وبركاته،\nأفيدكم أنا الموظف {{employeeName}} ...');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFields, setPdfFields] = useState<PdfField[]>([]);
  const [localPdfUrl, setLocalPdfUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supportsTemplateActiveColumn = templates.some(template => Object.prototype.hasOwnProperty.call(template, 'active'));
  const visibleTemplates = templates.filter(template => template.active !== false);

  const isMissingColumnError = (error: any, columnName: string) => {
    const message = String(error?.message || error?.details || '').toLowerCase();
    return error?.code === '42703' || (message.includes(columnName.toLowerCase()) && message.includes('column'));
  };

  useEffect(() => {
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
      setLoading(false);
    };

    fetchTemplates();

    const channel = supabase
      .channel('templates_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_templates' }, () => {
        fetchTemplates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (pdfFile) {
      const url = URL.createObjectURL(pdfFile);
      setLocalPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLocalPdfUrl(null);
    }
  }, [pdfFile]);

  const handleSave = async () => {
    if (!templateName) {
      setMessage({ type: 'error', text: 'الرجاء إدخال اسم القالب.' });
      return;
    }
    if (templateType === 'pdf' && !pdfFile && !existingPdfUrl) {
      setMessage({ type: 'error', text: 'الرجاء اختيار ملف PDF.' });
      return;
    }
    
    setSaving(true);
    try {
      const id = editTemplateId || uuidv4();
      let pdfUrl = existingPdfUrl || '';

      if (templateType === 'pdf' && pdfFile) {
        const res = await uploadFile(pdfFile, `templates/${id}`);
        pdfUrl = res.downloadUrl;
      }

      const templateData: any = {
        name: templateName,
        type: templateType,
        content: templateType === 'text' ? textContent : JSON.stringify(pdfFields),
        pdf_url: templateType === 'pdf' ? pdfUrl : null,
        signature_box: null, // deprecated
      };

      if (supportsTemplateActiveColumn) {
        templateData.active = true;
      }

      if (editTemplateId) {
        const { error } = await supabase.from('hr_templates').update(templateData).eq('id', editTemplateId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hr_templates').insert({
          id,
          ...templateData,
          created_at: new Date().toISOString()
        });
        if (error) throw error;
      }
      
      setCreateModalOpen(false);
      resetForm();
      setMessage({ type: 'success', text: editTemplateId ? 'تم حفظ تعديلات القالب.' : 'تم حفظ القالب الجديد.' });
      
      // Update local state immediately so user sees changes without refreshing
      const newTmpl = { id, ...templateData, created_at: new Date().toISOString() };
      if (editTemplateId) {
        setTemplates(prev => prev.map(t => t.id === editTemplateId ? { ...t, ...templateData } as LetterTemplate : t));
      } else {
        setTemplates(prev => [newTmpl as unknown as LetterTemplate, ...prev]);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ القالب.' });
    } finally {
      setSaving(false);
    }
  };

  const importOfficialTemplates = async () => {
    setIsImporting(true);
    try {
      for (const t of officialTemplates) {
        const payload: any = {
          id: uuidv4(),
          name: t.name,
          type: t.type,
          content: t.content,
          pdf_url: null,
          signature_box: null,
          created_at: new Date().toISOString()
        };

        if (supportsTemplateActiveColumn) {
          payload.active = true;
        }

        await supabase.from('hr_templates').insert(payload);
      }
      setMessage({ type: 'success', text: 'تم استيراد النماذج الرسمية بنجاح.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الاستيراد.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleEdit = (t: LetterTemplate) => {
    setEditTemplateId(t.id);
    setTemplateName(t.name);
    setTemplateType(t.type);
    if (t.type === 'text') setTextContent(t.content || '');
    if (t.type === 'pdf') {
      setExistingPdfUrl(t.pdfUrl || null);
      try {
        if (t.content) setPdfFields(JSON.parse(t.content));
        else setPdfFields([]);
      } catch (e) {
        setPdfFields([]);
      }
    }
    setCreateModalOpen(true);
  };

  const resetForm = () => {
    setEditTemplateId(null);
    setExistingPdfUrl(null);
    setTemplateName('');
    setTemplateType('text');
    setTextContent('السلام عليكم ورحمة الله وبركاته،\nأفيدكم أنا الموظف {{employeeName}} ...');
    setPdfFile(null);
    setPdfFields([]);
  };

  const handleDocxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setTextContent(result.value);
        setTemplateType('text');
        if (!templateName) {
          setTemplateName(file.name.replace(/\.docx?$/i, ''));
        }
        setIsImporting(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل استيراد ملف الوورد.' });
      setIsImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const template = templates.find(t => t.id === id);
    const canArchive = supportsTemplateActiveColumn || (template ? Object.prototype.hasOwnProperty.call(template, 'active') : false);

    if (window.confirm('سيتم حذف القالب من القائمة. إذا كانت قاعدة البيانات تدعم الأرشفة فسيتم أرشفته للحفاظ على الطلبات القديمة. هل تريد المتابعة؟')) {
      if (canArchive) {
        const { error } = await supabase
          .from('hr_templates')
          .update({ active: false })
          .eq('id', id);

        if (!error) {
          setTemplates(prev => prev.map(t => t.id === id ? { ...t, active: false } : t));
          setMessage({ type: 'success', text: 'تم حذف القالب من القائمة ونقله للأرشيف.' });
          return;
        }

        if (!isMissingColumnError(error, 'active')) {
          setMessage({ type: 'error', text: 'تعذر حذف القالب من القائمة. تحقق من الصلاحيات ثم حاول مرة أخرى.' });
          return;
        }
      }

      const { error: deleteError } = await supabase
        .from('hr_templates')
        .delete()
        .eq('id', id);

      if (deleteError) {
        setMessage({ type: 'error', text: 'تعذر حذف القالب. إذا كان مرتبطاً بطلبات قديمة، نفذ Migration الأرشفة أولاً.' });
        return;
      }

      setTemplates(prev => prev.filter(t => t.id !== id));
      setMessage({ type: 'success', text: 'تم حذف القالب.' });
    }
  };

  return (
    <div className="bt-panel-strong p-5 sm:p-6 mb-8" dir="rtl">
      {message && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-xs font-bold ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <h2 className="text-lg font-black text-[#173233] flex items-center gap-2">
            <FileText size={20} className="text-[#0a7e7e]" />
            إدارة قوالب الخطابات
          </h2>
          <p className="text-xs text-slate-500 mt-1">قم بإعداد قوالب النصوص أو ملفات PDF مع تحديد مربع التوقيع.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button 
            onClick={importOfficialTemplates}
            disabled={isImporting}
            className="bt-soft-btn flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
          >
            {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
            {isImporting ? 'جاري الاستيراد...' : 'استيراد النماذج الرسمية'}
          </button>
          <button 
            onClick={() => { resetForm(); setCreateModalOpen(true); }}
            className="bt-primary-btn flex items-center justify-center gap-2 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <Plus size={16} /> إضافة قالب
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : visibleTemplates.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-[#0a7e7e]/20 rounded-xl bg-white/60">
          <p className="text-sm text-slate-400 font-bold">لا توجد قوالب نشطة حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleTemplates.map(t => (
            <div key={t.id} className="border border-[#0a7e7e]/12 p-4 rounded-xl hover:shadow-md transition-shadow bg-white/75 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-extrabold text-slate-800 text-sm">{t.name}</h3>
                  <div className="flex items-center gap-1">
                    {t.active === false && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-200 text-slate-600">مؤرشف</span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${t.type === 'pdf' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                      {t.type === 'pdf' ? 'ملف PDF' : 'نص ديناميكي'}
                    </span>
                  </div>
                </div>
                {t.type === 'pdf' && t.content && (
                  <p className="text-[10px] text-slate-500 font-mono mt-2 flex items-center gap-1">
                    <Settings size={10} />
                    يحتوي على إعدادات الحقول الذكية
                  </p>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-[#0a7e7e]/10 flex justify-end gap-2">
                <button onClick={() => handleEdit(t)} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded-lg transition-colors" title="تعديل">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(t.id)} className="text-rose-500 hover:bg-rose-100 p-1.5 rounded-lg transition-colors" title="حذف">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setCreateModalOpen(false); resetForm(); }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-4xl rounded-xl shadow-xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-[#0a7e7e]/10 flex justify-between items-center bg-[#f5f3ed] rounded-t-xl">
                <h3 className="text-base font-black text-[#173233]">{editTemplateId ? 'تعديل القالب' : 'إضافة قالب جديد'}</h3>
                <button onClick={() => { setCreateModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              
              <div className="p-5 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم القالب</label>
                  <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600 outline-none" placeholder="مثال: نموذج إجازة اعتيادية" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع القالب</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={templateType === 'text'} onChange={() => setTemplateType('text')} className="w-4 h-4 text-blue-600" />
                      نص قابل للتعديل
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={templateType === 'pdf'} onChange={() => setTemplateType('pdf')} className="w-4 h-4 text-rose-600" />
                      ملف PDF (استيراد)
                    </label>
                  </div>
                </div>

                {templateType === 'text' ? (
                  <div>
                    <div className="flex justify-between items-end mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">محتوى القالب</label>
                      <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1">
                        <Upload size={12} />
                        استيراد من ملف Word (.docx)
                        <input type="file" accept=".docx" className="hidden" onChange={handleDocxImport} />
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2">استخدم المتغيرات الديناميكية مثل: <code className="bg-slate-100 px-1 rounded">[اسم الموظف]</code>، <code className="bg-slate-100 px-1 rounded">[الرقم الوظيفي]</code>، وسيطلب النظام تعبئتها قبل الإصدار.</p>
                    <div className="quill-a4-wrapper" dir="rtl">
                      <div className="quill-a4-editor bg-white rounded-lg">
                        <ReactQuill 
                          theme="snow" 
                          value={textContent} 
                          onChange={setTextContent} 
                          modules={quillModules}
                          formats={quillFormats}
                          style={{ direction: 'rtl', textAlign: 'right' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 border border-[#0a7e7e]/15 p-4 rounded-xl bg-[#f5f3ed]/50">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">ملف الـ PDF المرجعي</label>
                      {editTemplateId && existingPdfUrl && !pdfFile && (
                        <p className="text-[10px] text-green-600 mb-2 font-bold">✓ يوجد ملف PDF محفوظ حالياً. يمكنك رفع ملف جديد لاستبداله.</p>
                      )}
                      <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="w-full text-xs bg-white border border-slate-200 p-2 rounded" />
                    </div>
                    
                    {(localPdfUrl || existingPdfUrl) && (
                      <div className="pt-4 border-t border-slate-200">
                        <label className="block text-sm font-bold text-indigo-700 mb-3 flex items-center gap-2">
                          <Settings size={16} /> إعداد حقول الـ PDF التفاعلية
                        </label>
                        <PdfFieldMapper 
                          pdfUrl={localPdfUrl || existingPdfUrl!} 
                          fields={pdfFields} 
                          onChange={setPdfFields} 
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-[#0a7e7e]/10 flex justify-end gap-2 bg-white rounded-b-xl">
                <button onClick={() => { setCreateModalOpen(false); resetForm(); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors">إلغاء</button>
                <button onClick={handleSave} disabled={saving} className="bt-primary-btn px-6 py-2 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />} {editTemplateId ? 'حفظ التعديلات' : 'حفظ القالب'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
