/**
 * Brand identity, kept in one place.
 *
 * Note for whoever ships this: "For Dummies" is a registered trademark of John
 * Wiley & Sons, and its yellow-and-black trade dress is actively enforced.
 * The colour scheme is not the risk; using the phrase as a public product name
 * is. Changing `TAGLINE` here is a one-line change if that ever needs to go.
 */
export const BRAND = {
  name: "PropFirm",
  tagline: "for dummies",
  /** Used in <title> templates and the footer. */
  full: "PropFirm",
  description:
    "Answer a few questions about your trading style, budget and the rules that matter to you. We eliminate the challenges that cannot work for you and explain why the rest fit.",
} as const;
