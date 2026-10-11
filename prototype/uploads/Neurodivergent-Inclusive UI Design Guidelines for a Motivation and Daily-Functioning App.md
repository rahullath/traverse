# Neurodivergent-Inclusive UI Design Guidelines for a Motivation and Daily-Functioning App

## Overview

This document distills key research findings from human–computer interaction (HCI), neurodiversity-inclusive design, and cognitive accessibility into practical guidelines for designing a local, privacy-preserving app that helps neurodivergent people initiate action (for example, getting out of bed and starting their day). It is intended as design reference material when planning or revising layouts, color systems, and interaction models.

The emphasis is on common neurodivergent profiles such as ADHD, autism, and related sensory and executive-function differences. Core themes across the literature are reducing cognitive load, providing sensory comfort, and giving users flexible control over how intense or minimal the interface feels.[^1][^2][^3]

***

## Core Principles from Research

### Reduce Cognitive Load

HCI work on neurodivergent-inclusive software consistently emphasizes minimizing the number of elements and decisions a user must process at once. Overly dense interfaces, multiple competing focal points, and ambiguous microcopy increase cognitive effort, which can be especially costly for users with ADHD or autistic traits.[^2][^1]

Key tactics:

- Prefer single-purpose screens over complex dashboards with many controls.[^1]
- Use progressive disclosure: only reveal additional options or settings when they are immediately relevant.[^3]
- Keep the number of simultaneous choices low (ideally 2–3 main actions per screen).[^4]
- Make the primary action visually obvious using size, position, and subtle color contrast.

### Prioritize Customization over One-Size-Fits-All

Neurodivergent users vary widely in sensory preferences and cognitive styles. Reviews of inclusive UX for neurodivergent audiences suggest offering user-adjustable settings for key sensory dimensions (color intensity, animation, text size) rather than attempting to pick a single “perfect” default.[^5][^4]

Important implications:

- Provide theme variations (for example, calm light, low-stim dark, higher-energy) with simple labels that describe how they feel rather than technical color terms.[^4]
- Offer controls for text size, spacing, and motion/reduced motion within a single, clearly labeled “Comfort & focus” section instead of burying them in technical settings.[^5]
- Remember that both minimal and rich visual styles can be supportive depending on the user; the critical requirement is controllability.[^2]

### Co-Design with Neurodivergent Users

Scoping reviews of assistive technologies for neurodivergent users show that involving them directly in ideation, design, and evaluation yields more usable, trusted tools than designing “for” them without their input. Co-design sessions help uncover needs that are not obvious from the outside, such as specific triggers, preferred metaphors, and tolerances for notification frequency.[^6][^7]

Suggested practices:

- Run small usability sessions with neurodivergent participants using visual prototypes and very focused tasks.
- Ask about sensory comfort (colors, contrast, motion), cognitive clarity (can they tell what happens next?), and emotional tone (does the app feel supportive, pressuring, or neutral?).
- Treat lived experience as a primary source, adjusting patterns derived from literature when they conflict with real user feedback.[^7]

***

## Color and Sensory Environment

### General Color Principles

Research on autism-friendly environments and sensory rooms finds that highly saturated colors and intense, high-contrast patterns can be overstimulating, while softer, natural tones are often experienced as calming. Web accessibility experiments using color psychology show that combining accessible contrast for text and functional elements with low-arousal background colors improves readability and navigation efficiency for users with cognitive differences.[^8][^9][^10]

Key principles:

- Use soft, desaturated colors for large background areas (for example, light warm greys, muted blues, gentle greens, creams, and browns).[^9][^10]
- Avoid applying very bright or neon colors to large surfaces; reserve stronger saturation for small, focal elements like the primary call-to-action.[^9]
- Maintain sufficient contrast for text and interactive elements to meet accessibility guidelines (for example, WCAG-level contrast) while keeping the overall palette low-arousal.[^8]

### Role of Contrast

High contrast is essential for legibility but can become visually harsh when used everywhere. Sensory-inclusive design guidance recommends balancing contrast by concentrating it on text and crucial affordances, and using softer transitions for backgrounds and large panels.[^8][^9]

Practical rules:

- Ensure primary text and icons have strong contrast against their background for readability.
- Limit heavy contrast stripes, checkerboard patterns, or highly contrasting borders that create visual noise.
- Use subtle dividers, spacing, and small shifts in value (light vs. slightly darker) to separate sections instead of stark lines whenever possible.

### Example Palette for a Morning-Motivation App

A research-informed base palette for a “help me start my day” app might be:

- Background: very light warm grey or off-white (low arousal, high flexibility).
- Primary action color: desaturated teal or soft aqua (often associated with calmness and clarity, less intense than pure blue).[^9]
- Accent for positive feedback: muted coral or soft orange (providing gentle energy without excessive saturation).[^10]
- Error and warnings: softened red or terracotta, complemented with clear iconography and text so meaning is not color-dependent.[^8]

These choices deliberately avoid dark, high-intensity palettes as the default for users seeking activation and emotional support, while remaining compatible with a dark or low-stimulation theme option for those who prefer it.

### Theme Variants and Sensory Control

Given the diversity of preferences among neurodivergent users, research-backed practice is to provide a small, well-described set of theme variants rather than a single locked-in look.[^5][^4]

Example variants:

- **Calm light:** Light background, soft neutrals, and gentle teal/coral accents. Suitable as the default for users seeking a gentle push into activity.
- **Low-stimulation dark:** Dark, desaturated background with high-contrast but non-neon text and accents; minimal use of color outside of functionally necessary elements.
- **Higher-energy:** Slightly more saturated accents and micro-animations used sparingly, for users who respond positively to more stimulation.

Each variant should be described in terms of how it feels (“low-stimulation”, “brighter and energizing”) rather than purely visual terminology so users can match options to their sensory needs.[^5]

***

## Typography and Text Presentation

### Font Selection

Resources on cognitive accessibility and dyslexia-friendly design recommend simple, familiar sans-serif fonts with clear letterforms and avoiding overly decorative or ultralight typefaces. These choices support faster recognition and reduce the cognitive effort required to decode text.[^3]

Guidelines:

- Choose a common, readable sans-serif font family; avoid display fonts within core UI.
- Avoid very thin or condensed weights; regular or slightly heavier weights are typically easier to read.
- Ensure that italics, all caps, and letter-spacing variants are used sparingly and never as the only way to convey important information.

### Text Layout and Spacing

Cognitive accessibility checklists stress the importance of white space, clear structure, and avoiding dense text blocks. For neurodivergent users, who may experience attentional challenges or information processing differences, cluttered text regions can quickly become overwhelming.[^3]

Best practices:

- Use generous line spacing and paragraph spacing, especially for descriptive text.
- Avoid long, unbroken paragraphs; aim for short segments that can be processed at a glance.[^3]
- Use lists and bullet points for multi-step instructions instead of embedding all steps in a single paragraph.
- Maintain consistent alignment, preferably left-aligned text for body copy to support scanability.

### Language and Microcopy

Guidance on UX for neurodivergent users and W3C cognitive accessibility emphasizes plain, literal language and consistency in terminology.[^5][^3]

Practical rules:

- Use concrete, direct language (“Sit up in bed”, “Drink a glass of water”) instead of metaphorical or poetic phrasing.[^5]
- Avoid idioms, sarcasm, and ambiguous humor in critical flows, as they add interpretation overhead.
- Use the same label for the same action across the app (for example, always “Start my morning steps”, not alternating between “Start routine” and “Begin schedule”).[^5]
- Provide short, optional descriptions under key headings rather than lengthy explanations; users can ignore them when unnecessary but have support when needed.[^3]

***

## Layout and Information Architecture

### Single-Purpose Screens

Studies of neurodivergent-inclusive interfaces and autistic-friendly design emphasize clarity of purpose and minimal simultaneous demands on attention. Multi-function screens with many interactive elements demand more scanning, decision-making, and memory.[^1][^2]

Design implications:

- Structure the app as a sequence of simple screens, each dedicated to one primary goal (for example, “start my morning routine”, “view my upcoming steps”, “adjust my comfort settings”).
- Avoid control-dense dashboards as the first thing users see, especially when the app’s purpose is to help them initiate activity from a low-energy state.
- Use progressive disclosure to reveal additional options or advanced tools only when the user explicitly asks for them or moves into a more detailed context.[^3]

### Consistent Navigation

Inclusive UX resources for neurodivergent users highlight the importance of consistent navigation patterns and element placement. Re-labelling or moving key actions between contexts forces users to re-learn the interface, which is especially taxing for those with working memory or attention challenges.[^2][^5]

Guidelines:

- Keep primary navigation (for example, bottom bar or side rail) stable across screens where it appears.
- Use stable iconography and labels (do not alternate between different icons or words for the same function).
- When introducing a new or rarely used action, accompany it with clear labeling and, if necessary, a short, dismissible explanation.

### Clear Visual Hierarchy

Research on cognitive accessibility and HCI for neurodivergent users emphasizes the value of clear visual hierarchy in reducing cognitive load.[^1][^3]

Practical techniques:

- Use size, weight, and position to make the primary action unmistakable.
- Place the most important information at the top or center of the screen, with decreasing importance as users scan downward.
- Limit the number of emphasized elements; if everything is bold or colorful, nothing stands out.

***

## Interaction Patterns for Executive Dysfunction and ADHD

### Guided, Step-by-Step Flows

ADHD-oriented design guidance and inclusive UX articles recommend breaking large tasks into small, manageable actions with explicit next steps. This aligns with behavioral strategies used in clinical and coaching contexts for executive dysfunction.[^4][^2]

Implementation ideas:

- Represent key routines (such as “getting out of bed”) as sequences of micro-steps (for example, “open eyes”, “sit up”, “put feet on floor”).
- Present only one step at a time, with a clear “Done” action and a visible indication of progress (for example, “Step 2 of 4”).[^2]
- Provide a safe way to skip or modify a step (“Too hard right now”) to avoid users feeling stuck or failing.

### Multiple Input Modes Where Feasible

Neurodiversity-focused UX writing suggests offering more than one way to interact with key functions so users can select what feels easiest in the moment.[^2][^5]

Potential patterns:

- Single large button to advance steps, plus optional gestures (such as swipe) for the same action.
- Where appropriate and technically feasible, voice controls or one-tap shortcuts for commonly repeated actions.
- Quick-access shortcuts that jump straight to “start my next step” from a notification or home widget.

### Forgiving, Clear Error Handling

Accessibility guidelines for cognitive disabilities emphasize non-punitive, clearly recoverable error states. For neurodivergent users, who may already experience shame around productivity or routines, error-handling and edge cases should feel gentle and supportive.[^3][^5]

Design recommendations:

- Avoid alarming colors or language for recoverable issues; use calm explanations and clear actions (“Something went wrong saving this step. Try again.”) rather than blame.[^5]
- Always provide a clear way to back out or undo recent changes where feasible.
- For missed routines or skipped steps, focus on encouragement (“Let’s try one small thing now”) instead of negative framing.

### Motion and Animation

Neurodiversity-focused UX guidance warns that motion and animations can be distracting or overstimulating for autism and ADHD, though some users enjoy subtle motion.[^4][^2]

Best practices:

- Keep animations short, slow, and purposeful (for example, a small progress transition, not a flashing celebration).
- Offer a setting to reduce or disable non-essential motion, linked to system “reduce motion” preferences when available.[^4]
- Avoid flashing or rapidly changing elements altogether due to risk of sensory overload.

***

## Tone, Motivation, and Emotional Safety

### Supportive, Non-Judgmental Tone

UX writing for neurodivergent users and cognitive accessibility guidelines stress the importance of non-judgmental, validating language. Many neurodivergent people have experienced criticism about productivity or routines, so the app’s voice should explicitly avoid blame.[^3][^5]

Guidelines for microcopy:

- Acknowledge difficulty: phrases like “If this feels hard, that makes sense” or “Let’s try the smallest next step together” normalize struggle.[^5]
- Avoid language that implies moral failure (“You should have done this already”, “You failed this routine”).
- Provide options that adapt to the user’s current state (for example, “This is too much; show me something smaller”) to reinforce agency.

### Small Wins and Positive Reinforcement

Research on engagement for ADHD and cognitive differences in UX recommends frequent, low-pressure positive feedback instead of rare, high-stakes achievements.[^2][^4]

Practical patterns:

- Provide small acknowledgments for each completed micro-step (“Nice job sitting up”, “That’s one step closer to starting your day”).
- Offer optional, non-intrusive celebratory feedback for larger milestones (for example, completing the entire morning sequence), with the option to tone down or disable celebrations for users who find them overstimulating.[^4]
- Avoid turning everything into a gamified points system if it becomes another source of pressure, but simple streaks or completion counts can help some users.

### Predictable Emotional Patterns

Autistic-inclusive design guidelines note that sudden tone shifts, unexpected jokes, or inconsistent emotional framing can be uncomfortable or confusing. The app’s “personality” should be stable and predictable.[^2]

Recommendations:

- Maintain a coherent voice style across screens and versions.
- Avoid switching between very formal and very informal language without clear intent.
- When introducing new tone elements (for example, more humor), test them with neurodivergent users and keep them optional where possible.

***

## Concrete Design Kit for Implementation

This section summarizes the above research into a checklist-style design kit that can be used when implementing or refactoring the app.

### Visual and Theme Decisions

- Default to a calm light theme with soft background and desaturated accents; provide low-stimulation dark and higher-energy alternatives.[^10][^9][^8]
- Reserve intense colors and high contrast for small, important elements (buttons, alerts), not backgrounds.[^9]
- Use simple, readable sans-serif fonts with comfortable line spacing and paragraph spacing.[^3]
- Provide settings for:
  - Visual intensity (low/medium/high).
  - Text size and spacing (simple slider with live preview).
  - Motion level (full/reduced/off).[^4][^5]

### Layout and Navigation Patterns

- Structure flows as linear or lightly branched sequences of single-purpose screens instead of multi-panel dashboards.[^1][^2]
- Keep navigation consistent in position and labeling across screens.[^2][^5]
- Ensure one visually dominant primary action per screen, with secondary actions clearly subordinate.

### Core Interaction Models

- Model key routines as step-by-step flows with micro-steps and clear progress indicators.[^4][^2]
- Allow users to skip, defer, or shrink steps without feeling punished.[^5]
- Offer multiple input modes for key actions where feasible (buttons, gestures, shortcuts).[^2][^5]
- Use gentle, recoverable error states and provide undo where possible.[^3][^5]

### Tone and Feedback

- Maintain a supportive, validating tone that avoids blame and moral language.[^5][^3]
- Give frequent, low-pressure positive feedback for micro-steps and larger milestones.[^4][^2]
- Keep emotional style consistent and predictable; avoid sudden tone shifts that could be jarring.[^2]

***

## Applying the Guidelines to Iterative Design

When using this document as reference during design changes:

1. Start from the core principles section to ensure new features or visual changes still reduce cognitive load, respect sensory needs, and remain customizable.
2. Use the color and typography sections to choose or revise palettes and type scales, especially when tempted to adopt very dark or highly saturated designs.
3. Refer to the interaction patterns section when designing new flows, particularly those that involve starting the day, building routines, or performing multi-step tasks.
4. Run small, focused usability sessions with neurodivergent users and treat their feedback as an additional, primary data source alongside the guidelines summarized here.[^6][^7]

This approach keeps the app grounded in evidence-based design while remaining flexible enough to adapt to real-world experience and evolving user needs.

---

## References

1. [Neurodivergent-Inclusive Software Design: Cognitive ...](https://balticpapers.com/index.php/bjmr/article/view/57) - BJMR is a peer-reviewed open-access journal publishing high-quality multidisciplinary research in sc...

2. [Inclusive UX/UI for Neurodivergent Users: Best Practices and Challenges](https://medium.com/design-bootcamp/inclusive-ux-ui-for-neurodivergent-users-best-practices-and-challenges-488677ed2c6e) - Designing Interfaces That Cater to Users With ADHD, Autism, and Other Neurodivergent Needs

3. [Neurodiversity and UX: Essential Resources for Cognitive Accessibility](https://stephaniewalter.design/blog/neurodiversity-and-ux-essential-resources-for-cognitive-accessibility/) - Resources to design for neurodiversity and cognitive disabilities (dyslexia, dyscalculia, ADHD, and ...

4. [Neurodiversity In UX: 7 Key Design Principles](https://devqube.com/neurodiversity-in-ux/) - A revolutionary approach: neurodiversity in UX. Best practices for ADHD, dyslexia, and autism that w...

5. [Designing for Neurodiversity: Inclusive UX Strategies for 2025](https://medium.com/design-bootcamp/designing-for-neurodiversity-inclusive-ux-strategies-for-2025-51fbd30f1275) - As awareness of neurodiversity grows, UX designers must move beyond one-size-fits-all approaches and...

6. [[PDF] Designing assistive technologies for and with ...](https://www.citedrive.com/en/discovery/designing-assistive-technologies-for-and-with-neurodivergent-users-considerations-from-research-practice/) - Abstract To be accessible for neurodivergent users, interactive technologies must be designed and de...

7. [Neurodivergence and Work in Human-Computer Interaction: Mapping the Research Landscape](https://publikationen.bibliothek.kit.edu/1000172222/153439408)

8. [Web Accessibility Design Using Color Psychology for ...](https://www.atlantis-press.com/proceedings/iciaai-25/126015320) - This study explores the impact of color psychology on web accessibility, focusing on individuals wit...

9. [Top 5 Colours for an Autism-Friendly Sensory Room in SEN Settings](https://www.senteq.co.uk/autism-friendly-sensory-room-colours/) - Discover the most effective floor and wall padding colours for an autism-friendly sensory room in sc...

10. [A case study on the effect of light and colors in the built environment ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC9748440/) - Using autism-friendly color palettes such as pastel shades, neutral colors, and muted tones can fost...

