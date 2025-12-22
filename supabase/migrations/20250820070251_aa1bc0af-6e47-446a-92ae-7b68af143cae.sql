
-- Create a table to store saved filters for users
CREATE TABLE public.saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filter_type TEXT NOT NULL DEFAULT 'deals',
  filters JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to SELECT their own saved filters
CREATE POLICY "Users can view their own saved filters" 
  ON public.saved_filters 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to INSERT their own saved filters
CREATE POLICY "Users can create their own saved filters" 
  ON public.saved_filters 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to UPDATE their own saved filters
CREATE POLICY "Users can update their own saved filters" 
  ON public.saved_filters 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy that allows users to DELETE their own saved filters
CREATE POLICY "Users can delete their own saved filters" 
  ON public.saved_filters 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_saved_filters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_filters_updated_at
  BEFORE UPDATE ON public.saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_filters_updated_at();
