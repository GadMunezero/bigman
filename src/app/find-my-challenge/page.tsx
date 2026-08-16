import { listAccountSizes, listPlatforms } from "@/lib/repo";
import { getCurrentProfile } from "@/lib/session";
import { Quiz } from "./Quiz";

export const metadata = {
  title: "Find my challenge",
  description:
    "Six to eight questions about how you trade. We remove the challenges that cannot work for you and score the rest against your answers.",
};

export const dynamic = "force-dynamic";

export default async function FindMyChallengePage() {
  const [accountSizes, platforms, profile] = await Promise.all([
    Promise.resolve(listAccountSizes()),
    Promise.resolve(listPlatforms()),
    getCurrentProfile(),
  ]);

  // Retaking the quiz starts from the answers already given rather than a blank slate.
  const initialAnswers = profile
    ? {
        market: profile.market ?? undefined,
        trading_style: profile.trading_style ?? undefined,
        holding_period: profile.holding_period ?? undefined,
        news_trading: profile.news_trading ?? undefined,
        overnight_required: profile.overnight_required ?? undefined,
        budget: profile.budget ?? undefined,
        desired_account_size: profile.desired_account_size ?? undefined,
        priorities: profile.priorities,
        platform: profile.platform ?? undefined,
        ea_required:
          profile.ea_required === null ? undefined : profile.ea_required ? "true" : "false",
        weekend_required:
          profile.weekend_required === null
            ? undefined
            : profile.weekend_required
              ? "true"
              : "false",
      }
    : undefined;

  return (
    <Quiz accountSizes={accountSizes} platforms={platforms} initialAnswers={initialAnswers} />
  );
}
