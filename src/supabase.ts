/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
