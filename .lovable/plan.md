
## Fix Duplicate Note Editor Issue

### Problem
The popover note editor (triggered by the info icon next to each stakeholder name) and the inline note editor (in the Notes Summary panel at the bottom) both use the same `editingNote` state. When the info icon is clicked, both editors activate simultaneously, creating the duplicate UI shown in the screenshot.

### Solution
Separate the two editing contexts by introducing an `editingNoteSource` state that tracks WHERE the edit was initiated.

### Technical Details

**File: `src/components/DealExpandedPanel.tsx`**

1. **Add a source tracker state**
   - Add `editingNoteSource` state: `'popover' | 'inline' | null`
   - Set it to `'popover'` when the info icon popover opens (line 536)
   - Set it to `'inline'` when the pencil icon in the notes summary is clicked (line 625)
   - Reset to `null` when editing ends

2. **Guard the inline editor in notes summary (line 641)**
   - Only show the inline textarea when `editingNoteSource === 'inline'`
   - When source is `'popover'`, the notes summary continues to show the read-only bullet list

3. **Guard the popover editor (line 533)**
   - Only allow the popover to open when `editingNoteSource` is null or `'popover'`
   - When source is `'inline'`, clicking info icon should close the inline editor first

4. **Update all state-setting locations**
   - Popover `onOpenChange` (line 535): set source to `'popover'` on open, `null` on close
   - Pencil button `onClick` (line 625): set source to `'inline'`
   - Save/Cancel buttons in inline editor (lines 651-656): reset source to `null`
   - Delete confirmation (line 678): reset source to `null`

### Summary of Changes

| What | Where | Change |
|------|-------|--------|
| New state | ~line 440 area | Add `editingNoteSource` state |
| Popover onOpenChange | Line 535-538 | Set source to `'popover'` / `null` |
| Pencil button onClick | Line 625 | Set source to `'inline'` |
| Inline editor guard | Line 641 | Add `editingNoteSource === 'inline'` condition |
| Edit action icons guard | Line 622 | Add `editingNoteSource !== 'popover'` check |
| Save/Cancel/Delete handlers | Lines 651-688 | Reset source to `null` |

Only one file is modified: `src/components/DealExpandedPanel.tsx`
