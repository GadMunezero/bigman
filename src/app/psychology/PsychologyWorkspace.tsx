"use client";

import { useState } from "react";
import styles from "./psychology.module.css";
import { IncomeCalculator } from "./sections/IncomeCalculator";
import { BehaviorLog, Checklist, HabitsCoach, RiskGate } from "./sections/Interactive";
import { PracticeDrills } from "./sections/PracticeDrills";
import {
  InversionTool,
  MentalModels,
  Principles,
  TradeGrader,
  TrainingProtocol,
  WinnerVsLoser,
} from "./sections/Static";

const TABS = [
  { id: "models", label: "Mental models", render: () => <MentalModels /> },
  { id: "mindset", label: "Winner vs loser", render: () => <WinnerVsLoser /> },
  { id: "riskgate", label: "Risk gate", render: () => <RiskGate /> },
  { id: "behavior", label: "Behaviour log", render: () => <BehaviorLog /> },
  { id: "habits", label: "Habits coach", render: () => <HabitsCoach /> },
  { id: "checklist", label: "Pre-market checklist", render: () => <Checklist /> },
  { id: "protocol", label: "Training protocol", render: () => <TrainingProtocol /> },
  { id: "grade", label: "Trade grader", render: () => <TradeGrader /> },
  { id: "inversion", label: "Inversion", render: () => <InversionTool /> },
  { id: "principles", label: "Psychology", render: () => <Principles /> },
  { id: "calculator", label: "Income calculator", render: () => <IncomeCalculator /> },
  { id: "drills", label: "Practice drills", render: () => <PracticeDrills /> },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PsychologyWorkspace({ initialTab }: { initialTab?: string }) {
  const [active, setActive] = useState<TabId>(
    (TABS.find((t) => t.id === initialTab)?.id ?? "models") as TabId,
  );

  const current = TABS.find((tab) => tab.id === active)!;

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Psychology workspace">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls="psych-panel"
            className={`${styles.tab} ${active === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div id="psych-panel" role="tabpanel" aria-labelledby={`tab-${active}`}>
        {current.render()}
      </div>
    </>
  );
}
