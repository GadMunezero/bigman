"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProfileInput } from "@/lib/types";
import styles from "./quiz.module.css";

interface Option {
  value: string;
  label: string;
  hint?: string;
}

interface Question {
  /** Key on the profile this answer writes to. */
  key: keyof ProfileInput;
  title: string;
  help?: string;
  options: Option[];
  multi?: boolean;
  maxSelections?: number;
  /** Multi-select questions where choosing nothing is a valid answer. */
  allowEmpty?: boolean;
  /** Only asked when this returns true — this is what makes the quiz adaptive. */
  when?: (answers: Answers) => boolean;
  narrow?: boolean;
}

type Answers = Record<string, string | string[] | undefined>;

const ANALYSIS_STEPS = [
  "Understanding your trading style",
  "Checking challenge rules",
  "Removing incompatible challenges",
  "Calculating your matches",
];

/**
 * Stands in for "I don't mind" on single-select questions.
 *
 * Never an empty string: the quiz decides whether a question has been answered
 * by whether its value is truthy, so an empty option reads as unanswered and
 * blocks the Continue button forever.
 */
const NO_PREFERENCE = "no_preference";

const MARKET_OPTIONS: Record<string, Option> = {
  futures: { value: "futures", label: "Futures", hint: "ES, NQ, CL, GC and similar" },
  forex: { value: "forex", label: "Forex", hint: "Currency pairs" },
  cfd: { value: "cfd", label: "CFDs", hint: "Indices, commodities, shares" },
  crypto: { value: "crypto", label: "Crypto" },
};

function buildQuestions(
  accountSizes: number[],
  platforms: string[],
  markets: string[],
): Question[] {
  const sizeOptions: Option[] = accountSizes.map((size) => ({
    value: String(size),
    label: `$${(size / 1000).toLocaleString("en-US")}K`,
  }));

  return [
    {
      key: "market",
      title: "What do you trade?",
      help: "This is the first filter. A challenge that doesn't cover your market is removed outright.",
      // Built from what the catalogue actually covers. Offering a market with
      // nothing published would walk the trader through the whole questionnaire
      // to a guaranteed no-match, and "multiple markets" is only a meaningful
      // answer when there is more than one to span.
      //
      // With one market there is nothing to choose, so the question is not
      // asked at all and Quiz seeds the answer instead. Asking it anyway cost a
      // click and made the progress counter jump — the later platform question
      // depends on this answer, so the total went "1 of 11" then "2 of 12".
      when: () => markets.length > 1,
      options: [
        ...markets.map((m) => MARKET_OPTIONS[m]).filter(Boolean),
        ...(markets.length > 1
          ? [{ value: "multiple", label: "Multiple markets", hint: "Don't narrow by market" }]
          : []),
      ],
    },
    {
      key: "trading_style",
      title: "How do you usually trade?",
      options: [
        { value: "scalping", label: "Scalping", hint: "Many trades, very short holds" },
        { value: "day_trading", label: "Day trading", hint: "Flat by the close" },
        { value: "swing_trading", label: "Swing trading", hint: "Multi-day positions" },
        { value: "news_trading", label: "News trading", hint: "Around economic releases" },
        { value: "algorithmic", label: "Algorithmic / EA", hint: "Automated execution" },
        { value: "copy_trading", label: "Copy trading" },
        { value: "mixed", label: "Mixed", hint: "It depends on the day" },
      ],
    },
    {
      key: "holding_period",
      title: "How long do you usually hold a position?",
      help: "This decides whether overnight and weekend rules can disqualify a challenge for you.",
      options: [
        { value: "seconds", label: "Seconds" },
        { value: "minutes", label: "Minutes" },
        { value: "hours", label: "Hours" },
        { value: "overnight", label: "Overnight" },
        { value: "several_days", label: "Several days" },
      ],
      narrow: true,
    },
    {
      key: "news_trading",
      title: "Do you trade around major economic news?",
      help: "If you trade news frequently, challenges that prohibit it are removed rather than ranked lower.",
      options: [
        { value: "frequently", label: "Yes, frequently" },
        { value: "sometimes", label: "Sometimes" },
        { value: "rarely", label: "Rarely" },
        { value: "never", label: "Never" },
      ],
      narrow: true,
    },
    {
      key: "overnight_required",
      title: "Do you need to hold positions overnight?",
      options: [
        { value: "yes", label: "Yes", hint: "Required — non-negotiable" },
        { value: "sometimes", label: "Sometimes" },
        { value: "no", label: "No" },
      ],
      narrow: true,
    },
    {
      key: "weekend_required",
      title: "Do you need to hold through the weekend?",
      when: (a) => a.trading_style === "swing_trading" || a.holding_period === "several_days",
      options: [
        { value: "true", label: "Yes, I hold over weekends" },
        { value: "false", label: "No, I close before Friday's close" },
      ],
      narrow: true,
    },
    {
      key: "ea_required",
      title: "Do you require automated trading?",
      help: "Some firms allow EAs with conditions, and some prohibit them entirely.",
      when: (a) => a.trading_style === "algorithmic",
      options: [
        { value: "true", label: "Yes, my strategy is automated" },
        { value: "false", label: "No, I execute manually" },
      ],
      narrow: true,
    },
    {
      key: "challenge_approach",
      title: "How do you want to approach the challenge?",
      help: "This changes how everything else is weighted more than any other answer.",
      options: [
        {
          value: "pass_fast",
          label: "Pass as quickly as possible",
          hint: "Low targets, no minimum days, room to push",
        },
        {
          value: "normal",
          label: "Pass at a normal pace",
          hint: "A balance of speed and safety",
        },
        {
          value: "protect",
          label: "Take my time and protect the account",
          hint: "Stable drawdown, fewer ways to fail by accident",
        },
      ],
    },
    /*
     * The four questions below replace "would you describe yourself as
     * aggressive or conservative?".
     *
     * That question asked about self-image. These ask about facts a trader can
     * read off their own records, and each one decides a specific rule:
     * frequency decides whether minimum trading days are harmless or
     * disqualifying, profit shape decides whether a consistency rule can ever
     * bind, risk width decides whether a daily loss limit fits the strategy,
     * and the goal decides whether payout cadence or entry price should win a
     * tie. `risk_style` is still on the profile — it is now derived from
     * `risk_width` rather than asked.
     */
    {
      key: "trade_frequency",
      title: "How often do you actually trade?",
      help: "This decides whether a minimum-trading-days rule is harmless or disqualifying for you.",
      options: [
        { value: "many_daily", label: "20+ trades a day", hint: "High frequency, small holds" },
        { value: "few_daily", label: "A few trades a day" },
        { value: "few_weekly", label: "A few trades a week" },
        { value: "few_monthly", label: "A few trades a month", hint: "Only A+ setups" },
      ],
      narrow: true,
    },
    {
      key: "profit_shape",
      title: "When you have a profitable month, where does the profit come from?",
      help: "The single most useful thing you can tell us. A consistency rule caps what share of your profit one day may contribute — it is meaningless for an even earner and can stop a withdrawal entirely for a trader whose month is made on two days.",
      options: [
        {
          value: "one_big_day",
          label: "One or two big days carry it",
          hint: "Many small losses, occasional large winners",
        },
        { value: "mixed", label: "Some days matter more than others" },
        { value: "even", label: "It accumulates fairly evenly", hint: "Similar profit most days" },
        { value: "unsure", label: "I don't know yet" },
      ],
    },
    {
      key: "risk_width",
      title: "How much do you risk on a single trade?",
      help: "Against the account, not in dollars. A wide stop needs a daily loss limit it can fit inside — otherwise one ordinary losing trade ends your day.",
      options: [
        { value: "wide", label: "A lot", hint: "Wide stops, or big size on few trades" },
        { value: "moderate", label: "A moderate amount" },
        { value: "tight", label: "Very little", hint: "Small, tightly controlled risk" },
        { value: "unsure", label: "I don't know" },
      ],
      narrow: true,
    },
    {
      key: "primary_goal",
      title: "Once you're funded, what does winning look like?",
      help: "Two accounts with the same profit split can have completely different real payout economics. This decides which one we optimise for.",
      options: [
        { value: "get_funded", label: "Just reach a funded account" },
        {
          value: "fast_payouts",
          label: "Withdraw money quickly",
          hint: "Cadence and buffers outrank the headline split",
        },
        {
          value: "cheapest_route",
          label: "Spend as little as possible getting there",
          hint: "Willing to retry",
        },
        { value: "long_term_seat", label: "Hold a funded seat long term" },
      ],
    },
    {
      key: "deal_breakers",
      title: "Anything you absolutely will not accept?",
      help: "These are hard filters, not preferences. Anything you pick here removes challenges outright — and we'll tell you exactly which ones and why. Skip freely if nothing applies.",
      multi: true,
      allowEmpty: true,
      options: [
        { value: "trailing_drawdown", label: "Trailing drawdown" },
        { value: "daily_loss_limit", label: "Daily loss limit" },
        { value: "news_restrictions", label: "News restrictions" },
        { value: "minimum_trading_days", label: "Minimum trading days" },
        { value: "consistency_rule", label: "Consistency rule" },
        { value: "overnight_restrictions", label: "Overnight restrictions" },
        { value: "high_fees", label: "High fees" },
      ],
    },
    {
      key: "budget",
      title: "How much do you want to spend on the challenge?",
      help: "Challenges above your ceiling are removed. Cheapest is not automatically best — we score fit, not price alone.",
      options: [
        { value: "under_50", label: "Under $50" },
        { value: "50_100", label: "$50 – $100" },
        { value: "100_200", label: "$100 – $200" },
        { value: "200_300", label: "$200 – $300" },
        { value: "300_plus", label: "$300+" },
        { value: "no_preference", label: "No preference" },
      ],
      narrow: true,
    },
    {
      key: "desired_account_size",
      title: "What account size are you looking for?",
      help: "A preference, not a filter — a nearby size still scores, just slightly lower.",
      // Options come from the catalogue, so there is nothing to ask when the
      // catalogue has no confirmed sizes yet.
      when: () => sizeOptions.length > 0,
      options: [...sizeOptions, { value: "no_preference", label: "No preference" }],
      narrow: true,
    },
    {
      key: "platform",
      title: "Which platform do you prefer?",
      when: (a) =>
        platforms.length > 0 && (a.market === "futures" || a.market === "multiple"),
      /*
       * "No preference" carries a sentinel rather than an empty string.
       *
       * An empty value is indistinguishable from an unanswered question, so
       * selecting it left Continue disabled with no way forward — a dead end
       * in the middle of the questionnaire for anyone who did not care which
       * platform they used. The sentinel is converted back to null on submit.
       */
      options: [
        ...platforms.map((p) => ({ value: p, label: p })),
        { value: NO_PREFERENCE, label: "No preference" },
      ],
      narrow: true,
    },
    {
      key: "priorities",
      title: "What matters most to you?",
      help: "Choose up to 3. These get extra weight in your score.",
      multi: true,
      maxSelections: 3,
      options: [
        { value: "large_drawdown", label: "Large drawdown" },
        { value: "static_drawdown", label: "Static, not trailing, drawdown" },
        { value: "low_profit_target", label: "Low profit target" },
        { value: "low_price", label: "Low price" },
        { value: "fast_payouts", label: "Fast payouts" },
        { value: "no_consistency_rule", label: "No consistency rule" },
        { value: "no_daily_loss_rule", label: "No daily loss rule" },
        { value: "news_trading", label: "News trading" },
        { value: "overnight_trading", label: "Overnight trading" },
        { value: "weekend_holding", label: "Weekend holding" },
        { value: "ea_automation", label: "EA / automation" },
        { value: "low_restrictions", label: "Low restrictions" },
        { value: "platform", label: "Platform" },
        { value: "large_account_size", label: "Large account size" },
      ],
    },
  ];
}

export function Quiz({
  accountSizes,
  platforms,
  markets,
  initialAnswers,
}: {
  accountSizes: number[];
  platforms: string[];
  markets: string[];
  initialAnswers?: Answers;
}) {
  const router = useRouter();
  const all = useMemo(
    () => buildQuestions(accountSizes, platforms, markets),
    [accountSizes, platforms, markets],
  );
  // A single-market catalogue answers its own market question. The engine still
  // needs the value — it is the first hard filter — so it is seeded rather than
  // left undefined, and questions that branch on it behave as if it were asked.
  const [answers, setAnswers] = useState<Answers>(() => {
    const seeded: Answers = { ...(initialAnswers ?? {}) };
    if (markets.length === 1 && !seeded.market) seeded.market = markets[0];
    return seeded;
  });
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  // Only the questions that apply to the answers given so far.
  const questions = useMemo(
    () => all.filter((q) => !q.when || q.when(answers)),
    [all, answers],
  );

  const current = questions[Math.min(index, questions.length - 1)];
  const total = questions.length;

  useEffect(() => {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "quiz_started" }),
    }).catch(() => {});
  }, []);

  const answerFor = current ? answers[current.key as string] : undefined;
  const selected = Array.isArray(answerFor) ? answerFor : answerFor ? [answerFor] : [];
  const canContinue = current?.multi
    ? current.allowEmpty || selected.length > 0
    : selected.length === 1;

  const choose = useCallback(
    (option: Option) => {
      if (!current) return;
      setAnswers((prev) => {
        const key = current.key as string;
        if (!current.multi) return { ...prev, [key]: option.value };

        const existing = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
        const has = existing.includes(option.value);
        if (has) return { ...prev, [key]: existing.filter((v) => v !== option.value) };
        if (current.maxSelections && existing.length >= current.maxSelections) return prev;
        return { ...prev, [key]: [...existing, option.value] };
      });
    },
    [current],
  );

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    // The analysis sequence tracks the real request rather than padding it out
    // with a fake delay: each line advances on a short tick and the redirect
    // fires as soon as the response lands.
    setAnalysisStep(0);
    const ticker = setInterval(() => {
      setAnalysisStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 1));
    }, 260);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The platform sentinel means "no preference", which the profile
        // stores as absent rather than as a platform literally named that.
        body: JSON.stringify({
          ...answers,
          platform: answers.platform === NO_PREFERENCE ? "" : answers.platform,
        }),
      });
      if (!response.ok) throw new Error("Could not save your answers");
      clearInterval(ticker);
      router.push("/find-my-challenge/results");
    } catch {
      clearInterval(ticker);
      setSubmitting(false);
      setAnalysisStep(-1);
      setError("We couldn't build your profile. Check your connection and try again.");
    }
  }, [answers, router]);

  const next = useCallback(() => {
    if (index + 1 >= total) {
      void submit();
      return;
    }
    setIndex((i) => i + 1);
  }, [index, total, submit]);

  if (submitting) {
    return (
      <div className={`shell-narrow ${styles.wrap}`}>
        <div className={styles.analysing}>
          <h1 style={{ fontSize: "clamp(1.4rem, 3.4vw, 2rem)" }}>
            Analysing your trading profile…
          </h1>
          <div className={styles.steps}>
            {ANALYSIS_STEPS.map((step, i) => (
              <div
                key={step}
                className={`${styles.stepRow} ${i <= analysisStep ? styles.stepDone : ""}`}
              >
                <span className={styles.dot} />
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className={`shell-narrow ${styles.wrap}`}>
      <div className={styles.progressHead}>
        <span className={styles.stepLabel}>
          Question {index + 1} of {total}
        </span>
        <span className={styles.stepLabel}>{Math.round(((index + 1) / total) * 100)}%</span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label="Questionnaire progress"
      >
        <div className={styles.fill} style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <fieldset style={{ border: 0 }}>
        <legend style={{ padding: 0 }}>
          <h1 className={styles.question}>{current.title}</h1>
        </legend>
        {current.help ? <p className={styles.help}>{current.help}</p> : null}

        <div
          className={`${styles.options} ${current.narrow ? styles.optionsNarrow : ""}`}
          role={current.multi ? "group" : "radiogroup"}
          aria-label={current.title}
        >
          {current.options.map((option) => {
            const isSelected = selected.includes(option.value);
            const atLimit =
              Boolean(current.multi) &&
              !isSelected &&
              Boolean(current.maxSelections) &&
              selected.length >= current.maxSelections!;

            return (
              <button
                key={`${current.key as string}-${option.value}`}
                type="button"
                role={current.multi ? "checkbox" : "radio"}
                aria-checked={isSelected}
                aria-disabled={atLimit}
                className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`}
                onClick={() => !atLimit && choose(option)}
              >
                <span className={`${styles.tick} ${current.multi ? "" : styles.tickRound}`}>
                  {isSelected ? "✓" : ""}
                </span>
                <span>
                  <span className={styles.optionTitle}>{option.label}</span>
                  {option.hint ? <span className={styles.optionHint}>{option.hint}</span> : null}
                </span>
              </button>
            );
          })}
        </div>

        {current.multi ? (
          <p className={styles.limitNote}>
            {current.maxSelections
              ? `${selected.length} of ${current.maxSelections} selected`
              : selected.length === 0
                ? "None selected — nothing will be filtered out"
                : `${selected.length} selected`}
          </p>
        ) : null}
      </fieldset>

      {error ? (
        <p className="field-error" role="alert" style={{ marginTop: "1rem" }}>
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className="btn"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          Back
        </button>
        <span className={styles.spacer} />
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={next}
          disabled={!canContinue}
        >
          {index + 1 >= total ? "See my matches" : "Continue"}
        </button>
      </div>
    </div>
  );
}
