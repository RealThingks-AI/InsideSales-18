-- Add outcome tracking and notes to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS outcome text,
ADD COLUMN IF NOT EXISTS notes text;

-- Create meeting_follow_ups table for follow-up tasks
CREATE TABLE IF NOT EXISTS public.meeting_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting_reminders table for reminder settings
CREATE TABLE IF NOT EXISTS public.meeting_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  remind_15min BOOLEAN NOT NULL DEFAULT true,
  remind_1hr BOOLEAN NOT NULL DEFAULT true,
  remind_1day BOOLEAN NOT NULL DEFAULT false,
  sent_15min BOOLEAN NOT NULL DEFAULT false,
  sent_1hr BOOLEAN NOT NULL DEFAULT false,
  sent_1day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meeting_id)
);

-- Enable RLS on new tables
ALTER TABLE public.meeting_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for meeting_follow_ups
CREATE POLICY "Authenticated users can view all follow-ups" 
ON public.meeting_follow_ups FOR SELECT USING (true);

CREATE POLICY "Users can insert follow-ups" 
ON public.meeting_follow_ups FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own follow-ups, admins can update all" 
ON public.meeting_follow_ups FOR UPDATE 
USING (is_user_admin() OR created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can delete their own follow-ups, admins can delete all" 
ON public.meeting_follow_ups FOR DELETE 
USING (is_user_admin() OR created_by = auth.uid());

-- RLS policies for meeting_reminders
CREATE POLICY "Authenticated users can view all reminders" 
ON public.meeting_reminders FOR SELECT USING (true);

CREATE POLICY "Users can insert reminders for their meetings" 
ON public.meeting_reminders FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE id = meeting_id AND created_by = auth.uid()));

CREATE POLICY "Users can update reminders for their meetings" 
ON public.meeting_reminders FOR UPDATE 
USING (EXISTS (SELECT 1 FROM meetings WHERE id = meeting_id AND (created_by = auth.uid() OR is_user_admin())));

CREATE POLICY "Users can delete reminders for their meetings" 
ON public.meeting_reminders FOR DELETE 
USING (EXISTS (SELECT 1 FROM meetings WHERE id = meeting_id AND (created_by = auth.uid() OR is_user_admin())));

-- Trigger for updated_at on meeting_follow_ups
CREATE TRIGGER update_meeting_follow_ups_updated_at
BEFORE UPDATE ON public.meeting_follow_ups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on meeting_reminders
CREATE TRIGGER update_meeting_reminders_updated_at
BEFORE UPDATE ON public.meeting_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();