import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Eraser, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingSig, setExistingSig] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [canSaveEmployeeSignature, setCanSaveEmployeeSignature] = useState(false);
  const [canSaveLegacySignature, setCanSaveLegacySignature] = useState(false);

  useEffect(() => {
    const fetchSig = async () => {
      if (isOpen) {
        setLoading(true);
        setMessage(null);
        setCanSaveEmployeeSignature(false);
        setCanSaveLegacySignature(false);
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          const { data: employee } = await supabase
            .from('employees')
            .select('*')
            .eq('auth_user_id', sessionData.session.user.id)
            .maybeSingle();

          const supportsEmployeeSignature = Boolean(employee && Object.prototype.hasOwnProperty.call(employee, 'signature_data'));
          setCanSaveEmployeeSignature(supportsEmployeeSignature);

          if (supportsEmployeeSignature && employee?.signature_data) {
            setExistingSig(employee.signature_data);
          } else {
            const { data } = await supabase.from('users').select('*').eq('uid', sessionData.session.user.id).maybeSingle();
            const supportsLegacySignature = Boolean(data && Object.prototype.hasOwnProperty.call(data, 'signature_data'));
            setCanSaveLegacySignature(supportsLegacySignature);

            if (supportsLegacySignature && data?.signature_data) {
              setExistingSig(data.signature_data);
            }
          }
        }
        setLoading(false);
      }
    };
    fetchSig();
  }, [isOpen]);

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setExistingSig(null);
  };

  const saveSignature = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    
    let base64Sig = existingSig;
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      base64Sig = sigCanvas.current.getCanvas().toDataURL('image/png');
    }

    if (!base64Sig) {
      setMessage({ type: 'error', text: 'الرجاء التوقيع أولاً.' });
      return;
    }

    setSaving(true);
    try {
      if (canSaveEmployeeSignature) {
        await supabase
          .from('employees')
          .update({ signature_data: base64Sig })
          .eq('auth_user_id', user.id);
      } else if (canSaveLegacySignature) {
        await supabase.from('users').update({ signature_data: base64Sig }).eq('uid', user.id);
      } else {
        setMessage({ type: 'error', text: 'حفظ التوقيع يحتاج تنفيذ Migration الترقية أولاً.' });
        return;
      }

      setMessage({ type: 'success', text: 'تم حفظ التوقيع الإلكتروني داخل النظام.' });
      onClose();
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ التوقيع.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" dir="rtl">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-black text-slate-900">إعدادات الملف الشخصي والتوقيع</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-500 font-bold mb-2">توقيعك الإلكتروني (سيتم استخدامه لختم الطلبات والخطابات)</p>
            {message && (
              <div className={`rounded-xl border px-4 py-3 text-xs font-bold ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {message.text}
              </div>
            )}
            
            <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden relative" style={{ height: 200 }}>
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                  <Loader2 className="animate-spin text-blue-500" />
                </div>
              ) : existingSig ? (
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 bg-slate-50">
                  <img src={existingSig} alt="Signature" className="max-h-32 max-w-full" />
                </div>
              ) : (
                <SignatureCanvas 
                  ref={sigCanvas} 
                  penColor="#0f172a"
                  canvasProps={{ className: 'w-full h-full cursor-crosshair' }} 
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={clearSignature} className="flex items-center gap-1.5 px-4 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold text-xs transition-colors">
                <Eraser size={16} /> مسح
              </button>
              <button onClick={saveSignature} disabled={saving} className="flex items-center gap-1.5 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-xs transition-colors shadow-md">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                حفظ التوقيع
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
