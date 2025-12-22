
-- Create deal_action_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.deal_action_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL,
  next_action TEXT NOT NULL,
  assigned_to UUID NULL,
  due_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.deal_action_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies similar to lead_action_items
CREATE POLICY IF NOT EXISTS "Users can view action items for accessible deals" 
  ON public.deal_action_items 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM deals 
    WHERE deals.id = deal_action_items.deal_id
  ));

CREATE POLICY IF NOT EXISTS "Users can create action items for deals" 
  ON public.deal_action_items 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = created_by AND 
    EXISTS (
      SELECT 1 FROM deals 
      WHERE deals.id = deal_action_items.deal_id
    )
  );

CREATE POLICY IF NOT EXISTS "Users can update their own action items, admins can update all" 
  ON public.deal_action_items 
  FOR UPDATE 
  USING (
    is_user_admin() OR 
    created_by = auth.uid() OR 
    assigned_to = auth.uid()
  );

CREATE POLICY IF NOT EXISTS "Users can delete their own action items, admins can delete all" 
  ON public.deal_action_items 
  FOR DELETE 
  USING (
    is_user_admin() OR 
    created_by = auth.uid()
  );

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_deal_action_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_deal_action_items_updated_at ON public.deal_action_items;
CREATE TRIGGER update_deal_action_items_updated_at
  BEFORE UPDATE ON public.deal_action_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_deal_action_items_updated_at();

-- Add check constraint for status
ALTER TABLE public.deal_action_items 
DROP CONSTRAINT IF EXISTS deal_action_items_status_check;

ALTER TABLE public.deal_action_items 
ADD CONSTRAINT deal_action_items_status_check 
CHECK (status IN ('Open', 'Ongoing', 'Closed'));
