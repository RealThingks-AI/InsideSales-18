-- Create accounts table
CREATE TABLE public.accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL,
    region TEXT,
    country TEXT,
    website TEXT,
    company_type TEXT,
    tags TEXT[], -- Using array for multi-select tags
    status TEXT DEFAULT 'New',
    notes TEXT,
    account_owner UUID,
    industry TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    modified_by UUID
);

-- Create indexes for company_name and account_owner
CREATE INDEX idx_accounts_company_name ON public.accounts (company_name);
CREATE INDEX idx_accounts_account_owner ON public.accounts (account_owner);
CREATE INDEX idx_accounts_status ON public.accounts (status);

-- Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies matching existing patterns
CREATE POLICY "Authenticated users can view all accounts"
ON public.accounts
FOR SELECT
USING (true);

CREATE POLICY "Users can insert accounts"
ON public.accounts
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own accounts, admins can update all"
ON public.accounts
FOR UPDATE
USING (is_user_admin() OR (created_by = auth.uid()));

CREATE POLICY "Users can delete their own accounts, admins can delete all"
ON public.accounts
FOR DELETE
USING (is_user_admin() OR (created_by = auth.uid()));

-- Add trigger for updating updated_at
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add account_id foreign key to contacts table
ALTER TABLE public.contacts
ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX idx_contacts_account_id ON public.contacts (account_id);

-- Add account_id foreign key to leads table
ALTER TABLE public.leads
ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX idx_leads_account_id ON public.leads (account_id);