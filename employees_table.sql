-- إنشاء جدول الموظفين (employees)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    national_id TEXT,
    department TEXT NOT NULL,
    job_title TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'employee',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- سياسات الأمان (RLS Policies)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 1. السماح للجميع بقراءة بيانات الموظفين (أو على الأقل السماح لمن تم تسجيل دخوله)
CREATE POLICY "Allow public read to employees"
ON public.employees
FOR SELECT
USING (true);

-- 2. السماح للإدارة (hr_manager أو it_support أو principal) بالإضافة والتعديل والحذف
-- بما أن صلاحية الإدارة تتحدد من جدول employees نفسه، يمكننا بناء السياسة كالتالي:
CREATE POLICY "Allow HR and IT to insert employees"
ON public.employees
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.auth_user_id = auth.uid() 
        AND e.role IN ('hr_manager', 'it_support')
    )
);

CREATE POLICY "Allow HR and IT to update employees"
ON public.employees
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.auth_user_id = auth.uid() 
        AND e.role IN ('hr_manager', 'it_support', 'principal')
    )
);

CREATE POLICY "Allow HR and IT to delete employees"
ON public.employees
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.auth_user_id = auth.uid() 
        AND e.role IN ('hr_manager', 'it_support')
    )
);

-- ملاحظة مهمة للمدير: في حال كانت هذه هي المرة الأولى، يجب إدخال مدير الموارد البشرية يدوياً عبر SQL:
-- INSERT INTO public.employees (full_name, department, job_title, email, role)
-- VALUES ('مدير الموارد البشرية', 'الإدارة', 'مدير الموارد البشرية', 'hr@school.sa', 'hr_manager');
-- أو السماح بالإدخال المبدئي ثم تفعيل RLS.
