"use server";

import { redirect } from "next/navigation";
import { unsubscribeByToken } from "@/lib/repo";

/**
 * Unsubscribe, as a POST.
 *
 * Doing this on page load instead would be simpler and wrong: corporate mail
 * scanners and link-preview bots fetch every URL in an email before the
 * recipient sees it, so a GET-triggered unsubscribe silently removes people
 * who never clicked anything. A button press is a real signal.
 */
export async function unsubscribeAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (token) unsubscribeByToken(token);
  redirect(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}&done=1`);
}
