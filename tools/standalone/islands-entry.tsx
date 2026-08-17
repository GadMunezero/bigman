/**
 * The client-side halves of the app, mounted into the standalone build.
 *
 * These are the REAL components — the same psychology workspace and calculators
 * the Next.js site renders. They were always client components ("use client",
 * React state, localStorage), so nothing about them needed a server; only the
 * thin page.tsx wrappers did, and those are not used here.
 */
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { PsychologyWorkspace } from "../../src/app/psychology/PsychologyWorkspace";
import { ChallengeCalculator, DrawdownCalculator } from "../../src/app/tools/Calculators";

type Mountable = "psychology" | "drawdown" | "challenge";

const COMPONENTS: Record<Mountable, unknown> = {
  psychology: PsychologyWorkspace,
  drawdown: DrawdownCalculator,
  challenge: ChallengeCalculator,
};

const roots = new Map<Element, ReturnType<typeof createRoot>>();

(window as unknown as Record<string, unknown>).PFMount = function (
  el: Element,
  which: Mountable,
  props: Record<string, unknown>,
) {
  const component = COMPONENTS[which];
  if (!component) return;
  let root = roots.get(el);
  if (!root) { root = createRoot(el); roots.set(el, root); }
  root.render(createElement(component as never, props as never));
};
