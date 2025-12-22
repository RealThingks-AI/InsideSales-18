-- Fix audit logging by adding INSERT policy for security_audit_log table
-- This allows the log_security_event function to insert audit records

-- Add INSERT policy for security_audit_log table to allow audit logging
CREATE POLICY "Allow audit logging for authenticated users" 
ON public.security_audit_log 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Also add INSERT policy specifically for the service role to ensure edge functions can log
CREATE POLICY "Allow audit logging for service role" 
ON public.security_audit_log 
FOR INSERT 
TO service_role 
WITH CHECK (true);