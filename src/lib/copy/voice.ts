export type Register = 'plain' | 'clinical' | 'warm';

export const copy = {
  stateDeclaration: {
    title: {
      plain:    'Where is your energy at right now?',
      clinical: 'Self-report: current activation state.',
      warm:     'How are you, right now?',
    },
    caption: {
      plain:    'There is no wrong answer. This only changes how much time the chain leaves you.',
      clinical: 'Used to set wake-ramp duration. Not stored beyond this session.',
      warm:     'Whatever you pick is just information. No score, no streak.',
    },
    options: {
      clear: {
        plain:    'Clear and ready to act.',
        clinical: 'Clear · ready to initiate action.',
        warm:     "I'm okay. Let's go.",
      },
      foggy: {
        plain:    'A bit foggy — take the gentle ramp.',
        clinical: 'Foggy · standard ramp recommended.',
        warm:     'Foggy. Easy on me, please.',
      },
      empty: {
        plain:    'Running on empty.',
        clinical: 'Depleted · extended ramp or rest day.',
        warm:     'Empty tank. I need slow.',
      },
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

  declareButton: {
    plain:    'Declare a state',
    clinical: 'Capture current state',
    warm:     'Tell the app how you are',
  },
} as const;

export type CopyKey = keyof typeof copy;
