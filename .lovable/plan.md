

## Replace Textarea + Preview with Bullet-Point Editor

### What Changes
Remove the dual textarea + preview pattern in both the popover note editor and the inline note editor. Replace with a single smart textarea that automatically manages bullet points.

### New Behavior
- When the textarea is shown, each line is automatically prefixed with a bullet character ("• ")
- Pressing **Enter** creates a new line with "• " auto-inserted
- Pressing **Backspace** on an empty bullet line removes that line
- No separate "Preview" section -- the textarea itself IS the formatted view
- The helper text "Each line becomes a bullet point" is removed since the behavior is self-evident

### Technical Details

**File: `src/components/DealExpandedPanel.tsx`**

#### 1. Add a `handleNoteKeyDown` helper function

Handles Enter and Backspace for auto-bullet behavior:
- **Enter**: Prevent default, insert `\n• ` at cursor position
- **Backspace**: If cursor is right after a `• ` on an otherwise empty line, remove that bullet line

#### 2. Add a `formatWithBullets` helper function

When note text is loaded for editing, ensure every non-empty line starts with "• ". When saving, strip the "• " prefix so storage stays clean (plain text lines).

#### 3. Update the Popover note editor (lines 510-539)

- Remove the Preview section (lines 519-531)
- Remove the "Each line becomes a bullet point" helper text (line 511)
- Add `onKeyDown={handleNoteKeyDown}` to the Textarea
- On open, format existing text with bullets; on save, strip bullets before saving

#### 4. Update the Inline note editor in the notes summary (lines 612-628)

- Same changes: add `onKeyDown`, format with bullets on edit start, strip on save

#### 5. Styling tweak

- Give the textarea a slightly larger min-height (100px) since it now serves as both editor and preview
- Use `font-family: inherit` to keep consistent styling with the bullet list display

### Summary of Changes

| Location | Change |
|----------|--------|
| Popover editor (line 510-539) | Remove preview section, add auto-bullet logic |
| Inline editor (line 612-628) | Add auto-bullet logic |
| New helper functions | `handleNoteKeyDown`, `formatWithBullets`, `stripBullets` |

