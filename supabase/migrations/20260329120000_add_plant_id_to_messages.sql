-- Add plant_id column to messages table for tracking which plant the message is about
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL;
