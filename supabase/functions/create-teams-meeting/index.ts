import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Attendee {
  email: string;
  name: string;
}

interface MeetingRequest {
  subject: string;
  attendees: Attendee[];
  startTime: string;
  endTime: string;
  timezone?: string;
  description?: string;
}

async function getAccessToken(): Promise<string> {
  const tenantId = Deno.env.get('AZURE_TEAMS_TENANT_ID');
  const clientId = Deno.env.get('AZURE_TEAMS_CLIENT_ID');
  const clientSecret = Deno.env.get('AZURE_TEAMS_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing Azure Teams credentials. Please configure AZURE_TEAMS_TENANT_ID, AZURE_TEAMS_CLIENT_ID, and AZURE_TEAMS_CLIENT_SECRET.');
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
    throw new Error(data.error_description || 'Failed to get access token from Azure AD');
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
    console.error('Failed to fetch user by email:', errorData);
    throw new Error(
      `Cannot find user in Azure AD: ${email}. ` +
      `Please ensure the Azure App has User.Read.All permission with admin consent, ` +
      `or the user exists in your Azure AD tenant.`
    );
  }

  const userData = await userResponse.json();
  console.log('Found user ID:', userData.id);
  return userData.id;
}

async function createOnlineMeeting(accessToken: string, meetingRequest: MeetingRequest, organizerUserId: string): Promise<any> {
  console.log('Creating Teams online meeting via Microsoft Graph API...');
  
  // Build participants list for the online meeting
  const meetingParticipants = meetingRequest.attendees.map(attendee => ({
    upn: attendee.email,
    identity: {
      user: {
        displayName: attendee.name || attendee.email
      }
    }
  }));

  console.log('Meeting participants:', JSON.stringify(meetingParticipants, null, 2));
  
  const meetingBody: Record<string, any> = {
    startDateTime: meetingRequest.startTime,
    endDateTime: meetingRequest.endTime,
    subject: meetingRequest.subject,
    lobbyBypassSettings: {
      scope: 'everyone',
      isDialInBypassEnabled: true
    },
    allowedPresenters: 'everyone',
    // Add participants to the online meeting
    participants: {
      attendees: meetingParticipants.map(p => ({
        upn: p.upn,
        role: 'attendee'
      }))
    }
  };

  if (meetingRequest.timezone) {
    console.log('Meeting timezone:', meetingRequest.timezone);
  }

  console.log('Online meeting request body:', JSON.stringify(meetingBody, null, 2));

  const meetingResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${organizerUserId}/onlineMeetings`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetingBody),
    }
  );

  const meetingData = await meetingResponse.json();

  if (!meetingResponse.ok) {
    console.error('Graph API error creating online meeting:', meetingData);
    
    if (meetingData.error?.code === 'AuthenticationError') {
      throw new Error(
        'Authentication error with Microsoft Graph. ' +
        'Please ensure the Azure App has OnlineMeetings.ReadWrite.All permission with admin consent.'
      );
    }
    
    if (meetingData.error?.code === 'ResourceNotFound') {
      throw new Error(
        `User does not have a Teams license or is not enabled for online meetings.`
      );
    }
    
    throw new Error(meetingData.error?.message || 'Failed to create Teams online meeting');
  }

  console.log('Teams online meeting created successfully:', meetingData.id);
  console.log('Meeting participants from response:', JSON.stringify(meetingData.participants, null, 2));
  
  return {
    id: meetingData.id,
    joinUrl: meetingData.joinWebUrl,
    joinInformation: meetingData.joinInformation,
    subject: meetingData.subject,
    startDateTime: meetingData.startDateTime,
    endDateTime: meetingData.endDateTime,
    participants: meetingData.participants,
  };
}

async function createCalendarEvent(
  accessToken: string, 
  meetingRequest: MeetingRequest, 
  organizerUserId: string, 
  onlineMeeting: any
): Promise<any> {
  console.log('Creating calendar event via Microsoft Graph API...');
  
  // Build attendees list for calendar event
  const calendarAttendees = meetingRequest.attendees.map(attendee => ({
    emailAddress: {
      address: attendee.email,
      name: attendee.name || attendee.email
    },
    type: 'required'
  }));

  // Build event body with Teams meeting link
  const eventBody: Record<string, any> = {
    subject: meetingRequest.subject,
    body: {
      contentType: 'HTML',
      content: `${meetingRequest.description || ''}<br><br>
        <b>Join Microsoft Teams Meeting</b><br>
        <a href="${onlineMeeting.joinUrl}">${onlineMeeting.joinUrl}</a>`
    },
    start: {
      dateTime: meetingRequest.startTime,
      timeZone: meetingRequest.timezone || 'UTC'
    },
    end: {
      dateTime: meetingRequest.endTime,
      timeZone: meetingRequest.timezone || 'UTC'
    },
    attendees: calendarAttendees,
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness',
    onlineMeeting: {
      joinUrl: onlineMeeting.joinUrl
    }
  };

  console.log('Calendar event request body:', JSON.stringify(eventBody, null, 2));

  const eventResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${organizerUserId}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    }
  );

  const eventData = await eventResponse.json();

  if (!eventResponse.ok) {
    console.error('Graph API error creating calendar event:', eventData);
    
    if (eventData.error?.code === 'AuthenticationError') {
      throw new Error(
        'Authentication error with Microsoft Graph. ' +
        'Please ensure the Azure App has Calendars.ReadWrite permission with admin consent.'
      );
    }
    
    throw new Error(eventData.error?.message || 'Failed to create calendar event');
  }

  console.log('Calendar event created successfully:', eventData.id);
  
  return {
    id: eventData.id,
    webLink: eventData.webLink,
    subject: eventData.subject,
    startDateTime: eventData.start?.dateTime,
    endDateTime: eventData.end?.dateTime,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
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

    const { subject, attendees, startTime, endTime, timezone, description }: MeetingRequest = await req.json();

    if (!subject || !attendees || !startTime || !endTime) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subject, attendees, startTime, endTime' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating Teams meeting:', { subject, attendeesCount: attendees.length, startTime, endTime, timezone });

    // Get Azure AD access token
    const accessToken = await getAccessToken();

    // Use the authenticated user's email as the organizer
    const organizerEmail = user.email!;
    
    // Get the organizer's user ID from Azure AD
    const organizerUserId = await getUserId(accessToken, organizerEmail);

    // Step 1: Create the Teams online meeting
    const onlineMeeting = await createOnlineMeeting(accessToken, { subject, attendees, startTime, endTime, timezone }, organizerUserId);

    // Step 2: Create a calendar event with the Teams meeting link
    let calendarEvent = null;
    try {
      calendarEvent = await createCalendarEvent(
        accessToken, 
        { subject, attendees, startTime, endTime, timezone, description }, 
        organizerUserId, 
        onlineMeeting
      );
      console.log('Calendar event created and meeting will appear in Teams calendar');
    } catch (calendarError: any) {
      console.warn('Failed to create calendar event (meeting link still works):', calendarError.message);
      // Don't fail the entire request if calendar creation fails
      // The online meeting link is still valid
    }

    // Log the meeting creation for security audit
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
      await adminClient.rpc('log_security_event', {
        p_action: 'TEAMS_MEETING_CREATED',
        p_resource_type: 'meeting',
        p_details: {
          meeting_id: onlineMeeting.id,
          calendar_event_id: calendarEvent?.id,
          subject,
          attendee_count: attendees.length,
          created_by: user.id,
          join_url: onlineMeeting.joinUrl,
          created_at: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.warn('Failed to log security event:', logError);
    }

    console.log('Teams meeting created successfully:', onlineMeeting.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        meeting: onlineMeeting,
        calendarEvent,
        message: calendarEvent 
          ? 'Teams meeting created and added to calendar' 
          : 'Teams meeting created (calendar event may not have been created)'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error creating Teams meeting:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
