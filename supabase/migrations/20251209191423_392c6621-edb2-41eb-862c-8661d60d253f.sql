-- User Sessions table for session management
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  ip_address inet,
  user_agent text,
  device_info jsonb,
  last_active_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true
);

-- User notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email_notifications boolean DEFAULT true,
  in_app_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT false,
  lead_assigned boolean DEFAULT true,
  deal_updates boolean DEFAULT true,
  task_reminders boolean DEFAULT true,
  meeting_reminders boolean DEFAULT true,
  weekly_digest boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User display preferences table (extends user_preferences)
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS date_format text DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS time_format text DEFAULT '12h',
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Kolkata',
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
ADD COLUMN IF NOT EXISTS default_module text DEFAULT 'dashboard';

-- Extend profiles table for profile management
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Kolkata',
ADD COLUMN IF NOT EXISTS bio text;

-- CRM field customization table
CREATE TABLE public.crm_custom_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL, -- 'lead', 'contact', 'deal', 'account'
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text', -- 'text', 'number', 'date', 'select', 'multiselect', 'boolean'
  field_options jsonb, -- for select/multiselect options
  is_required boolean DEFAULT false,
  is_visible boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(entity_type, field_name)
);

-- Pipeline stage customization table
CREATE TABLE public.pipeline_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_name text NOT NULL,
  stage_order integer NOT NULL DEFAULT 0,
  stage_color text DEFAULT '#3b82f6',
  stage_probability integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_won_stage boolean DEFAULT false,
  is_lost_stage boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Lead status customization table
CREATE TABLE public.lead_statuses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_name text NOT NULL UNIQUE,
  status_color text DEFAULT '#6b7280',
  status_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  is_converted_status boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Import/Export settings table
CREATE TABLE public.import_export_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  field_mappings jsonb,
  default_values jsonb,
  skip_duplicates boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type)
);

-- Integration settings table
CREATE TABLE public.integration_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_name text NOT NULL UNIQUE,
  is_enabled boolean DEFAULT false,
  config jsonb,
  last_sync_at timestamp with time zone,
  sync_status text DEFAULT 'inactive',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_export_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own sessions" ON public.user_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own sessions" ON public.user_sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own sessions" ON public.user_sessions FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Admins can view all sessions" ON public.user_sessions FOR SELECT USING (is_user_admin());

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own notification prefs" ON public.notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own notification prefs" ON public.notification_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own notification prefs" ON public.notification_preferences FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for crm_custom_fields (admin only for CRUD, all can read)
CREATE POLICY "Authenticated users can view custom fields" ON public.crm_custom_fields FOR SELECT USING (true);
CREATE POLICY "Admins can manage custom fields" ON public.crm_custom_fields FOR ALL USING (is_user_admin());

-- RLS Policies for pipeline_stages
CREATE POLICY "Authenticated users can view pipeline stages" ON public.pipeline_stages FOR SELECT USING (true);
CREATE POLICY "Admins can manage pipeline stages" ON public.pipeline_stages FOR ALL USING (is_user_admin());

-- RLS Policies for lead_statuses
CREATE POLICY "Authenticated users can view lead statuses" ON public.lead_statuses FOR SELECT USING (true);
CREATE POLICY "Admins can manage lead statuses" ON public.lead_statuses FOR ALL USING (is_user_admin());

-- RLS Policies for import_export_settings
CREATE POLICY "Users can view their own import/export settings" ON public.import_export_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own import/export settings" ON public.import_export_settings FOR ALL USING (user_id = auth.uid());

-- RLS Policies for integration_settings
CREATE POLICY "Authenticated users can view integration settings" ON public.integration_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage integration settings" ON public.integration_settings FOR ALL USING (is_user_admin());

-- Triggers for updated_at
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_custom_fields_updated_at BEFORE UPDATE ON public.crm_custom_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lead_statuses_updated_at BEFORE UPDATE ON public.lead_statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_import_export_settings_updated_at BEFORE UPDATE ON public.import_export_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integration_settings_updated_at BEFORE UPDATE ON public.integration_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default pipeline stages
INSERT INTO public.pipeline_stages (stage_name, stage_order, stage_color, stage_probability, is_won_stage, is_lost_stage)
VALUES 
  ('Lead', 0, '#6b7280', 10, false, false),
  ('Qualified', 1, '#3b82f6', 25, false, false),
  ('RFQ', 2, '#8b5cf6', 40, false, false),
  ('Offered', 3, '#f59e0b', 60, false, false),
  ('Discussions', 4, '#10b981', 80, false, false),
  ('Won', 5, '#22c55e', 100, true, false),
  ('Lost', 6, '#ef4444', 0, false, true),
  ('Dropped', 7, '#94a3b8', 0, false, true);

-- Insert default lead statuses
INSERT INTO public.lead_statuses (status_name, status_color, status_order, is_converted_status)
VALUES 
  ('New', '#3b82f6', 0, false),
  ('Contacted', '#8b5cf6', 1, false),
  ('Qualified', '#10b981', 2, false),
  ('Unqualified', '#ef4444', 3, false),
  ('Converted', '#22c55e', 4, true);

-- Insert default integrations
INSERT INTO public.integration_settings (integration_name, is_enabled, config)
VALUES 
  ('Microsoft Teams', false, '{"client_id": null, "tenant_id": null}'),
  ('Email (SMTP)', false, '{"host": null, "port": 587, "secure": false}'),
  ('Calendar Sync', false, '{"provider": null}');