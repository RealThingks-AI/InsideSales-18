
-- Ensure deals table has proper constraints and defaults for RLS
ALTER TABLE public.deals 
ALTER COLUMN created_by SET NOT NULL;

-- Update any existing deals that might have NULL created_by to a default admin user
-- (This is a safety measure - you may want to adjust this based on your specific needs)
UPDATE public.deals 
SET created_by = (
  SELECT user_id 
  FROM public.user_roles 
  WHERE role = 'admin' 
  LIMIT 1
)
WHERE created_by IS NULL;

-- Ensure the RLS policies are exactly as specified
DROP POLICY IF EXISTS "Authenticated users can view all deals" ON public.deals;
DROP POLICY IF EXISTS "Users can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Users can update their own deals, admins can update all" ON public.deals;
DROP POLICY IF EXISTS "Users can delete their own deals, admins can delete all" ON public.deals;

-- Recreate policies to match Contacts and Leads exactly
CREATE POLICY "Authenticated users can view all deals" 
  ON public.deals 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert deals" 
  ON public.deals 
  FOR INSERT 
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own deals, admins can update all" 
  ON public.deals 
  FOR UPDATE 
  USING (is_user_admin() OR (created_by = auth.uid()));

CREATE POLICY "Users can delete their own deals, admins can delete all" 
  ON public.deals 
  FOR DELETE 
  USING (is_user_admin() OR (created_by = auth.uid()));
