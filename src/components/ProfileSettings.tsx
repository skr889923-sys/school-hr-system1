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

  useEffect(() => {
    const fetchSig = async () => {
      if (isOpen) {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          const { data } = await supabase.from('users').select('signature_data, signatureData').eq('uid', sessionData.session.user.id).maybeSingle();
          if (data) {
            setExistingSig(data.signature_data || data.signatureData);
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
      alert("الرجاء التوقيع أولاً");
      return;
    }

    setSaving(true);
    try {
      await supabase.from('users').update({ signature_data: base64Sig, signatureData: base64Sig }).eq('uid', user.id);
      alert('تم حفظ التوقيع بنجاح!');
      onClose();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
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
