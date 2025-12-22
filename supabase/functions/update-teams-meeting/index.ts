import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Attendee {
  email: string;
  name?: string;
}

interface UpdateRequest {
  meetingId?: string;
  joinUrl: string;
  subject?: string;
  attendees?: Attendee[];
  startTime?: string;
  endTime?: string;
  timezone?: string;
  description?: string;
}

async function getAccessToken(): Promise<string> {
  const tenantId = Deno.env.get("AZURE_TEAMS_TENANT_ID");
  const clientId = Deno.env.get("AZURE_TEAMS_CLIENT_ID");
  const clientSecret = Deno.env.get("AZURE_TEAMS_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Missing Azure Teams credentials. Please configure AZURE_TEAMS_TENANT_ID, AZURE_TEAMS_CLIENT_ID, and AZURE_TEAMS_CLIENT_SECRET."
    );
  }

  console.log("Fetching access token from Azure AD...");

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("grant_type", "client_credentials");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Azure AD token error:", data);
    throw new Error(data.error_description || "Failed to get access token from Azure AD");
  }

  console.log("Successfully obtained access token");
  return data.access_token;
}

async function getUserId(accessToken: string, email: string): Promise<string> {
  const userResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!userResponse.ok) {
    const errorData = await userResponse.json();
    console.error("Failed to fetch user by email:", errorData);
    throw new Error(`Cannot find user in Azure AD: ${email}`);
  }

  const userData = await userResponse.json();
  console.log("Found user ID:", userData.id);
  return userData.id;
}

function extractMeetingId(url: string): string | null {
  const match = url.match(/19:meeting_([a-z0-9-]+)@thread\.v2/i);
  if (match) return match[1].toLowerCase();
  return null;
}

function normalizeUrl(url: string): string {
  try {
    return decodeURIComponent(url).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

async function findCalendarEventId(accessToken: string, userId: string, joinUrl: string): Promise<string | null> {
  const normalizedTargetUrl = normalizeUrl(joinUrl);
  const targetMeetingId = extractMeetingId(normalizedTargetUrl);

  console.log("Searching for calendar event to update", {
    targetMeetingId,
    joinUrl: normalizedTargetUrl,
  });

  // Wide search window to handle reschedules (event may still be at old time)
  const now = new Date();
  const startDateTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDateTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const eventsResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userId}/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$top=100&$select=id,subject,onlineMeeting,isOnlineMeeting`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: 'outlook.timezone="UTC"',
      },
    }
  );

  if (!eventsResponse.ok) {
    const errorData = await eventsResponse.json();
    console.error("Failed to fetch calendar events:", errorData);
    return null;
  }

  const eventsData = await eventsResponse.json();
  const events = eventsData.value || [];
  console.log(`Scanning ${events.length} events for matching join URL...`);

  for (const event of events) {
    const eventJoinUrl = event.onlineMeeting?.joinUrl;
    if (!eventJoinUrl) continue;

    const normalizedEventUrl = normalizeUrl(eventJoinUrl);
    const eventMeetingId = extractMeetingId(normalizedEventUrl);

    // Prefer meeting-id comparison, fallback to URL includes
    const isMatch =
      (targetMeetingId && eventMeetingId && targetMeetingId === eventMeetingId) ||
      normalizedEventUrl === normalizedTargetUrl ||
      normalizedEventUrl.includes(normalizedTargetUrl) ||
      normalizedTargetUrl.includes(normalizedEventUrl);

    if (isMatch) {
      console.log("Matched event:", { id: event.id, subject: event.subject });
      return event.id;
    }
  }

  console.warn("No matching calendar event found for joinUrl");
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: UpdateRequest = await req.json();

    if (!body.joinUrl) {
      return new Response(JSON.stringify({ error: "Missing required field: joinUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Updating Teams calendar event", {
      meetingId: body.meetingId,
      subject: body.subject,
      hasAttendees: !!body.attendees?.length,
      startTime: body.startTime,
      endTime: body.endTime,
      timezone: body.timezone,
    });

    const accessToken = await getAccessToken();
    const organizerEmail = user.email!;
    const userId = await getUserId(accessToken, organizerEmail);

    const eventId = await findCalendarEventId(accessToken, userId, body.joinUrl);
    if (!eventId) {
      return new Response(
        JSON.stringify({
          error: "Could not find the corresponding calendar event to update.",
          details: "Make sure the meeting was created via this app (calendar event exists) and the organizer matches.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patch: Record<string, any> = {};

    if (body.subject) patch.subject = body.subject;

    if (body.startTime) {
      patch.start = { dateTime: body.startTime, timeZone: body.timezone || "UTC" };
    }

    if (body.endTime) {
      patch.end = { dateTime: body.endTime, timeZone: body.timezone || "UTC" };
    }

    if (typeof body.description === "string") {
      patch.body = {
        contentType: "HTML",
        content: `${body.description || ""}<br><br><b>Join Microsoft Teams Meeting</b><br><a href="${body.joinUrl}">${body.joinUrl}</a>`,
      };
    }

    if (body.attendees) {
      patch.attendees = body.attendees.map((a) => ({
        emailAddress: { address: a.email, name: a.name || a.email },
        type: "required",
      }));
    }

    if (Object.keys(patch).length === 0) {
      return new Response(JSON.stringify({ error: "Nothing to update" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Patching event", { eventId, patchKeys: Object.keys(patch) });

    const updateResponse = await fetch(
      `https://graph.microsoft.com/v1.0/users/${userId}/events/${eventId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error("Failed to update calendar event:", errorText);
      return new Response(JSON.stringify({ error: "Failed to update Teams calendar event", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log security event
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    try {
      await adminClient.rpc("log_security_event", {
        p_action: "TEAMS_MEETING_UPDATED",
        p_resource_type: "meeting",
        p_resource_id: body.meetingId ?? null,
        p_details: {
          meeting_id: body.meetingId,
          event_id: eventId,
          updated_fields: Object.keys(patch),
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (logError) {
      console.warn("Failed to log security event:", logError);
    }

    return new Response(
      JSON.stringify({ success: true, eventId, message: "Calendar event updated" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error updating Teams meeting:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
