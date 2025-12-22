-- First, fix the RLS policies on user_roles to prevent infinite recursion
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can manage user roles" ON public.user_roles;

-- Create safe RLS policies that don't cause recursion
-- Allow users to view their own role
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow admins to view all roles (using user metadata to avoid recursion)
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (
  COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', 'user') = 'admin'
);

-- Allow admins to insert/update/delete roles (using user metadata to avoid recursion)
CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (
  COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', 'user') = 'admin'
);

-- Update the get_user_role function to be more robust
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = p_user_id),
    'user'
  );
$$;

-- Create a safe function to update user roles that handles upserts
CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update the user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role::app_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = p_role::app_role,
    updated_at = now();
END;
$$;