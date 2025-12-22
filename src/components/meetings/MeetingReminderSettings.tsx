import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Loader2 } from "lucide-react";

interface ReminderSettings {
  remind_15min: boolean;
  remind_1hr: boolean;
  remind_1day: boolean;
}

interface MeetingReminderSettingsProps {
  meetingId?: string;
  disabled?: boolean;
}

export const MeetingReminderSettings = ({ meetingId, disabled }: MeetingReminderSettingsProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ReminderSettings>({
    remind_15min: true,
    remind_1hr: true,
    remind_1day: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (meetingId) {
      fetchReminderSettings();
    }
  }, [meetingId]);

  const fetchReminderSettings = async () => {
    if (!meetingId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_reminders')
        .select('remind_15min, remind_1hr, remind_1day')
        .eq('meeting_id', meetingId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings({
          remind_15min: data.remind_15min,
          remind_1hr: data.remind_1hr,
          remind_1day: data.remind_1day
        });
      }
    } catch (error) {
      console.error('Error fetching reminder settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field: keyof ReminderSettings, value: boolean) => {
    if (!meetingId) return;
    
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('meeting_reminders')
        .upsert({
          meeting_id: meetingId,
          ...newSettings
        }, { onConflict: 'meeting_id' });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving reminder settings:', error);
      // Revert on error
      setSettings(settings);
      toast({
        title: "Error",
        description: "Failed to save reminder settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!meetingId) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-muted-foreground">
          <Bell className="h-4 w-4" />
          Reminders
        </Label>
        <p className="text-sm text-muted-foreground italic">
          Save the meeting first to configure reminders
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Bell className="h-4 w-4" />
        Reminders
        {(loading || saving) && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
      </Label>

      <div className="space-y-3 pl-1">
        <div className="flex items-center justify-between">
          <span className="text-sm">15 minutes before</span>
          <Switch
            checked={settings.remind_15min}
            onCheckedChange={(checked) => handleToggle('remind_15min', checked)}
            disabled={disabled || loading}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">1 hour before</span>
          <Switch
            checked={settings.remind_1hr}
            onCheckedChange={(checked) => handleToggle('remind_1hr', checked)}
            disabled={disabled || loading}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">1 day before</span>
          <Switch
            checked={settings.remind_1day}
            onCheckedChange={(checked) => handleToggle('remind_1day', checked)}
            disabled={disabled || loading}
          />
        </div>
      </div>
    </div>
  );
};
