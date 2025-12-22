
-- 1. Make ai@realthingks.com an admin user
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Find the user ID for ai@realthingks.com
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'ai@realthingks.com';
    
    -- If user exists, make them admin
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, assigned_by)
        VALUES (admin_user_id, 'admin', admin_user_id)
        ON CONFLICT (user_id) 
        DO UPDATE SET role = 'admin', assigned_at = now();
        
        RAISE NOTICE 'Made ai@realthingks.com an admin user';
    ELSE
        RAISE NOTICE 'User ai@realthingks.com not found in auth.users table';
    END IF;
END $$;

-- 2. Fix RLS policies to properly restrict access
-- Currently, normal users can edit/delete records they should only view

-- Update contacts table policies
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.contacts;

-- New contacts policies: Normal users can view all but only edit/delete their own
CREATE POLICY "Authenticated users can view all contacts" ON public.contacts
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert contacts" ON public.contacts
FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own contacts, admins can update all" ON public.contacts
FOR UPDATE TO authenticated USING (
    is_user_admin() OR created_by = auth.uid()
);

CREATE POLICY "Users can delete their own contacts, admins can delete all" ON public.contacts
FOR DELETE TO authenticated USING (
    is_user_admin() OR created_by = auth.uid()
);

-- Update deals table policies
DROP POLICY IF EXISTS "Authenticated users can view deals" ON public.deals;
DROP POLICY IF EXISTS "Authenticated users can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Admins can update deals" ON public.deals;
DROP POLICY IF EXISTS "Admins can delete deals" ON public.deals;

-- New deals policies: Normal users can view all but only edit/delete their own
CREATE POLICY "Authenticated users can view all deals" ON public.deals
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert deals" ON public.deals
FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own deals, admins can update all" ON public.deals
FOR UPDATE TO authenticated USING (
    is_user_admin() OR created_by = auth.uid()
);

CREATE POLICY "Users can delete their own deals, admins can delete all" ON public.deals
FOR DELETE TO authenticated USING (
    is_user_admin() OR created_by = auth.uid()
);

-- Update leads table policies
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;

-- New leads policies: Normal users can view all but only edit/delete their own
CREATE POLICY "Authenticated users can view all leads" ON public.leads
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert leads" ON public.leads
FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own leads, admins can update all" ON public.leads
FOR UPDATE TO authenticated USING (
    is_user_admin() OR created_by = auth.uid()
);

CREATE POLICY "Users can delete their own leads, admins can delete all" ON public.leads
FOR DELETE TO authenticated USING (
    is_user_admin() OR created_by = auth.uid()
);

-- Ensure profiles table RLS is properly configured
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile or admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile or admins can update all" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile or admins can view all" ON public.profiles
FOR SELECT TO authenticated USING (
    is_user_admin() OR id = auth.uid()
);

CREATE POLICY "Users can update their own profile or admins can update all" ON public.profiles
FOR UPDATE TO authenticated USING (
    is_user_admin() OR id = auth.uid()
);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
