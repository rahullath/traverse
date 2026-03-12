# Mirror UI User Guide

## What is Mirror UI?

Mirror UI is a simplified, mobile-first view of your daily plan designed for real-time adaptation when plans break mid-day. Whether you wake up late, miss an anchor, or feel overwhelmed, Mirror UI helps you quickly see what's next and make informed decisions without complex navigation.

## Accessing Mirror UI

Navigate to `/daily-plan/mirror` or click "Mirror View" in the main navigation.

## Key Features

### 1. Simplified Timeline View

Mirror UI displays your day as a vertical timeline with:

- **Current time indicator**: A line showing where you are in your day
- **Time blocks**: Each activity with start/end times, duration, and name
- **Visual states**:
  - Pending (default color)
  - Current (highlighted)
  - Completed (green checkmark)
  - Skipped (gray)
  - Late (warning color)

### 2. State Declaration

When you open Mirror UI within 2 hours of an anchor, you'll see a prompt asking about your current state. This helps the system show only relevant information.

#### State Options

**"Starting my day"**

- Shows your full activation chain from now
- All steps marked as pending
- Use when: You're beginning your day and ready to follow the plan

**"Ready for anchor"**

- Hides activation chain steps
- Shows only departure time, travel, anchor, and recovery
- Use when: You've completed prep and are ready to leave

**"Mid-chain"**

- Prompts you to select which step you're on
- Marks prior steps as completed
- Shows remaining steps
- Use when: You're partway through your chain

**"At anchor"**

- Marks prep and travel as completed
- Highlights the anchor block
- Use when: You've arrived at your commitment

**"Missed it"**

- Marks anchor and related steps as skipped
- Shows remaining timeline
- Use when: You missed the anchor and need to move on

**"Just checking"**

- Shows full timeline without changes
- Use when: You're just looking at your plan

### 3. Triage Mode

When you don't have enough time for planned activities (runway < required duration), triage mode activates automatically.

#### What You'll See

A prominent banner showing:

- Time remaining until next anchor (runway)
- Time needed for all planned activities (required duration)
- The most important activity to protect (keystone)

#### Your Options

**Protect Keystone**

- Keeps only the most critical activity and the anchor
- Removes prep and recovery steps
- Use when: You want to make the anchor but need to cut corners

**Skip Anchor**

- Marks the anchor as skipped
- Removes entire commitment envelope
- Use when: You've decided not to attend

**Recalculate**

- Generates a fresh plan from current time
- Uses existing plan generation logic
- Use when: You want a completely new plan

### 4. Completion Tracking

#### Marking Steps Complete

**Desktop**: Click the checkmark button on any time block

**Mobile**:

- Swipe right to mark complete
- Tap the checkmark button

#### Skipping Steps

**Desktop**: Click the skip button

**Mobile**:

- Swipe left to skip
- Tap the skip button
- You'll be prompted for a skip reason

#### Progress Indicators

- Completed steps show a green checkmark
- Skipped steps appear grayed out
- Your progress persists across sessions

### 5. Inline Editing

Enable edit mode using the toggle in the header.

#### Editing Anchors

1. Tap the edit icon on any anchor block
2. Modify time, location, or duration
3. Save changes
4. The system regenerates the commitment envelope with new timing

**Conflict Detection**: If your new anchor time conflicts with another anchor, you'll see a warning.

#### Editing Step Durations

1. Tap the duration badge on any chain step
2. Select new duration (5-120 minutes in 5-minute increments)
3. Subsequent steps automatically adjust timing

#### Adding Custom Steps

1. Click the "+" button between time blocks
2. Enter activity name and duration
3. The step is inserted and timing cascades

#### Deleting Anchors

1. Open the inline editor for an anchor
2. Click "Delete Anchor"
3. Confirm deletion
4. The entire commitment envelope is removed

### 6. Deadline Visibility

Each commitment envelope displays:

**"Start at [TIME]" label**

- Shows when you need to begin the chain
- Displays countdown if before start time
- Shows how late if after start time

**"Complete by [TIME]" banner**

- Shows deadline for completing all prep steps
- Displays time remaining in human-readable format
- Changes to warning color if you're past deadline

### 7. Recalculation

#### Manual Recalculation

Click "Recalculate from Now" in the header to generate a fresh plan starting from current time.

**What happens:**

- Existing plan is replaced
- New chains generated from now
- Completed steps are preserved (matched by time)
- Your wake/sleep preferences remain unchanged

**Timeout**: If recalculation takes longer than 4 seconds, you'll see a timeout error and can retry.

#### Auto-Recalculation

Enable "Recalculate plan on open" in Settings to automatically regenerate your plan each time you open Mirror UI.

**Use when:**

- You want fresh plans every time
- Your schedule changes frequently
- You prefer starting from "now" rather than seeing broken plans

### 8. Intent Signal

If you haven't created a plan for 7+ consecutive days, you'll see a neutral banner asking: "Need a plan today?"

**Options:**

- "Yes, generate plan" → Takes you to plan generation
- "No, not today" → Dismisses until next session

This is a gentle re-engagement prompt, not a guilt trip.

## Mobile-Specific Features

### Touch Gestures

- **Swipe right**: Mark step complete
- **Swipe left**: Mark step skipped
- **Long press**: Open context menu

### Bottom Sheet Prompts

State declaration and triage prompts slide up from the bottom with:

- Backdrop overlay
- Swipe-down to dismiss
- Safe area inset support

### Responsive Design

Mirror UI adapts to screen sizes from 320px to 1920px:

- Mobile: Stacked vertical layout
- Tablet: Optimized spacing
- Desktop: Full-width timeline

All buttons meet 44x44px minimum touch target size.

## Accessibility

### Keyboard Navigation

- **Tab**: Move between interactive elements
- **Enter/Space**: Activate buttons
- **Escape**: Dismiss prompts

### Screen Reader Support

- All buttons have ARIA labels
- Triage and state prompts announce to screen readers
- Focus management on prompt open/close

### Visual Accessibility

- High contrast semantic colors
- Clear visual states
- Prominent current time indicator
- Large touch targets

## Tips for Success

1. **Declare your state** when prompted - it helps filter out irrelevant information
2. **Use triage mode** when running late - it gives you clear options fast
3. **Enable auto-recalc** if you want fresh plans every time
4. **Mark steps as you go** - completion tracking helps you see progress
5. **Edit inline** when plans change - no need to regenerate everything
6. **Watch the deadline banner** - it keeps you on track without mental math

## Troubleshooting

**Mirror UI won't load**

- Check your internet connection
- Ensure you're logged in
- Try refreshing the page

**Recalculation times out**

- You may have too many anchors (6+)
- Try again - it usually succeeds on retry
- Consider removing some anchors

**State prompt doesn't show**

- You may have declared state in the last 30 minutes
- You may not be within 2 hours of an anchor
- This is normal behavior

**Completion state not saving**

- Check your internet connection
- Ensure you're logged in
- Try marking the step again

## Privacy & Data

- All completion tracking is private to your account
- State declarations are stored in your preferences
- Triage decisions are session-only (not saved to database)
- Your data is never shared

## Feedback

Mirror UI is designed for people with executive dysfunction. If something doesn't work for you, that's valuable feedback. Let us know what's confusing or overwhelming.
