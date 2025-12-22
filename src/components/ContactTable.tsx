import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCRUDAudit } from "@/hooks/useCRUDAudit";
import { Card } from "@/components/ui/card";
import { ContactTableHeader } from "./contact-table/ContactTableHeader";
import { ContactTableBody } from "./contact-table/ContactTableBody";
import { ContactTablePagination } from "./contact-table/ContactTablePagination";
import { ContactModal } from "./ContactModal";
import { ContactColumnCustomizer, ContactColumnConfig } from "./ContactColumnCustomizer";
import { ContactDetailModal } from "./contacts/ContactDetailModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Contact {
  id: string;
  contact_name: string;
  company_name?: string;
  account_id?: string;
  account_company_name?: string;
  position?: string;
  email?: string;
  phone_no?: string;
  mobile_no?: string;
  region?: string;
  city?: string;
  state?: string;
  contact_owner?: string;
  created_time?: string;
  modified_time?: string;
  lead_status?: string;
  industry?: string;
  contact_source?: string;
  linkedin?: string;
  website?: string;
  description?: string;
  annual_revenue?: number;
  no_of_employees?: number;
  created_by?: string;
  modified_by?: string;
  tags?: string[];
  score?: number;
  segment?: string;
  email_opens?: number;
  email_clicks?: number;
  engagement_score?: number;
}

const defaultColumns: ContactColumnConfig[] = [
  { field: 'contact_name', label: 'Contact Name', visible: true, order: 0 },
  { field: 'account_company_name', label: 'Company Account', visible: true, order: 1 },
  { field: 'position', label: 'Position', visible: true, order: 2 },
  { field: 'email', label: 'Email', visible: true, order: 3 },
  { field: 'phone_no', label: 'Phone Number', visible: true, order: 4 },
  { field: 'contact_source', label: 'Contact Source', visible: true, order: 5 },
  { field: 'contact_owner', label: 'Contact Owner', visible: true, order: 6 },
];

interface ContactTableProps {
  showColumnCustomizer: boolean;
  setShowColumnCustomizer: (show: boolean) => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  selectedContacts: string[];
  setSelectedContacts: React.Dispatch<React.SetStateAction<string[]>>;
  refreshTrigger?: number;
}

export const ContactTable = ({ 
  showColumnCustomizer, 
  setShowColumnCustomizer, 
  showModal, 
  setShowModal,
  selectedContacts,
  setSelectedContacts,
  refreshTrigger
}: ContactTableProps) => {
  const { toast } = useToast();
  const { logDelete } = useCRUDAudit();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [columns, setColumns] = useState(defaultColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Default 50 contacts per page
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  console.log('ContactTable: Rendering with contacts:', contacts.length);

  const fetchContacts = async () => {
    try {
      console.log('ContactTable: Starting to fetch contacts...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          accounts:account_id (
            company_name
          )
        `)
        .order('created_time', { ascending: false });
      
      // Transform data to include account_company_name
      const transformedData = (data || []).map(contact => ({
        ...contact,
        account_company_name: contact.accounts?.company_name || contact.company_name || null
      }));

      if (error) {
        console.error('ContactTable: Supabase error:', error);
        throw error;
      }
      
      console.log('ContactTable: Successfully fetched contacts:', transformedData?.length || 0);
      setContacts(transformedData || []);
      
    } catch (error) {
      console.error('ContactTable: Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contacts. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log('ContactTable: Finished fetching contacts');
    }
  };

  // Initial load
  useEffect(() => {
    console.log('ContactTable: Initial mount, fetching contacts');
    fetchContacts();
  }, []);

  // Handle refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('ContactTable: Refresh triggered:', refreshTrigger);
      fetchContacts();
    }
  }, [refreshTrigger]);

  // Filter and sort contacts
  useEffect(() => {
    console.log('ContactTable: Filtering contacts, search term:', searchTerm);
    let filtered = contacts.filter(contact =>
      contact.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        const aValue = a[sortField as keyof Contact] || '';
        const bValue = b[sortField as keyof Contact] || '';
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        
        // For non-string values, convert to string for comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        const comparison = aStr.localeCompare(bStr);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    setFilteredContacts(filtered);
    setCurrentPage(1);
    console.log('ContactTable: Filtered contacts:', filtered.length);
  }, [contacts, searchTerm, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Find the contact first to log the deleted data
      const contactToDelete = contacts.find(c => c.id === id);
      
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log delete operation
      await logDelete('contacts', id, contactToDelete);

      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
      
      fetchContacts();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  const handleEditContact = (contact: Contact) => {
    console.log('ContactTable: Editing contact:', contact.id);
    setEditingContact(contact);
    setShowModal(true);
  };

  const handleViewContact = (contact: Contact) => {
    console.log('ContactTable: Viewing contact:', contact.id);
    setViewingContact(contact);
    setShowDetailModal(true);
  };

  const visibleColumns = columns.filter(col => col.visible);
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageContacts = filteredContacts.slice(startIndex, startIndex + itemsPerPage);

  console.log('ContactTable: Render state - loading:', loading, 'contacts:', contacts.length, 'pageContacts:', pageContacts.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ContactTableHeader 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedContacts={selectedContacts}
        setSelectedContacts={setSelectedContacts}
        pageContacts={pageContacts}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />

      <Card>
        <ContactTableBody
          loading={loading}
          pageContacts={pageContacts}
          visibleColumns={visibleColumns}
          selectedContacts={selectedContacts}
          setSelectedContacts={setSelectedContacts}
          onEdit={handleEditContact}
          onView={handleViewContact}
          onDelete={(id) => {
            setContactToDelete(id);
            setShowDeleteDialog(true);
          }}
          searchTerm={searchTerm}
          onRefresh={fetchContacts}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </Card>

      {totalPages > 1 && (
        <ContactTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredContacts.length}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modals */}
      <ContactModal
        open={showModal}
        onOpenChange={setShowModal}
        contact={editingContact}
        onSuccess={() => {
          fetchContacts();
          setEditingContact(null);
        }}
      />

      <ContactDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        contact={viewingContact as any}
        onUpdate={fetchContacts}
      />

      <ContactColumnCustomizer
        open={showColumnCustomizer}
        onOpenChange={setShowColumnCustomizer}
        columns={columns}
        onColumnsChange={setColumns}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the contact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (contactToDelete) {
                  handleDelete(contactToDelete);
                  setContactToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
