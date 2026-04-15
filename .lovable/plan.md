
Root cause analysis:

1. Logged-in user email is not actually being used as the sender
- In `supabase/functions/send-campaign-email/index.ts`, the function still computes `fromEmail = user.email || mailboxEmail`.
- But in `supabase/functions/_shared/azure-email.ts`, the code that applies `message.from` is explicitly commented out.
- So Microsoft Graph always sends from `AZURE_SENDER_EMAIL` (`crm@realthingks.com`), regardless of the logged-in user.
- This is consistent with the earlier `ErrorSendAsDenied` failure: the current code intentionally fell back to the shared mailbox to avoid that error.

2. Reply detection is pointed at the wrong mailbox
- Outbound mail is currently sent from the shared mailbox.
- But `supabase/functions/check-email-replies/index.ts` tries to inspect the inbox of the owner/profile email first:
  - it maps `owner`/`created_by` to `profiles."Email ID"`
  - then queries `/users/{senderEmail}/mailFolders/inbox/messages`
- If the message was actually sent from `crm@realthingks.com`, replies will land in the shared mailbox thread, not necessarily the owner mailbox.
- That means reply polling can miss replies even when `conversation_id` exists.

3. Thread metadata is also fragile for manual replies
- The app’s internal reply flow (`CampaignCommunications.tsx` → `EmailComposeModal.tsx`) passes `parent_id`/`thread_id`, but the Graph send path does not add mail headers like `In-Reply-To` or `References`.
- So CRM-side threading may look grouped, while Outlook/Graph-level threading can still be inconsistent.
- Current sent-item metadata lookup only filters by subject, which is weak when multiple emails share similar subjects.

4. Your screenshot confirms the current state
- Outlook shows the sender as `CRM`, not the logged-in user.
- That matches the code path where `message.from` is not being set.
- The visible “You replied…” grouping in Outlook is mailbox-native threading, but the CRM reply sync still depends on polling the correct mailbox plus storing the right conversation/message IDs.

What needs to be built:

Phase 1 — Fix sender behavior correctly
- Restore optional `message.from` support in `_shared/azure-email.ts`.
- Keep the shared mailbox as the actual send endpoint (`/users/{sharedMailbox}/sendMail`), but set:
  - `from` to the logged-in user email
  - and, if needed, `sender` to the shared mailbox for clearer semantics
- Add graceful fallback behavior:
  - if Graph returns `ErrorSendAsDenied` / `ErrorSendOnBehalfOfDenied`, store a precise failure reason instead of silently sending from CRM
- Important: this only works after Exchange permissions are granted for the mailbox.
- Required external setup:
  - grant the relevant users or app-backed mailbox flow “Send As” or “Send on Behalf” rights for `crm@realthingks.com`
- Without that Exchange change, the app cannot legally send as the logged-in user.

Phase 2 — Fix reply detection to use the actual sending mailbox
- Update `check-email-replies/index.ts` so it checks the shared mailbox conversation first, because that is where replies currently arrive.
- Do not rely on `profiles."Email ID"` as the primary inbox source while outbound mail is still shared-mailbox based.
- Use stored send metadata to determine mailbox strategy:
  - if email was sent from shared mailbox, poll shared mailbox
  - only poll user mailbox if/when true per-user sending is enabled
- Keep deduping by `internet_message_id`.

Phase 3 — Make Outlook/Graph threading robust
- Enhance send flow to preserve proper thread linkage on replies:
  - store and reuse original `internet_message_id`
  - add `In-Reply-To` / `References` internet headers when replying
  - or switch reply sends to Graph’s native reply endpoint when replying to an existing external message
- Improve sent-item lookup after send:
  - filter by subject plus recipient and close send timestamp window, not just subject
- Store enough metadata to reliably reconnect future replies.

Phase 4 — Align CRM thread tracking with mailbox reality
- Keep `campaign_communications.conversation_id` as the primary email thread key.
- For manual CRM replies, also persist the original outbound/inbound message linkage so the UI thread and Graph thread stay aligned.
- Ensure reply-synced messages update original communication status and contact/account stage exactly once.

Files to update:
- `supabase/functions/_shared/azure-email.ts`
- `supabase/functions/send-campaign-email/index.ts`
- `supabase/functions/check-email-replies/index.ts`

Validation after implementation:
1. Send a new campaign email as a logged-in user.
2. Confirm Outlook shows the sender as that user (or “on behalf of” that user, depending on Exchange config).
3. Reply from the recipient mailbox.
4. Run or wait for reply sync.
5. Verify:
   - `conversation_id` is populated
   - reply row is inserted into `campaign_communications`
   - original email becomes `Replied`
   - CRM thread UI groups both messages correctly

Technical note:
- This is not just a code bug; part of it is an Exchange permission issue.
- If Exchange delegation is not configured, the correct product behavior is:
  - either fail clearly with a permission error
  - or intentionally send from `crm@realthingks.com`
- It cannot truthfully send from the logged-in user without mailbox delegation.
