
-- 1. Add 'expert' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'expert';

-- 2. Create experts table for expert-specific profile data
CREATE TABLE public.experts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  specialization TEXT[] NOT NULL DEFAULT '{}',
  years_of_experience INTEGER NOT NULL DEFAULT 0,
  certifications TEXT[] DEFAULT '{}',
  consultation_price_online NUMERIC NOT NULL DEFAULT 0,
  consultation_price_onsite NUMERIC NOT NULL DEFAULT 0,
  location TEXT,
  bio TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC DEFAULT 0,
  total_consultations INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.experts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts are viewable by everyone"
  ON public.experts FOR SELECT
  USING (true);

CREATE POLICY "Experts can update their own profile"
  ON public.experts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Experts can insert their own profile"
  ON public.experts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all experts"
  ON public.experts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_experts_updated_at
  BEFORE UPDATE ON public.experts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create expert_availability table
CREATE TABLE public.expert_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expert_id UUID NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expert_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability is viewable by everyone"
  ON public.expert_availability FOR SELECT
  USING (true);

CREATE POLICY "Experts can manage their own availability"
  ON public.expert_availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.experts
      WHERE experts.id = expert_availability.expert_id
      AND experts.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all availability"
  ON public.expert_availability FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Create consultations table
CREATE TABLE public.consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  expert_id UUID NOT NULL REFERENCES public.experts(id),
  consultation_type TEXT NOT NULL DEFAULT 'online' CHECK (consultation_type IN ('online', 'onsite')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  client_notes TEXT,
  expert_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own consultations"
  ON public.consultations FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Experts can view their consultations"
  ON public.consultations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.experts
      WHERE experts.id = consultations.expert_id
      AND experts.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create consultations"
  ON public.consultations FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Experts can update their consultations"
  ON public.consultations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.experts
      WHERE experts.id = consultations.expert_id
      AND experts.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update their own consultations"
  ON public.consultations FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can manage all consultations"
  ON public.consultations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
