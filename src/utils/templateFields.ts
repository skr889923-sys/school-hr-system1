/**
 * Template Fields Definition
 * يحدد الحقول المطلوبة لكل قالب رسمي عند إنشاء طلب جديد من قِبل الإدارة.
 * تظهر هذه الحقول ديناميكياً في نافذة إنشاء الطلب بعد اختيار القالب.
 */

export interface TemplateField {
  key: string;           // مفتاح فريد للحقل (يُستخدم لحفظ واسترجاع القيمة)
  label: string;         // التسمية بالعربية
  type: 'text' | 'date' | 'textarea' | 'select' | 'time';
  required: boolean;
  placeholder?: string;
  options?: string[];    // للحقول من نوع select
  fullWidth?: boolean;   // هل يأخذ العرض الكامل (col-span-2)
}

export interface TemplateFieldsConfig {
  templateName: string;
  fields: TemplateField[];
}

/**
 * خريطة حقول القوالب — مفتاح كل قالب هو اسمه الرسمي في جدول hr_templates
 */
export const TEMPLATE_FIELDS: Record<string, TemplateField[]> = {

  // ── 01. خطاب تكليف معلم بعمل أو مهمة ──
  'خطاب تكليف معلم بعمل أو مهمة': [
    { key: 'jobTitle', label: 'المسمى الوظيفي', type: 'text', required: true, placeholder: 'مثال: معلم رياضيات' },
    { key: 'taskDescription', label: 'المهمة المكلف بها', type: 'textarea', required: true, placeholder: 'وصف المهمة بالتفصيل...', fullWidth: true },
    { key: 'taskDuration', label: 'مدة التكليف', type: 'text', required: true, placeholder: 'مثال: أسبوعان' },
    { key: 'startDate', label: 'تاريخ بداية التكليف', type: 'date', required: true },
    { key: 'endDate', label: 'تاريخ نهاية التكليف', type: 'date', required: true },
    { key: 'notes', label: 'ملاحظات', type: 'textarea', required: false, fullWidth: true },
  ],

  // ── 02. خطاب توجيه إداري للمعلم ──
  'خطاب توجيه إداري للمعلم': [
    { key: 'directiveSubject', label: 'موضوع التوجيه', type: 'textarea', required: true, placeholder: 'وصف الموضوع المطلوب توجيه المعلم بشأنه...', fullWidth: true },
    { key: 'requiredAction', label: 'الإجراء المطلوب', type: 'textarea', required: true, placeholder: 'ما المطلوب من المعلم تحديداً...', fullWidth: true },
    { key: 'executionPeriod', label: 'مدة التنفيذ', type: 'text', required: false, placeholder: 'مثال: فوري / خلال أسبوع' },
    { key: 'adminNotes', label: 'ملاحظات الإدارة', type: 'textarea', required: false, fullWidth: true },
  ],

  // ── 03. خطاب تنبيه شفهي موثق ──
  'خطاب تنبيه شفهي موثق': [
    { key: 'warningDate', label: 'تاريخ التنبيه الشفهي', type: 'date', required: true },
    { key: 'warningSubject', label: 'موضوع التنبيه', type: 'text', required: true, placeholder: 'الموضوع المطلوب التنبيه بشأنه' },
    { key: 'observedIssue', label: 'الملاحظة المرصودة', type: 'textarea', required: true, placeholder: 'وصف الملاحظة أو المخالفة...', fullWidth: true },
    { key: 'correctiveAction', label: 'الإجراء التصحيحي المطلوب', type: 'textarea', required: true, fullWidth: true },
  ],

  // ── 04. خطاب لفت نظر ──
  'خطاب لفت نظر': [
    { key: 'observationDate', label: 'تاريخ الملاحظة', type: 'date', required: true },
    { key: 'attentionSubject', label: 'موضوع لفت النظر', type: 'text', required: true },
    { key: 'observationDetails', label: 'تفاصيل الملاحظة', type: 'textarea', required: true, fullWidth: true },
    { key: 'requiredAction', label: 'الإجراء المطلوب', type: 'textarea', required: true, fullWidth: true },
    { key: 'deadline', label: 'المهلة إن وجدت', type: 'text', required: false, placeholder: 'مثال: خلال 3 أيام عمل' },
  ],

  // ── 05. خطاب مساءلة معلم ──
  'خطاب مساءلة معلم': [
    { key: 'incidentDate', label: 'تاريخ الواقعة', type: 'date', required: true },
    { key: 'inquirySubject', label: 'موضوع المساءلة', type: 'text', required: true },
    { key: 'incidentDescription', label: 'وصف الواقعة', type: 'textarea', required: true, fullWidth: true },
    { key: 'requiredFromTeacher', label: 'المطلوب من المعلم', type: 'textarea', required: true, placeholder: 'تقديم إفادة خطية / مبررات...', fullWidth: true },
    { key: 'responseDeadline', label: 'آخر موعد للرد', type: 'date', required: true },
  ],

  // ── 06. نموذج إفادة معلم ──
  'نموذج إفادة معلم': [
    { key: 'nationalId', label: 'السجل المدني أو الرقم الوظيفي', type: 'text', required: false },
    { key: 'specialty', label: 'التخصص', type: 'text', required: false },
    { key: 'statementSubject', label: 'موضوع الإفادة', type: 'text', required: true },
    { key: 'statementText', label: 'نص الإفادة', type: 'textarea', required: true, fullWidth: true },
    { key: 'attachmentsNote', label: 'المرفقات إن وجدت', type: 'text', required: false },
  ],

  // ── 07. محضر تحقيق إداري مختصر ──
  'محضر تحقيق إداري مختصر': [
    { key: 'dayDate', label: 'اليوم والتاريخ', type: 'date', required: true },
    { key: 'startTime', label: 'وقت بداية المحضر', type: 'time', required: true },
    { key: 'location', label: 'مكان إعداد المحضر', type: 'text', required: true, placeholder: 'مثال: مكتب مدير المدرسة' },
    { key: 'investigationSubject', label: 'موضوع التحقيق', type: 'text', required: true },
    { key: 'incidentSummary', label: 'ملخص الواقعة', type: 'textarea', required: true, fullWidth: true },
    { key: 'teacherStatements', label: 'أقوال المعلم', type: 'textarea', required: false, fullWidth: true },
    { key: 'recommendation', label: 'التوصية', type: 'textarea', required: false, fullWidth: true },
  ],

  // ── 08. خطاب إنذار إداري ──
  'خطاب إنذار إداري': [
    { key: 'warningSubject', label: 'موضوع الإنذار', type: 'text', required: true },
    { key: 'violationDetails', label: 'تفاصيل المخالفة أو الملاحظة', type: 'textarea', required: true, fullWidth: true },
    { key: 'previousActions', label: 'الإجراءات السابقة إن وجدت', type: 'textarea', required: false, fullWidth: true },
    { key: 'requiredAction', label: 'الإجراء المطلوب', type: 'textarea', required: true, fullWidth: true },
    { key: 'correctionPeriod', label: 'مدة التصحيح', type: 'text', required: false, placeholder: 'مثال: خلال أسبوع' },
  ],

  // ── 09. خطاب شكر وتقدير لمعلم ──
  'خطاب شكر وتقدير لمعلم': [
    { key: 'appreciationReason', label: 'سبب الشكر', type: 'textarea', required: true, fullWidth: true },
    { key: 'periodOrOccasion', label: 'الفترة أو المناسبة', type: 'text', required: false },
    { key: 'additionalNotes', label: 'ملاحظات إضافية', type: 'textarea', required: false, fullWidth: true },
  ],

  // ── 10. شهادة شكر وتقدير ──
  'شهادة شكر وتقدير': [
    { key: 'excellenceArea', label: 'مجال التميز', type: 'text', required: true },
    { key: 'occasion', label: 'المناسبة', type: 'text', required: false },
    { key: 'certificateDate', label: 'تاريخ منح الشهادة', type: 'date', required: true },
  ],

  // ── 11. خطاب إشادة بجهود معلم ──
  'خطاب إشادة بجهود معلم': [
    { key: 'commendationArea', label: 'مجال الإشادة', type: 'text', required: true },
    { key: 'effortDescription', label: 'وصف الجهود', type: 'textarea', required: true, fullWidth: true },
    { key: 'impactOnSchool', label: 'أثر الجهود على المدرسة أو الطلاب', type: 'textarea', required: false, fullWidth: true },
  ],

  // ── 12. خطاب طلب حضور اجتماع ──
  'خطاب طلب حضور اجتماع': [
    { key: 'meetingSubject', label: 'موضوع الاجتماع', type: 'text', required: true },
    { key: 'meetingDate', label: 'اليوم والتاريخ', type: 'date', required: true },
    { key: 'meetingTime', label: 'وقت الاجتماع', type: 'time', required: true },
    { key: 'meetingLocation', label: 'مكان الاجتماع', type: 'text', required: true, placeholder: 'مثال: غرفة المصادر' },
    { key: 'meetingAgenda', label: 'محاور الاجتماع', type: 'textarea', required: false, fullWidth: true },
  ],

  // ── 13. محضر اجتماع مع معلم أو مجموعة معلمين ──
  'محضر اجتماع مع معلم أو مجموعة معلمين': [
    { key: 'meetingDate', label: 'اليوم والتاريخ', type: 'date', required: true },
    { key: 'meetingTime', label: 'وقت الاجتماع', type: 'time', required: true },
    { key: 'meetingLocation', label: 'مكان الاجتماع', type: 'text', required: true },
    { key: 'attendees', label: 'أسماء الحاضرين', type: 'textarea', required: true, fullWidth: true },
    { key: 'meetingSubject', label: 'موضوع الاجتماع', type: 'text', required: true },
    { key: 'discussionPoints', label: 'أبرز ما تمت مناقشته', type: 'textarea', required: true, fullWidth: true },
    { key: 'recommendations', label: 'التوصيات والقرارات', type: 'textarea', required: true, fullWidth: true },
    { key: 'executionResponsible', label: 'مسؤول التنفيذ', type: 'text', required: false },
  ],

  // ── 14. نموذج استلام تعميم أو توجيه ──
  'نموذج استلام تعميم أو توجيه': [
    { key: 'circularTitle', label: 'عنوان التعميم أو التوجيه', type: 'text', required: true },
    { key: 'circularNumber', label: 'رقم التعميم إن وجد', type: 'text', required: false },
    { key: 'circularDate', label: 'تاريخ التعميم', type: 'date', required: true },
    { key: 'receiptDate', label: 'تاريخ الاستلام', type: 'date', required: true },
    { key: 'notes', label: 'ملاحظات', type: 'textarea', required: false, fullWidth: true },
  ],

  // ── 15. نموذج تعهد معلم ──
  'نموذج تعهد معلم': [
    { key: 'employeeNumber', label: 'الرقم الوظيفي', type: 'text', required: false },
    { key: 'pledgeSubject', label: 'موضوع التعهد', type: 'text', required: true },
    { key: 'pledgeText', label: 'نص التعهد', type: 'textarea', required: true, fullWidth: true },
    { key: 'pledgeDate', label: 'تاريخ التعهد', type: 'date', required: true },
    { key: 'notes', label: 'ملاحظات', type: 'textarea', required: false, fullWidth: true },
  ],

  // ── 16. نموذج متابعة أداء معلم ──
  'نموذج متابعة أداء معلم': [
    { key: 'specialty', label: 'التخصص', type: 'text', required: true },
    { key: 'followUpPeriod', label: 'الفترة محل المتابعة', type: 'text', required: true, placeholder: 'مثال: الفصل الدراسي الأول' },
    { key: 'strengths', label: 'نقاط القوة', type: 'textarea', required: true, fullWidth: true },
    { key: 'improvements', label: 'فرص التحسين', type: 'textarea', required: true, fullWidth: true },
    { key: 'recommendations', label: 'التوصيات', type: 'textarea', required: false, fullWidth: true },
    { key: 'nextFollowUp', label: 'موعد المتابعة القادم', type: 'date', required: false },
  ],

  // ── 17. نموذج زيارة صفية أو ملاحظة أداء ──
  'نموذج زيارة صفية أو ملاحظة أداء': [
    { key: 'subject', label: 'المادة', type: 'text', required: true },
    { key: 'className', label: 'الصف', type: 'text', required: true },
    { key: 'visitDate', label: 'اليوم والتاريخ', type: 'date', required: true },
    { key: 'period', label: 'الحصة', type: 'text', required: true, placeholder: 'مثال: الحصة الثالثة' },
    { key: 'lessonTopic', label: 'موضوع الدرس', type: 'text', required: true },
    { key: 'excellenceAspects', label: 'جوانب التميز', type: 'textarea', required: true, fullWidth: true },
    { key: 'developmentNotes', label: 'الملاحظات التطويرية', type: 'textarea', required: false, fullWidth: true },
    { key: 'recommendations', label: 'التوصيات', type: 'textarea', required: false, fullWidth: true },
  ],

  // ── 18. خطاب طلب تبرير غياب أو تأخر ──
  'خطاب طلب تبرير غياب أو تأخر': [
    { key: 'caseType', label: 'نوع الحالة', type: 'select', required: true, options: ['غياب', 'تأخر', 'انصراف مبكر'] },
    { key: 'absenceDate', label: 'تاريخ الغياب أو التأخر', type: 'date', required: true },
    { key: 'delayDuration', label: 'مدة التأخر إن وجدت', type: 'text', required: false, placeholder: 'مثال: 30 دقيقة' },
    { key: 'requiredSubmission', label: 'المطلوب تقديمه', type: 'textarea', required: true, placeholder: 'تبرير خطي مع إرفاق المستندات الداعمة...', fullWidth: true },
    { key: 'justificationDeadline', label: 'آخر موعد للتبرير', type: 'date', required: true },
  ],

  // ── 19. نموذج مباشرة بعد غياب أو إجازة ──
  'نموذج مباشرة بعد غياب أو إجازة': [
    { key: 'absenceType', label: 'نوع الانقطاع أو الإجازة', type: 'select', required: true, options: ['إجازة اعتيادية', 'إجازة مرضية', 'إجازة اضطرارية', 'غياب', 'انتداب', 'أخرى'] },
    { key: 'absenceStartDate', label: 'تاريخ بداية الغياب أو الإجازة', type: 'date', required: true },
    { key: 'absenceEndDate', label: 'تاريخ النهاية', type: 'date', required: true },
    { key: 'resumeDate', label: 'تاريخ المباشرة', type: 'date', required: true },
    { key: 'notes', label: 'ملاحظات', type: 'textarea', required: false, fullWidth: true },
  ],

  // ── 20. خطاب إخلاء طرف داخلي أو تسليم عهدة ──
  'خطاب إخلاء طرف داخلي أو تسليم عهدة': [
    { key: 'clearanceReason', label: 'سبب إخلاء الطرف', type: 'select', required: true, options: ['نقل', 'انتهاء عقد', 'تقاعد', 'استقالة', 'تكليف خارجي', 'أخرى'] },
    { key: 'itemsDelivered', label: 'العهد المسلمة', type: 'textarea', required: true, placeholder: 'قائمة العهد والأدوات المسلمة...', fullWidth: true },
    { key: 'receivingParty', label: 'الجهة المستلمة', type: 'text', required: true },
    { key: 'deliveryDate', label: 'تاريخ التسليم', type: 'date', required: true },
    { key: 'notes', label: 'الملاحظات', type: 'textarea', required: false, fullWidth: true },
    { key: 'clearanceStatus', label: 'حالة الإخلاء', type: 'select', required: true, options: ['مكتمل', 'جزئي', 'معلق'] },
  ],
};

const normalizeArabic = (str: string) => {
  return str
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0654\u0655\u0670]/g, '') // إزالة التشكيل والهمزات المنفصلة
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ''); // إزالة المسافات
};

export function getFieldsForTemplate(templateName: string): TemplateField[] {
  if (!templateName) return [];
  
  const normInput = normalizeArabic(templateName);

  for (const key of Object.keys(TEMPLATE_FIELDS)) {
    const normKey = normalizeArabic(key);
    if (normInput === normKey || normInput.includes(normKey) || normKey.includes(normInput)) {
      return TEMPLATE_FIELDS[key];
    }
  }

  return [];
}

/**
 * يستبدل العناصر النائبة (___________) في محتوى القالب بالبيانات المعبأة.
 * يعتمد على ترتيب الحقول في القالب لمطابقتها مع البيانات.
 */
export function renderTemplateContent(
  rawContent: string,
  templateName: string,
  templateData: Record<string, string>,
  employeeName: string
): string {
  let rendered = rawContent || '';

  // استبدال المتغيرات المباشرة إن وجدت (للتوافق القديم)
  rendered = rendered.replace(/\{\{employeeName\}\}/g, employeeName || '');

  // استبدال [اسم الموظف] إن وجدت (الجديدة)
  rendered = rendered.replace(/\[اسم الموظف\]/g, employeeName || '');

  // الحصول على حقول هذا القالب
  const fields = getFieldsForTemplate(templateName);

  // استبدال الحقول بناء على تسمياتها في القالب
  fields.forEach(field => {
    const value = templateData[field.key] || '';
    // Escape the label for RegExp to match literal square brackets
    // We want to match "[label]", so the regex pattern is "\[label\]"
    const pattern = '\\\\[' + field.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\\\]';
    const regex = new RegExp(pattern, 'g');
    rendered = rendered.replace(regex, value);
  });

  // من أجل دعم الطريقة القديمة في القوالب النصية (استبدال ___________ بالقيم)
  if (!rawContent.includes('<p>') && rawContent.includes('___________')) {
    const lines = rendered.split('\\n');
    const result: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '___________' && i > 0) {
        const prevLine = lines[i - 1].trim();
        const matchingField = fields.find(f => prevLine.includes(f.label));
        if (matchingField && templateData[matchingField.key]) {
          result.push(templateData[matchingField.key]);
        } else {
          result.push('____________');
        }
      } else {
        result.push(line);
      }
    }
    return result.join('\\n');
  }

  return rendered;
}
