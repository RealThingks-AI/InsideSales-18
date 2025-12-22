import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface AccountColumnConfig {
  field: string;
  label: string;
  visible: boolean;
  order: number;
}

interface AccountColumnCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: AccountColumnConfig[];
  onColumnsChange: (columns: AccountColumnConfig[]) => void;
}

export const AccountColumnCustomizer = ({
  open,
  onOpenChange,
  columns,
  onColumnsChange
}: AccountColumnCustomizerProps) => {
  const handleToggleColumn = (field: string, visible: boolean) => {
    const updated = columns.map(col =>
      col.field === field ? { ...col, visible } : col
    );
    onColumnsChange(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Columns</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {columns.map(column => (
            <div key={column.field} className="flex items-center space-x-2">
              <Checkbox
                id={column.field}
                checked={column.visible}
                onCheckedChange={(checked) => handleToggleColumn(column.field, checked as boolean)}
              />
              <Label htmlFor={column.field} className="cursor-pointer">
                {column.label}
              </Label>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
