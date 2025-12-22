
-- Update the notification creation function to be more precise about who gets notified
CREATE OR REPLACE FUNCTION public.create_action_item_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  lead_name TEXT;
  assignee_id UUID;
  creator_id UUID;
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
    creator_id := NEW.created_by;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if status changed to Closed
    IF OLD.status != NEW.status AND NEW.status = 'Closed' THEN
      message_text := 'Action item closed for lead: ' || COALESCE(lead_name, 'Unknown Lead');
    ELSE
      message_text := 'Action item updated for lead: ' || COALESCE(lead_name, 'Unknown Lead');
    END IF;
    assignee_id := NEW.assigned_to;
    creator_id := NEW.created_by;
  ELSIF TG_OP = 'DELETE' THEN
    message_text := 'Action item deleted for lead: ' || COALESCE(lead_name, 'Unknown Lead');
    assignee_id := OLD.assigned_to;
    creator_id := OLD.created_by;
  END IF;

  -- Only create notification for the assignee if they exist and are different from the person making the change
  IF assignee_id IS NOT NULL AND assignee_id != auth.uid() THEN
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

  -- Only notify the creator if they are different from both the assignee and the person making the change
  IF creator_id IS NOT NULL 
     AND creator_id != assignee_id 
     AND creator_id != auth.uid() THEN
    INSERT INTO public.notifications (
      user_id,
      lead_id,
      message,
      notification_type,
      action_item_id
    ) VALUES (
      creator_id,
      COALESCE(NEW.lead_id, OLD.lead_id),
      message_text,
      notification_type,
      COALESCE(NEW.id, OLD.id)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS action_item_notification_trigger ON public.lead_action_items;

CREATE TRIGGER action_item_notification_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.lead_action_items
  FOR EACH ROW EXECUTE FUNCTION create_action_item_notification();
