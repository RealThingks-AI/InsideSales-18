

## Add Edit and Delete Actions to Stakeholder Notes

### What Changes
When the Notes section is expanded in the Deal Expanded Panel, each note will get action buttons (Edit and Delete) so users can manage notes directly from the summary view.

### Current Behavior
- Notes are displayed as read-only bullet lists under each stakeholder
- To edit a note, users must go through the stakeholder info icon
- No way to delete a note from the summary view

### New Behavior
- Each note card will show a small actions menu (three-dot dropdown) on hover or always visible
- **Edit**: Opens an inline textarea to edit the note, with Save/Cancel buttons
- **Delete**: Shows a confirmation prompt, then clears the note from the stakeholder record

### Technical Details

**File: `src/components/DealExpandedPanel.tsx`**

1. Add a `deletingNote` state to track which note is being deleted (for confirmation)
2. Modify the notes summary panel (lines 580-597) to add action buttons to each note card:

```
Each note card will change from:
  [Badge] [Contact Name]
  - bullet point 1
  - bullet point 2

To:
  [Badge] [Contact Name]          [Edit] [Delete]
  - bullet point 1
  - bullet point 2

  -- OR when editing --
  [Badge] [Contact Name]
  [textarea with current note]
  [Save] [Cancel]
```

3. When **Edit** is clicked:
   - Set `editingNote` to that stakeholder's ID (reuse existing state)
   - Show a textarea pre-filled with the current note
   - Show Save/Cancel buttons
   - On Save, call the existing `handleSaveNote` function

4. When **Delete** is clicked:
   - Show a small confirmation (inline or alert)
   - On confirm, call `handleSaveNote(stakeholderId, "")` which sets note to null

5. Import `DropdownMenu` components (or use simple icon buttons) for the actions:
   - `Pencil` icon for Edit
   - `Trash2` icon for Delete

No database changes needed -- the existing `deal_stakeholders.note` column and `handleSaveNote` function handle everything.

