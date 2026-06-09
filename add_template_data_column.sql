-- إضافة عمود template_data لحفظ بيانات النماذج الديناميكية
ALTER TABLE public.hr_requests 
ADD COLUMN IF NOT EXISTS template_data JSONB DEFAULT NULL;

-- تعليق توضيحي
COMMENT ON COLUMN public.hr_requests.template_data IS 'بيانات حقول النموذج المعبأة من قبل الإدارة (JSON)';
