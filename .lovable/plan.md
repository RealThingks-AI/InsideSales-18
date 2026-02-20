

## Fix: Info Icon Should Open Note Editor for Specific Contact Only

### Root Cause
Two issues found in `src/components/DealExpandedPanel.tsx`:

1. **`stakeholdersWithNotes` filters out contacts without notes** (line 449: `stakeholders.filter((s) => s.note)`). When clicking the info icon on a contact that has no note yet, `editingNote` is set to that stakeholder's ID, but that stakeholder is excluded from the rendered list -- so nothing appears or the panel shows only other contacts' notes.

2. **All notes are shown at once** when the panel opens. The user expects that clicking the info/add button for a specific contact should show/edit only that contact's note, not display all stakeholder notes.

### Changes (single file: `src/components/DealExpandedPanel.tsx`)

**1. Include the actively-edited stakeholder in the filtered list (line 449)**
Change the filter from:
```
stakeholders.filter((s) => s.note)
```
to:
```
stakeholders.filter((s) => s.note || s.id === editingNote)
```
Also add `editingNote` to the `useMemo` dependency array (line 457).

**2. When info icon is clicked, show only that contact's note card**
Instead of showing all notes when the summary panel opens from the info icon click, filter the displayed list to only the stakeholder being edited. This can be done by:
- Adding a state like `focusedNoteId` (set when info icon is clicked, cleared when the panel is manually toggled via the "Notes" button).
- When `focusedNoteId` is set, render only the matching stakeholder card instead of the full `stakeholdersWithNotes` list.
- When the user clicks the "Notes (N)" toggle button at the top, clear `focusedNoteId` so all notes are shown as before.

**3. Update the info icon click handler (line 541-544)**
Set `focusedNoteId` alongside the existing state updates:
```
onClick={() => {
  setShowNotesSummary(true);
  setFocusedNoteId(sh.id);
  setEditingNote(sh.id);
  setNoteText(formatWithBullets(sh.note || ""));
}}
```

**4. Update the "Notes (N)" toggle button**
When toggling the panel via the Notes button, clear `focusedNoteId` so all notes display:
```
onClick={() => {
  setShowNotesSummary(!showNotesSummary);
  setFocusedNoteId(null);
}}
```

**5. Filter the rendered list based on focus**
In the rendering section (line 591), use a computed list:
```
const displayedNotes = focusedNoteId
  ? stakeholdersWithNotes.filter(s => s.id === focusedNoteId)
  : stakeholdersWithNotes;
```
Then map over `displayedNotes` instead of `stakeholdersWithNotes`.

**6. Clear focusedNoteId on save/cancel/delete**
Reset `focusedNoteId` to `null` in the save handler, cancel button, and delete confirmation so the panel reverts to showing all notes after editing completes.

### Summary

| Change | Location | Purpose |
|--------|----------|---------|
| Include editing stakeholder in filter | Line 449 | Show card for contacts without existing notes |
| Add `focusedNoteId` state | Near line 310 | Track which contact's note to isolate |
| Set focus on info icon click | Line 541 | Isolate to clicked contact |
| Clear focus on Notes toggle | Notes button onClick | Show all notes when toggled manually |
| Filter displayed list | Line 591 | Render only focused contact or all |
| Clear focus on save/cancel/delete | Various handlers | Return to full view after editing |

