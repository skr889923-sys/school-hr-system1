import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { LetterTemplate, SignatureBox } from '../types';
import { officialTemplates } from '../utils/officialTemplates';
import { uploadFile } from '../utils/storage';
import { Plus, Trash2, FileText, Upload, Loader2, X, Settings, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';


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
  'list', 'bullet', 'indent',
  'direction', 'align',
  'link'
];

export default function TemplateManager() {
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<'text' | 'pdf'>('text');
  const [textContent, setTextContent] = useState('السلام عليكم ورحمة الله وبركاته،\nأفيدكم أنا الموظف {{employeeName}} ...');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sigBox, setSigBox] = useState<SignatureBox>({ pageIndex: 0, x: 50, y: 50, width: 150, height: 60 });
  const [preset, setPreset] = useState('bottom-left');

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

  const handlePresetChange = (val: string) => {
    setPreset(val);
    if (val === 'bottom-left') setSigBox({ ...sigBox, x: 50, y: 50, width: 150, height: 60 });
    if (val === 'bottom-right') setSigBox({ ...sigBox, x: 400, y: 50, width: 150, height: 60 });
    if (val === 'bottom-center') setSigBox({ ...sigBox, x: 225, y: 50, width: 150, height: 60 });
  };

  const handleSave = async () => {
    if (!templateName) return alert('الرجاء إدخال اسم القالب');
    if (templateType === 'pdf' && !pdfFile) return alert('الرجاء اختيار ملف PDF');
    
    setSaving(true);
    try {
      const id = uuidv4();
      let pdfUrl = '';

      if (templateType === 'pdf' && pdfFile) {
        const res = await uploadFile(pdfFile, `templates/${id}_${pdfFile.name}`);
        pdfUrl = res.downloadUrl;
      }

      const newTemplate: LetterTemplate = {
        id,
        name: templateName,
        type: templateType,
        content: templateType === 'text' ? textContent : undefined,
        pdfUrl: templateType === 'pdf' ? pdfUrl : undefined,
        signatureBox: templateType === 'pdf' ? sigBox : undefined,
        createdAt: new Date().toISOString()
      };

      await supabase.from('hr_templates').insert({
        id: newTemplate.id,
        name: newTemplate.name,
        type: newTemplate.type,
        content: newTemplate.content || null,
        pdf_url: newTemplate.pdfUrl || null,
        signature_box: newTemplate.signatureBox || null,
        created_at: newTemplate.createdAt
      });
      setCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ القالب');
    } finally {
      setSaving(false);
    }
  };

  const importOfficialTemplates = async () => {
    setIsImporting(true);
    try {
      for (const t of officialTemplates) {
        await supabase.from('hr_templates').insert({
          id: uuidv4(),
          name: t.name,
          type: t.type,
          content: t.content,
          pdf_url: null,
          signature_box: null,
          created_at: new Date().toISOString()
        });
      }
      alert('تم استيراد النماذج الرسمية بنجاح!');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الاستيراد');
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setTemplateName('');
    setTemplateType('text');
    setTextContent('السلام عليكم ورحمة الله وبركاته،\nأفيدكم أنا الموظف {{employeeName}} ...');
    setPdfFile(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا القالب؟')) {
      await supabase.from('hr_templates').delete().eq('id', id);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            إدارة قوالب الخطابات
          </h2>
          <p className="text-xs text-slate-500 mt-1">قم بإعداد قوالب النصوص أو ملفات PDF مع تحديد مربع التوقيع.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={importOfficialTemplates}
            disabled={isImporting}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
          >
            {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
            {isImporting ? 'جاري الاستيراد...' : 'استيراد النماذج الرسمية'}
          </button>
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-950 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
          >
            <Plus size={16} /> إضافة قالب
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-sm text-slate-400 font-bold">لا يوجد قوالب مسجلة حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.id} className="border border-slate-200 p-4 rounded-xl hover:shadow-md transition-shadow bg-slate-50 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-extrabold text-slate-800 text-sm">{t.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${t.type === 'pdf' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                    {t.type === 'pdf' ? 'ملف PDF' : 'نص ديناميكي'}
                  </span>
                </div>
                {t.type === 'pdf' && (
                  <p className="text-[10px] text-slate-500 font-mono mt-2 flex items-center gap-1">
                    <Settings size={10} />
                    مربع التوقيع: X:{t.signatureBox?.x} Y:{t.signatureBox?.y}
                  </p>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                <button onClick={() => handleDelete(t.id)} className="text-rose-500 hover:bg-rose-100 p-1.5 rounded-lg transition-colors">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setCreateModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-4xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h3 className="text-base font-black text-slate-900">إضافة قالب جديد</h3>
                <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
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
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">محتوى القالب</label>
                    <p className="text-[10px] text-slate-500 mb-2">استخدم المتغيرات الديناميكية مثل: <code className="bg-slate-100 px-1 rounded">[اسم الموظف]</code>، <code className="bg-slate-100 px-1 rounded">[الرقم الوظيفي]</code>، وسيطلب النظام تعبئتها قبل الإصدار.</p>
                    <div className="bg-white rounded-lg border border-slate-300 overflow-hidden" dir="rtl">
                      <ReactQuill 
                        theme="snow" 
                        value={textContent} 
                        onChange={setTextContent} 
                        modules={quillModules}
                        formats={quillFormats}
                        className="h-64"
                        style={{ direction: 'rtl', textAlign: 'right' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 border border-slate-200 p-4 rounded-xl bg-slate-50">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">ملف الـ PDF المرجعي</label>
                      <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="w-full text-xs" />
                    </div>
                    
                    <div className="pt-2 border-t border-slate-200">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">موقع التوقيع الإلكتروني للموظف</label>
                      <select value={preset} onChange={e => handlePresetChange(e.target.value)} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 mb-3 outline-none">
                        <option value="bottom-left">أسفل اليسار</option>
                        <option value="bottom-right">أسفل اليمين</option>
                        <option value="bottom-center">أسفل المنتصف</option>
                        <option value="custom">تخصيص (إحداثيات)</option>
                      </select>
                      
                      {preset === 'custom' && (
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">X (أفقي)</label>
                            <input type="number" value={sigBox.x} onChange={e => setSigBox({...sigBox, x: +e.target.value})} className="w-full text-xs border border-slate-300 rounded px-2 py-1" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Y (عمودي)</label>
                            <input type="number" value={sigBox.y} onChange={e => setSigBox({...sigBox, y: +e.target.value})} className="w-full text-xs border border-slate-300 rounded px-2 py-1" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">العرض</label>
                            <input type="number" value={sigBox.width} onChange={e => setSigBox({...sigBox, width: +e.target.value})} className="w-full text-xs border border-slate-300 rounded px-2 py-1" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">الارتفاع</label>
                            <input type="number" value={sigBox.height} onChange={e => setSigBox({...sigBox, height: +e.target.value})} className="w-full text-xs border border-slate-300 rounded px-2 py-1" />
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-amber-600 mt-2">* يتم احتساب الإحداثيات من الزاوية السفلية اليسرى للملف.</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-white rounded-b-2xl">
                <button onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors">إلغاء</button>
                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} حفظ القالب
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
