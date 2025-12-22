import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserDisplayNames } from "@/hooks/useUserDisplayNames";
import { AccountModal } from "@/components/AccountModal";
import { Building2, Globe, Phone, MapPin, Tag, FileText, User, Calendar, Pencil } from "lucide-react";

interface AccountViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string | null;
}

interface Account {
  id: string;
  company_name: string;
  region?: string;
  country?: string;
  website?: string;
  company_type?: string;
  tags?: string[];
  status?: string;
  notes?: string;
  industry?: string;
  phone?: string;
  account_owner?: string;
  created_by?: string;
  modified_by?: string;
  created_at?: string;
  updated_at?: string;
}

export const AccountViewModal = ({ open, onOpenChange, accountId }: AccountViewModalProps) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Get user IDs for display names
  const userIds = [account?.account_owner, account?.created_by, account?.modified_by].filter(Boolean) as string[];
  const { displayNames } = useUserDisplayNames(userIds);

  const fetchAccount = async () => {
    if (!accountId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (error) throw error;
      setAccount(data);
    } catch (error) {
      console.error('Error fetching account:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && accountId) {
      fetchAccount();
    }
  }, [open, accountId]);

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    fetchAccount(); // Refresh account data after edit
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'hot': return 'bg-red-500';
      case 'warm': return 'bg-orange-500';
      case 'working': return 'bg-blue-500';
      case 'closed-won': return 'bg-green-500';
      case 'closed-lost': return 'bg-gray-500';
      default: return 'bg-primary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Account Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Loading account...</span>
          </div>
        ) : account ? (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{account.company_name}</h2>
                {account.industry && (
                  <p className="text-muted-foreground">{account.industry}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {account.status && (
                  <Badge className={`${getStatusColor(account.status)} text-white`}>
                    {account.status}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Pencil className="w-4 h-4" />
                  Update
                </Button>
              </div>
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {account.region && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Region</p>
                    <p className="font-medium">{account.region}</p>
                  </div>
                </div>
              )}

              {account.country && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="font-medium">{account.country}</p>
                  </div>
                </div>
              )}

              {account.website && (
                <div className="flex items-start gap-3">
                  <Globe className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <a 
                      href={account.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {account.website}
                    </a>
                  </div>
                </div>
              )}

              {account.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{account.phone}</p>
                  </div>
                </div>
              )}

              {account.company_type && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company Type</p>
                    <p className="font-medium">{account.company_type}</p>
                  </div>
                </div>
              )}

              {account.account_owner && (
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Account Owner</p>
                    <p className="font-medium">{displayNames[account.account_owner] || 'Loading...'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tags Section */}
            {account.tags && account.tags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Tags</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {account.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes Section */}
            {account.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Notes</p>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap">{account.notes}</p>
                </div>
              </>
            )}

            {/* Metadata Section */}
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{formatDate(account.created_at)}</p>
                  {account.created_by && (
                    <p className="text-xs text-muted-foreground">
                      by {displayNames[account.created_by] || 'Unknown'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Last Modified</p>
                  <p>{formatDate(account.updated_at)}</p>
                  {account.modified_by && (
                    <p className="text-xs text-muted-foreground">
                      by {displayNames[account.modified_by] || 'Unknown'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Account not found
          </div>
        )}
      </DialogContent>

      {/* Edit Account Modal */}
      <AccountModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        account={account}
        onSuccess={handleEditSuccess}
      />
    </Dialog>
  );
};
