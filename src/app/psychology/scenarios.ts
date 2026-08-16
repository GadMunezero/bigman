import type { DrillCategory } from "./data";

/**
 * Local scenario bank.
 *
 * The drills work with no API key configured — these are the fallback
 * scenarios. They are written practice prompts, not market data, and they are
 * parameterised by the trader's market so the wording matches what they trade.
 */

export interface Scenario {
  category: Exclude<DrillCategory, "random">;
  text: string;
}

interface Context {
  market: string;
  instrument: string;
}

export function contextForMarket(market: string | null): Context {
  switch (market) {
    case "forex":
      return { market: "forex", instrument: "EUR/USD" };
    case "crypto":
      return { market: "crypto", instrument: "BTC" };
    case "cfd":
      return { market: "CFDs", instrument: "the index you trade" };
    case "futures":
      return { market: "futures", instrument: "your main contract" };
    default:
      return { market: "your market", instrument: "your main instrument" };
  }
}

const BANK: Record<Exclude<DrillCategory, "random">, ((c: Context) => string)[]> = {
  defusion: [
    (c) =>
      `You are down two trades on the day. A third setup forms on ${c.instrument}, but it is missing one of your required conditions. A thought arrives fully formed: "this one is obviously going to run, and I need it." Your hand is already on the mouse. What goes through your mind, and what do you do?`,
    (c) =>
      `You are flat and ${c.instrument} has just made the move you were waiting for — without you, because you were getting coffee. The thought is: "I always miss the good one." The next candle pulls back into your zone. How do you separate the thought from the decision?`,
  ],
  observer: [
    (c) =>
      `You are in a position on ${c.instrument} at your planned size. Price stalls for eleven minutes, going nowhere. You notice your jaw is tight and you have refreshed the P&L four times. Nothing about your invalidation has changed. Describe what you are feeling, name it, and say what you do next.`,
    () =>
      `Your account is up on the day for the first time this week. You feel a strong pull to close everything and protect it, even though your target has not been hit and your thesis is intact. What is actually generating that pull, and how do you respond to it?`,
  ],
  loss: [
    (c) =>
      `You just took a textbook-clean loss on ${c.instrument}. Entry was valid, stop was where the idea was wrong, size was correct. It stopped you out by two ticks and reversed straight to your target without you. What is your very next action, and what are you telling yourself?`,
    () =>
      `Second stop of the morning, both by the book. Your daily loss limit allows one more trade. You notice you are scanning charts faster than usual and the setups are starting to "kind of" qualify. What do you do with the rest of the session?`,
  ],
  holding: [
    (c) =>
      `You are in a winner on ${c.instrument}, roughly halfway to your target. Price pulls back about a third of your open profit, then stalls. Your stop is still where it belongs. Every fibre wants to close it here and bank something. What do you do, and what is the rule you are actually following?`,
    () =>
      `Your position is at 80% of target. You have been in it for forty minutes. Your plan says hold to target or invalidation, nothing else. A voice says "a bird in the hand." What decides this — the plan or the feeling? Say how you know.`,
  ],
  filtering: [
    (c) =>
      `${c.instrument} is trending hard, and it is not your setup. Nothing you trade has triggered all session. Two hours in, you find yourself building a case for an entry that would need one of your rules bent slightly. Talk through what happens next.`,
    () =>
      `You have taken your maximum trades for the day. Forty minutes before the close, the cleanest version of your setup you have seen all week appears. What do you do, and what is the cost of each choice?`,
  ],
  drawdown: [
    () =>
      `You are three losses into the session, all valid, and your prop account's trailing drawdown is now the tightest it has been. You have one trade left inside your rules. Do you take it, and what determines the answer?`,
    () =>
      `You are 60% of the way through your evaluation's maximum drawdown, with two weeks of the period left. You notice you are sizing down out of fear rather than out of plan, and skipping valid setups. How do you correct that without swinging to the other extreme?`,
  ],
  process: [
    () =>
      `You broke a rule today — entered before confirmation — and it turned into your biggest winner of the week. Your P&L is green and your process grade is an F. How do you log this, and what do you tell yourself tomorrow morning?`,
    () =>
      `You followed every rule perfectly for five sessions and finished the week down. A friend asks how the week went. What is your honest answer, and what does that answer say about how you are measuring your performance?`,
  ],
  identity: [
    () =>
      `You are one bad day from failing your third evaluation this year. You catch yourself thinking "maybe I'm just not built for this." A valid setup is forming right now. What do you do with that thought, and what do you do with the setup?`,
    () =>
      `Someone in your trading group posts a large payout screenshot. You are green on the month but well behind that number. You notice a strong urge to increase size tomorrow. Where is that urge coming from, and what does the professional response look like?`,
  ],
};

export function pickLocalScenario(
  category: DrillCategory,
  context: Context,
  seed = Math.random(),
): Scenario {
  const categories = Object.keys(BANK) as Exclude<DrillCategory, "random">[];
  const resolved =
    category === "random" ? categories[Math.floor(seed * categories.length)] : category;

  const options = BANK[resolved];
  const text = options[Math.floor(seed * options.length)](context);

  return { category: resolved, text };
}

// ---------------------------------------------------------------------------
// Local (no-API) response evaluation
// ---------------------------------------------------------------------------

export type Rating = "SOLID" | "PARTIAL" | "REACTIVE";

const PROCESS_MARKERS = [
  "my plan", "the plan", "my rule", "my rules", "invalidation", "criteria",
  "checklist", "written", "process", "stop stays", "same size", "sample",
  "expectancy", "no trade", "wait", "log it", "journal", "grade",
];

const REACTIVE_MARKERS = [
  "make it back", "get it back", "revenge", "double", "size up", "bigger size",
  "move my stop", "move the stop", "widen", "average down", "chase", "need this one",
  "have to win", "prove", "deserve",
];

const AWARENESS_MARKERS = [
  "i notice", "i feel", "i'm noticing", "im noticing", "fear", "urge", "anxious",
  "frustrated", "aware", "observe", "name it", "breathe", "pause", "reset",
];

/**
 * Rubric-based evaluation used when no model API key is configured.
 *
 * This is deliberately transparent about what it is: a keyword-and-structure
 * rubric, not a psychologist. It counts process language, reactive language and
 * self-awareness language, and reports what it actually found rather than
 * pretending to have understood the response.
 */
export function evaluateLocally(response: string): { rating: Rating; feedback: string } {
  const text = response.toLowerCase();
  const count = (markers: string[]) => markers.filter((m) => text.includes(m)).length;

  const process = count(PROCESS_MARKERS);
  const reactive = count(REACTIVE_MARKERS);
  const awareness = count(AWARENESS_MARKERS);
  const substantial = response.trim().split(/\s+/).length >= 35;

  let rating: Rating;
  if (reactive > 0 && process === 0) rating = "REACTIVE";
  else if (reactive > process) rating = "REACTIVE";
  else if (process >= 2 && reactive === 0 && substantial) rating = "SOLID";
  else rating = "PARTIAL";

  const parts: string[] = [];

  if (process > 0) {
    parts.push(
      `You referenced your plan or your rules ${process} time${process === 1 ? "" : "s"} — that is the anchor that keeps a decision from being made by the feeling.`,
    );
  } else {
    parts.push(
      "Your answer did not reference a rule, a written plan, or an invalidation point. Under pressure, an answer with no anchor tends to become whatever the moment wants.",
    );
  }

  if (awareness > 0) {
    parts.push(
      "You named what you were feeling rather than acting straight from it, which is the gap that defusion is supposed to create.",
    );
  } else {
    parts.push(
      "You did not name the emotion in play. Naming it — 'fear is appearing', not 'I am scared' — is what creates room to choose.",
    );
  }

  if (reactive > 0) {
    parts.push(
      "There is recovery language in your response — wanting to make something back, size up, or move a stop. That is the exact pattern these drills exist to catch.",
    );
  }

  if (!substantial) {
    parts.push("The response is short. Short answers usually skip the part where the decision actually gets made.");
  }

  parts.push(
    "Note: no model API key is configured, so this is a rubric-based check on the language you used, not a full psychological reading of your answer.",
  );

  return { rating, feedback: parts.join(" ") };
}
