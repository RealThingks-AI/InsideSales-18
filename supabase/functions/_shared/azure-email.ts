// Shared Microsoft Graph email sending utility

export interface AzureEmailConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  senderEmail: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  graphMessageId?: string;
  internetMessageId?: string;
  conversationId?: string;
  sentAsUser?: boolean;
}

export function getAzureEmailConfig(): AzureEmailConfig | null {
  const tenantId = Deno.env.get("AZURE_EMAIL_TENANT_ID") || Deno.env.get("AZURE_TENANT_ID");
  const clientId = Deno.env.get("AZURE_EMAIL_CLIENT_ID") || Deno.env.get("AZURE_CLIENT_ID");
  const clientSecret = Deno.env.get("AZURE_EMAIL_CLIENT_SECRET") || Deno.env.get("AZURE_CLIENT_SECRET");
  const senderEmail = Deno.env.get("AZURE_SENDER_EMAIL");

  if (!tenantId || !clientId || !clientSecret || !senderEmail) {
    return null;
  }

  return { tenantId, clientId, clientSecret, senderEmail };
}

export async function getGraphAccessToken(config: AzureEmailConfig): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  const data = await resp.json();
  if (!data.access_token) {
    const errMsg = data.error_description || data.error || "Unknown token error";
    throw new Error(`Azure token error: ${errMsg}`);
  }
  return data.access_token;
}

/**
 * Send email via Graph sendMail API on the shared mailbox.
 * Attempts to set the `from` address to the logged-in user's email.
 * If that fails with ErrorSendAsDenied, retries without `from` (sends as shared mailbox).
 * After sending, queries Sent Items to retrieve conversationId/internetMessageId.
 */
export async function sendEmailViaGraph(
  accessToken: string,
  senderEmail: string,
  recipientEmail: string,
  recipientName: string,
  subject: string,
  htmlBody: string,
  fromEmail?: string,
  replyToInternetMessageId?: string,
): Promise<SendEmailResult> {
  const sendUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;

  // Build message payload
  const message: Record<string, unknown> = {
    subject,
    body: { contentType: "HTML", content: htmlBody },
    toRecipients: [{ emailAddress: { address: recipientEmail, name: recipientName } }],
  };

  // Add In-Reply-To / References headers for proper threading
  if (replyToInternetMessageId) {
    message.internetMessageHeaders = [
      { name: "In-Reply-To", value: replyToInternetMessageId },
      { name: "References", value: replyToInternetMessageId },
    ];
  }

  // Try sending with "from" set to the user's email first
  const wantFrom = fromEmail && fromEmail.toLowerCase() !== senderEmail.toLowerCase();
  let sentAsUser = false;

  if (wantFrom) {
    message.from = { emailAddress: { address: fromEmail } };
  }

  let sendResp = await fetch(sendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });

  // If ErrorSendAsDenied, retry without the from field
  if (!sendResp.ok && wantFrom) {
    const errBody = await sendResp.text();
    let errorCode = "";
    try {
      const parsed = JSON.parse(errBody);
      errorCode = parsed?.error?.code || "";
    } catch { /* ignore */ }

    if (errorCode === "ErrorSendAsDenied" || errorCode === "ErrorSendOnBehalfOfDenied") {
      console.warn(`Send-as denied for ${fromEmail}, retrying as shared mailbox ${senderEmail}`);
      delete message.from;

      sendResp = await fetch(sendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, saveToSentItems: true }),
      });
    }
  }

  if (!sendResp.ok) {
    const errBody = await sendResp.text();
    let errorCode = "SEND_FAILED";
    try {
      const parsed = JSON.parse(errBody);
      errorCode = parsed?.error?.code || "SEND_FAILED";
    } catch { /* ignore */ }
    console.error(`Graph sendMail failed for ${recipientEmail}: ${sendResp.status} ${errBody}`);
    return { success: false, error: errBody, errorCode };
  }

  // If we got here with from still set, user email was used
  sentAsUser = !!(wantFrom && message.from !== undefined);

  // sendMail returns 202 with empty body — consume it
  await sendResp.text();

  // Query Sent Items to retrieve message metadata for reply tracking
  await new Promise((r) => setTimeout(r, 2500));

  let graphMessageId: string | null = null;
  let internetMessageId: string | null = null;
  let conversationId: string | null = null;

  try {
    // Use a simple query: get the most recent sent item to this recipient with this subject
    const escapedSubject = subject.replace(/'/g, "''");
    const escapedRecipient = recipientEmail.replace(/'/g, "''");
    // Build filter with subject and recipient — use $search if filter is too complex
    const sentItemsUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/mailFolders/sentitems/messages?$top=5&$orderby=sentDateTime desc&$select=id,internetMessageId,conversationId,subject,toRecipients`;

    const sentResp = await fetch(sentItemsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (sentResp.ok) {
      const sentData = await sentResp.json();
      const msgs = sentData.value || [];
      // Find the matching message by subject and recipient
      const match = msgs.find((m: any) => {
        const subjectMatch = m.subject === subject;
        const recipientMatch = (m.toRecipients || []).some(
          (r: any) => r.emailAddress?.address?.toLowerCase() === recipientEmail.toLowerCase()
        );
        return subjectMatch && recipientMatch;
      }) || msgs[0]; // fallback to most recent

      if (match) {
        graphMessageId = match.id || null;
        internetMessageId = match.internetMessageId || null;
        conversationId = match.conversationId || null;
        console.log(`Retrieved sent message metadata: graphId=${graphMessageId}, internetMsgId=${internetMessageId}, convId=${conversationId}`);
      } else {
        console.warn("No sent message found in Sent Items after sendMail");
      }
    } else {
      const errText = await sentResp.text();
      console.warn(`Failed to query Sent Items: ${sentResp.status} ${errText}`);
    }
  } catch (metaErr) {
    console.warn("Error retrieving sent message metadata:", metaErr);
  }

  return {
    success: true,
    graphMessageId: graphMessageId ?? undefined,
    internetMessageId: internetMessageId ?? undefined,
    conversationId: conversationId ?? undefined,
    sentAsUser,
  };
}
