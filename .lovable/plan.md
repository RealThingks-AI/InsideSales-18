

## Fix: Email Reply Sync Not Working + Remove Manual Log Reply

### Root Cause

The edge function logs reveal the exact problem:

```
ERROR Graph inbox query failed for deepak.dongare@realthingks.com:
400 {"error":{"code":"InefficientFilter","message":"The restriction or sort order is too complex for this operation."}}
```

The `conversationId` property is **not a filterable field** in Microsoft Graph's `/messages` endpoint. The current code uses `$filter=conversationId eq '...'` which Graph rejects with `InefficientFilter`. This means **zero replies are ever detected**.

### Fix Plan

#### 1. Fix Graph API query in `check-email-replies/index.ts`

Replace the broken `$filter=conversationId eq '...'` approach with a two-step strategy:
- Fetch recent inbox messages (last 7 days) from the sender's mailbox **without** filtering by conversationId
- Use `$filter=receivedDateTime ge {sevenDaysAgo}` which IS a supported filter
- Match `conversationId` **in code** (server-side) against the set of conversation IDs we're tracking
- Batch by sender mailbox (not by conversation) to minimize Graph API calls — one call per unique sender mailbox instead of one per conversation

This is the standard workaround for Graph's `conversationId` filter limitation.

#### 2. Remove "Log Reply" button from `CampaignCommunications.tsx`

Remove the manual "Log Reply" button (lines 488-534) since the user wants real-time auto-sync only. Keep the Reply button (for composing a reply email) and the Task button.

#### 3. Add auto-refresh polling

Add a `useEffect` interval that calls `check-email-replies` automatically every 60 seconds when the Outreach tab is active, so replies appear without manual refresh.

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/check-email-replies/index.ts` | Fix Graph query: fetch by date range, filter conversationId in code |
| `src/components/campaigns/CampaignCommunications.tsx` | Remove "Log Reply" button, add 60s auto-poll for reply sync |

### Technical Detail: New Graph Query

```
// Before (broken):
/users/{mailbox}/mailFolders/inbox/messages?$filter=conversationId eq '{convId}'

// After (working):
/users/{mailbox}/mailFolders/inbox/messages
  ?$filter=receivedDateTime ge {sevenDaysAgo}
  &$orderby=receivedDateTime desc
  &$top=50
  &$select=id,subject,from,receivedDateTime,internetMessageId,conversationId,bodyPreview
```

Then in code: `inboxMessages.filter(msg => trackedConversationIds.has(msg.conversationId))`

