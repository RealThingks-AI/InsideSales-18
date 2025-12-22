
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeadStatusFilterProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const LeadStatusFilter = ({ value, onValueChange }: LeadStatusFilterProps) => {
  return (
    <Select value={value || "New"} onValueChange={onValueChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="New" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="New">New</SelectItem>
        <SelectItem value="Attempted">Attempted</SelectItem>
        <SelectItem value="Follow-up">Follow-up</SelectItem>
        <SelectItem value="Qualified">Qualified</SelectItem>
        <SelectItem value="Disqualified">Disqualified</SelectItem>
      </SelectContent>
    </Select>
  );
};
