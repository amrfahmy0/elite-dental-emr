-- Run this script in your Supabase SQL Editor to support the Next Visit Plan feature

ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS next_visit_plan TEXT;
