import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

interface MeetingNotesSectionProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const MeetingNotesSection = ({ value, onChange, disabled }: MeetingNotesSectionProps) => {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Meeting Notes
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add notes during or after the meeting..."
        rows={4}
        disabled={disabled}
        className="resize-none"
      />
    </div>
  );
};
