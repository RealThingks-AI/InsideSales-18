import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Video, Loader2, CalendarIcon, Clock, XCircle, X, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MeetingOutcomeSelect } from "@/components/meetings/MeetingOutcomeSelect";
import { MeetingConflictWarning } from "@/components/meetings/MeetingConflictWarning";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Comprehensive timezones (40 options, ordered by GMT offset)
const TIMEZONES = [{
  value: "Pacific/Midway",
  label: "(GMT-11:00) Midway Island, Samoa",
  short: "GMT-11"
}, {
  value: "Pacific/Honolulu",
  label: "(GMT-10:00) Hawaii",
  short: "GMT-10"
}, {
  value: "America/Anchorage",
  label: "(GMT-09:00) Alaska",
  short: "GMT-9"
}, {
  value: "America/Los_Angeles",
  label: "(GMT-08:00) Los Angeles, San Francisco",
  short: "GMT-8"
}, {
  value: "America/Tijuana",
  label: "(GMT-08:00) Tijuana, Baja California",
  short: "GMT-8"
}, {
  value: "America/Denver",
  label: "(GMT-07:00) Denver, Phoenix",
  short: "GMT-7"
}, {
  value: "America/Phoenix",
  label: "(GMT-07:00) Arizona",
  short: "GMT-7"
}, {
  value: "America/Chicago",
  label: "(GMT-06:00) Chicago, Dallas",
  short: "GMT-6"
}, {
  value: "America/Mexico_City",
  label: "(GMT-06:00) Mexico City",
  short: "GMT-6"
}, {
  value: "America/New_York",
  label: "(GMT-05:00) New York, Washington",
  short: "GMT-5"
}, {
  value: "America/Bogota",
  label: "(GMT-05:00) Bogota, Lima",
  short: "GMT-5"
}, {
  value: "America/Caracas",
  label: "(GMT-04:00) Caracas, La Paz",
  short: "GMT-4"
}, {
  value: "America/Santiago",
  label: "(GMT-04:00) Santiago",
  short: "GMT-4"
}, {
  value: "America/Halifax",
  label: "(GMT-04:00) Atlantic Time",
  short: "GMT-4"
}, {
  value: "America/Sao_Paulo",
  label: "(GMT-03:00) Brasilia, Sao Paulo",
  short: "GMT-3"
}, {
  value: "America/Buenos_Aires",
  label: "(GMT-03:00) Buenos Aires",
  short: "GMT-3"
}, {
  value: "Atlantic/South_Georgia",
  label: "(GMT-02:00) Mid-Atlantic",
  short: "GMT-2"
}, {
  value: "Atlantic/Azores",
  label: "(GMT-01:00) Azores",
  short: "GMT-1"
}, {
  value: "Atlantic/Cape_Verde",
  label: "(GMT-01:00) Cape Verde",
  short: "GMT-1"
}, {
  value: "UTC",
  label: "(GMT+00:00) UTC",
  short: "UTC"
}, {
  value: "Europe/London",
  label: "(GMT+00:00) London, Dublin",
  short: "GMT+0"
}, {
  value: "Africa/Casablanca",
  label: "(GMT+00:00) Casablanca",
  short: "GMT+0"
}, {
  value: "Europe/Berlin",
  label: "(GMT+01:00) Berlin, Vienna, Rome",
  short: "GMT+1"
}, {
  value: "Europe/Paris",
  label: "(GMT+01:00) Paris, Brussels, Madrid",
  short: "GMT+1"
}, {
  value: "Africa/Lagos",
  label: "(GMT+01:00) West Central Africa",
  short: "GMT+1"
}, {
  value: "Europe/Athens",
  label: "(GMT+02:00) Athens, Bucharest",
  short: "GMT+2"
}, {
  value: "Africa/Cairo",
  label: "(GMT+02:00) Cairo",
  short: "GMT+2"
}, {
  value: "Africa/Johannesburg",
  label: "(GMT+02:00) Johannesburg",
  short: "GMT+2"
}, {
  value: "Europe/Moscow",
  label: "(GMT+03:00) Moscow, St. Petersburg",
  short: "GMT+3"
}, {
  value: "Asia/Kuwait",
  label: "(GMT+03:00) Kuwait, Riyadh, Baghdad",
  short: "GMT+3"
}, {
  value: "Africa/Nairobi",
  label: "(GMT+03:00) Nairobi",
  short: "GMT+3"
}, {
  value: "Asia/Tehran",
  label: "(GMT+03:30) Tehran",
  short: "GMT+3:30"
}, {
  value: "Asia/Dubai",
  label: "(GMT+04:00) Dubai, Abu Dhabi",
  short: "GMT+4"
}, {
  value: "Asia/Kabul",
  label: "(GMT+04:30) Kabul",
  short: "GMT+4:30"
}, {
  value: "Asia/Karachi",
  label: "(GMT+05:00) Islamabad, Karachi",
  short: "GMT+5"
}, {
  value: "Asia/Kolkata",
  label: "(GMT+05:30) Chennai, Kolkata, Mumbai",
  short: "GMT+5:30"
}, {
  value: "Asia/Kathmandu",
  label: "(GMT+05:45) Kathmandu",
  short: "GMT+5:45"
}, {
  value: "Asia/Dhaka",
  label: "(GMT+06:00) Dhaka, Almaty",
  short: "GMT+6"
}, {
  value: "Asia/Yangon",
  label: "(GMT+06:30) Yangon",
  short: "GMT+6:30"
}, {
  value: "Asia/Bangkok",
  label: "(GMT+07:00) Bangkok, Hanoi",
  short: "GMT+7"
}, {
  value: "Asia/Singapore",
  label: "(GMT+08:00) Singapore, Kuala Lumpur",
  short: "GMT+8"
}, {
  value: "Asia/Hong_Kong",
  label: "(GMT+08:00) Hong Kong, Beijing",
  short: "GMT+8"
}, {
  value: "Asia/Tokyo",
  label: "(GMT+09:00) Tokyo, Seoul",
  short: "GMT+9"
}, {
  value: "Australia/Darwin",
  label: "(GMT+09:30) Darwin, Adelaide",
  short: "GMT+9:30"
}, {
  value: "Australia/Sydney",
  label: "(GMT+10:00) Sydney, Melbourne",
  short: "GMT+10"
}, {
  value: "Pacific/Guam",
  label: "(GMT+10:00) Guam, Port Moresby",
  short: "GMT+10"
}, {
  value: "Pacific/Noumea",
  label: "(GMT+11:00) Magadan, Solomon Islands",
  short: "GMT+11"
}, {
  value: "Pacific/Auckland",
  label: "(GMT+12:00) Auckland, Wellington",
  short: "GMT+12"
}, {
  value: "Pacific/Fiji",
  label: "(GMT+12:00) Fiji, Marshall Islands",
  short: "GMT+12"
}, {
  value: "Pacific/Tongatapu",
  label: "(GMT+13:00) Nuku'alofa",
  short: "GMT+13"
}];

// Duration options
const DURATION_OPTIONS = [{
  value: "15",
  label: "15 min"
}, {
  value: "30",
  label: "30 min"
}, {
  value: "45",
  label: "45 min"
}, {
  value: "60",
  label: "1 hour"
}, {
  value: "90",
  label: "1.5 hours"
}, {
  value: "120",
  label: "2 hours"
}];

// Generate 15-minute time slots
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
    }
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

// Get browser timezone
const getBrowserTimezone = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Check if it exists in our list
    if (TIMEZONES.some(t => t.value === tz)) {
      return tz;
    }
    return "Asia/Kolkata"; // Fallback
  } catch {
    return "Asia/Kolkata";
  }
};
interface Meeting {
  id: string;
  subject: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  join_url?: string | null;
  attendees?: unknown;
  lead_id?: string | null;
  contact_id?: string | null;
  status: string;
  outcome?: string | null;
  notes?: string | null;
}
interface Lead {
  id: string;
  lead_name: string;
  email?: string;
}
interface Contact {
  id: string;
  contact_name: string;
  email?: string;
}
interface MeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: Meeting | null;
  onSuccess: () => void;
}
export const MeetingModal = ({
  open,
  onOpenChange,
  meeting,
  onSuccess
}: MeetingModalProps) => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [creatingTeamsMeeting, setCreatingTeamsMeeting] = useState(false);
  const [cancellingMeeting, setCancellingMeeting] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showParticipantsInput, setShowParticipantsInput] = useState(false);

  // State for date/time selection
  const [timezone, setTimezone] = useState(getBrowserTimezone);
  const [tzPopoverOpen, setTzPopoverOpen] = useState(false);
  const tzListRef = useRef<HTMLDivElement | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  useEffect(() => {
    if (!tzPopoverOpen) return;

    // After popover mounts, scroll the selected timezone into view.
    const raf = requestAnimationFrame(() => {
      const selectedEl = tzListRef.current?.querySelector(`[data-tz="${timezone}"]`) as HTMLElement | null;
      selectedEl?.scrollIntoView({
        block: "center"
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [tzPopoverOpen, timezone]);

  // Toggle for Lead vs Contact selection
  const [linkType, setLinkType] = useState<'lead' | 'contact'>('lead');

  // Multiple email addresses for external participants
  const [participants, setParticipants] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    join_url: "",
    lead_id: "",
    contact_id: "",
    status: "scheduled",
    outcome: ""
  });

  // Handle timezone change
  const handleTimezoneChange = (newTimezone: string) => {
    if (startDate && startTime) {
      const [h, m] = startTime.split(":").map(Number);
      const dateInOldTz = new Date(startDate);
      dateInOldTz.setHours(h, m, 0, 0);
      const utcTime = fromZonedTime(dateInOldTz, timezone);
      const timeInNewTz = toZonedTime(utcTime, newTimezone);
      setStartDate(timeInNewTz);
      setStartTime(format(timeInNewTz, "HH:mm"));
    }
    setTimezone(newTimezone);
    setTzPopoverOpen(false);
  };

  // Get current date/time for validation
  const now = new Date();
  const nowInTimezone = toZonedTime(now, timezone);
  const todayInTimezone = new Date(nowInTimezone.getFullYear(), nowInTimezone.getMonth(), nowInTimezone.getDate());

  // Filter time slots to exclude past times for today
  const getAvailableTimeSlots = (selectedDate: Date | undefined) => {
    if (!selectedDate) return TIME_SLOTS;
    const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const isToday = selectedDateOnly.getTime() === todayInTimezone.getTime();
    if (!isToday) return TIME_SLOTS;
    const currentHour = nowInTimezone.getHours();
    const currentMinute = nowInTimezone.getMinutes();
    return TIME_SLOTS.filter(slot => {
      const [h, m] = slot.split(":").map(Number);
      if (h > currentHour) return true;
      if (h === currentHour && m > currentMinute) return true;
      return false;
    });
  };
  const availableStartTimeSlots = useMemo(() => getAvailableTimeSlots(startDate), [startDate, timezone, nowInTimezone]);

  // Calculate end time based on start time and duration
  const calculateEndDateTime = (start: Date, time: string, durationMinutes: number) => {
    const [h, m] = time.split(":").map(Number);
    const endDateTime = new Date(start);
    endDateTime.setHours(h, m, 0, 0);
    endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);
    return endDateTime;
  };

  // Compute proposed meeting times for conflict detection
  const proposedStartTime = useMemo(() => {
    if (!startDate) return "";
    const [h, m] = startTime.split(":").map(Number);
    const dt = new Date(startDate);
    dt.setHours(h, m, 0, 0);
    const utcTime = fromZonedTime(dt, timezone);
    return utcTime.toISOString();
  }, [startDate, startTime, timezone]);
  const proposedEndTime = useMemo(() => {
    if (!startDate) return "";
    const endDateTime = calculateEndDateTime(startDate, startTime, parseInt(duration));
    const utcTime = fromZonedTime(endDateTime, timezone);
    return utcTime.toISOString();
  }, [startDate, startTime, duration, timezone]);
  useEffect(() => {
    if (open) {
      fetchLeadsAndContacts();
      if (meeting) {
        const start = new Date(meeting.start_time);
        const end = new Date(meeting.end_time);
        const durationMs = end.getTime() - start.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));

        // Find closest duration option
        const closestDuration = DURATION_OPTIONS.reduce((prev, curr) => {
          return Math.abs(parseInt(curr.value) - durationMinutes) < Math.abs(parseInt(prev.value) - durationMinutes) ? curr : prev;
        });
        setStartDate(start);
        setStartTime(format(start, "HH:mm"));
        setDuration(closestDuration.value);
        setFormData({
          subject: meeting.subject || "",
          description: meeting.description || "",
          join_url: meeting.join_url || "",
          lead_id: meeting.lead_id || "",
          contact_id: meeting.contact_id || "",
          status: meeting.status || "scheduled",
          outcome: meeting.outcome || ""
        });
        if (meeting.lead_id) {
          setLinkType('lead');
        } else if (meeting.contact_id) {
          setLinkType('contact');
        }
        if (meeting.attendees && Array.isArray(meeting.attendees)) {
          const existingEmails = (meeting.attendees as {
            email: string;
          }[]).map(a => a.email).filter(Boolean);
          setParticipants(existingEmails);
          if (existingEmails.length > 0) setShowParticipantsInput(true);
        } else {
          setParticipants([]);
        }
      } else {
        // Default: next hour rounded to 15 min
        const defaultStart = new Date();
        defaultStart.setMinutes(Math.ceil(defaultStart.getMinutes() / 15) * 15 + 15, 0, 0);
        setStartDate(defaultStart);
        setStartTime(format(defaultStart, "HH:mm"));
        setDuration("60");
        setTimezone(getBrowserTimezone());
        setLinkType('lead');
        setParticipants([]);
        setEmailInput("");
        setShowParticipantsInput(false);
        setFormData({
          subject: "",
          description: "",
          join_url: "",
          lead_id: "",
          contact_id: "",
          status: "scheduled",
          outcome: ""
        });
      }
    }
  }, [open, meeting]);
  const fetchLeadsAndContacts = async () => {
    try {
      const [leadsRes, contactsRes] = await Promise.all([supabase.from('leads').select('id, lead_name, email').order('lead_name'), supabase.from('contacts').select('id, contact_name, email').order('contact_name')]);
      if (leadsRes.data) setLeads(leadsRes.data);
      if (contactsRes.data) setContacts(contactsRes.data);
    } catch (error) {
      console.error('Error fetching leads/contacts:', error);
    }
  };
  const buildISODateTime = (date: Date | undefined, time: string): string => {
    if (!date) return "";
    const [h, m] = time.split(":").map(Number);
    const dt = new Date(date);
    dt.setHours(h, m, 0, 0);
    const utcTime = fromZonedTime(dt, timezone);
    return utcTime.toISOString();
  };
  const buildEndISODateTime = (date: Date | undefined, time: string, durationMinutes: number): string => {
    if (!date) return "";
    const endDateTime = calculateEndDateTime(date, time, durationMinutes);
    const utcTime = fromZonedTime(endDateTime, timezone);
    return utcTime.toISOString();
  };
  const createTeamsMeeting = async () => {
    if (!formData.subject || !startDate) {
      toast({
        title: "Missing fields",
        description: "Please fill in meeting title and date/time",
        variant: "destructive"
      });
      return;
    }
    setCreatingTeamsMeeting(true);
    try {
      const attendees: {
        email: string;
        name: string;
      }[] = [];
      if (linkType === 'lead' && formData.lead_id) {
        const lead = leads.find(l => l.id === formData.lead_id);
        if (lead?.email) {
          attendees.push({
            email: lead.email,
            name: lead.lead_name
          });
        }
      } else if (linkType === 'contact' && formData.contact_id) {
        const contact = contacts.find(c => c.id === formData.contact_id);
        if (contact?.email) {
          attendees.push({
            email: contact.email,
            name: contact.contact_name
          });
        }
      }
      participants.forEach(email => {
        if (email && !attendees.some(a => a.email === email)) {
          attendees.push({
            email,
            name: email.split('@')[0]
          });
        }
      });
      const {
        data,
        error
      } = await supabase.functions.invoke('create-teams-meeting', {
        body: {
          subject: formData.subject,
          attendees,
          startTime: buildISODateTime(startDate, startTime),
          endTime: buildEndISODateTime(startDate, startTime, parseInt(duration)),
          timezone,
          description: formData.description
        }
      });
      if (error) throw error;
      if (data?.meeting?.joinUrl) {
        setFormData(prev => ({
          ...prev,
          join_url: data.meeting.joinUrl
        }));
        toast({
          title: "Teams Meeting Created",
          description: "Meeting link has been generated"
        });
        return data.meeting.joinUrl;
      }
      return null;
    } catch (error: any) {
      console.error('Error creating Teams meeting:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create Teams meeting",
        variant: "destructive"
      });
      return null;
    } finally {
      setCreatingTeamsMeeting(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent, joinUrlOverride?: string | null) => {
    e.preventDefault();
    if (!formData.subject || !startDate) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate: must have related record or participants
    const hasRelatedRecord = linkType === 'lead' && formData.lead_id || linkType === 'contact' && formData.contact_id;
    if (!hasRelatedRecord && participants.length === 0) {
      toast({
        title: "Missing attendees",
        description: "Please select a Lead/Contact or add external participants",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const meetingData = {
        subject: formData.subject,
        description: formData.description || null,
        start_time: buildISODateTime(startDate, startTime),
        end_time: buildEndISODateTime(startDate, startTime, parseInt(duration)),
        join_url: joinUrlOverride || formData.join_url || null,
        lead_id: linkType === 'lead' && formData.lead_id && formData.lead_id.trim() !== "" ? formData.lead_id : null,
        contact_id: linkType === 'contact' && formData.contact_id && formData.contact_id.trim() !== "" ? formData.contact_id : null,
        attendees: participants.length > 0 ? participants.map(email => ({
          email,
          name: email.split('@')[0]
        })) : null,
        status: formData.status,
        outcome: formData.outcome || null,
        created_by: user?.id
      };
      const isUpdate = meeting?.id && meeting.id.trim() !== '';
      if (isUpdate) {
        const {
          error
        } = await supabase.from('meetings').update(meetingData).eq('id', meeting.id);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Meeting updated successfully"
        });
      } else {
        const {
          error
        } = await supabase.from('meetings').insert([meetingData]);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Meeting created successfully"
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving meeting:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save meeting",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleCancelMeeting = async () => {
    if (!meeting?.id || !meeting?.join_url) {
      toast({
        title: "Cannot cancel",
        description: "No Teams meeting link found for this meeting",
        variant: "destructive"
      });
      return;
    }
    setCancellingMeeting(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('cancel-teams-meeting', {
        body: {
          meetingId: meeting.id,
          joinUrl: meeting.join_url
        }
      });
      if (error) throw error;
      const {
        error: updateError
      } = await supabase.from('meetings').update({
        status: 'cancelled'
      }).eq('id', meeting.id);
      if (updateError) throw updateError;
      toast({
        title: "Meeting Cancelled",
        description: "The Teams meeting has been cancelled"
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error cancelling meeting:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel meeting",
        variant: "destructive"
      });
    } finally {
      setCancellingMeeting(false);
    }
  };
  const formatDisplayTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };
  const addParticipant = () => {
    const email = emailInput.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !participants.includes(email)) {
      setParticipants(prev => [...prev, email]);
      setEmailInput("");
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
    }
  };
  const selectedTimezone = TIMEZONES.find(tz => tz.value === timezone);
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-5">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-base font-semibold">{meeting ? "Edit Meeting" : "New Meeting"}</DialogTitle>
          <DialogDescription className="sr-only">Schedule a meeting with participants</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Meeting Title */}
          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-xs font-medium">Meeting Title *</Label>
            <Input id="subject" value={formData.subject} onChange={e => setFormData(prev => ({
            ...prev,
            subject: e.target.value
          }))} placeholder="Enter meeting title" className="h-8 text-sm" required />
          </div>

          {/* Organizer Info */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Meeting Organizer</Label>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You'}
              {user?.email && <span className="text-muted-foreground/60">({user.email})</span>}
            </div>
          </div>

          {/* Timezone, Date, Time & Duration Row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Timezone</Label>
              <TooltipProvider>
                <Popover open={tzPopoverOpen} onOpenChange={setTzPopoverOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-8 justify-start text-left font-normal text-xs gap-1.5">
                          
                          <span className="truncate">{selectedTimezone?.short || timezone}</span>
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{selectedTimezone?.label || timezone}</p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-72 p-0" align="start">
                    <div ref={tzListRef} className="max-h-60 overflow-y-auto overscroll-contain pointer-events-auto p-1" onWheelCapture={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
                      {TIMEZONES.map(tz => <Button key={tz.value} data-tz={tz.value} variant={timezone === tz.value ? "secondary" : "ghost"} className="w-full justify-start text-xs h-7 font-normal" onClick={() => handleTimezoneChange(tz.value)}>
                          {tz.label}
                        </Button>)}
                    </div>
                  </PopoverContent>
                </Popover>
              </TooltipProvider>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full h-8 justify-start text-left font-normal text-xs", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {startDate ? format(startDate, "dd MMM") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={date => date < todayInTimezone} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Time *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-8 justify-start text-left font-normal text-xs">
                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                    {formatDisplayTime(startTime)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-28 p-1 z-50 max-h-48 overflow-y-auto" align="start">
                  {availableStartTimeSlots.length > 0 ? availableStartTimeSlots.map(slot => <Button key={slot} variant={startTime === slot ? "secondary" : "ghost"} className="w-full justify-start text-xs h-7" onClick={() => setStartTime(slot)}>
                        {formatDisplayTime(slot)}
                      </Button>) : <p className="text-xs text-muted-foreground p-2">No times available</p>}
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Duration *</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conflict Warning */}
          {proposedStartTime && proposedEndTime && <MeetingConflictWarning startTime={proposedStartTime} endTime={proposedEndTime} excludeMeetingId={meeting?.id} />}

          {/* Related To */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Related To *</Label>
              <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => setShowParticipantsInput(!showParticipantsInput)}>
                <Plus className="h-3 w-3" />
                Add Participants
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded p-0.5 shrink-0">
                <Button type="button" variant={linkType === 'lead' ? 'secondary' : 'ghost'} size="sm" onClick={() => {
                setLinkType('lead');
                setFormData(prev => ({
                  ...prev,
                  contact_id: ''
                }));
              }} className="h-6 px-2.5 text-xs">
                  Lead
                </Button>
                <Button type="button" variant={linkType === 'contact' ? 'secondary' : 'ghost'} size="sm" onClick={() => {
                setLinkType('contact');
                setFormData(prev => ({
                  ...prev,
                  lead_id: ''
                }));
              }} className="h-6 px-2.5 text-xs">
                  Contact
                </Button>
              </div>
              
              <div className="flex-1">
                {linkType === 'lead' ? <Select value={formData.lead_id} onValueChange={value => setFormData(prev => ({
                ...prev,
                lead_id: value === "none" ? "" : value
              }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select a lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      {leads.map(lead => <SelectItem key={lead.id} value={lead.id} className="text-xs">
                          {lead.lead_name}{lead.email ? ` (${lead.email})` : ''}
                        </SelectItem>)}
                    </SelectContent>
                  </Select> : <Select value={formData.contact_id} onValueChange={value => setFormData(prev => ({
                ...prev,
                contact_id: value === "none" ? "" : value
              }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select a contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      {contacts.map(contact => <SelectItem key={contact.id} value={contact.id} className="text-xs">
                          {contact.contact_name}{contact.email ? ` (${contact.email})` : ''}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>}
              </div>
            </div>
          </div>

          {/* Participants - Collapsible */}
          {showParticipantsInput && <div className="space-y-1.5 border-l-2 border-muted pl-3">
              <Label className="text-xs font-medium">External Participants</Label>
              <div className="flex gap-1.5">
                <Input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="email@example.com" className="h-7 text-xs" onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addParticipant();
              }
            }} />
                <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={addParticipant}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {participants.length > 0 && <div className="flex flex-wrap gap-1">
                  {participants.map((email, index) => <Badge key={index} variant="secondary" className="gap-0.5 pr-0.5 text-xs h-5">
                      {email}
                      <button type="button" onClick={() => setParticipants(prev => prev.filter((_, i) => i !== index))} className="ml-0.5 hover:bg-muted-foreground/20 rounded-full p-0.5">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>)}
                </div>}
            </div>}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium">Agenda</Label>
            <Textarea id="description" value={formData.description} onChange={e => setFormData(prev => ({
            ...prev,
            description: e.target.value
          }))} placeholder="Meeting agenda..." rows={2} className="text-xs resize-none min-h-[60px]" />
          </div>

          {/* Outcome - only for existing meetings */}
          {meeting && <MeetingOutcomeSelect value={formData.outcome} onChange={value => setFormData(prev => ({
          ...prev,
          outcome: value
        }))} />}

          {/* Actions */}
          <div className="flex justify-between items-center gap-2 pt-3 border-t">
            <div>
              {meeting && meeting.join_url && <Button type="button" variant="destructive" size="sm" disabled={cancellingMeeting || loading} onClick={handleCancelMeeting} className="gap-1 h-8 text-xs">
                  {cancellingMeeting ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                  {cancellingMeeting ? "Cancelling..." : "Cancel"}
                </Button>}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button type="button" size="sm" className="gap-1 h-8 text-xs" disabled={loading || creatingTeamsMeeting || cancellingMeeting} onClick={async e => {
              e.preventDefault();
              if (!formData.subject || !startDate) {
                toast({
                  title: "Missing fields",
                  description: "Please fill in meeting title and date/time",
                  variant: "destructive"
                });
                return;
              }
              let joinUrl = formData.join_url;
              if (!joinUrl) {
                joinUrl = await createTeamsMeeting();
              }
              const fakeEvent = {
                preventDefault: () => {}
              } as React.FormEvent;
              await handleSubmit(fakeEvent, joinUrl);
            }}>
                {loading || creatingTeamsMeeting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Video className="h-3 w-3" />}
                {loading ? "Saving..." : creatingTeamsMeeting ? "Creating..." : meeting ? "Update" : "Create Meeting"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
};