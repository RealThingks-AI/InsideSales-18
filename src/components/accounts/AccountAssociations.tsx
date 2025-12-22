import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Briefcase, ExternalLink, Loader2, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Contact {
  id: string;
  contact_name: string;
  email?: string;
  phone_no?: string;
  position?: string;
}

interface Deal {
  id: string;
  deal_name: string;
  stage: string;
  total_contract_value?: number;
  probability?: number;
}

interface AccountAssociationsProps {
  accountId: string;
  companyName: string;
}

export const AccountAssociations = ({ accountId, companyName }: AccountAssociationsProps) => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssociations();
  }, [accountId, companyName]);

  const fetchAssociations = async () => {
    setLoading(true);
    try {
      // Fetch contacts linked to this account
      const { data: contactData } = await supabase
        .from('contacts')
        .select('id, contact_name, email, phone_no, position')
        .eq('account_id', accountId)
        .order('contact_name');

      setContacts(contactData || []);

      // Fetch deals where customer_name matches company_name
      if (companyName) {
        const { data: dealData } = await supabase
          .from('deals')
          .select('id, deal_name, stage, total_contract_value, probability')
          .eq('customer_name', companyName)
          .order('created_at', { ascending: false });

        setDeals(dealData || []);
      }
    } catch (error) {
      console.error('Error fetching associations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      'Lead': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      'Qualified': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'RFQ': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Discussions': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Offered': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Won': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Lost': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Dropped': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };
    return stageColors[stage] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Contacts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Contacts ({contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No contacts linked to this account
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{contact.contact_name}</p>
                      {contact.position && (
                        <p className="text-xs text-muted-foreground truncate">{contact.position}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {contact.email && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <a href={`mailto:${contact.email}`}>
                            <Mail className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      {contact.phone_no && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <a href={`tel:${contact.phone_no}`}>
                            <Phone className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => navigate('/contacts')}
          >
            View All Contacts
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Deals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Deals ({deals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No deals linked to this account
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{deal.deal_name}</p>
                      {deal.total_contract_value && (
                        <p className="text-xs text-muted-foreground">
                          ${deal.total_contract_value.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge className={`ml-2 ${getStageColor(deal.stage)}`}>
                      {deal.stage}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => navigate('/deals')}
          >
            View All Deals
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
