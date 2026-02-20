

## Stakeholders Section: Inline Add Button and Visual Separators

### Problem
1. The "+" add contact button sits on a separate line below existing contacts, wasting vertical space and looking disconnected
2. The Stakeholders grid cells lack visual separation -- all four roles blend together without clear boundaries

### Changes (all in `src/components/DealExpandedPanel.tsx`)

### Fix 1: Make "+" button inline with contacts

**Current behavior (lines 539-547):** The `StakeholderAddDropdown` "+" button is in its own `div` below the list of contacts, always on a new row.

**New behavior:** 
- When contacts exist for a role, place the "+" button inline (inside the same flex row) after the last contact's action icons
- When no contacts exist, show the "+" button on the first line (same as the role label)
- New contacts added will appear as separate rows below existing ones

**Implementation:**
- Remove the standalone add dropdown wrapper `div` at lines 539-547
- For each role cell, render contacts as rows and append the `StakeholderAddDropdown` inline in the last contact's row (after the X remove button)
- If no contacts exist, render a single row with just the `StakeholderAddDropdown`

### Fix 2: Add visual separators between roles

**Current:** Cells have subtle `border-b` and `border-r` but minimal visual distinction between the four quadrants.

**Changes:**
- Add a slightly stronger border color between cells: `border-border/30` to `border-border/50`
- Add alternating subtle background tint to distinguish rows: odd rows get a very light `bg-muted/10`
- Ensure the left colored border (`border-l-2`) per role is more prominent for visual anchoring

### Technical Details

**Lines affected in `src/components/DealExpandedPanel.tsx`:**

| Lines | Change |
|-------|--------|
| 449-454 | Increase border opacity from `border-border/30` to `border-border/50` for better separation |
| 465-548 | Restructure the contact list and add button layout -- move `StakeholderAddDropdown` inline with the last contact row instead of a separate block |
| 539-547 | Remove standalone add button wrapper; integrate it into the contact row or show as first element if no contacts |

No new files. No database changes.
