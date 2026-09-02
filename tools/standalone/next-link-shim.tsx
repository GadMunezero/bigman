/**
 * Stands in for next/link inside the standalone build.
 *
 * The app's pages are written against real paths ("/find-my-challenge"); the
 * standalone routes by hash. This maps one to the other so the genuine page
 * components can be reused verbatim instead of being rewritten with different
 * hrefs — the rewriting is exactly what made the standalone drift from the app
 * in the first place.
 */
import { createElement, type ReactNode } from "react";

const ROUTES: Record<string, string> = {
  "/": "#/",
  "/find-my-challenge": "#/find",
  "/challenges": "#/browse",
  "/firms": "#/firms",
  "/compare": "#/compare",
  "/psychology": "#/psychology",
  "/tools": "#/tools",
};

export function toHash(href: string): string {
  if (!href || href.startsWith("http") || href.startsWith("#")) return href;
  const path = href.split("?")[0].replace(/\/$/, "") || "/";
  if (ROUTES[path]) return ROUTES[path];
  const challenge = /^\/challenges\/(.+)$/.exec(path);
  if (challenge) return "#/c/" + challenge[1];
  const firm = /^\/firms\/(.+)$/.exec(path);
  if (firm) return "#/f/" + firm[1];
  // Landing pages and trust pages have no standalone equivalent. Sending the
  // reader to the directory is honest; a dead link is not.
  return "#/browse";
}

export default function Link(
  props: { href: string; children?: ReactNode } & Record<string, unknown>,
) {
  const { href, children, ...rest } = props;
  return createElement("a", { href: toHash(href), ...rest }, children);
}
