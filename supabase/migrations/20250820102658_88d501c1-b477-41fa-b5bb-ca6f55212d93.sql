
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  lead_id UUID REFERENCES leads(id),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('read', 'unread')),
  notification_type TEXT NOT NULL DEFAULT 'action_item',
  action_item_id UUID REFERENCES lead_action_items(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
  ON public.notifications 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create trigger
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE PROCEDURE public.update_notifications_updated_at();

-- Enable real-time for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable real-time for lead_action_items table (for monitoring changes)
ALTER TABLE public.lead_action_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_action_items;

-- Create function to create notifications for action item changes
CREATE OR REPLACE FUNCTION public.create_action_item_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  lead_name TEXT;
  assignee_id UUID;
  message_text TEXT;
  notification_type TEXT := 'action_item';
BEGIN
  -- Get lead name
  SELECT leads.lead_name INTO lead_name
  FROM leads
  WHERE leads.id = COALESCE(NEW.lead_id, OLD.lead_id);

  -- Determine the message and who to notify based on the operation
  IF TG_OP = 'INSERT' THEN
    message_text := 'New action item added for lead: ' || COALESCE(lead_name, 'Unknown Lead');
    assignee_id := NEW.assigned_to;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if status changed to Closed
    IF OLD.status != NEW.status AND NEW.status = 'Closed' THEN
      message_text := 'Action item closed for lead: ' || COALESCE(lead_name, 'Unknown Lead');
    ELSE
      message_text := 'Action item updated for lead: ' || COALESCE(lead_name, 'Unknown Lead');
    END IF;
    assignee_id := NEW.assigned_to;
  ELSIF TG_OP = 'DELETE' THEN
    message_text := 'Action item deleted for lead: ' || COALESCE(lead_name, 'Unknown Lead');
    assignee_id := OLD.assigned_to;
  END IF;

  -- Create notification for the assignee (if exists)
  IF assignee_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      lead_id,
      message,
      notification_type,
      action_item_id
    ) VALUES (
      assignee_id,
      COALESCE(NEW.lead_id, OLD.lead_id),
      message_text,
      notification_type,
      COALESCE(NEW.id, OLD.id)
    );
  END IF;

  -- Also notify the creator if different from assignee
  IF COALESCE(NEW.created_by, OLD.created_by) IS NOT NULL 
     AND COALESCE(NEW.created_by, OLD.created_by) != assignee_id THEN
    INSERT INTO public.notifications (
      user_id,
      lead_id,
      message,
      notification_type,
      action_item_id
    ) VALUES (
      COALESCE(NEW.created_by, OLD.created_by),
      COALESCE(NEW.lead_id, OLD.lead_id),
      message_text,
      notification_type,
      COALESCE(NEW.id, OLD.id)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create triggers for action item notifications
CREATE TRIGGER action_item_notification_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.lead_action_items
  FOR EACH ROW EXECUTE PROCEDURE public.create_action_item_notification();
