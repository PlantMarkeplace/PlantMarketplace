-- Add reviewer_name column to reviews table
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- Update existing reviews with reviewer names from profiles if available
UPDATE public.reviews r
SET reviewer_name = p.full_name
FROM public.profiles p
WHERE r.reviewer_id = p.user_id AND r.reviewer_name IS NULL;
