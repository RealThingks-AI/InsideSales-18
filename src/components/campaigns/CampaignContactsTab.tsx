import { useState, useMemo } from 'react';
import { useCampaignContacts, useCampaignAccounts } from '@/hooks/useCampaigns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, X, Search, ArrowRightCircle, Linkedin, Phone } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CAMPAIGN_CONTACT_STAGES } from '@/types/campaign';
import { ConvertToDealDialog } from './ConvertToDealDialog';
import type { CampaignContact } from '@/types/campaign';

interface Props {
  campaignId: string;
}

export function CampaignContactsTab({ campaignId }: Props) {
  const { query, addContact, removeContact, updateContactStage } = useCampaignContacts(campaignId);
  const accountsHook = useCampaignAccounts(campaignId);
  const [addOpen, setAddOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [convertContact, setConvertContact] = useState<CampaignContact | null>(null);

  const campaignAccounts = accountsHook.query.data || [];

  const allContactsQuery = useQuery({
    queryKey: ['all_contacts_for_campaign'],
    queryFn: async () => {
      const { data } = await supabase.from('contacts').select('id, contact_name, email, position, company_name, phone_no, linkedin').order('contact_name');
      return data || [];
    },
    enabled: addOpen,
  });

  const existingIds = new Set((query.data || []).map(c => c.contact_id));

  // Extract unique positions for filter
  const positions = useMemo(() => {
    const allContacts = allContactsQuery.data || [];
    return [...new Set(allContacts.map(c => c.position).filter(Boolean))].sort() as string[];
  }, [allContactsQuery.data]);

  const availableContacts = (allContactsQuery.data || []).filter(c => {
    if (existingIds.has(c.id)) return false;
    if (!c.contact_name.toLowerCase().includes(contactSearch.toLowerCase())) return false;
    if (accountFilter !== 'all') {
      const account = campaignAccounts.find(a => a.account_id === accountFilter);
      if (account && c.company_name?.toLowerCase() !== account.accounts?.account_name?.toLowerCase()) return false;
    }
    if (positionFilter !== 'all' && c.position !== positionFilter) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAdd = async () => {
    for (const contactId of Array.from(selectedIds)) {
      await addContact.mutateAsync({ contactId });
    }
    setSelectedIds(new Set());
    setAddOpen(false);
  };

  const handleSingleAdd = (contactId: string) => {
    addContact.mutate({ contactId });
    setAddOpen(false);
  };

  const resetFilters = () => {
    setSelectedIds(new Set());
    setContactSearch('');
    setAccountFilter('all');
    setPositionFilter('all');
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">Target Contacts ({query.data?.length || 0})</span>
        <Popover open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetFilters(); }}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Add Contacts</Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-2" align="end">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input placeholder="Search contacts..." value={contactSearch} onChange={e => setContactSearch(e.target.value)} className="pl-7 h-8 text-xs" />
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              {campaignAccounts.length > 0 && (
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {campaignAccounts.map(a => (
                      <SelectItem key={a.account_id} value={a.account_id}>{a.accounts?.account_name || a.account_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {positions.length > 0 && (
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Position" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {availableContacts.map(c => (
                <label key={c.id} className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent cursor-pointer">
                  <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} className="h-3.5 w-3.5" />
                  <span className="truncate flex-1">
                    {c.contact_name}
                    {c.position && <span className="text-muted-foreground ml-1">· {c.position}</span>}
                    {c.company_name && <span className="text-muted-foreground ml-1">@ {c.company_name}</span>}
                  </span>
                  <button className="text-primary text-[10px] font-medium shrink-0 hover:underline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSingleAdd(c.id); }}>
                    Add
                  </button>
                </label>
              ))}
              {!availableContacts.length && <p className="text-xs text-muted-foreground p-2">No contacts found</p>}
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between border-t border-border mt-2 pt-2 px-1">
                <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
                <Button size="sm" className="h-7 text-xs" onClick={handleBulkAdd} disabled={addContact.isPending}>Add Selected</Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {!query.data?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">No contacts added yet</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>LinkedIn</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.map(cc => (
              <TableRow key={cc.id}>
                <TableCell className="font-medium text-sm">{cc.contacts?.contact_name || '—'}</TableCell>
                <TableCell className="text-sm">{cc.contacts?.email || '—'}</TableCell>
                <TableCell className="text-sm">
                  {cc.contacts?.phone_no ? (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {cc.contacts.phone_no}
                    </span>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-sm">
                  {cc.contacts?.linkedin ? (
                    <a href={cc.contacts.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <Linkedin className="h-3 w-3" />
                      Profile
                    </a>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-sm">{cc.contacts?.position || '—'}</TableCell>
                <TableCell>
                  <Select value={cc.stage} onValueChange={v => updateContactStage.mutate({ id: cc.id, stage: v })}>
                    <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_CONTACT_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {(cc.stage === 'Responded' || cc.stage === 'Qualified') && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Convert to Deal" onClick={() => setConvertContact(cc)}>
                        <ArrowRightCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeContact.mutate(cc.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConvertToDealDialog
        open={!!convertContact}
        onOpenChange={() => setConvertContact(null)}
        campaignId={campaignId}
        campaignContact={convertContact}
      />
    </div>
  );
}
