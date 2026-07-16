# MeshOS: A Scientific Design Guide for Convivial Executive Function Tools

## 1. Philosophical Foundation: Crip Technoscience and Conviviality

MeshOS is not a "solution" for a "pitiable" condition. It is an act of **Epistemic Activism**. We reject the mainstream disability technoscience model that treats the user as a passive "need-knower" in search of a "cure" or a "fix" to achieve neurotypical productivity. Instead, MeshOS is a **Convivial Tool**, as defined by Ivan Illich: a technology that allows the user to invest the world with their own meaning rather than being **regimented** by the tool’s internal logic.

Mainstream tools demand a fixed standard of performance; they regiment the user into "efficient" cycles that cause **uneven debilitation**. MeshOS prioritizes the user as a **Knowing-Maker**, allowing "Energy States" (High/Med/Low) to fundamentally alter the tool’s behavior rather than the tool demanding the user "mask" their executive dysfunction.

### Design Model Divergence

|   |   |   |
|---|---|---|
|Feature|Traditional Assistive Tech (Medical Model)|Crip Technoscience (MeshOS Model)|
|**Objective**|Remediation and "Cure" of the deficit.|World-building/dismantling for Justice.|
|**User Role**|Passive "Client" or "Need Knower."|Expert, Designer, and **Knowing-Maker**.|
|**Productivity**|Maximizing "Independent" output.|Agitating against productivity as a requirement for existence.|
|**Access Logic**|Seamless inclusion and assimilation.|**Access as Friction**: A site of protest and non-compliance.|
|**Expertise**|Clinical and Engineering hierarchies.|Lived experience and "Crip Science" hacks.|

MeshOS champions **Access as Friction**. We do not design for "seamlessness" if it erases the reality of the **Misfit**. By incorporating Illich’s conviviality, we ensure MeshOS remains a tool for autonomy, allowing for "Anchor-less days" and jagged baselines without triggering a "failure" state.

--------------------------------------------------------------------------------

## 2. Neurological Mapping: Executive Function (EF) and Dysfunction

Design decisions within MeshOS are rooted in the clinical reality of the **Dorsolateral Prefrontal Cortex (DLPFC)** and the **Temporal Lobe**. These regions govern the metacognitive processes required to organize information and inhibit behavior.

### The Nine Core Executive Functions

1. **Working Memory**
    - **Clinical Definition:** The capacity to hold, process, and manipulate information in temporary storage (DLPFC).
    - **The "Misfit" Manifestation:** Failure to sequence multi-step instructions; inability to "spell WORLD backwards."
2. **Time Management**
    - **Clinical Definition:** Governed by the **DLPFC and the Temporal Lobe**; the ability to estimate duration and passage.
    - **The "Misfit" Manifestation:** "Time Blindness"—the inability to read analog clocks or judge "Rush Hour" variability.
3. **Emotion Regulation**
    - **Clinical Definition:** Maintaining an internal locus of control and "even keel" baseline.
    - **The "Misfit" Manifestation:** "External Locus of Control"; daily annoyances do not "bounce off," leading to jagged emotional peaks.
4. **Cognitive Flexibility**
    - **Clinical Definition:** Set-shifting; the ability to contemplate multiple rules or switch thoughts (tested via the "Knock-Tap Test").
    - **The "Misfit" Manifestation:** Frustration with non-linear transitions; "getting stuck" when rules change mid-task.
5. **Planning**
    - **Clinical Definition:** Deliberate specification of a sequence of actions to achieve a problem-goal.
    - **The "Misfit" Manifestation:** Lacking formed goals; waiting until the "last minute" because the long-term benefit of preparation isn't processed.
6. **Forethought**
    - **Clinical Definition:** Scenario-playing; predicting outcomes of Choice A vs. Choice B.
    - **The "Misfit" Manifestation:** Choosing the "path of least resistance"; difficulty with strategy-based games like Chess or "Dots and Boxes."
7. **Learning from Consequences**
    - **Clinical Definition:** Linking previous errors to future behavior; the brain's ability to "weigh" consequences.
    - **The "Misfit" Manifestation:** Repeating the same error and being "surprised" at the outcome; the "Animal 1 and Animal 2" failure where the brain fails to link an action to a resulting change.
8. **Organization**
    - **Clinical Definition:** Categorizing ideas/items using hierarchies and non-linear associations.
    - **The "Misfit" Manifestation:** "Jumping all over" with ideas; failure to maintain Roman-numeral outlines.
9. **Reconstitution of Information**
    - **Clinical Definition:** Receiving a message, processing it, and outputting it accurately.
    - **The "Misfit" Manifestation:** The "Telephone Game" effect; "Garbled Reconstitution" where "Buy Milk" is output as "Buy Eggs."

### The "Stop Sign" Principle

Foundationally, executive dysfunction is a failure of **Inhibitory Control**. Behavioral inhibition is the brain’s internal "Stop Sign." In our users, this **Stop Sign is late or missing**. MeshOS UI elements must act as the externalized Stop Sign—forcing a pause before impulsive transitions.

--------------------------------------------------------------------------------

## 3. Design Principles for Cognitive Flexibility and Inhibition

UI/UX patterns must translate clinical symptoms into concrete digital guardrails.

- **Inhibitory "Reset" Signals:** Based on the **Knock-Tap Test** logic, when a user switches contexts (e.g., from "Prep" to "Travel"), the UI must provide a **"No Action" signal** or a clear visual reset. This prevents perseveration—the tendency to stay stuck in the previous mental set.
- **Anti-Garble Protocol:** To combat "Garbled Reconstitution," MeshOS **forbids voice-only commands** as primary inputs. All instructions must be presented as **Written/Typed Records** to ensure a static, referencable record that survives the "Telephone Game" of processing.
- **Bite-Sized Pacing:** For Working Memory deficits, the UI must never present a wall of text. Use **Visual Outlines** (Mindjet Map logic) and color-coded hierarchies. Only one "Active Instruction" is rendered at a time.

--------------------------------------------------------------------------------

## 4. The Chain Engine: Architecting Interdependence

The Chain Engine rejects "Individualist Independence." It builds the day backward from **Anchors** (fixed commitments), recognizing that a "Jagged Baseline" is the standard.

**The Commitment Envelope Mental Model** An Anchor is not a point; it is a 5-part sequence: **Prep** (Steps) → **Buffer** → **Travel** → **Anchor** → **Recovery**

### Technical Logic

- **The Wake Ramp:** A dynamic startup sequence. Duration is determined by the **State Declaration**:
    - **High Energy:** 75 min | **Medium Energy:** 90 min | **Low Energy:** 120 min.
    - **Components (**`**wake-ramp.ts**`**):** Toilet, Hygiene, Shower, Dress, and Buffer.
- **The Exit Gate:** A mandatory boolean checklist (Keys, Phone, Meds, Bag) triggered before the "Travel" block. This is "Convivial Friction"—a deliberate stop sign that ensures the user is "ready to leave" before the transition.
- **D-1 Context Integration:** The engine pulls data from **yesterday (D-1)**.
    - If D-1 shows successful habits (meds/sleep/meals), estimates are tightened.
    - If D-1 data is missing or "Rough," the engine **defaults to "Padding"** (automatically adding 15-20% duration to all prep steps).

--------------------------------------------------------------------------------

## 5. Mirror Runtime: Real-Time Time Physics and Triage

The **Mirror** (`MirrorUI.tsx`) is the live runtime that manages the friction of existence.

### Technical Logic Flow

1. **Check:** `currentTime` is polled every 60 seconds.
2. **Calculate Runway:** `runway = (effective_arrival_deadline - current_time)`.
3. **Threshold:** If `runway < required_duration`, the Triage Engine activates.
4. **Trigger:** In V1, the `TriagePrompt.tsx` auto-shows.

### The Triage Decision Matrix

The user is presented with three radical choices for self-regulation:

1. **Protect Keystone:** Strip all non-essential steps, leaving only the "Keystone" (meds/shower) and the Anchor.
2. **Skip Anchor:** Mark the anchor as skipped and purge the chain.
3. **Recalculate:** Regenerate the plan from `now`.

### Robust Keystone Tagging

Current keystone detection is name-based (fragile). We advocate for a **Tag-Based Metadata System**. Any block tagged as `#wholeness` or `#keystone` (defaulting to Shower, Meds, Hygiene) is rendered with a **Star 🌟 icon** and an accent border. These blocks are protected from standard triage deletion unless the user explicitly skips them.

--------------------------------------------------------------------------------

## 6. Social Reciprocity and Interdependent Features

MeshOS facilitates **Access Intimacy**—the "frictional" but loving production of access.

- **The Hula-Hoop Tool:** A visual metaphor for **Conversational Distance**. The UI provides a "Social Distance" reference to help users who stand too close or too far, reducing the exhaustion of constant self-monitoring.
- **Nonverbal Signal Suite:** A feature set allowing users to establish digital "cues" with a partner (e.g., a "Wrap it up" or "Interrupting" vibrate signal on a wearable) to outsource behavioral inhibition.
- **Apology Proper:** A prompt based on the Sarkis formula: **Acknowledge Behavior ("I was late") + Improve Behavior ("I am setting a phone timer now")**.
- **Crip Cartography:** The `effective_arrival_deadline` is informed by **Critical Crowdsourcing**. If another user reports a "Misfit" (e.g., a broken elevator or blocked curb cut), the Mirror runtime automatically adjusts the `Travel` duration.

--------------------------------------------------------------------------------

## 7. Ethical Guardrails and Reframed Success

MeshOS is a tool for **World-Building**, not for making the disabled body "Productive" for capital.

### Forced Compliance Anti-Features

1. **No "Cure" Language:** All references to "remediation" or "fixing" are forbidden. We value the user "as they are" (Eli Clare).
2. **Productivity Detox:** "Independence" is not the goal. The UI supports "Anchor-less days" through the **Free Activation Prompt**, valuing the user's existence outside of labor.
3. **No Shame-Based Streaks:** Habit data informs the **Chain Engine** (D-1 logic) for accuracy; it is never used to "shame" or "gamify" compliance.
4. **Wholeness in Brokenness:** The UI must affirm that the user is "whole," even if they feel "shattered or broken." Success is defined by **Self-Regulation**, not task completion.

--------------------------------------------------------------------------------

## 8. Appendix: Component & Feature Flags

### Core Runtime vs. Progressive Disclosure Features

|   |   |   |
|---|---|---|
|Component|Function|Status|
|`MirrorUI.tsx`|Root orchestrator for real-time state.|Core|
|`Timeline.tsx`|Renders context-aware time blocks.|Core|
|`TriagePrompt.tsx`|Decision matrix for time-friction.|Core|
|`StateDeclarationPrompt.tsx`|Captures energy state for D-1 padding.|Core|
|`RealityCheckPrompt.tsx`|Alternative paths when time physics fail.|V2|
|`IntentPrompt.tsx`|"What do you need right now?" display filter.|V2|
|`FreeActivationPrompt.tsx`|Interface for anchor-less existence.|V2|
|`FeltHelpfulPrompt.tsx`|End-of-day conviviality reflection.|V2|

**Final Command:** Prioritize **Access as Friction** over "Seamlessness." Maintain the commitment to disabled people as "knowers and makers" of their own time. All UI must assume a "Jagged Baseline."