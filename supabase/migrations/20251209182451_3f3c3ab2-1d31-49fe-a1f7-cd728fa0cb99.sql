-- Add scoring and segmentation fields to accounts table
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'prospect',
ADD COLUMN IF NOT EXISTS total_revenue NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS deal_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS contact_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP WITH TIME ZONE;

-- Create account_activities table for activity logging
CREATE TABLE IF NOT EXISTS public.account_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'call', 'email', 'meeting', 'note', 'task'
  subject TEXT NOT NULL,
  description TEXT,
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_minutes INTEGER,
  outcome TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_account_activities_account_id ON public.account_activities(account_id);
CREATE INDEX IF NOT EXISTS idx_account_activities_activity_date ON public.account_activities(activity_date DESC);

-- Enable RLS on account_activities
ALTER TABLE public.account_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for account_activities
CREATE POLICY "Authenticated users can view all account activities" 
ON public.account_activities FOR SELECT USING (true);

CREATE POLICY "Users can insert account activities" 
ON public.account_activities FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own activities, admins can update all" 
ON public.account_activities FOR UPDATE 
USING (is_user_admin() OR created_by = auth.uid());

CREATE POLICY "Users can delete their own activities, admins can delete all" 
ON public.account_activities FOR DELETE 
USING (is_user_admin() OR created_by = auth.uid());

-- Trigger for updated_at on account_activities
CREATE TRIGGER update_account_activities_updated_at
BEFORE UPDATE ON public.account_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update account stats (contact_count, deal_count, last_activity)
CREATE OR REPLACE FUNCTION public.update_account_stats(p_account_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.accounts
  SET 
    contact_count = (SELECT COUNT(*) FROM public.contacts WHERE account_id = p_account_id),
    last_activity_date = (SELECT MAX(activity_date) FROM public.account_activities WHERE account_id = p_account_id)
  WHERE id = p_account_id;
END;
$$;

-- Function to calculate account score based on activities, deals, contacts
CREATE OR REPLACE FUNCTION public.calculate_account_score(p_account_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER := 0;
  v_contact_count INTEGER;
  v_activity_count INTEGER;
  v_recent_activity BOOLEAN;
BEGIN
  -- Base score from contacts (10 points per contact, max 30)
  SELECT COUNT(*) INTO v_contact_count FROM public.contacts WHERE account_id = p_account_id;
  v_score := v_score + LEAST(v_contact_count * 10, 30);
  
  -- Score from activities (5 points per activity, max 30)
  SELECT COUNT(*) INTO v_activity_count FROM public.account_activities WHERE account_id = p_account_id;
  v_score := v_score + LEAST(v_activity_count * 5, 30);
  
  -- Bonus for recent activity (within 30 days)
  SELECT EXISTS(
    SELECT 1 FROM public.account_activities 
    WHERE account_id = p_account_id 
    AND activity_date > NOW() - INTERVAL '30 days'
  ) INTO v_recent_activity;
  
  IF v_recent_activity THEN
    v_score := v_score + 20;
  END IF;
  
  -- Score from having website/phone (10 points each)
  SELECT 
    v_score + (CASE WHEN website IS NOT NULL AND website != '' THEN 10 ELSE 0 END) +
    (CASE WHEN phone IS NOT NULL AND phone != '' THEN 10 ELSE 0 END)
  INTO v_score
  FROM public.accounts WHERE id = p_account_id;
  
  RETURN LEAST(v_score, 100);
END;
$$;