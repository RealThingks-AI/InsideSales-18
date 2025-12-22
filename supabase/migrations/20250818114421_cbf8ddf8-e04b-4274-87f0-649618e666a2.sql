-- Fix the critical security issues by removing direct user_metadata references
-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create a secure function to check if current user is admin using metadata safely
CREATE OR REPLACE FUNCTION public.is_current_user_admin_by_metadata()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    -- Get role from user metadata safely
    SELECT COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', 'user') 
    INTO user_role;
    
    RETURN user_role = 'admin';
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Create safer RLS policies using the security definer function
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.is_current_user_admin_by_metadata());

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.is_current_user_admin_by_metadata());

-- Update other functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = p_user_id),
    'user'
  );
$$;