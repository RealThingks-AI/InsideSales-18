import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, UserX, CalendarClock } from "lucide-react";

const OUTCOME_OPTIONS = [
  { value: "successful", label: "Successful", icon: CheckCircle2, color: "text-green-500" },
  { value: "follow_up_needed", label: "Follow-up Needed", icon: AlertCircle, color: "text-yellow-500" },
  { value: "no_show", label: "No-show", icon: UserX, color: "text-red-500" },
  { value: "rescheduled", label: "Rescheduled", icon: CalendarClock, color: "text-blue-500" },
];

interface MeetingOutcomeSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const MeetingOutcomeSelect = ({ value, onChange, disabled }: MeetingOutcomeSelectProps) => {
  return (
    <div className="space-y-2">
      <Label>Meeting Outcome</Label>
      <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select outcome" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not Set</SelectItem>
          {OUTCOME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${opt.color}`} />
                  <span>{opt.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export const getOutcomeBadgeProps = (outcome: string | null) => {
  const opt = OUTCOME_OPTIONS.find(o => o.value === outcome);
  if (!opt) return null;
  return { label: opt.label, color: opt.color, Icon: opt.icon };
};
