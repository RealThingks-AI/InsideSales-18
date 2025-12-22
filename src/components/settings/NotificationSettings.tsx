import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Mail, Smartphone, Loader2 } from 'lucide-react';

interface NotificationPrefs {
  email_notifications: boolean;
  in_app_notifications: boolean;
  push_notifications: boolean;
  lead_assigned: boolean;
  deal_updates: boolean;
  task_reminders: boolean;
  meeting_reminders: boolean;
  weekly_digest: boolean;
}

const NotificationSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email_notifications: true,
    in_app_notifications: true,
    push_notifications: false,
    lead_assigned: true,
    deal_updates: true,
    task_reminders: true,
    meeting_reminders: true,
    weekly_digest: false,
  });

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPrefs({
          email_notifications: data.email_notifications,
          in_app_notifications: data.in_app_notifications,
          push_notifications: data.push_notifications,
          lead_assigned: data.lead_assigned,
          deal_updates: data.deal_updates,
          task_reminders: data.task_reminders,
          meeting_reminders: data.meeting_reminders,
          weekly_digest: data.weekly_digest,
        });
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email_notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              id="email_notifications"
              checked={prefs.email_notifications}
              onCheckedChange={() => togglePref('email_notifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="in_app_notifications">In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications within the app
                </p>
              </div>
            </div>
            <Switch
              id="in_app_notifications"
              checked={prefs.in_app_notifications}
              onCheckedChange={() => togglePref('in_app_notifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="push_notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive browser push notifications
                </p>
              </div>
            </div>
            <Switch
              id="push_notifications"
              checked={prefs.push_notifications}
              onCheckedChange={() => togglePref('push_notifications')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Events</CardTitle>
          <CardDescription>
            Choose which events trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="lead_assigned">Lead Assigned</Label>
              <p className="text-sm text-muted-foreground">
                When a lead is assigned to you
              </p>
            </div>
            <Switch
              id="lead_assigned"
              checked={prefs.lead_assigned}
              onCheckedChange={() => togglePref('lead_assigned')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="deal_updates">Deal Updates</Label>
              <p className="text-sm text-muted-foreground">
                When deals you're involved in are updated
              </p>
            </div>
            <Switch
              id="deal_updates"
              checked={prefs.deal_updates}
              onCheckedChange={() => togglePref('deal_updates')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="task_reminders">Task Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Reminders for upcoming and overdue tasks
              </p>
            </div>
            <Switch
              id="task_reminders"
              checked={prefs.task_reminders}
              onCheckedChange={() => togglePref('task_reminders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="meeting_reminders">Meeting Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Reminders before scheduled meetings
              </p>
            </div>
            <Switch
              id="meeting_reminders"
              checked={prefs.meeting_reminders}
              onCheckedChange={() => togglePref('meeting_reminders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weekly_digest">Weekly Digest</Label>
              <p className="text-sm text-muted-foreground">
                Weekly summary of activities and metrics
              </p>
            </div>
            <Switch
              id="weekly_digest"
              checked={prefs.weekly_digest}
              onCheckedChange={() => togglePref('weekly_digest')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;