import { classifyArchetypes, getChallengeRecommendations, matchLabel } from "@/lib/engine";
import {
  CHALLENGE_APPROACHES, CRITERION_LABELS, DEAL_BREAKERS, DEAL_BREAKER_LABELS,
  HOLDING_PERIODS, MARKETS, NEWS_FREQUENCIES, PRIMARY_GOALS, PRIMARY_GOAL_LABELS,
  PRIORITIES, PRIORITY_LABELS, PROFIT_SHAPES, PROFIT_SHAPE_LABELS, RISK_STYLES,
  RISK_WIDTHS, RISK_WIDTH_LABELS, TRADE_FREQUENCIES, TRADE_FREQUENCY_LABELS,
  TRADING_STYLES,
} from "@/lib/types";

// The real engine, unchanged, running client-side. Nothing here re-implements
// scoring or classification — a demo that approximates the product would prove
// nothing about the product.
(window as unknown as Record<string, unknown>).PF = {
  getChallengeRecommendations, matchLabel, classifyArchetypes,
  vocab: {
    CHALLENGE_APPROACHES, CRITERION_LABELS, DEAL_BREAKERS, DEAL_BREAKER_LABELS,
    HOLDING_PERIODS, MARKETS, NEWS_FREQUENCIES, PRIMARY_GOALS, PRIMARY_GOAL_LABELS,
    PRIORITIES, PRIORITY_LABELS, PROFIT_SHAPES, PROFIT_SHAPE_LABELS, RISK_STYLES,
    RISK_WIDTHS, RISK_WIDTH_LABELS, TRADE_FREQUENCIES, TRADE_FREQUENCY_LABELS,
    TRADING_STYLES,
  },
};
