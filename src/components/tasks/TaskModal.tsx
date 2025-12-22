import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Task, CreateTaskData, TaskStatus, TaskPriority, TaskRecurrence } from '@/types/task';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'deferred']),
  priority: z.enum(['high', 'medium', 'low']),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']),
  assigned_to: z.string().optional(),
  lead_id: z.string().optional(),
  contact_id: z.string().optional(),
  deal_id: z.string().optional(),
  account_id: z.string().optional(),
  category: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSubmit: (data: CreateTaskData) => Promise<any>;
  onUpdate?: (taskId: string, data: Partial<Task>) => Promise<boolean>;
}

export const TaskModal = ({
  open,
  onOpenChange,
  task,
  onSubmit,
  onUpdate,
}: TaskModalProps) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [leads, setLeads] = useState<{ id: string; lead_name: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; contact_name: string }[]>([]);
  const [deals, setDeals] = useState<{ id: string; deal_name: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; company_name: string }[]>([]);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'open',
      priority: 'medium',
      due_date: '',
      due_time: '',
      recurrence: 'none',
      assigned_to: '',
      lead_id: '',
      contact_id: '',
      deal_id: '',
      account_id: '',
      category: '',
    },
  });

  useEffect(() => {
    if (open) {
      fetchDropdownData();
      if (task) {
        form.reset({
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
          due_date: task.due_date || '',
          due_time: task.due_time || '',
          recurrence: task.recurrence,
          assigned_to: task.assigned_to || '',
          lead_id: task.lead_id || '',
          contact_id: task.contact_id || '',
          deal_id: task.deal_id || '',
          account_id: task.account_id || '',
          category: task.category || '',
        });
      } else {
        form.reset({
          title: '',
          description: '',
          status: 'open',
          priority: 'medium',
          due_date: '',
          due_time: '',
          recurrence: 'none',
          assigned_to: '',
          lead_id: '',
          contact_id: '',
          deal_id: '',
          account_id: '',
          category: '',
        });
      }
    }
  }, [open, task, form]);

  const fetchDropdownData = async () => {
    const [usersRes, leadsRes, contactsRes, dealsRes, accountsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name'),
      supabase.from('leads').select('id, lead_name').limit(100),
      supabase.from('contacts').select('id, contact_name').limit(100),
      supabase.from('deals').select('id, deal_name').limit(100),
      supabase.from('accounts').select('id, company_name').limit(100),
    ]);

    if (usersRes.data) setUsers(usersRes.data);
    if (leadsRes.data) setLeads(leadsRes.data);
    if (contactsRes.data) setContacts(contactsRes.data);
    if (dealsRes.data) setDeals(dealsRes.data);
    if (accountsRes.data) setAccounts(accountsRes.data);
  };

  const handleSubmit = async (data: TaskFormData) => {
    setLoading(true);
    try {
      const taskData: CreateTaskData = {
        title: data.title,
        description: data.description || undefined,
        status: data.status as TaskStatus,
        priority: data.priority as TaskPriority,
        due_date: data.due_date || undefined,
        due_time: data.due_time || undefined,
        recurrence: data.recurrence as TaskRecurrence,
        assigned_to: data.assigned_to || undefined,
        lead_id: data.lead_id || undefined,
        contact_id: data.contact_id || undefined,
        deal_id: data.deal_id || undefined,
        account_id: data.account_id || undefined,
        category: data.category || undefined,
      };

      if (task && onUpdate) {
        await onUpdate(task.id, taskData);
      } else {
        await onSubmit(taskData);
      }
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter task description" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="deferred">Deferred</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurrence</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} 
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || 'Unknown'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Link to CRM Entity</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lead_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lead" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {leads.map(lead => (
                            <SelectItem key={lead.id} value={lead.id}>
                              {lead.lead_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contact" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {contacts.map(contact => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.contact_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deal_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select deal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {deals.map(deal => (
                            <SelectItem key={deal.id} value={deal.id}>
                              {deal.deal_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {accounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Follow-up, Meeting, Documentation" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {task ? 'Update Task' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
