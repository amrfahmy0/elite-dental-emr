-- Run this script in your Supabase SQL Editor to support receipt uploads

-- 1. Add receipt_url column to the expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 2. Create a public storage bucket for receipts (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies so everyone can view receipts, and authenticated users can upload
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated Uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'receipts');
