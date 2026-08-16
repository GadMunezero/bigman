/**
 * Static content for the psychology workspace.
 *
 * Kept as data rather than markup so the same models can drive the cards here,
 * the drill categories, and anything that consumes them later.
 */

export type ModelCategory = "foundation" | "edge" | "execution" | "identity";

export interface MentalModel {
  id: string;
  category: ModelCategory;
  icon: string;
  title: string;
  tagline: string;
  panels: { kicker: string; text: string }[];
  speech: string;
  apply: string;
  warning: string;
}

export const MENTAL_MODELS: MentalModel[] = [
  {
    id: "casino",
    category: "foundation",
    icon: "EV",
    title: "The casino model",
    tagline: "The house doesn't care about hand 47. It cares about hand 10,000.",
    panels: [
      {
        kicker: "Scene",
        text: "You take a valid setup, manage risk correctly, and still lose. The emotional brain screams: the setup is broken.",
      },
      {
        kicker: "Mistake",
        text: "Most traders judge an edge by the last trade. That is like a casino closing blackjack after one bad table.",
      },
      {
        kicker: "Correction",
        text: "The casino protects its rules and keeps dealing. Your job is to protect risk, repeat the edge, and wait for sample size.",
      },
    ],
    speech: "The trade is one hand. The system is the casino. Do not confuse them.",
    apply:
      "Use a 100-trade sample before judging an edge. Grade execution after each trade, not whether price paid you immediately.",
    warning: "Three losses do not invalidate an edge. They test whether you actually believe in process.",
  },
  {
    id: "athlete",
    category: "foundation",
    icon: "OS",
    title: "The trader athlete",
    tagline: "Trading is not a prediction game. It is a performance sport.",
    panels: [
      {
        kicker: "Scene",
        text: "A trader starts the day thinking about P&L, passing the challenge, or making back yesterday's loss. The scoreboard becomes louder than the process.",
      },
      {
        kicker: "Mistake",
        text: "Athletes do not perform best by staring at the score. Outcome focus creates fear, greed, urgency and revenge.",
      },
      {
        kicker: "Correction",
        text: "Train consistency under pressure: pre-trade game plan, process-first log, next-play reset, loss-streak rehearsal, and a daily behaviour score.",
      },
    ],
    speech:
      "You are not here to predict perfectly. You are here to execute your system correctly under uncertainty.",
    apply:
      "Before the session, write IF-THEN conditions, risk, daily loss limit and your emotional state. After each trade, grade plan-following before P&L.",
    warning: "A winning trade with poor behaviour still trains the wrong athlete.",
  },
  {
    id: "surgeon",
    category: "foundation",
    icon: "Rx",
    title: "The surgeon model",
    tagline: "A surgeon doesn't improvise mid-operation.",
    panels: [
      {
        kicker: "Scene",
        text: "The market opens fast. Candles stretch. You feel pressure to adjust the plan because this one looks different.",
      },
      {
        kicker: "Mistake",
        text: "Changing the plan during stress hands control to adrenaline. The trader becomes reactive instead of surgical.",
      },
      {
        kicker: "Correction",
        text: "Your pre-market work is the operation plan: levels, entry, stop, risk and max loss are decided before the first cut.",
      },
    ],
    speech: "Once the bell rings, execute the plan you made while calm.",
    apply:
      "Write your levels and invalidation before entry. If the trade requires new logic after entry, it was not ready.",
    warning: "Mid-trade creativity is usually fear wearing a clever costume.",
  },
  {
    id: "forecaster",
    category: "edge",
    icon: "70%",
    title: "The weather forecaster",
    tagline: "A 70% chance of rain doesn't mean it will rain.",
    panels: [
      {
        kicker: "Scene",
        text: "The statistical setup is strong, but price rejects and stops you out. You think: the data lied.",
      },
      {
        kicker: "Mistake",
        text: "Probability is not prophecy. An 80% edge still contains losing trades. The losing trades are part of the forecast.",
      },
      {
        kicker: "Correction",
        text: "Bring the umbrella: position size, stop, and acceptance. You are trading probability, not certainty.",
      },
    ],
    speech: "Edge means favoured outcome, not guaranteed outcome.",
    apply: "Before entry, say the failure case out loud. If you cannot accept it, size is too big.",
    warning: "A valid losing trade is normal. An invalid winning trade is dangerous.",
  },
  {
    id: "poker",
    category: "edge",
    icon: "A♠",
    title: "The poker player",
    tagline: "Good decision + bad outcome = still a good decision.",
    panels: [
      {
        kicker: "Scene",
        text: "You make a disciplined trade, lose, then watch price run without you. The mind wants to punish the decision.",
      },
      {
        kicker: "Mistake",
        text: "Outcome bias says a losing trade was bad and a winning trade was good. That is how bad habits get rewarded.",
      },
      {
        kicker: "Correction",
        text: "A poker pro reviews the decision at the moment of the bet. You review the trade at the moment of entry.",
      },
    ],
    speech: "Do not let the last card rewrite your process grade.",
    apply:
      "Screenshot the entry and answer: did I know enough at that moment to take this trade by my rules?",
    warning: "The most poisonous trade is the rule-breaking winner.",
  },
  {
    id: "inversion",
    category: "edge",
    icon: "INV",
    title: "Inversion",
    tagline: "Ask what destroys the account, then avoid it.",
    panels: [
      {
        kicker: "Scene",
        text: "You want the perfect entry. You search for more indicators, more confirmation, more certainty.",
      },
      {
        kicker: "Mistake",
        text: "The account rarely dies from missing a perfect setup. It dies from one preventable behaviour repeated under stress.",
      },
      {
        kicker: "Correction",
        text: "List the fatal moves: moving stops, revenge, oversizing, chasing, news gambling. Then do none of them.",
      },
    ],
    speech: "Survival is the first edge. Profit is what can happen after survival.",
    apply: "Read your account-destroyer list before every session and before returning after a loss.",
    warning: "If a destructive behaviour feels tempting, the trade size is already too large for your state.",
  },
  {
    id: "pilot",
    category: "execution",
    icon: "CHK",
    title: "The pilot checklist",
    tagline: "Checklists exist because memory fails under pressure.",
    panels: [
      {
        kicker: "Scene",
        text: "You have done the routine hundreds of times, so you skip it. The market opens and one missing step becomes expensive.",
      },
      {
        kicker: "Mistake",
        text: "Experience creates confidence, but stress still narrows attention. The brain drops details when speed rises.",
      },
      {
        kicker: "Correction",
        text: "The checklist is your external brain. It works even when you are tired, excited or impatient.",
      },
    ],
    speech: "A professional does the boring part before the dangerous part.",
    apply: "No checklist, no first trade. Treat that rule as part of risk management.",
    warning: "The skipped routine is often the first domino.",
  },
  {
    id: "dichotomy",
    category: "execution",
    icon: "DC",
    title: "Dichotomy of control",
    tagline: "You control inputs. The market controls outputs.",
    panels: [
      {
        kicker: "Scene",
        text: "Price tags your stop, then reverses. You feel insulted, as if the market targeted you personally.",
      },
      {
        kicker: "Mistake",
        text: "Trying to control the outcome creates anger. Anger creates revenge. Revenge creates account damage.",
      },
      {
        kicker: "Correction",
        text: "Control criteria, size, stop, entry, and whether you trade at all. Release the candle after entry.",
      },
    ],
    speech: "Your job is clean input. The market owns output.",
    apply: "After entry, manage only according to rules already written. No bargaining with candles.",
    warning: "Most emotional pain comes from trying to control what was never yours.",
  },
  {
    id: "cost",
    category: "execution",
    icon: "$",
    title: "Loss as cost of goods",
    tagline: "A restaurant doesn't panic when the produce bill arrives.",
    panels: [
      { kicker: "Scene", text: "A normal stop-loss hits. The body reacts like something went wrong." },
      {
        kicker: "Mistake",
        text: "You treat every loss as failure, so you try to erase it immediately. That turns a business cost into a discipline problem.",
      },
      {
        kicker: "Correction",
        text: "A planned loss is operating expense. The only unacceptable loss is the one outside the plan.",
      },
    ],
    speech: "Losses inside risk are not emergencies. They are rent for running the edge.",
    apply:
      "Predefine max daily loss and risk per trade. If the loss is inside the number, accept it without negotiation.",
    warning: "The panic after a normal loss is more dangerous than the loss.",
  },
  {
    id: "firstprinciples",
    category: "foundation",
    icon: "1+1",
    title: "First principles thinking",
    tagline: "Strip away what feels right. Return to what is true.",
    panels: [
      { kicker: "Scene", text: "A setup looks close. It feels familiar. You remember a similar trade that worked." },
      {
        kicker: "Mistake",
        text: "The word 'almost' sneaks into the decision. Almost valid becomes real risk with no real edge.",
      },
      {
        kicker: "Correction",
        text: "Break the setup into binary criteria. If any required piece is missing, the answer is no.",
      },
    ],
    speech: "Feelings are analogies. Criteria are first principles.",
    apply: "Use a yes/no entry checklist: structure confirmed, entry zone valid, stop defined, target logical.",
    warning: "Most damage comes from trades that look like your setup but are not your setup.",
  },
  {
    id: "process",
    category: "identity",
    icon: "ID",
    title: "Process identity",
    tagline: "I am a trader who follows process, not a P&L number.",
    panels: [
      { kicker: "Scene", text: "A funded account makes every tick feel personal. Balance becomes identity." },
      {
        kicker: "Mistake",
        text: "If identity equals P&L, every loss attacks who you are. Defensive trading follows.",
      },
      {
        kicker: "Correction",
        text: "Anchor identity to behaviour: I follow rules, protect risk, and execute my setup with precision.",
      },
    ],
    speech: "The account can fluctuate. The process is who you are.",
    apply: "Grade the day by process first. P&L is recorded, but it does not decide whether you traded well.",
    warning: "Funded trader is a status. Disciplined trader is an identity.",
  },
];

// ---------------------------------------------------------------------------

export interface Principle {
  n: string;
  tag: string;
  tone: "info" | "violet" | "accent" | "warn";
  title: string;
  body: string[];
  callout?: string;
  contrast?: { badLabel: string; bad: string[]; goodLabel: string; good: string[] };
}

export const PRINCIPLES: Principle[] = [
  {
    n: "01",
    tag: "Awareness",
    tone: "info",
    title: "Metacognition — watching your own mind",
    body: [
      "The professional trader runs two parallel processes: reading the market and observing their own mental state. Most losing trades happen automatically — an urge appears and becomes an action before any evaluation occurs.",
      "Metacognition inserts a gap. Instead of reacting to “I need to exit now,” you notice what is generating that signal: is it fear, or actual invalidation of your thesis?",
    ],
    callout: "The skill is not suppressing impulses — it's seeing them clearly enough to choose.",
  },
  {
    n: "02",
    tag: "Cognitive control",
    tone: "violet",
    title: "Cognitive fusion — why revenge trading happens",
    body: [
      "Fusion is when you treat a thought as literal truth and act accordingly. “I'm about to lose” becomes an emergency. “I need my money back” becomes an oversized impulsive entry.",
      "Defusion creates a single moment of distance: “my brain is generating urgency because uncertainty feels dangerous.” That is not dismissing the thought — it is labelling it accurately. Decision quality returns when you stop treating every mental alarm as a valid signal.",
    ],
    contrast: {
      badLabel: "Fused",
      bad: ["Thought = fact", "Urgency = immediate action", "Discomfort = exit signal"],
      goodLabel: "Defused",
      good: ["Thought = mental event", "Urgency = noted, evaluated", "Discomfort = tolerated"],
    },
  },
  {
    n: "03",
    tag: "Identity",
    tone: "accent",
    title: "Identity-based trading — when ego enters every trade",
    body: [
      "Many traders unknowingly use their P&L to answer deeper questions: am I smart? Am I good enough? Am I proving something? When that is true, every trade carries psychological stakes far beyond money.",
      "The professional version sounds quieter: “my job is to execute my edge repeatedly. One trade is one data point.” That identity is stable because it is process-based — it does not fluctuate with outcomes.",
    ],
    callout: "When trading becomes identity proof, drawdown becomes existential. That's when rules break.",
  },
  {
    n: "04",
    tag: "Awareness",
    tone: "info",
    title: "Attentional control — what you focus on, you amplify",
    body: [
      "The market is engineered to hijack attention: floating P&L, missed moves, random candles that look like setups. Your nervous system responds to whatever you watch. Watching money fluctuate produces cortisol, not clarity.",
      "Elite traders deliberately redirect focus toward inputs they control — execution quality, structure, alignment with plan.",
    ],
    contrast: {
      badLabel: "Reactive focus",
      bad: ["Floating P&L", "Missed opportunities", "What could have been"],
      goodLabel: "Disciplined focus",
      good: ["Setup criteria", "Market structure", "Execution quality"],
    },
  },
  {
    n: "05",
    tag: "Performance state",
    tone: "warn",
    title: "Flow — what it is and what breaks it",
    body: [
      "Flow in trading emerges when preparation is solid, risk is genuinely accepted, and execution becomes intuitive rather than effortful. You stop deliberating and start reading. The market feels slower, not faster.",
      "The common misconception is that flow can be forced. It cannot. Traders who push harder — forcing setups, overtrading — destroy the conditions that allow it to arise.",
    ],
    callout:
      "Flow killers: watching P&L tick, trying to “make money today”, forcing setups when the market is quiet. Flow is a byproduct of trust, not control.",
  },
  {
    n: "06",
    tag: "Resilience",
    tone: "warn",
    title: "Psychological flexibility — acting well while uncomfortable",
    body: [
      "This is the core professional skill. Can you feel drawdown, watch open profit shrink, hold through uncertainty — and still execute your system correctly?",
      "Most traders require emotional comfort to follow their rules. They exit early because it feels better. They skip setups because the recent loss is still active. Psychological flexibility means your behaviour is governed by your plan, not your emotional state.",
    ],
    callout: "Discomfort is not a reason to deviate. It's the price of consistency.",
  },
  {
    n: "07",
    tag: "Awareness",
    tone: "info",
    title: "The observer — separating emotion from action",
    body: [
      "Most traders become their emotions during a trade. “I am scared” means the fear is making decisions. Observer mode introduces language that creates distance: “fear is appearing”, “greed is increasing”, “I want certainty right now”.",
      "That shift — from being an emotion to noticing it — is the functional space where choice lives. Without that separation, emotional state and execution become the same thing.",
    ],
  },
  {
    n: "08",
    tag: "Skill execution",
    tone: "violet",
    title: "Automaticity — why over-analysing live trades is a trap",
    body: [
      "The goal of preparation is trained recognition, not endless analysis at the point of decision. At high levels, setups become recognisable without effort. Execution is quiet. Decisions are fast because pattern recognition is doing the work.",
      "But pressure disrupts this. Traders who have built genuine skill begin interfering with it under stress — micromanaging entries, second-guessing exits, overriding what they trained. This is the direct equivalent of an athlete choking.",
    ],
    callout: "More thinking during a live trade is often a symptom of anxiety, not analytical rigour.",
  },
  {
    n: "09",
    tag: "Mindset",
    tone: "accent",
    title: "Cognitive reappraisal — how you interpret a loss determines its cost",
    body: [
      "The same losing trade produces different physiological responses depending on what it means to you. “Loss equals failure” generates shame and urgency. “Loss equals statistical business expense” generates data.",
      "Your nervous system reacts to interpretation more than to events themselves. Reappraisal is not rationalisation — it is replacing an inaccurate frame with an accurate one.",
    ],
    contrast: {
      badLabel: "Amateur frame",
      bad: ["Loss = failure", "Outcome = judgment", "Drawdown = danger signal"],
      goodLabel: "Pro frame",
      good: ["Loss = business expense", "Outcome = data point", "Drawdown = normal variance"],
    },
  },
  {
    n: "10",
    tag: "Focus",
    tone: "accent",
    title: "Process orientation — the counterintuitive path to better P&L",
    body: [
      "Focusing directly on making money produces worse trading than focusing on process quality. Money-focus activates outcome anxiety, which degrades decision-making. Process-focus keeps you in your locus of control.",
      "The right post-session questions are not “how much did I make?” — they are: was my bias correct? Did I execute cleanly? Was risk managed? Did my attention stay stable?",
    ],
    callout:
      "Answer those well consistently and the money follows. That is not wishful thinking — it is how an edge compounds without behaviour destroying it.",
  },
  {
    n: "11",
    tag: "Identity",
    tone: "violet",
    title: "Decoupling self-worth from outcomes",
    body: [
      "Markets are probabilistic. A good trade can lose. A bad trade can win. If your self-worth moves with your P&L, you will be psychologically unstable by definition — because the market will produce drawdown regardless of how good you become.",
      "Professional identity is built on factors that are not subject to outcome randomness: did I follow my process? Did I respect risk? Did I act with discipline? Those can be answered yes even on a losing day.",
    ],
    callout: "Outcome-based identity cannot survive a probabilistic career. Process-based identity can.",
  },
  {
    n: "12",
    tag: "Development",
    tone: "warn",
    title: "Deliberate practice — the difference between trading and improving",
    body: [
      "Most traders trade. Very few deliberately practise. Trading accumulates experience. Deliberate practice extracts learning from it. The difference is intention and feedback loops.",
      "Deliberate practice looks like reviewing screenshots of the same setup until recognition is instant, replaying sessions to study emotional patterns, journalling what happened before each rule deviation, and working on one weakness at a time.",
    ],
    callout:
      "Volume of trades without review reinforces whatever you already do — including your mistakes.",
  },
];

// ---------------------------------------------------------------------------

export const WINNER_LOSER = {
  reactive: [
    ["Scoreboard addicted", "Measures the day by money, then lets P&L decide self-worth."],
    ["Improvises under heat", "Changes stops, entries and size after adrenaline arrives."],
    ["Needs to be right", "Treats a normal loss like a personal insult from the chart."],
    ["Trades feelings", "Boredom, FOMO, revenge and urgency become fake signals."],
  ],
  professional: [
    ["Process scoreboard", "Grades the day by rule adherence before looking at outcome."],
    ["Pre-committed", "Defines levels, risk, stop and invalidation before entry."],
    ["Loss tolerant", "Accepts planned losses as the cost of running a real edge."],
    ["Waits cleanly", "No valid setup means no trade, and no button pressing for entertainment."],
  ],
  rounds: [
    ['"I need to make it back."', '"The next trade is independent."', "The market does not owe refunds."],
    ['"This candle looks strong."', '"Does it match my written rule?"', "Strong is not the same as valid."],
    ['"I will move the stop a little."', '"The stop is where the idea is wrong."', "Pain does not get editing rights."],
    ['"I am hot today. Size up."', '"Same size. Same checklist."', "Confidence still reports to risk."],
    ['"Waiting feels useless."', '"Waiting is a position."', "Patience is not empty time. It is risk control."],
    ['"A win means I traded well."', '"Execution decides the grade."', "Outcome can lie. Behaviour leaves evidence."],
  ],
};

export const TRAINING_PROTOCOL = [
  {
    step: "01 pre-open",
    title: "Morning calibration",
    body: "Rate sleep, stress, focus and patience. If baseline is below 6, the day starts in defence mode.",
    line: '"I do not need to feel perfect. I need to behave clearly."',
  },
  {
    step: "02 map",
    title: "Written game plan",
    body: "Mark your levels, your invalidation, and the IF-THEN entry rule — before the session, in writing.",
    line: "If the plan cannot be written in one sentence, it is not a plan yet.",
  },
  {
    step: "03 pressure",
    title: "Five-loss simulation",
    body: "Imagine five valid losses in a row. The win condition is not recovery. It is fixed size, no revenge, and obeying stop-for-day.",
    line: "If five losses can make you abandon rules, rehearse five losses until they cannot.",
  },
  {
    step: "04 live",
    title: "One-play focus",
    body: "During the trade, only one question matters: am I still inside the written plan?",
    line: "Candles are loud. The checklist is louder.",
  },
  {
    step: "05 reset",
    title: "Next-play reset",
    body: "After every trade, take the 90-second reset. The next setup is independent from the last outcome.",
    line: "Revenge trading is just yesterday trying to trade today.",
  },
  {
    step: "06 review",
    title: "Post-session film room",
    body: "Screenshot the entry, grade process, name the strongest behaviour, and name the one behaviour to train tomorrow.",
    line: "A trader who reviews behaviour compounds faster than one who only reviews candles.",
  },
];

export const GRADES = [
  {
    grade: "A",
    tone: "accent",
    title: "Elite execution",
    body: "Valid setup, entry zone respected, stop held, size correct, calm reset.",
    points: ["Result does not matter.", "This is an identity rep.", "Screenshot and repeat."],
  },
  {
    grade: "B",
    tone: "info",
    title: "Professional with a wobble",
    body: "The setup was valid and risk was protected, but one small behaviour leaked: hesitation, early exit, minor impatience.",
    points: ["Write the wobble.", "Do not punish yourself.", "Fix one thing next trade."],
  },
  {
    grade: "C",
    tone: "warn",
    title: "Warning rep",
    body: "Close enough to learn, not clean enough to call professional. Something emotional entered the cockpit.",
    points: ["Mandatory reset.", "Reduce size or pause.", "Name the trigger clearly."],
  },
  {
    grade: "F",
    tone: "danger",
    title: "Stop trading",
    body: "Revenge, FOMO, moved stop, oversized, ignored max loss, or traded an almost-setup.",
    points: ["No negotiation.", "Close the platform.", "Review when calm."],
  },
  {
    grade: "?",
    tone: "violet",
    title: "The honesty check",
    body: "If you need a long story to explain why it was valid, it probably was not valid. Clean trades are easy to describe.",
    points: ["Was the setup written before entry?", "Was risk accepted before entry?", "Would you take it 100 times?"],
  },
  {
    grade: "+",
    tone: "info",
    title: "Discipline win",
    body: "Sometimes the best trade is the one you did not take. Log avoided FOMO as a real performance rep.",
    points: ["Skipped bad setup.", "Held daily cap.", "Protected tomorrow."],
  },
];

export const DESTROYERS = [
  {
    n: "01",
    title: "Moving the stop",
    body: "The trade was planned with one risk number. Then fear tries to edit the contract after signing.",
    counter: "Stop goes where the idea is wrong, not where pain feels smaller.",
  },
  {
    n: "02",
    title: "Revenge after loss",
    body: "The last trade starts managing the next trade. Now you are not trading the market, you are arguing with memory.",
    counter: "90-second reset, then only a fresh valid setup can speak.",
  },
  {
    n: "03",
    title: "Almost-setup entry",
    body: "It looks close. It feels close. It is not your setup. Almost is where discipline goes to get expensive.",
    counter: "If one required box is missing, the trade is missing.",
  },
  {
    n: "04",
    title: "Win-streak ego",
    body: "After a few wins, size starts whispering that you are special. The plan suddenly feels optional.",
    counter: "Same size, same checklist, same humility.",
  },
  {
    n: "05",
    title: "News gambling",
    body: "Volatility arrives and discipline pretends it is opportunity. Fast candles make slow thinking disappear.",
    counter: "No major release without a written event plan.",
  },
  {
    n: "06",
    title: "Overtrading boredom",
    body: "No setup appears, so the mind manufactures one because waiting feels like doing nothing.",
    counter: "Waiting is a position. No trade is also execution.",
  },
];

export const CHECKLIST_ITEMS = [
  "Rate sleep and emotional baseline. If below 6, reduce size.",
  "Mark your key levels: overnight high and low, prior day high and low, and session opening range.",
  "Define today's bias in one written sentence, with the condition that would invalidate it.",
  "Write the IF-THEN entry rule for the setup you are allowed to take today.",
  "Check the economic calendar. No trading around major releases without a written plan.",
  "State max daily loss and position size out loud.",
  "Confirm the one setup you are trading today — and that nothing else qualifies.",
];

export const HABIT_LEAKS = [
  { value: "Moved stop", kind: "Risk leak", note: "Fear edited the plan after entry." },
  { value: "Early entry", kind: "Timing leak", note: "You entered before the criteria were complete." },
  { value: "Chased move", kind: "FOMO leak", note: "You paid for speed because waiting felt painful." },
  { value: "Revenge trade", kind: "Emotion leak", note: "The last trade tried to control the next trade." },
  { value: "Oversized", kind: "Size leak", note: "Confidence or fear made risk bigger than the plan." },
  { value: "Traded boredom", kind: "Patience leak", note: "No valid setup appeared, so the brain manufactured action." },
];

export const HABIT_PRESCRIPTIONS: Record<string, string> = {
  "Moved stop":
    "Next week's rule: stop placement is final before entry. If you want to move it, close the platform first.",
  "Early entry":
    "Next week's rule: no entry until every criterion on your written checklist is confirmed.",
  "Chased move": "Next week's rule: if the move is already gone, the trade is dead. Wait for the next setup.",
  "Revenge trade": "Next week's rule: after any loss, a mandatory 90-second reset before another decision.",
  Oversized: "Next week's rule: one fixed risk size all week. Confidence does not get a raise.",
  "Traded boredom": "Next week's rule: no setup means no trade. Waiting counts as execution.",
};

export const DRILL_CATEGORIES = [
  { id: "random", label: "Random", sub: "Any category, any scenario" },
  { id: "defusion", label: "Defusion", sub: "Separate thought from action" },
  { id: "observer", label: "Observer mode", sub: "Notice emotions without reacting" },
  { id: "loss", label: "Loss response", sub: "The moment after a red trade" },
  { id: "holding", label: "Holding winners", sub: "Resist premature exits" },
  { id: "filtering", label: "Setup filtering", sub: "FOMO and missed entries" },
  { id: "drawdown", label: "Drawdown days", sub: "Multi-loss session discipline" },
  { id: "process", label: "Process focus", sub: "Execution over P&L" },
  { id: "identity", label: "Identity", sub: "Ego and self-worth in trades" },
] as const;

export type DrillCategory = (typeof DRILL_CATEGORIES)[number]["id"];
