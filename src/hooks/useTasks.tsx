import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Task, TaskSubtask, CreateTaskData, TaskStatus } from '@/types/task';

export const useTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          leads:lead_id (lead_name),
          contacts:contact_id (contact_name),
          deals:deal_id (deal_name),
          accounts:account_id (company_name),
          task_subtasks (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map(task => ({
        ...task,
        lead_name: task.leads?.lead_name || null,
        contact_name: task.contacts?.contact_name || null,
        deal_name: task.deals?.deal_name || null,
        account_name: task.accounts?.company_name || null,
        subtasks: task.task_subtasks || [],
      })) as Task[];

      setTasks(transformedData);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = async (taskData: CreateTaskData) => {
    if (!user?.id) {
      toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Success", description: "Task created successfully" });
      fetchTasks();
      return data;
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({ title: "Error", description: error.message || "Failed to create task", variant: "destructive" });
      return null;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const updateData: any = { ...updates };
      
      // If status is changing to completed, set completed_at
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (updates.status) {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      toast({ title: "Success", description: "Task updated successfully" });
      fetchTasks();
      return true;
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({ title: "Error", description: error.message || "Failed to update task", variant: "destructive" });
      return false;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({ title: "Success", description: "Task deleted successfully" });
      fetchTasks();
      return true;
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({ title: "Error", description: error.message || "Failed to delete task", variant: "destructive" });
      return false;
    }
  };

  // Subtask operations
  const addSubtask = async (taskId: string, title: string) => {
    try {
      const { data: existingSubtasks } = await supabase
        .from('task_subtasks')
        .select('order_index')
        .eq('task_id', taskId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrder = existingSubtasks && existingSubtasks.length > 0 
        ? existingSubtasks[0].order_index + 1 
        : 0;

      const { error } = await supabase
        .from('task_subtasks')
        .insert({
          task_id: taskId,
          title,
          order_index: nextOrder,
        });

      if (error) throw error;
      fetchTasks();
      return true;
    } catch (error: any) {
      console.error('Error adding subtask:', error);
      toast({ title: "Error", description: "Failed to add subtask", variant: "destructive" });
      return false;
    }
  };

  const toggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('task_subtasks')
        .update({ is_completed: isCompleted })
        .eq('id', subtaskId);

      if (error) throw error;
      fetchTasks();
      return true;
    } catch (error: any) {
      console.error('Error toggling subtask:', error);
      return false;
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    try {
      const { error } = await supabase
        .from('task_subtasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;
      fetchTasks();
      return true;
    } catch (error: any) {
      console.error('Error deleting subtask:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
  };
};
