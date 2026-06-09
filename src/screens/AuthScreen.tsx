import React, { useState } from 'react';
import { supabase } from '../supabase';
import { motion } from 'motion/react';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setIsLoading(true);
      setError('');
      try {
        if (isLoginMode) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
        } else {
          const { error: signUpError } = await supabase.auth.signUp({ email, password });
          if (signUpError) throw signUpError;
        }
      } catch (err: any) {
        if (isLoginMode) {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        } else {
          setError(err.message?.includes('already registered') 
            ? 'البريد الإلكتروني مسجل مسبقاً' 
            : 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مرة أخرى');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 pb-16 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 py-4 px-6 sm:px-12 flex justify-end items-center">
        <div className="flex items-center gap-3">
          <span className="font-black text-slate-800 text-lg">School System</span>
          <img src="/logo.png" alt="School System Logo" className="h-10 object-contain" />
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-10 py-8 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 w-full" 
          dir="rtl"
        >
          <div className="bg-white rounded-2xl shadow-sm w-full max-w-md p-8 border border-slate-200">
            <div className="flex flex-col items-center justify-center mb-8">
              <img src="/logo.png" alt="شعار المدرسة" className="w-32 h-32 object-contain mb-4 drop-shadow-sm" />
              <h1 className="text-xl font-black text-slate-950 text-center">مدرسة الأمير سعود بن عبدالله بن جلوي المتوسطة</h1>
              <p className="text-xs text-slate-500 mt-2 font-medium">نظام إدارة الموارد البشرية - بوابة الإدارة</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-700">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-800"
                  placeholder="T157606@estb.moe.gov.sa"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-700">الرقم السري {isLoginMode ? '' : '(6 أحرف أو أرقام على الأقل)'}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-slate-800"
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
              {error && <p className="text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-lg">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'جاري التحقق...' : (isLoginMode ? 'التحقق والدخول' : 'إنشاء الحساب')}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button 
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setError('');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                {isLoginMode ? 'ليس لديك حساب؟ قم بإنشاء حساب جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
