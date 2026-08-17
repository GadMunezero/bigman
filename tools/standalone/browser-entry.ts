import { getChallengeRecommendations, matchLabel } from "@/lib/engine";
import {
  CHALLENGE_APPROACHES, DEAL_BREAKERS, DEAL_BREAKER_LABELS, HOLDING_PERIODS,
  MARKETS, PRIORITIES, PRIORITY_LABELS, RISK_STYLES, TRADING_STYLES, CRITERION_LABELS,
} from "@/lib/types";

// The real engine, unchanged, running client-side. Nothing here re-implements
// scoring — a demo that approximates the product would prove nothing.
(window as unknown as Record<string, unknown>).PF = {
  getChallengeRecommendations, matchLabel,
  vocab: {
    CHALLENGE_APPROACHES, DEAL_BREAKERS, DEAL_BREAKER_LABELS, HOLDING_PERIODS,
    MARKETS, PRIORITIES, PRIORITY_LABELS, RISK_STYLES, TRADING_STYLES, CRITERION_LABELS,
  },
};
