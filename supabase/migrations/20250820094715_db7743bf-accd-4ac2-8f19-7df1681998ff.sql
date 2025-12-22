
-- Create the security_audit_log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the security_audit_log table
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for security_audit_log
CREATE POLICY "Users can view audit logs" ON public.security_audit_log
    FOR SELECT USING (true);

CREATE POLICY "Users can insert audit logs" ON public.security_audit_log
    FOR INSERT WITH CHECK (true);

-- Create the log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.security_audit_log (
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        ip_address
    ) VALUES (
        auth.uid(),
        p_action,
        p_resource_type,
        p_resource_id,
        p_details,
        inet_client_addr()
    );
END;
$$;

-- Create the log_data_access function
CREATE OR REPLACE FUNCTION public.log_data_access(
    p_table_name TEXT,
    p_operation TEXT,
    p_record_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.security_audit_log (
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        ip_address
    ) VALUES (
        auth.uid(),
        p_operation,
        p_table_name,
        p_record_id,
        jsonb_build_object(
            'operation', p_operation,
            'table', p_table_name,
            'timestamp', NOW()
        ),
        inet_client_addr()
    );
END;
$$;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own role" ON public.user_roles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update all roles" ON public.user_roles
    FOR UPDATE USING (true);
