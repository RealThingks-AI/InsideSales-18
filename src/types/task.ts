export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'deferred';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  due_time: string | null;
  reminder_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  recurrence: TaskRecurrence;
  recurrence_end_date: string | null;
  parent_task_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  account_id: string | null;
  tags: string[] | null;
  category: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  lead_name?: string;
  contact_name?: string;
  deal_name?: string;
  account_name?: string;
  subtasks?: TaskSubtask[];
}

export interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  due_time?: string;
  reminder_date?: string;
  assigned_to?: string;
  recurrence?: TaskRecurrence;
  recurrence_end_date?: string;
  lead_id?: string;
  contact_id?: string;
  deal_id?: string;
  account_id?: string;
  tags?: string[];
  category?: string;
}
