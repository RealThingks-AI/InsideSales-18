import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getAzureEmailConfig, getGraphAccessToken } from "../_shared/azure-email.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SentEmailRecord = {
  id: string;
  campaign_id: string;
  contact_id: string | null;
  account_id: string | null;
  conversation_id: string | null;
  internet_message_id: string | null;
  subject: string | null;
  owner: string | null;
  created_by: string | null;
  communication_date: string | null;
};

type TrackableEmailRecord = SentEmailRecord & {
  sender_mailbox: string;
};

async function loadSenderMaps(supabase: any, sentEmails: SentEmailRecord[]) {
  const senderByMessageId = new Map<string, string>();
  const internetMessageIds = [...new Set(sentEmails.map((email) => email.internet_message_id).filter(Boolean))] as string[];

  if (internetMessageIds.length > 0) {
    const { data: emailHistory, error } = await supabase
      .from("email_history")
      .select("internet_message_id, sender_email")
      .in("internet_message_id", internetMessageIds);

    if (error) {
      console.error("Failed to load sender emails from email_history:", error);
    } else {
      for (const record of emailHistory || []) {
        const messageId = record.internet_message_id?.trim();
        const senderEmail = record.sender_email?.trim().toLowerCase();
        if (messageId && senderEmail) {
          senderByMessageId.set(messageId, senderEmail);
        }
      }
    }
  }

  const senderByOwnerId = new Map<string, string>();
  const ownerIds = [...new Set(sentEmails.map((email) => email.owner).filter(Boolean))] as string[];

  if (ownerIds.length > 0) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select('id, "Email ID"')
      .in("id", ownerIds);

    if (error) {
      console.error("Failed to load sender emails from profiles:", error);
    } else {
      for (const profile of profiles || []) {
        const senderEmail = profile?.["Email ID"]?.trim().toLowerCase();
        if (profile?.id && senderEmail) {
          senderByOwnerId.set(profile.id, senderEmail);
        }
      }
    }
  }

  return { senderByMessageId, senderByOwnerId };
}

function resolveSenderMailbox(
  email: SentEmailRecord,
  senderByMessageId: Map<string, string>,
  senderByOwnerId: Map<string, string>,
  fallbackMailbox: string,
) {
  const senderFromHistory = email.internet_message_id ? senderByMessageId.get(email.internet_message_id) : undefined;
  const senderFromOwner = email.owner ? senderByOwnerId.get(email.owner) : undefined;

  return (senderFromHistory || senderFromOwner || fallbackMailbox).trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("MY_SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const azureConfig = getAzureEmailConfig();
    if (!azureConfig) {
      return new Response(JSON.stringify({ error: "Azure email not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken: string;
    try {
      accessToken = await getGraphAccessToken(azureConfig);
    } catch (err) {
      console.error("Failed to get Graph token for reply check:", (err as Error).message);
      return new Response(JSON.stringify({ error: "Auth failed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find sent emails from the last 7 days with a conversation_id
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: sentEmails, error: fetchErr } = await supabase
      .from("campaign_communications")
      .select("id, campaign_id, contact_id, account_id, conversation_id, internet_message_id, subject, owner, created_by, communication_date")
      .eq("communication_type", "Email")
      .eq("sent_via", "azure")
      .not("conversation_id", "is", null)
      .gte("communication_date", sevenDaysAgo)
      .order("communication_date", { ascending: false });

    if (fetchErr) {
      console.error("Failed to fetch sent emails:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sentEmails || sentEmails.length === 0) {
      return new Response(JSON.stringify({ message: "No trackable emails found", repliesFound: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { senderByMessageId, senderByOwnerId } = await loadSenderMaps(supabase, sentEmails as SentEmailRecord[]);

    const trackableEmails: TrackableEmailRecord[] = (sentEmails as SentEmailRecord[]).map((email) => ({
      ...email,
      sender_mailbox: resolveSenderMailbox(email, senderByMessageId, senderByOwnerId, azureConfig.senderEmail),
    }));

    // Group by conversation_id to avoid duplicate checks
    const conversationMap = new Map<string, TrackableEmailRecord[]>();
    for (const email of trackableEmails) {
      const convId = email.conversation_id!;
      const groupKey = `${email.sender_mailbox}::${convId}`;
      if (!conversationMap.has(groupKey)) {
        conversationMap.set(groupKey, []);
      }
      conversationMap.get(groupKey)!.push(email);
    }

    // Get all known internet_message_ids to skip already-tracked messages
    const allInternetMsgIds = new Set(
      trackableEmails.map((email) => email.internet_message_id).filter(Boolean)
    );

    // Also get all existing synced replies to avoid re-inserting
    const { data: existingSynced } = await supabase
      .from("campaign_communications")
      .select("internet_message_id")
      .eq("sent_via", "graph-sync")
      .not("internet_message_id", "is", null);

    const existingSyncedIds = new Set(
      (existingSynced || []).map(e => e.internet_message_id).filter(Boolean)
    );

    let totalRepliesFound = 0;
    const processedConversations: string[] = [];

    for (const [groupKey, emails] of conversationMap.entries()) {
      try {
        const convId = emails[0]?.conversation_id;
        const senderMailbox = emails[0]?.sender_mailbox || azureConfig.senderEmail;
        if (!convId) {
          continue;
        }

        // Query Graph for messages in this conversation from the sender's inbox
        const filter = encodeURIComponent(`conversationId eq '${convId}'`);
        const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderMailbox)}/mailFolders/inbox/messages?$filter=${filter}&$orderby=receivedDateTime desc&$top=20&$select=id,subject,from,receivedDateTime,internetMessageId,conversationId,bodyPreview`;

        const graphResp = await fetch(graphUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!graphResp.ok) {
          const errText = await graphResp.text();
          console.error(`Graph inbox query failed for ${senderMailbox}, conv ${convId}: ${graphResp.status} ${errText}`);
          continue;
        }

        const graphData = await graphResp.json();
        const inboxMessages = graphData.value || [];

        for (const msg of inboxMessages) {
          const msgInternetId = msg.internetMessageId;

          // Skip if we already know about this message
          if (!msgInternetId) continue;
          if (allInternetMsgIds.has(msgInternetId)) continue;
          if (existingSyncedIds.has(msgInternetId)) continue;

          // This is a new reply!
          const fromEmail = msg.from?.emailAddress?.address || "";
          const fromName = msg.from?.emailAddress?.name || fromEmail;
          const receivedAt = msg.receivedDateTime || new Date().toISOString();

          if (fromEmail.toLowerCase() === senderMailbox) {
            continue;
          }

          const originalEmail = [...emails].sort(
            (a, b) => new Date(b.communication_date || 0).getTime() - new Date(a.communication_date || 0).getTime(),
          )[0];

          const { error: insertErr } = await supabase
            .from("campaign_communications")
            .insert({
              campaign_id: originalEmail.campaign_id,
              contact_id: originalEmail.contact_id,
              account_id: originalEmail.account_id || null,
              communication_type: "Email",
              subject: msg.subject || `Re: ${originalEmail.subject || ""}`,
              body: msg.bodyPreview || null,
              email_status: "Replied",
              delivery_status: "received",
              sent_via: "graph-sync",
              internet_message_id: msgInternetId,
              conversation_id: convId,
              parent_id: originalEmail.id,
              owner: originalEmail.owner,
              created_by: originalEmail.created_by,
              notes: `Auto-synced reply from ${fromName} (${fromEmail}) to ${senderMailbox}`,
              communication_date: receivedAt,
            });

          if (insertErr) {
            console.error(`Failed to insert reply for conv ${convId}:`, insertErr);
            continue;
          }

          totalRepliesFound++;
          existingSyncedIds.add(msgInternetId);

          // Update original email's status to "Replied"
          await supabase
            .from("campaign_communications")
            .update({ email_status: "Replied" })
            .eq("id", originalEmail.id);

          // Update email_history reply fields
          if (originalEmail.internet_message_id) {
            const { data: historyRow } = await supabase
              .from("email_history")
              .select("reply_count")
              .eq("internet_message_id", originalEmail.internet_message_id)
              .maybeSingle();

            await supabase
              .from("email_history")
              .update({
                replied_at: receivedAt,
                last_reply_at: receivedAt,
                reply_count: (historyRow?.reply_count || 0) + 1,
              })
              .eq("internet_message_id", originalEmail.internet_message_id);
          }

          // Update campaign_contacts stage to "Responded" if rank is higher
          if (originalEmail.contact_id) {
            const { data: cc } = await supabase
              .from("campaign_contacts")
              .select("stage")
              .eq("campaign_id", originalEmail.campaign_id)
              .eq("contact_id", originalEmail.contact_id)
              .single();

            const stageRanks: Record<string, number> = {
              "Not Contacted": 0, "Email Sent": 1, "Phone Contacted": 2,
              "LinkedIn Contacted": 3, "Responded": 4, "Qualified": 5,
            };
            const currentRank = stageRanks[cc?.stage || "Not Contacted"] ?? 0;
            if (stageRanks["Responded"] > currentRank) {
              await supabase
                .from("campaign_contacts")
                .update({ stage: "Responded" })
                .eq("campaign_id", originalEmail.campaign_id)
                .eq("contact_id", originalEmail.contact_id);
            }
          }

          // Recompute account status
          if (originalEmail.account_id) {
            const { data: acContacts } = await supabase
              .from("campaign_contacts")
              .select("stage")
              .eq("campaign_id", originalEmail.campaign_id)
              .eq("account_id", originalEmail.account_id);

            let derivedStatus = "Not Contacted";
            const contacts = acContacts || [];
            if (contacts.some((c: any) => c.stage === "Qualified")) derivedStatus = "Deal Created";
            else if (contacts.some((c: any) => c.stage === "Responded")) derivedStatus = "Responded";
            else if (contacts.some((c: any) => c.stage !== "Not Contacted")) derivedStatus = "Contacted";

            await supabase
              .from("campaign_accounts")
              .update({ status: derivedStatus })
              .eq("campaign_id", originalEmail.campaign_id)
              .eq("account_id", originalEmail.account_id);
          }
        }

        processedConversations.push(groupKey);
      } catch (convErr) {
        console.error(`Error processing conversation group ${groupKey}:`, convErr);
      }
    }

    console.log(`Reply check complete: ${totalRepliesFound} new replies found across ${processedConversations.length} mailbox conversations`);

    return new Response(JSON.stringify({
      message: "Reply check complete",
      repliesFound: totalRepliesFound,
      conversationsChecked: processedConversations.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Unexpected error in check-email-replies:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
