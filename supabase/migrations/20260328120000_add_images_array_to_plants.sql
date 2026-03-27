-- Add images array column to plants table for multiple image support
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT ARRAY[]::TEXT[];
