
-- Remove foreign key constraints that are blocking deletions
-- This will allow leads to be deleted independently of notifications

-- First, let's remove the foreign key constraint from notifications to lead_action_items
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_action_item_id_fkey;

-- Remove any foreign key constraint from notifications to leads (if it exists)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_lead_id_fkey;

-- Remove any foreign key constraint from lead_action_items to leads (if it exists) 
ALTER TABLE public.lead_action_items DROP CONSTRAINT IF EXISTS lead_action_items_lead_id_fkey;

-- Now we'll keep the columns but remove the foreign key enforcement
-- This allows reference-based association without blocking deletions
