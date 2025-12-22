import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailAttachment {
  name: string;
  contentType: string;
  contentBytes: string; // Base64 encoded
}

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  toName?: string;
  from: string;
  attachments?: EmailAttachment[];
}

async function getAccessToken(): Promise<string> {
  // Use email-specific Azure credentials
  const tenantId = Deno.env.get("AZURE_EMAIL_TENANT_ID");
  const clientId = Deno.env.get("AZURE_EMAIL_CLIENT_ID");
  const clientSecret = Deno.env.get("AZURE_EMAIL_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Azure email credentials not configured. Please set AZURE_EMAIL_TENANT_ID, AZURE_EMAIL_CLIENT_ID, and AZURE_EMAIL_CLIENT_SECRET.");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("grant_type", "client_credentials");

  console.log("Requesting access token from Azure AD...");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to get access token:", errorText);
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log("Successfully obtained access token");
  return data.access_token as string;
}

async function sendEmail(accessToken: string, emailRequest: EmailRequest): Promise<void> {
  const graphUrl = `https://graph.microsoft.com/v1.0/users/${emailRequest.from}/sendMail`;

  // Build attachments array for Microsoft Graph API
  const attachments = emailRequest.attachments?.map(att => ({
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: att.name,
    contentType: att.contentType,
    contentBytes: att.contentBytes,
  })) || [];

  const emailPayload: any = {
    message: {
      subject: emailRequest.subject,
      body: {
        contentType: "Text",
        content: emailRequest.body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: emailRequest.to,
            name: emailRequest.toName || emailRequest.to,
          },
        },
      ],
    },
    saveToSentItems: true,
  };

  // Add attachments if present
  if (attachments.length > 0) {
    emailPayload.message.attachments = attachments;
    console.log(`Adding ${attachments.length} attachment(s) to email`);
  }

  console.log(`Sending email to ${emailRequest.to}...`);

  const response = await fetch(graphUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to send email:", errorText);
    throw new Error(`Failed to send email: ${response.status} ${errorText}`);
  }

  console.log("Email sent successfully");
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, toName, from, attachments }: EmailRequest = await req.json();

    if (!to || !subject || !from) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, from" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Processing email request from ${from} to: ${to}${attachments?.length ? ` with ${attachments.length} attachment(s)` : ''}`);

    // Get access token from Azure AD
    const accessToken = await getAccessToken();

    // Send email via Microsoft Graph API
    await sendEmail(accessToken, { to, subject, body, toName, from, attachments });

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
