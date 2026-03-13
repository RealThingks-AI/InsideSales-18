

# Campaign Module Deep Audit -- Findings & Fix Plan

## Audit Summary

After thorough code review across all Campaign files, here is the status of each area and the fixes required.

---

## Section A -- What Is Implemented & Working

| Feature | Status |
|---------|--------|
| Campaign CRUD (create, edit, delete) | Working |
| Campaign list with filters (search, status, type, owner) | Working |
| Campaign detail panel with 9 tabs | Working |
| Accounts tab (search, filter, bulk add, status tracking) | Working |
| Contacts tab (search, filter by account/position, bulk add, stage tracking) | Working |
| Outreach tab (log communication, send email via Graph API) | Working |
| Email Templates (CRUD, audience segment, use in outreach) | Working |
| Phone Scripts (CRUD, audience segment) | Working |
| Materials tab (upload to storage, delete) | Working |
| Action Items tab (CRUD, linked via module_type='campaigns') | Working |
| Convert to Deal (creates deal at Lead stage, links stakeholder) | Working |
| Analytics (stats, funnel chart, pie chart, summary) | Working |
| Campaign Settings page (types, statuses, follow-up rules) | Working |
| Campaign name required validation | Working |
| Start date > end date validation | Working |
| Owner defaults to current user | Working |
| Status defaults to Draft | Working |
| Aggregates (accounts, contacts, deals counts on list) | Working |

---

## Section B -- Critical Bug: Edge Function Auth

**File:** `supabase/functions/send-campaign-email/index.ts` (line 64)

```typescript
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
```

`getClaims()` is **not a standard method** in Supabase JS v2. This will fail at runtime when sending emails.

**Fix:** Replace with `supabase.auth.getUser(token)`:
```typescript
const { data: userData, error: userError } = await supabase.auth.getUser(token);
if (userError || !userData?.user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
}
const userId = userData.user.id;
```

---

## Section C -- Issues Found (Bugs & Gaps)

### 1. No Duplicate Prevention for Accounts/Contacts
Adding the same account or contact twice to a campaign will cause a database error (no unique constraint check in UI). The hooks fire insert without checking if already exists.

**Fix:** Add `unique(campaign_id, account_id)` constraint on `campaign_accounts` and `unique(campaign_id, contact_id)` on `campaign_contacts` via migration. Also add client-side toast if error occurs instead of generic error.

### 2. No Campaign Archive Feature
The audit document mentions "Archive campaign." There is no archive functionality -- only delete. The `campaigns` table has no `archived_at` column.

**Fix:** Not critical for MVP. Skip unless user requests.

### 3. Email Template Placeholders Not Implemented
Templates are plain text. No `{{contact_name}}`, `{{company_name}}` variable substitution exists in the send flow.

**Fix:** Add placeholder replacement in `handleSendEmail` in CampaignOutreachTab before sending:
```typescript
let processedBody = sendForm.body
  .replace(/\{\{contact_name\}\}/gi, contact?.contacts?.contact_name || '')
  .replace(/\{\{company_name\}\}/gi, contact?.contacts?.company_name || '')
  .replace(/\{\{email\}\}/gi, contact?.contacts?.email || '');
```
Also display supported placeholders in the template editor UI.

### 4. No "Campaign Goal" Field
The audit requests a "Campaign Goal" field. The DB and form have `message_strategy` and `target_audience` but no explicit `campaign_goal`.

**Fix:** The `message_strategy` field can serve this purpose. Rename the label to "Campaign Goal / Message Strategy" or add a new column. Will ask user preference.

### 5. Materials Cannot Be Downloaded
Materials are uploaded to private storage but there's no download button. Only delete exists.

**Fix:** Add a download button that generates a signed URL via `supabase.storage.from('campaign-materials').createSignedUrl(filePath, 3600)`.

### 6. No Cascade Delete for Campaign Sub-records
The delete confirmation warns about associated data being deleted, but no ON DELETE CASCADE foreign keys exist on `campaign_accounts`, `campaign_contacts`, `campaign_communications`, `campaign_email_templates`, `campaign_phone_scripts`, `campaign_materials`. Deleting a campaign will leave orphan records.

**Fix:** Add foreign key constraints with CASCADE via migration, or implement client-side cascade delete before the campaign delete call.

### 7. Communication Tracking Not Shown in Contact/Account Activity
Communications logged in campaigns are stored in `campaign_communications` but not surfaced in contact or account detail views elsewhere in the CRM.

**Fix:** This is a cross-module enhancement. Not critical for campaign module itself but should be noted for future work.

### 8. No Pagination on Any Campaign Tab
All tables load all records without pagination. With 1000+ contacts this will be slow.

**Fix:** Add pagination to contacts, accounts, and communications tabs using the existing `StandardPagination` component pattern.

---

## Section D -- Implementation Plan (Priority Order)

### Phase 1: Critical Fixes (Must Do)

1. **Fix edge function auth** -- Replace `getClaims` with `getUser` in `send-campaign-email/index.ts`
2. **Add duplicate prevention** -- DB migration for unique constraints on `campaign_accounts(campaign_id, account_id)` and `campaign_contacts(campaign_id, contact_id)`
3. **Add cascade delete** -- DB migration to add FK constraints with ON DELETE CASCADE from campaign sub-tables to `campaigns`
4. **Add template placeholder support** -- Process `{{contact_name}}`, `{{company_name}}`, `{{email}}` in outreach send flow + display helper text in template editor
5. **Add material download** -- Add download button with signed URL generation

### Phase 2: Improvements (Should Do)

6. **Add pagination** to contacts, accounts, and communications tabs
7. **Rename "Message Strategy" label** to clarify its purpose as campaign goal/strategy

### Phase 3: Enhancements (Nice to Have -- skip unless requested)

- Campaign archive
- Campaign cloning
- Region-specific templates
- Engagement scoring
- Follow-up automation
- Campaign ROI calculation

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-campaign-email/index.ts` | Fix auth from getClaims to getUser |
| New migration | Add unique constraints + FK cascades |
| `src/components/campaigns/CampaignOutreachTab.tsx` | Add placeholder substitution in send flow |
| `src/components/campaigns/CampaignEmailTemplatesTab.tsx` | Show supported placeholder variables |
| `src/components/campaigns/CampaignMaterialsTab.tsx` | Add download button |
| `src/components/campaigns/CampaignContactsTab.tsx` | Add pagination |
| `src/components/campaigns/CampaignAccountsTab.tsx` | Add pagination |

