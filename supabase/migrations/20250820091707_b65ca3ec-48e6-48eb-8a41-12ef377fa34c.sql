
-- Create the lead_action_items table
CREATE TABLE public.lead_action_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  next_action TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Ongoing', 'Closed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lead_action_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view action items for accessible leads" 
  ON public.lead_action_items 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = lead_action_items.lead_id
    )
  );

CREATE POLICY "Users can create action items for leads" 
  ON public.lead_action_items 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = lead_action_items.lead_id
    )
  );

CREATE POLICY "Users can update their own action items, admins can update all" 
  ON public.lead_action_items 
  FOR UPDATE 
  USING (
    is_user_admin() OR 
    created_by = auth.uid() OR 
    assigned_to = auth.uid()
  );

CREATE POLICY "Users can delete their own action items, admins can delete all" 
  ON public.lead_action_items 
  FOR DELETE 
  USING (
    is_user_admin() OR 
    created_by = auth.uid()
  );

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION public.update_lead_action_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_action_items_updated_at
  BEFORE UPDATE ON public.lead_action_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_action_items_updated_at();
