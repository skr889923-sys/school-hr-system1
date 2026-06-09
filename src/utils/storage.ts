import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a file to Supabase Storage under a specific folder (e.g. request ID).
 * Returns the download URL and the storage path.
 */
export const uploadFile = async (
  file: File,
  requestId: string,
  onProgress?: (progress: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> => {
  // Generate a unique file name to avoid collisions
  const fileExtension = file.name.split('.').pop();
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
      upsert: false
    });

  if (error) {
    console.error("Upload failed", error);
    throw error;
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
  try {
    const { error } = await supabase.storage.from('files').remove([storagePath]);
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting file", error);
  }
};
