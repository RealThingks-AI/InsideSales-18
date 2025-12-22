import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Mail, Phone, Globe, Loader2 } from 'lucide-react';
const timezones = [{
  value: 'Asia/Kolkata',
  label: 'IST (India Standard Time)'
}, {
  value: 'America/New_York',
  label: 'EST (Eastern Standard Time)'
}, {
  value: 'America/Los_Angeles',
  label: 'PST (Pacific Standard Time)'
}, {
  value: 'Europe/London',
  label: 'GMT (Greenwich Mean Time)'
}, {
  value: 'Europe/Paris',
  label: 'CET (Central European Time)'
}, {
  value: 'Asia/Tokyo',
  label: 'JST (Japan Standard Time)'
}, {
  value: 'Asia/Singapore',
  label: 'SGT (Singapore Time)'
}, {
  value: 'Australia/Sydney',
  label: 'AEST (Australian Eastern Time)'
}, {
  value: 'Asia/Dubai',
  label: 'GST (Gulf Standard Time)'
}];
interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  timezone: string;
  bio: string;
  avatar_url: string;
}
const ProfileSettings = () => {
  const {
    user
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    email: '',
    phone: '',
    timezone: 'Asia/Kolkata',
    bio: '',
    avatar_url: ''
  });
  useEffect(() => {
    fetchProfile();
  }, [user]);
  const fetchProfile = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      setProfile({
        full_name: data?.full_name || user.user_metadata?.full_name || '',
        email: data?.['Email ID'] || user.email || '',
        phone: data?.phone || '',
        timezone: data?.timezone || 'Asia/Kolkata',
        bio: data?.bio || '',
        avatar_url: data?.avatar_url || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.full_name,
        'Email ID': profile.email,
        phone: profile.phone,
        timezone: profile.timezone,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
              <AvatarFallback className="text-lg">
                {getInitials(profile.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">
                Profile picture
              </p>
              
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" value={profile.full_name} onChange={e => setProfile(p => ({
              ...p,
              full_name: e.target.value
            }))} placeholder="Enter your full name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={profile.email} onChange={e => setProfile(p => ({
                ...p,
                email: e.target.value
              }))} placeholder="Enter your email" className="pl-9" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="phone" value={profile.phone} onChange={e => setProfile(p => ({
                ...p,
                phone: e.target.value
              }))} placeholder="Enter your phone number" className="pl-9" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Select value={profile.timezone} onValueChange={value => setProfile(p => ({
                ...p,
                timezone: value
              }))}>
                  <SelectTrigger className="pl-9">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map(tz => <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          

          <div className="pt-4 border-t flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default ProfileSettings;