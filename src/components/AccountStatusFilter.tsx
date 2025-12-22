import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AccountStatusFilterProps {
  value: string;
  onValueChange: (value: string) => void;
}

const statuses = [
  { value: "all", label: "All Statuses" },
  { value: "New", label: "New" },
  { value: "Working", label: "Working" },
  { value: "Warm", label: "Warm" },
  { value: "Hot", label: "Hot" },
  { value: "Nurture", label: "Nurture" },
  { value: "Closed-Won", label: "Closed-Won" },
  { value: "Closed-Lost", label: "Closed-Lost" },
];

export const AccountStatusFilter = ({ value, onValueChange }: AccountStatusFilterProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status.value} value={status.value}>
            {status.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
