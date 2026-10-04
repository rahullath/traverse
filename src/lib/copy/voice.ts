export type Register = 'plain' | 'clinical' | 'warm';

export const copy = {
  stateDeclaration: {
    title: {
      plain:    'Where are you in the chain right now?',
      clinical: 'Self-report: current position in the activation chain.',
      warm:     'Where are you at, right now?',
    },
    caption: {
      plain:    'There is no wrong answer. This only changes which steps the chain still shows you.',
      clinical: 'Used to filter the visible timeline. Not stored beyond today.',
      warm:     'Whatever you pick is just information. No score, no streak.',
    },
    options: {
      starting_day: {
        plain:    'Just starting the day.',
        clinical: 'Day start · show the full activation chain.',
        warm:     "Just woke up, more or less.",
      },
      ready_for_anchor: {
        plain:    "Ready — I just need to leave.",
        clinical: 'Prep complete · show departure and anchor only.',
        warm:     "I'm ready. Just tell me when to go.",
      },
      mid_chain: {
        plain:    "Somewhere in the middle.",
        clinical: 'Mid-chain · select current step.',
        warm:     "I've started. Let me show you where.",
      },
      at_anchor: {
        plain:    "I'm already there.",
        clinical: 'At anchor · mark prep and travel complete.',
        warm:     'Made it. I\'m there.',
      },
      missed_it: {
        plain:    "It's not happening today.",
        clinical: 'Anchor missed · mark skipped, no penalty.',
        warm:     "It didn't happen. That's okay.",
      },
      just_checking: {
        plain:    'Just looking.',
        clinical: 'View only · no changes.',
        warm:     'Just peeking.',
      },
    },
    stepPicker: {
      plain:    'Which step are you on?',
      clinical: 'Select the current step.',
      warm:     'Which bit are you doing now?',
    },
  },

  realityCheck: {
    openButton: {
      plain:    'What can I still fit?',
      clinical: 'Run a reality check',
      warm:     'What can I still do?',
    },
    title: {
      plain:    'Here is what fits before the anchor.',
      clinical: 'Reality check: steps that fit the remaining runway.',
      warm:     "Here's what there's room for.",
    },
    fitsLabel: {
      plain:    'fits',
      clinical: 'within runway',
      warm:     'room for',
    },
    noRoom: {
      plain:    'There is time to head straight to the anchor.',
      clinical: 'No prep steps fit. Proceed directly to departure.',
      warm:     'Just enough time to go. That still counts.',
    },
    droppedLabel: {
      plain:    "won't fit — fine to drop",
      clinical: 'exceeds runway',
      warm:     'can let go of',
    },
    passed: {
      plain:    'This anchor has already started. Nothing to fit before it.',
      clinical: 'Anchor start time has passed.',
      warm:     "That one's already started. You can still go, or let it be.",
    },
  },

  triage: {
    nudge: {
      plain:    'The chain wants more time than the runway has. Not a panic — a decision.',
      clinical: 'Required prep duration exceeds the runway window to the effective arrival deadline. A triage decision is available.',
      warm:     "The plan is a little longer than the time left. Nothing's on fire — we can choose.",
    },
    openButton: {
      plain:    'open triage',
      clinical: 'open triage decision',
      warm:     'look at the options',
    },
    title: {
      plain:    'Time physics check: we are running a bit behind the original plan.',
      clinical: 'Runway is below required duration. Triage decision required.',
      warm:     "We're a bit behind. That's information, not failure.",
    },
    caption: {
      plain:    "Don't rush or panic — let's just triage.",
      clinical: 'Three options. Each is a valid clinical decision.',
      warm:     'Pick whichever feels possible.',
    },
    protect: {
      plain:    'Protect the keystone.',
      clinical: 'Protect keystone activity (e.g. medication, hygiene).',
      warm:     'Just keep the essentials. Go.',
    },
    skip: {
      plain:    'Skip this anchor entirely.',
      clinical: 'Mark anchor as skipped. No penalty.',
      warm:     'Skip the appointment. Today is allowed to be small.',
    },
    recalc: {
      plain:    'Recalculate from right now.',
      clinical: 'Recalculate timeline from current moment.',
      warm:     'Start the plan again from now.',
    },
  },

  feltHelpful: {
    title: {
      plain:    'Did the app help carry the load for your working memory today?',
      clinical: 'Convivial-tool check: did the system reduce cognitive load today?',
      warm:     'Did this help, today?',
    },
    caption: {
      plain:    'This is a question about the tool, not about you.',
      clinical: 'A measure of the tool, not the user.',
      warm:     "It's okay if it didn't. The point is to ask.",
    },
    footer: {
      plain:    "No answer is fine either. Close when you're ready.",
      clinical: 'Skip is a valid response. The app stores nothing.',
      warm:     'Either way, thank you for being here. Goodnight.',
    },
  },

  footer: {
    plain:    'Screenshot this if you want to leave the app. The plan does not need you to stay here.',
    clinical: 'This view is intended for short, intermittent use. No data is retained between sessions.',
    warm:     "You can leave any time. The plan won't be sad.",
  },

  recalcButton: {
    plain:    'Recalculate from now',
    clinical: 'Recalculate timeline from current moment',
    warm:     'Start again from now',
  },

  declareButton: {
    plain:    'Declare a state',
    clinical: 'Capture current state',
    warm:     'Tell the app how you are',
  },
} as const;

export type CopyKey = keyof typeof copy;
