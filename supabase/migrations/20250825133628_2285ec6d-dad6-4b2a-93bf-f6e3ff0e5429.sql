
-- Fix the notifications table foreign key constraint to handle user deletion
-- Drop the existing foreign key constraint on notifications.user_id
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Add the foreign key constraint back with CASCADE deletion
-- This will automatically delete notification records when a user is deleted
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
