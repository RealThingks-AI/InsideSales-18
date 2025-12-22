-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- Drop all existing policies on user_roles to start fresh
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Recreate the get_user_role function with correct parameter name
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

-- Create safe RLS policies that avoid recursion by using user metadata
-- Users can view their own role
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

-- Admins can view all roles (using user metadata to avoid recursion)
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (
  COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', 'user') = 'admin'
);

-- Admins can insert/update/delete roles (using user metadata to avoid recursion)
CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (
  COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', 'user') = 'admin'
);

-- Create a safe function to update user roles that handles upserts
CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update the user role using upsert
  INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
  VALUES (p_user_id, p_role::user_role, auth.uid(), now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = p_role::user_role,
    assigned_by = auth.uid(),
    assigned_at = now();
END;
$$;