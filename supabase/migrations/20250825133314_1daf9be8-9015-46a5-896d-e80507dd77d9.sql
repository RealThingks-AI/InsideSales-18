
-- Update the security_audit_log table to handle user deletion properly
-- First, let's make the user_id column nullable so we can keep audit records even after user deletion
ALTER TABLE public.security_audit_log 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a CASCADE option to handle user deletions gracefully by setting user_id to NULL
-- We'll drop the existing constraint and recreate it with proper handling
ALTER TABLE public.security_audit_log 
DROP CONSTRAINT IF EXISTS security_audit_log_user_id_fkey;

-- Add the foreign key constraint back with ON DELETE SET NULL
-- This will set user_id to NULL when a user is deleted, preserving the audit record
ALTER TABLE public.security_audit_log 
ADD CONSTRAINT security_audit_log_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
