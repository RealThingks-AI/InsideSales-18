-- Create page_permissions table for role-based page access
CREATE TABLE public.page_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    page_name TEXT NOT NULL,
    description TEXT,
    route TEXT NOT NULL UNIQUE,
    admin_access BOOLEAN NOT NULL DEFAULT true,
    manager_access BOOLEAN NOT NULL DEFAULT false,
    user_access BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for page_permissions
CREATE POLICY "Admins can manage page permissions"
ON public.page_permissions
FOR ALL
USING (is_user_admin());

CREATE POLICY "Authenticated users can view page permissions"
ON public.page_permissions
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_page_permissions_updated_at
BEFORE UPDATE ON public.page_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default page permissions
INSERT INTO public.page_permissions (page_name, description, route, admin_access, manager_access, user_access) VALUES
('Dashboard', 'Main dashboard with overview and stats', '/dashboard', true, true, true),
('Leads', 'View and manage leads', '/leads', true, true, true),
('Deals', 'View and manage deals pipeline', '/deals', true, true, true),
('Contacts', 'View and manage contacts', '/contacts', true, true, true),
('Accounts', 'View and manage accounts', '/accounts', true, true, true),
('Settings', 'Administrative settings and user management', '/settings', true, false, false),
('Notifications', 'View notifications', '/notifications', true, true, true);

-- Create backups table for backup metadata
CREATE TABLE public.backups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    size_bytes BIGINT,
    tables_count INTEGER,
    records_count INTEGER,
    backup_type TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'completed',
    manifest JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- Policies for backups - only admins
CREATE POLICY "Admins can manage backups"
ON public.backups
FOR ALL
USING (is_user_admin());

CREATE POLICY "Admins can view backups"
ON public.backups
FOR SELECT
USING (is_user_admin());

-- Create storage bucket for backups (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for backups bucket - admin only
CREATE POLICY "Admins can upload backups"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'backups' AND is_user_admin());

CREATE POLICY "Admins can view backups"
ON storage.objects
FOR SELECT
USING (bucket_id = 'backups' AND is_user_admin());

CREATE POLICY "Admins can delete backups"
ON storage.objects
FOR DELETE
USING (bucket_id = 'backups' AND is_user_admin());