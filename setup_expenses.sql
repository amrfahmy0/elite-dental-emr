-- Run this script in your Supabase SQL Editor to create the expenses table and policies

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_date DATE NOT NULL,
    category TEXT NOT NULL,
    payee TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Allow doctors to read and write their own expenses
CREATE POLICY "Users can view their own expenses" 
ON public.expenses 
FOR SELECT 
USING (auth.uid() = doctor_id);

CREATE POLICY "Users can insert their own expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (auth.uid() = doctor_id);

-- Alternatively, allow all authenticated users (if using a general staff structure)
-- CREATE POLICY "Enable read access for all authenticated users" ON "public"."expenses" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Enable insert for authenticated users only" ON "public"."expenses" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
