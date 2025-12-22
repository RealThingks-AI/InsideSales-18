import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Mail, Eye, RefreshCw, ListTodo, UserPlus, CheckSquare } from "lucide-react";

export interface RowAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
}

interface RowActionsDropdownProps {
  actions: RowAction[];
}

export const RowActionsDropdown = ({ actions }: RowActionsDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="w-4 h-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action, index) => (
          <React.Fragment key={index}>
            {action.separator && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={action.onClick}
              disabled={action.disabled}
              className={action.destructive ? "text-destructive focus:text-destructive" : ""}
            >
              <span className="mr-2">{action.icon}</span>
              {action.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Export commonly used icons for convenience
export { Edit, Trash2, Mail, Eye, RefreshCw, ListTodo, UserPlus, CheckSquare };
