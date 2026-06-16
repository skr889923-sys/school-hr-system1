import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import { assertValidUploadFile } from './fileValidation';

/**
 * Uploads a file to Supabase Storage under a specific folder (e.g. request ID).
 * Returns the download URL and the storage path.
 */
export const uploadFile = async (
  file: File,
  requestId: string,
  onProgress?: (progress: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> => {
  assertValidUploadFile(file);

  // Generate a unique file name to avoid collisions
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  const storagePath = `requests/${requestId}/${uniqueFileName}`;
  
  // Supabase JS client doesn't natively support progress events yet.
  if (onProgress) {
    onProgress(10);
  }

  const { data, error } = await supabase.storage
    .from('files')
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    const statusCode = (error as { statusCode?: string; status?: number }).statusCode
      || (error as { statusCode?: string; status?: number }).status;
    const details = [statusCode ? `رمز ${statusCode}` : null, error.message]
      .filter(Boolean)
      .join(' - ');
    throw new Error(`فشل رفع الملف إلى التخزين${details ? `: ${details}` : ''}. المسار: ${storagePath}`);
  }

  if (onProgress) {
    onProgress(100);
  }

  const { data: publicUrlData } = supabase.storage
    .from('files')
    .getPublicUrl(storagePath);

  return {
    downloadUrl: publicUrlData.publicUrl,
    storagePath: storagePath
  };
};

/**
 * Deletes a file from Supabase Storage given its path.
 */
export const deleteFile = async (storagePath: string): Promise<void> => {
  const { error } = await supabase.storage.from('files').remove([storagePath]);
  if (error) throw error;
};
