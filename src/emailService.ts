import emailjs from '@emailjs/browser';
import { EmployeeRequest } from './types';

// ==========================================
// ⚠️ إعدادات EmailJS (مفاتيح مؤقتة) ⚠️
// يجب عليك إنشاء حساب في emailjs.com مجاناً واستبدال هذه القيم بالقيم الحقيقية الخاصة بك:
// 1. Service ID
// 2. Template ID
// 3. Public Key
// ==========================================

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'DUMMY_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'DUMMY_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'DUMMY_PUBLIC_KEY';
const ADMIN_EMAIL = 'T157606@estb.moe.gov.sa';

/**
 * دالة لإرسال إيميل عند استلام الطلب الجديد
 */
export const sendOrderConfirmationEmail = async (request: EmployeeRequest) => {
  if (!request.email) return;

  // القيم التي سيتم إرسالها إلى قالب الإيميل
  const templateParams = {
    employee_name: request.employeeName,
    request_id: request.id,
    request_type: request.requestType,
    client_email: request.email,
    email: request.email, // To the employee
    new_status: 'تم الاستلام ⏳',
    tracking_link: `${window.location.origin}/request/${request.id}` // رابط تفاصيل الطلب
  };

  try {
    // 1. إرسال الإيميل للموظف
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    console.log('تم إرسال إيميل الموظف بنجاح!', response.status, response.text);

    // 2. إرسال إيميل للإدارة
    const adminTemplateParams = {
      ...templateParams,
      email: ADMIN_EMAIL, // يتم توجيه الرسالة للإدارة
      new_status: 'طلب جديد بانتظار المراجعة 🚨'
    };
    
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      adminTemplateParams,
      EMAILJS_PUBLIC_KEY
    );
    console.log('تم إرسال إيميل الإدارة بنجاح!');
  } catch (error) {
    console.error('فشل في إرسال الإيميل:', error);
  }
};

/**
 * دالة لإرسال إيميل عند تغيير حالة الطلب من لوحة التحكم
 */
export const sendOrderStatusUpdateEmail = async (request: EmployeeRequest, newStatusText: string) => {
  if (!request.email) return;

  const templateParams = {
    employee_name: request.employeeName,
    request_id: request.id,
    request_type: request.requestType,
    client_email: request.email,
    email: request.email,
    new_status: newStatusText,
    tracking_link: `${window.location.origin}/request/${request.id}`
  };

  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID, 
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    console.log('تم إرسال إيميل تحديث الحالة بنجاح!', response.status, response.text);
  } catch (error) {
    console.error('فشل في إرسال إيميل التحديث:', error);
  }
};
