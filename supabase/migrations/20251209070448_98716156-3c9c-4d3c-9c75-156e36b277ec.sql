-- Create meetings table for storing Teams meeting records
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  join_url TEXT,
  attendees JSONB DEFAULT '[]'::jsonb,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'scheduled'
);

-- Create email_templates table for storing reusable email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on meetings table
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on email_templates table
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for meetings
CREATE POLICY "Authenticated users can view all meetings"
ON public.meetings FOR SELECT USING (true);

CREATE POLICY "Users can insert meetings"
ON public.meetings FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own meetings, admins can update all"
ON public.meetings FOR UPDATE USING (is_user_admin() OR created_by = auth.uid());

CREATE POLICY "Users can delete their own meetings, admins can delete all"
ON public.meetings FOR DELETE USING (is_user_admin() OR created_by = auth.uid());

-- RLS policies for email_templates
CREATE POLICY "Authenticated users can view all email templates"
ON public.email_templates FOR SELECT USING (true);

CREATE POLICY "Users can insert email templates"
ON public.email_templates FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates, admins can update all"
ON public.email_templates FOR UPDATE USING (is_user_admin() OR created_by = auth.uid());

CREATE POLICY "Users can delete their own templates, admins can delete all"
ON public.email_templates FOR DELETE USING (is_user_admin() OR created_by = auth.uid());

-- Create indexes for meetings
CREATE INDEX idx_meetings_lead_id ON public.meetings(lead_id);
CREATE INDEX idx_meetings_contact_id ON public.meetings(contact_id);
CREATE INDEX idx_meetings_start_time ON public.meetings(start_time);
CREATE INDEX idx_meetings_created_by ON public.meetings(created_by);

-- Create indexes for email_templates
CREATE INDEX idx_email_templates_created_by ON public.email_templates(created_by);

-- Create trigger for updating meetings updated_at
CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating email_templates updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();