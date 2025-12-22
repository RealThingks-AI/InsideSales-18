import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ContactActivityTimeline } from './ContactActivityTimeline';
import { ContactActivityLogModal } from './ContactActivityLogModal';
import { ContactTagsManager } from './ContactTagsManager';
import { ContactEmailTracking } from './ContactEmailTracking';
import { toast } from '@/hooks/use-toast';
import {
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  Linkedin,
  MapPin,
  Plus,
  Clock,
  Tag,
  Activity,
  BarChart3,
} from 'lucide-react';

interface Contact {
  id: string;
  contact_name: string;
  company_name: string | null;
  position: string | null;
  email: string | null;
  phone_no: string | null;
  linkedin: string | null;
  website: string | null;
  region: string | null;
  industry: string | null;
  contact_source: string | null;
  description: string | null;
  tags: string[] | null;
  score: number | null;
  segment: string | null;
  email_opens: number | null;
  email_clicks: number | null;
  engagement_score: number | null;
  created_time: string | null;
}

interface ContactDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onUpdate?: () => void;
}

export const ContactDetailModal = ({
  open,
  onOpenChange,
  contact,
  onUpdate,
}: ContactDetailModalProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (contact) {
      setTags(contact.tags || []);
    }
  }, [contact]);

  const handleTagsChange = async (newTags: string[]) => {
    if (!contact) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .update({ tags: newTags })
        .eq('id', contact.id);

      if (error) throw error;

      setTags(newTags);
      toast({
        title: "Tags Updated",
        description: "Contact tags have been updated",
      });
      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating tags:', error);
      toast({
        title: "Error",
        description: "Failed to update tags",
        variant: "destructive",
      });
    }
  };

  const handleActivityLogged = () => {
    onUpdate?.();
  };

  if (!contact) return null;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">{contact.contact_name}</DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {contact.position && <span>{contact.position}</span>}
                    {contact.position && contact.company_name && <span>at</span>}
                    {contact.company_name && (
                      <span className="font-medium">{contact.company_name}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {contact.score !== null && (
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(contact.score)}`}>
                      {contact.score}
                    </div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>
                )}
                {contact.segment && (
                  <Badge variant="outline" className="capitalize">
                    {contact.segment}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="tags" className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                Tags
              </TabsTrigger>
              <TabsTrigger value="engagement" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Engagement
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">Contact Information</h3>
                  
                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${contact.email}`} className="text-sm hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  
                  {contact.phone_no && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${contact.phone_no}`} className="text-sm hover:underline">
                        {contact.phone_no}
                      </a>
                    </div>
                  )}
                  
                  {contact.linkedin && (
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-muted-foreground" />
                      <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                  
                  {contact.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                        {contact.website}
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">Company Details</h3>
                  
                  {contact.company_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contact.company_name}</span>
                    </div>
                  )}
                  
                  {contact.industry && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contact.industry}</span>
                    </div>
                  )}
                  
                  {contact.region && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contact.region}</span>
                    </div>
                  )}
                  
                  {contact.contact_source && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Source: {contact.contact_source}</span>
                    </div>
                  )}
                </div>
              </div>

              {contact.description && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">Description</h3>
                    <p className="text-sm">{contact.description}</p>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Activity Timeline</h3>
                <Button size="sm" onClick={() => setShowActivityLogModal(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Log Activity
                </Button>
              </div>
              <ContactActivityTimeline contactId={contact.id} />
            </TabsContent>

            <TabsContent value="tags" className="mt-4">
              <div className="space-y-4">
                <h3 className="font-medium">Tags & Labels</h3>
                <ContactTagsManager tags={tags} onTagsChange={handleTagsChange} />
              </div>
            </TabsContent>

            <TabsContent value="engagement" className="mt-4">
              <div className="space-y-4">
                <h3 className="font-medium">Email Tracking & Engagement</h3>
                <ContactEmailTracking
                  emailOpens={contact.email_opens || 0}
                  emailClicks={contact.email_clicks || 0}
                  engagementScore={contact.engagement_score || 0}
                />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ContactActivityLogModal
        open={showActivityLogModal}
        onOpenChange={setShowActivityLogModal}
        contactId={contact.id}
        onSuccess={handleActivityLogged}
      />
    </>
  );
};
