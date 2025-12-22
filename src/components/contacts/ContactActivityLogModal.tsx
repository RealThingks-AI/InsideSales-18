import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ContactActivityLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  onSuccess: () => void;
}

const activityTypes = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
  { value: 'message', label: 'Message' },
  { value: 'task', label: 'Task' },
];

export const ContactActivityLogModal = ({
  open,
  onOpenChange,
  contactId,
  onSuccess,
}: ContactActivityLogModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    activity_type: 'call',
    subject: '',
    description: '',
    outcome: '',
    duration_minutes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('contact_activities').insert({
        contact_id: contactId,
        activity_type: formData.activity_type,
        subject: formData.subject,
        description: formData.description || null,
        outcome: formData.outcome || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Activity Logged",
        description: "Activity has been recorded successfully",
      });

      // Reset form
      setFormData({
        activity_type: 'call',
        subject: '',
        description: '',
        outcome: '',
        duration_minutes: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error logging activity:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to log activity",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Activity Type</Label>
            <Select
              value={formData.activity_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, activity_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Enter activity subject"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add details about this activity"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                placeholder="e.g. 30"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label>Outcome</Label>
              <Input
                value={formData.outcome}
                onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value }))}
                placeholder="e.g. Scheduled demo"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.subject}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Activity
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
