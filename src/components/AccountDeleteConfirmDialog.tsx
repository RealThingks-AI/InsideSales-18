import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AccountDeleteConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isMultiple?: boolean;
  count?: number;
}

export const AccountDeleteConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  isMultiple = false,
  count = 1
}: AccountDeleteConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isMultiple ? `Delete ${count} Accounts?` : "Delete Account?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isMultiple
              ? `Are you sure you want to delete ${count} accounts? This action cannot be undone. Accounts with linked contacts or leads cannot be deleted.`
              : "Are you sure you want to delete this account? This action cannot be undone. Accounts with linked contacts or leads cannot be deleted."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
