const MB = 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'png', 'jpg', 'jpeg']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]);

export interface FileValidationResult {
  valid: boolean;
  message?: string;
}

export function validateUploadFile(file: File): FileValidationResult {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeAllowed = file.type ? ALLOWED_MIME_TYPES.has(file.type) : true;

  if (!ALLOWED_EXTENSIONS.has(extension) || !mimeAllowed) {
    return {
      valid: false,
      message: 'نوع الملف غير مسموح. الأنواع المسموحة: PDF، DOCX، PNG، JPG.',
    };
  }

  const maxSize = extension === 'pdf' ? 25 * MB : 10 * MB;
  if (file.size > maxSize) {
    return {
      valid: false,
      message: `حجم الملف أكبر من الحد المسموح (${Math.round(maxSize / MB)}MB).`,
    };
  }

  if (file.name.length > 180) {
    return {
      valid: false,
      message: 'اسم الملف طويل جداً. يرجى اختصار الاسم ثم المحاولة مرة أخرى.',
    };
  }

  return { valid: true };
}

export function assertValidUploadFile(file: File): void {
  const result = validateUploadFile(file);
  if (!result.valid) {
    throw new Error(result.message || 'تعذر قبول الملف.');
  }
}
