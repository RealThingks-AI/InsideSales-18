-- Fix all foreign key constraints that reference auth.users to allow user deletion

-- deals table
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_created_by_fkey;
ALTER TABLE public.deals ADD CONSTRAINT deals_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_modified_by_fkey;
ALTER TABLE public.deals ADD CONSTRAINT deals_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Also make created_by nullable for deals since we're setting it to NULL on delete
ALTER TABLE public.deals ALTER COLUMN created_by DROP NOT NULL;

-- contacts table
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_contact_owner_fkey;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_contact_owner_fkey FOREIGN KEY (contact_owner) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_created_by_fkey;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_modified_by_fkey;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- deal_action_items table
ALTER TABLE public.deal_action_items DROP CONSTRAINT IF EXISTS deal_action_items_assigned_to_fkey;
ALTER TABLE public.deal_action_items ADD CONSTRAINT deal_action_items_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.deal_action_items DROP CONSTRAINT IF EXISTS deal_action_items_created_by_fkey;
ALTER TABLE public.deal_action_items ADD CONSTRAINT deal_action_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- lead_action_items table
ALTER TABLE public.lead_action_items DROP CONSTRAINT IF EXISTS lead_action_items_assigned_to_fkey;
ALTER TABLE public.lead_action_items ADD CONSTRAINT lead_action_items_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.lead_action_items DROP CONSTRAINT IF EXISTS lead_action_items_created_by_fkey;
ALTER TABLE public.lead_action_items ADD CONSTRAINT lead_action_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- leads table
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_contact_owner_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_contact_owner_fkey FOREIGN KEY (contact_owner) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_created_by_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_modified_by_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- yearly_revenue_targets table
ALTER TABLE public.yearly_revenue_targets DROP CONSTRAINT IF EXISTS yearly_revenue_targets_created_by_fkey;
ALTER TABLE public.yearly_revenue_targets ADD CONSTRAINT yearly_revenue_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;