import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CancelRequest {
  meetingId: string;
  joinUrl: string;
}

async function getAccessToken(): Promise<string> {
  const tenantId = Deno.env.get('AZURE_TEAMS_TENANT_ID');
  const clientId = Deno.env.get('AZURE_TEAMS_CLIENT_ID');
  const clientSecret = Deno.env.get('AZURE_TEAMS_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing Azure Teams credentials.');
  }

  console.log('Fetching access token from Azure AD...');
  
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('grant_type', 'client_credentials');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Azure AD token error:', data);
    throw new Error(data.error_description || 'Failed to get access token');
  }

  console.log('Successfully obtained access token');
  return data.access_token;
}

async function getUserId(accessToken: string, email: string): Promise<string> {
  const userResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!userResponse.ok) {
    const errorData = await userResponse.json();
    console.error('Failed to fetch user:', errorData);
    throw new Error(`Cannot find user in Azure AD: ${email}`);
  }

  const userData = await userResponse.json();
  console.log('Found user ID:', userData.id);
  return userData.id;
}

async function cancelCalendarEvents(accessToken: string, userId: string, joinUrl: string): Promise<boolean> {
  console.log('Searching for calendar events with join URL:', joinUrl);
  
  // Normalize the join URL by decoding it for comparison
  const normalizeUrl = (url: string): string => {
    try {
      return decodeURIComponent(url).toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  };
  
  const normalizedTargetUrl = normalizeUrl(joinUrl);
  console.log('Normalized target URL:', normalizedTargetUrl);
  
  // Search for calendar events - limited time range for better performance
  const now = new Date();
  const startDateTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
  const endDateTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead
  
  const eventsResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userId}/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$top=50&$select=id,subject,onlineMeeting,isOnlineMeeting,body`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'outlook.timezone="UTC"'
      },
    }
  );

  if (!eventsResponse.ok) {
    const errorData = await eventsResponse.json();
    console.error('Failed to fetch calendar events:', errorData);
    return false;
  }

  const eventsData = await eventsResponse.json();
  console.log(`Found ${eventsData.value?.length || 0} calendar events to search`);
  
  let cancelledCount = 0;
  
  for (const event of eventsData.value || []) {
    const eventJoinUrl = event.onlineMeeting?.joinUrl;
    
    if (!eventJoinUrl) {
      continue;
    }
    
    const normalizedEventUrl = normalizeUrl(eventJoinUrl);
    
    // Compare normalized URLs or check if one contains the key meeting identifier
    const targetMeetingId = extractMeetingId(normalizedTargetUrl);
    const eventMeetingId = extractMeetingId(normalizedEventUrl);
    
    console.log(`Comparing event "${event.subject}": targetMeetingId=${targetMeetingId}, eventMeetingId=${eventMeetingId}`);
    
    if (targetMeetingId && eventMeetingId && targetMeetingId === eventMeetingId) {
      console.log('Found matching calendar event:', event.id, event.subject);
      
      // Cancel/Delete the calendar event
      const deleteResponse = await fetch(
        `https://graph.microsoft.com/v1.0/users/${userId}/events/${event.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      if (deleteResponse.ok || deleteResponse.status === 204) {
        console.log('Successfully deleted calendar event:', event.id);
        cancelledCount++;
        // Only delete ONE matching event
        break;
      } else {
        const deleteError = await deleteResponse.text();
        console.error('Failed to delete calendar event:', deleteError);
      }
    }
  }
  
  console.log(`Cancelled ${cancelledCount} calendar event(s)`);
  return cancelledCount > 0;
}

// Extract the unique meeting ID from a Teams join URL
function extractMeetingId(url: string): string | null {
  // Teams meeting URLs contain a meeting ID like: 19:meeting_xxxxx@thread.v2
  const match = url.match(/19:meeting_([a-z0-9-]+)@thread\.v2/i);
  if (match) {
    return match[1].toLowerCase();
  }
  return null;
}

async function deleteOnlineMeeting(accessToken: string, userId: string, joinUrl: string): Promise<boolean> {
  console.log('Attempting to delete online meeting...');
  
  // Extract meeting ID from join URL if possible
  // Teams meeting join URLs typically contain the meeting ID
  // Format: https://teams.microsoft.com/l/meetup-join/...
  
  // First, try to find the meeting by listing online meetings
  const meetingsResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userId}/onlineMeetings?$filter=joinWebUrl eq '${encodeURIComponent(joinUrl)}'`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (meetingsResponse.ok) {
    const meetingsData = await meetingsResponse.json();
    console.log('Online meetings search result:', meetingsData.value?.length || 0);
    
    if (meetingsData.value && meetingsData.value.length > 0) {
      const onlineMeeting = meetingsData.value[0];
      console.log('Found online meeting:', onlineMeeting.id);
      
      // Delete the online meeting
      const deleteResponse = await fetch(
        `https://graph.microsoft.com/v1.0/users/${userId}/onlineMeetings/${onlineMeeting.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      if (deleteResponse.ok || deleteResponse.status === 204) {
        console.log('Successfully deleted online meeting');
        return true;
      } else {
        const deleteError = await deleteResponse.text();
        console.error('Failed to delete online meeting:', deleteError);
      }
    }
  } else {
    const errorData = await meetingsResponse.json();
    console.log('Could not search online meetings (may not support filtering):', errorData);
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.email);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { meetingId, joinUrl }: CancelRequest = await req.json();

    if (!meetingId || !joinUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: meetingId, joinUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Cancelling Teams meeting:', { meetingId, joinUrl });

    const accessToken = await getAccessToken();
    const organizerEmail = user.email!;
    const userId = await getUserId(accessToken, organizerEmail);

    // Try to delete the online meeting
    const onlineMeetingDeleted = await deleteOnlineMeeting(accessToken, userId, joinUrl);
    
    // Cancel/delete calendar events with this meeting link
    const calendarEventsCancelled = await cancelCalendarEvents(accessToken, userId, joinUrl);

    // Log the cancellation
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
      await adminClient.rpc('log_security_event', {
        p_action: 'TEAMS_MEETING_CANCELLED',
        p_resource_type: 'meeting',
        p_resource_id: meetingId,
        p_details: {
          meeting_id: meetingId,
          join_url: joinUrl,
          online_meeting_deleted: onlineMeetingDeleted,
          calendar_events_cancelled: calendarEventsCancelled,
          cancelled_by: user.id,
          cancelled_at: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.warn('Failed to log security event:', logError);
    }

    console.log('Meeting cancellation completed:', { onlineMeetingDeleted, calendarEventsCancelled });

    return new Response(
      JSON.stringify({ 
        success: true,
        onlineMeetingDeleted,
        calendarEventsCancelled,
        message: 'Meeting cancelled successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error cancelling Teams meeting:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
