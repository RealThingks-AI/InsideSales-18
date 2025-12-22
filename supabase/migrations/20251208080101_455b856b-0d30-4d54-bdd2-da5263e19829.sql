-- Fix the assigned_by foreign key constraint to allow cascade deletion
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_assigned_by_fkey;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_assigned_by_fkey 
FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;