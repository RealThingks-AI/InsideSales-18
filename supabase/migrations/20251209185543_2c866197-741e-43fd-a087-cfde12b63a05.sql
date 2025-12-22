-- Create task status enum
DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('open', 'in_progress', 'completed', 'deferred');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create task priority enum
DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create task recurrence enum
DO $$ BEGIN
  CREATE TYPE public.task_recurrence AS ENUM ('none', 'daily', 'weekly', 'monthly', 'yearly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  due_time TIME,
  reminder_date TIMESTAMP WITH TIME ZONE,
  
  -- Assignment
  assigned_to UUID,
  created_by UUID,
  
  -- Recurrence
  recurrence TEXT DEFAULT 'none',
  recurrence_end_date DATE,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  
  -- CRM Entity Links
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  -- Organization
  tags TEXT[],
  category TEXT,
  
  -- Timestamps
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
CREATE POLICY "Authenticated users can view all tasks"
ON public.tasks
FOR SELECT
USING (true);

CREATE POLICY "Users can insert tasks"
ON public.tasks
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own tasks or assigned tasks, admins can update all"
ON public.tasks
FOR UPDATE
USING (is_user_admin() OR created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can delete their own tasks, admins can delete all"
ON public.tasks
FOR DELETE
USING (is_user_admin() OR created_by = auth.uid());

-- RLS policies for subtasks
CREATE POLICY "Authenticated users can view all subtasks"
ON public.task_subtasks
FOR SELECT
USING (true);

CREATE POLICY "Users can insert subtasks for accessible tasks"
ON public.task_subtasks
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tasks 
  WHERE tasks.id = task_subtasks.task_id
));

CREATE POLICY "Users can update subtasks for accessible tasks"
ON public.task_subtasks
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.tasks 
  WHERE tasks.id = task_subtasks.task_id
  AND (is_user_admin() OR tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
));

CREATE POLICY "Users can delete subtasks for accessible tasks"
ON public.task_subtasks
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.tasks 
  WHERE tasks.id = task_subtasks.task_id
  AND (is_user_admin() OR tasks.created_by = auth.uid())
));

-- Add updated_at triggers
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_subtasks_updated_at
BEFORE UPDATE ON public.task_subtasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON public.tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON public.tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal_id ON public.tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_account_id ON public.tasks(account_id);
CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id ON public.task_subtasks(task_id);