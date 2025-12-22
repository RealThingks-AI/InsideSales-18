import AccountTable from "@/components/AccountTable";
import { Button } from "@/components/ui/button";
import { Settings, Trash2, Upload, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAccountsImportExport } from "@/hooks/useAccountsImportExport";
import { AccountDeleteConfirmDialog } from "@/components/AccountDeleteConfirmDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Accounts = () => {
  const { toast } = useToast();
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    handleImport,
    handleExport,
    isImporting
  } = useAccountsImportExport(() => {
    setRefreshTrigger(prev => prev + 1);
  });

  const handleBulkDeleteClick = () => {
    if (selectedAccounts.length === 0) return;
    setShowBulkDeleteDialog(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      handleImport(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a valid CSV file",
        variant: "destructive"
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-background">
        <div className="px-6 h-16 flex items-center border-b w-full">
          <div className="flex items-center justify-between w-full">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl text-foreground font-semibold">Accounts</h1>
            </div>
            <div className="flex items-center gap-3">
              {selectedAccounts.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={handleBulkDeleteClick} disabled={isDeleting}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isDeleting ? 'Deleting...' : `Delete Selected (${selectedAccounts.length})`}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowColumnCustomizer(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Columns
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                    <Upload className="w-4 h-4 mr-2" />
                    {isImporting ? 'Importing...' : 'Import CSV'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkDeleteClick} disabled={selectedAccounts.length === 0 || isDeleting} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Deleting...' : `Delete Selected (${selectedAccounts.length})`}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
                Add Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} style={{ display: 'none' }} />

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <AccountTable 
          showColumnCustomizer={showColumnCustomizer} 
          setShowColumnCustomizer={setShowColumnCustomizer} 
          showModal={showModal} 
          setShowModal={setShowModal} 
          selectedAccounts={selectedAccounts} 
          setSelectedAccounts={setSelectedAccounts} 
          key={refreshTrigger} 
          onBulkDeleteComplete={() => {
            setSelectedAccounts([]);
            setRefreshTrigger(prev => prev + 1);
            setShowBulkDeleteDialog(false);
          }} 
        />
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <AccountDeleteConfirmDialog 
        open={showBulkDeleteDialog} 
        onConfirm={async () => {
          setIsDeleting(true);
          setShowBulkDeleteDialog(false);
          setIsDeleting(false);
        }} 
        onCancel={() => setShowBulkDeleteDialog(false)} 
        isMultiple={true} 
        count={selectedAccounts.length} 
      />
    </div>
  );
};

export default Accounts;