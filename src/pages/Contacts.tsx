import { ContactTable } from "@/components/ContactTable";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, MoreVertical, Upload, Plus, Trash2, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleContactsImportExport } from "@/hooks/useSimpleContactsImportExport";
import { useCRUDAudit } from "@/hooks/useCRUDAudit";
const Contacts = () => {
  const {
    toast
  } = useToast();
  const {
    logBulkDelete
  } = useCRUDAudit();
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  console.log('Contacts page: Rendering with refreshTrigger:', refreshTrigger);
  const onRefresh = () => {
    console.log('Contacts page: Triggering refresh...');
    setRefreshTrigger(prev => {
      const newTrigger = prev + 1;
      console.log('Contacts page: Refresh trigger updated from', prev, 'to', newTrigger);
      return newTrigger;
    });
  };
  const {
    handleImport,
    handleExport,
    isImporting
  } = useSimpleContactsImportExport(onRefresh);
  const handleImportClick = () => {
    console.log('Contacts page: Import clicked, opening file dialog');
    fileInputRef.current?.click();
  };
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('Contacts page: File selected for import:', file?.name);
    if (!file) {
      console.log('Contacts page: No file selected, returning');
      return;
    }
    console.log('Contacts page: Starting CSV import process with file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });
    try {
      console.log('Contacts page: Calling handleImport from hook');
      await handleImport(file);

      // Reset the file input to allow reimporting the same file
      event.target.value = '';
      console.log('Contacts page: File input reset');
    } catch (error: any) {
      console.error('Contacts page: Import error caught:', error);

      // Reset file input on error too
      event.target.value = '';
    }
  };
  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) return;
    try {
      const {
        error
      } = await supabase.from('contacts').delete().in('id', selectedContacts);
      if (error) throw error;

      // Log bulk delete operation
      await logBulkDelete('contacts', selectedContacts.length, selectedContacts);
      toast({
        title: "Success",
        description: `${selectedContacts.length} contacts deleted successfully`
      });
      setSelectedContacts([]);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete contacts",
        variant: "destructive"
      });
    }
  };
  return <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-background">
        <div className="px-6 h-16 flex items-center border-b w-full">
          <div className="flex items-center justify-between w-full">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl text-foreground font-semibold">Contacts</h1>
            </div>
            <div className="flex items-center gap-3">
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isImporting}>
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setShowColumnCustomizer(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Columns
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportClick} disabled={isImporting}>
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
              {selectedContacts.length > 0 && <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedContacts.length})
                </DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
            Add Contact
          </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input for CSV import */}
      <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" disabled={isImporting} />

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <ContactTable showColumnCustomizer={showColumnCustomizer} setShowColumnCustomizer={setShowColumnCustomizer} showModal={showModal} setShowModal={setShowModal} selectedContacts={selectedContacts} setSelectedContacts={setSelectedContacts} refreshTrigger={refreshTrigger} />
      </div>
    </div>;
};
export default Contacts;