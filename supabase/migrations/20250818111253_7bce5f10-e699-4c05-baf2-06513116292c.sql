
-- First, let's check if the user actually has the admin role assigned
-- and fix the get_user_role function to work with RPC calls

-- Drop the existing get_user_role function
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- Create a new get_user_role function that works with RPC calls
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(role::text, 'user') FROM public.user_roles WHERE user_roles.user_id = $1;
$$;

-- Ensure the ai@realthingks.com user has admin role
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Get the user ID for ai@realthingks.com
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'ai@realthingks.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Insert or update the user role to admin
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin'::user_role)
        ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::user_role;
        
        RAISE NOTICE 'Admin role assigned to user: %', target_user_id;
    ELSE
        RAISE NOTICE 'User ai@realthingks.com not found in auth.users';
    END IF;
END $$;

-- Update the is_user_admin function to use the new get_user_role
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT get_user_role(user_id) = 'admin';
$$;
