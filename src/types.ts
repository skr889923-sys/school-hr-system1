/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HRRequestType = 
  | 'مساءلة غياب/تأخر' 
  | 'طلب إجازة عادية/مرضية' 
  | 'تعريف بالراتب' 
  | 'طلب استئذان' 
  | 'شكوى/تظلم' 
  | 'عهدة'
  | 'خطابات';

export const REQUEST_TYPES: HRRequestType[] = [
  'مساءلة غياب/تأخر',
  'طلب إجازة عادية/مرضية',
  'تعريف بالراتب',
  'طلب استئذان',
  'شكوى/تظلم',
  'عهدة',
  'خطابات'
];

export interface AttachmentFile {
  name: string;
  size: number;
  type: string;
  previewUrl?: string; // object URL for images
  downloadUrl?: string; // Firebase storage download URL
  storagePath?: string; // path in Firebase storage to allow deletion
}

export interface EmployeeRequest {
  id: string; // auto-generated request code e.g. HR-1002
  
  // Section 1: Employee Details
  employeeName: string;
  employeeId: string;
  department?: string;
  jobTitle: string;
  phone: string;
  email: string;
  
  // Section 2: Request Details
  requestType: HRRequestType | '';
  startDate?: string;
  endDate?: string;
  leaveDays?: number;
  justification: string;
  
  // Attachments
  attachments: AttachmentFile[];
  
  // Signature
  agreedToTerms: boolean;
  signatureData?: string; // canvas draw base64
  
  // --- Admin Additions ---
  adminNotes?: string;
  adminAttachments?: AttachmentFile[];
  
  // --- Templates ---
  templateId?: string; // ID of the template associated with this request
  templateData?: Record<string, string>; // Dynamic template field values filled by admin
  finalPdfUrl?: string; // Generated PDF with signature/text
  employeeSignature?: string; // Employee's base64 signature
  
  // --- Audit Trail ---
  auditTrail?: AuditLogEntry[];
  
  createdAt: string;
  status: 'pending_employee_response' | 'submitted_by_employee' | 'forwarded_to_principal' | 'approved' | 'rejected' | 'completed';
  rejectionReason?: string;
  rejectedByRole?: string;
  updatedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string; // e.g. "STATUS_CHANGE", "FILE_UPLOAD", "CREATED"
  details: string; // e.g. "غير الحالة إلى مقبول"
  performedByRole: UserRole; // 'principal', 'hr_manager', 'employee', 'system'
  performedByName: string; // "مدير المدرسة" or "موظف"
  timestamp: string;
}

export type UserRole = 'principal' | 'hr_manager' | 'it_support' | 'unassigned' | 'employee' | 'system';

export interface UserAccount {
  uid: string;
  email: string;
  role: UserRole;
  signatureData?: string; // base64 canvas data
  stampData?: string; // image download URL or base64
}

export interface SignatureBox {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PdfFieldType = 'text' | 'long-text' | 'date' | 'signature';

export interface PdfField {
  id: string;
  type: PdfFieldType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface LetterTemplate {
  id: string;
  name: string;
  type: 'text' | 'pdf';
  
  // For 'text' type
  content?: string; // HTML or text with variables like {{employeeName}}
  
  // For 'pdf' type
  pdfUrl?: string; // Original uploaded PDF
  signatureBox?: SignatureBox; // Where to put the employee's signature
  adminSignatureBox?: SignatureBox; // Where to put the admin's signature (optional)
  
  createdAt: string;
}
