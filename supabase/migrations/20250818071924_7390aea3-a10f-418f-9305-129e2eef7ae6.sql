
-- First, let's create the user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the user_roles table structure if needed
DO $$ 
BEGIN
    -- Check if user_roles table needs updates
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
        CREATE TABLE public.user_roles (
            id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            role user_role NOT NULL DEFAULT 'user',
            assigned_by uuid REFERENCES auth.users(id),
            assigned_at timestamp with time zone DEFAULT now(),
            UNIQUE(user_id)
        );
    END IF;
END $$;

-- Enable RLS on user_roles if not already enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own role" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- Create or replace the function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid DEFAULT auth.uid())
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.user_roles WHERE user_roles.user_id = get_user_role.user_id;
$$;

-- Create or replace admin check function
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(get_user_role(user_id) = 'admin', false);
$$;

-- Apply RLS policies to existing tables based on roles

-- Contacts table RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.contacts;

CREATE POLICY "Authenticated users can view contacts" ON public.contacts
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contacts" ON public.contacts
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update contacts" ON public.contacts
FOR UPDATE TO authenticated USING (is_user_admin());

CREATE POLICY "Admins can delete contacts" ON public.contacts
FOR DELETE TO authenticated USING (is_user_admin());

-- Deals table RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view deals" ON public.deals;
DROP POLICY IF EXISTS "Authenticated users can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Admins can update deals" ON public.deals;
DROP POLICY IF EXISTS "Admins can delete deals" ON public.deals;

CREATE POLICY "Authenticated users can view deals" ON public.deals
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert deals" ON public.deals
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update deals" ON public.deals
FOR UPDATE TO authenticated USING (is_user_admin());

CREATE POLICY "Admins can delete deals" ON public.deals
FOR DELETE TO authenticated USING (is_user_admin());

-- Leads table RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;

CREATE POLICY "Authenticated users can view leads" ON public.leads
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert leads" ON public.leads
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update leads" ON public.leads
FOR UPDATE TO authenticated USING (is_user_admin());

CREATE POLICY "Admins can delete leads" ON public.leads
FOR DELETE TO authenticated USING (is_user_admin());

-- Dashboard preferences RLS
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.dashboard_preferences;

CREATE POLICY "Users can manage their own preferences" ON public.dashboard_preferences
FOR ALL TO authenticated USING (user_id = auth.uid());

-- Security audit log RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.security_audit_log;

CREATE POLICY "Admins can view all audit logs" ON public.security_audit_log
FOR SELECT TO authenticated USING (is_user_admin());

-- Yearly revenue targets RLS
ALTER TABLE public.yearly_revenue_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view revenue targets" ON public.yearly_revenue_targets;
DROP POLICY IF EXISTS "Admins can manage revenue targets" ON public.yearly_revenue_targets;

CREATE POLICY "Authenticated users can view revenue targets" ON public.yearly_revenue_targets
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage revenue targets" ON public.yearly_revenue_targets
FOR ALL TO authenticated USING (is_user_admin());

-- Create trigger to automatically assign default role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- Create trigger for new user role assignment
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
