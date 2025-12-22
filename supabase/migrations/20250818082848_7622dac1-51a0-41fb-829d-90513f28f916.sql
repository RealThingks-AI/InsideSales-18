
-- Drop existing policies that are causing recursion
DROP POLICY IF EXISTS "Users can view own profile, admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile, admins update all" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own role, admins view all" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid DEFAULT auth.uid())
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.user_roles WHERE user_roles.user_id = get_user_role.user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(get_user_role(user_id) = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT is_user_admin(auth.uid());
$$;

-- Create new RLS policies for profiles using security definer functions
CREATE POLICY "Users can view their own profile or admins can view all" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id OR is_user_admin());

CREATE POLICY "Users can update their own profile or admins can update all" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id OR is_user_admin());

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (is_user_admin());

-- Create new RLS policies for user_roles using security definer functions
CREATE POLICY "Users can view their own role or admins can view all" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id OR is_user_admin());

CREATE POLICY "Admins can insert roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (is_user_admin());

CREATE POLICY "Admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (is_user_admin());

CREATE POLICY "Admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (is_user_admin());

-- Ensure ai@realthingks.com has admin role
INSERT INTO public.user_roles (user_id, role)
SELECT auth.users.id, 'admin'::user_role
FROM auth.users 
WHERE auth.users.email = 'ai@realthingks.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::user_role;
