

## Remove Popover Editor -- Use Inline-Only Note Editing

### Problem
The info icon still opens a Popover with a duplicate textarea and Save button (as shown in the screenshot). The user wants NO popover at all -- clicking the info icon should instead open the Notes Summary panel and trigger the inline editor there.

### Solution
1. **Remove the Popover wrapper** around the info icon (lines 534-570). Replace it with a plain button that:
   - Opens the Notes Summary panel (`setShowNotesSummary(true)`)
   - Sets the inline editing state (`setEditingNote(sh.id)`, `setEditingNoteSource('inline')`, `setNoteText(...)`)
2. **Remove the `editingNoteSource` state entirely** since popover mode no longer exists -- simplify back to just `editingNote`.
3. **Clean up all `editingNoteSource` references** throughout the file (guards, resets in save/cancel/delete handlers).

### Technical Details

**File: `src/components/DealExpandedPanel.tsx`**

| Change | Details |
|--------|---------|
| Remove `editingNoteSource` state (line 314) | No longer needed |
| Replace Popover block (lines 534-570) | Replace with a plain `<button>` that calls `setShowNotesSummary(true)`, `setEditingNote(sh.id)`, `setNoteText(formatWithBullets(sh.note))` |
| Remove Popover/PopoverTrigger/PopoverContent imports if unused | Clean up imports |
| Simplify inline editor guard (line 642) | Change from `editingNote === s.id && editingNoteSource === 'inline'` to just `editingNote === s.id` |
| Simplify action icons guard (line 623) | Remove `editingNoteSource !== 'popover'` check |
| Remove all `setEditingNoteSource(...)` calls | Lines 537-538, 626, 652, 655, 679 |

The info icon button keeps its existing styling (highlighted when note exists, faded when empty). Clicking it now scrolls/opens the Notes panel and activates inline editing for that stakeholder.

