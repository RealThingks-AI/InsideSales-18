

## Optimize Notes Summary Layout

### Current Issues
- The layout is flat and cramped: the role badge, contact name, bullet list, and Save/Cancel buttons are all squeezed together with minimal visual hierarchy.
- The textarea and buttons feel disconnected from the header.
- Save/Cancel buttons are tiny and hard to click.
- No clear visual separation between the header area and the content/editing area.

### Proposed Visual Improvements (File: `src/components/DealExpandedPanel.tsx`)

**1. Restructure the card layout (lines 592-646)**
- Give each stakeholder note card a cleaner structure: a distinct header row (badge + name + action icons) with a subtle bottom border, followed by the content area below.
- Increase padding from `p-1.5` to `p-2.5` for breathing room.
- Use a slightly stronger background: `bg-muted/50` instead of `bg-muted/30`.

**2. Improve the header row (lines 593-616)**
- Move the badge and contact name into a more cohesive inline layout with proper vertical alignment.
- Make action icons (edit/delete) slightly larger (`h-3.5 w-3.5`) and add a subtle separator or spacing from the name.

**3. Improve the textarea editing area (lines 619-636)**
- Add a rounded border and subtle background to the textarea container so it looks like a proper input card.
- Increase textarea min-height to `100px` for comfortable editing.
- Move Save/Cancel buttons to the right side with proper spacing and slightly larger touch targets (`h-7` instead of `h-6`).
- Use an outline-style Cancel button for better contrast against the primary Save button.

**4. Improve read-only bullet list (lines 638-645)**
- Add slight left padding/indent so bullets are visually nested under the header.
- Increase line text size from `text-[11px]` to `text-xs` for readability.
- Add `leading-relaxed` for comfortable line spacing.

**5. Increase the max-height of the scrollable area (line 590)**
- Change from `max-h-[200px]` to `max-h-[280px]` so more content is visible without scrolling.

### Summary of Changes

| Element | Before | After |
|---------|--------|-------|
| Card padding | `p-1.5` | `p-2.5` |
| Card background | `bg-muted/30` | `bg-muted/50` |
| Header separator | None | `border-b pb-1.5 mb-1.5` on header row |
| Action icon size | `h-3 w-3` | `h-3.5 w-3.5` |
| Textarea min-height | `80px` | `100px` |
| Save/Cancel buttons | `h-6 text-[10px]` | `h-7 text-xs`, right-aligned |
| Bullet text size | `text-[11px]` | `text-xs leading-relaxed` |
| Scroll area height | `max-h-[200px]` | `max-h-[280px]` |
| Cancel button variant | `ghost` | `outline` |

Only one file is modified: `src/components/DealExpandedPanel.tsx`

