/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

const getProjectRef = (url: string) => {
  try {
    return new URL(url).hostname.split('.')[0] || 'school-hr';
  } catch {
    return 'school-hr';
  }
};

const projectRef = getProjectRef(supabaseUrl);
const authStorageKey = `school-hr-${projectRef}-auth`;
const legacyAuthStorageKey = `sb-${projectRef}-auth-token`;

if (typeof window !== 'undefined') {
  try {
    if (window.localStorage.getItem(legacyAuthStorageKey) && !window.localStorage.getItem(authStorageKey)) {
      window.localStorage.removeItem(legacyAuthStorageKey);
    }
  } catch {
    // Local storage may be unavailable in private or restricted contexts.
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: authStorageKey,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const signInAdmin = async (password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
        email: 'T157606@estb.moe.gov.sa',
        password: password,
    });
    if (error) {
        throw new Error('كلمة المرور غير صحيحة أو الحساب غير موجود. يرجى التواصل مع الدعم الفني لإنشاء حساب المدير.');
    }
}

export const signOutUser = async () => {
    await supabase.auth.signOut();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
