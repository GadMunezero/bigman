/**
 * Converts a PropFirmMatch-style export into the bulk-import template.
 *
 * This exists as a script rather than a one-off hand edit because the export it
 * reads is not trustworthy enough to be a final answer. When a corrected export
 * arrives, re-run this instead of re-typing fifty rows.
 *
 * Two conversions do real work and are worth understanding before you trust the
 * output:
 *
 *   Futures firms publish targets and drawdowns in DOLLARS ($3,000 on a $50K
 *   account). The schema stores PERCENTAGES, because that is what makes a $50K
 *   and a $150K account comparable. So $3,000 on 50K becomes 6.
 *
 *   CFD firms already publish percentages, so those pass through untouched.
 *   Mixing the two up would silently corrupt the most heavily weighted input
 *   the engine has, which is why the account size is required for a dollar row.
 *
 * Everything lands as `needs_review` / `draft` with source_type
 * `aggregator_unverified`. Nothing here reaches the public site until a human
 * reads the firm's own page and publishes it.
 *
 *   npx tsx db/convert-propfirmmatch.ts <export.csv> <out.csv>
 */
import fs from "node:fs";
import path from "node:path";
import { parseCsv, CHALLENGE_COLUMNS } from "../src/lib/import";

/**
 * Futures firms covered by data/futures-specs.json, which carries real per-size
 * figures. Their aggregator rows are dropped: importing both would collide on
 * the same slugs, and because the importer never overwrites, the real figures
 * would sit unapplied behind templated ones — the merge even proposed replacing
 * recorded rules with "unknown".
 *
 * A futures firm NOT in that file is kept, because a templated row flagged
 * `aggregator_unverified` is still better than dropping a real firm (Topstep
 * and Hola Prime Futures both vanished when this filtered on market alone).
 */
const SPECS_FIRMS: ReadonlySet<string> = new Set(
  (
    JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "futures-specs.json"), "utf8"),
    ) as { products: { firm: string }[] }
  ).products.map((p) => p.firm.toLowerCase()),
);

const RULE_MAP: Record<string, string> = {
  yes: "allowed",
  allowed: "allowed",
  restricted: "restricted",
  no: "prohibited",
  prohibited: "prohibited",
};

const PAYOUT_DAYS: Record<string, string> = {
  daily: "1",
  weekly: "7",
  "bi-weekly": "14",
  biweekly: "14",
  "14 days": "14",
  monthly: "30",
};

/** "50K" -> 50000, "100K" -> 100000, "$50,000" -> 50000. */
function accountSize(raw: string): number | null {
  const t = raw.trim().replace(/[$,\s]/g, "");
  if (!t) return null;
  const m = /^([\d.]+)([KkMm]?)$/.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return m[2].toLowerCase() === "k" ? n * 1000 : m[2].toLowerCase() === "m" ? n * 1e6 : n;
}

/**
 * Returns a percentage from a cell that may be either a percentage ("10%") or a
 * dollar figure ("$3,000") that has to be measured against the account.
 *
 * A dollar cell with no account size returns null rather than a number, because
 * there is no honest way to convert it and a wrong drawdown percentage is worse
 * than a blank one.
 */
function toPercent(raw: string, size: number | null): { value: number | null; note?: string } {
  const t = raw.trim();
  if (!t || t.toUpperCase() === "N/A") return { value: null };

  // Multi-phase targets arrive as "8% → 5%". The first phase is the one that
  // gates entry, so that is what gets stored; the rest is flagged, not dropped.
  if (t.includes("→")) {
    const first = toPercent(t.split("→")[0], size);
    return { value: first.value, note: `multi-phase target "${t}" stored as phase 1 only` };
  }

  if (t.includes("%")) {
    const n = Number(t.replace(/[%\s]/g, ""));
    return Number.isFinite(n) ? { value: n } : { value: null };
  }

  if (t.includes("$")) {
    const n = Number(t.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n)) return { value: null };
    if (!size) return { value: null, note: `cannot convert "${t}" without an account size` };
    return { value: Math.round((n / size) * 10000) / 100 };
  }

  const n = Number(t);
  return Number.isFinite(n) ? { value: n } : { value: null };
}

function drawdownType(raw: string): { value: string; note?: string } {
  const t = raw.trim().toLowerCase();
  if (!t) return { value: "" };
  if (t === "static") return { value: "static" };
  if (t.includes("eod")) return { value: "eod_trailing" };
  if (t.includes("intraday")) return { value: "intraday_trailing" };
  if (t === "trailing") return { value: "trailing" };
  // e.g. "5% daily / 10% max" — a rule summary that landed in the type column.
  return { value: "", note: `unrecognised drawdown type "${raw}" left blank` };
}

function markets(category: string, assets: string): string {
  if (category.toLowerCase() === "futures") return "futures";
  const a = assets.toLowerCase();
  const out = new Set<string>();
  if (a.includes("fx") || a.includes("forex")) out.add("forex");
  if (a.includes("crypto")) out.add("crypto");
  if (a.includes("indices") || a.includes("stocks") || a.includes("commodities") || a.includes("metals")) {
    out.add("cfd");
  }
  return out.size ? [...out].join(";") : "cfd";
}

function phases(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t.startsWith("1")) return "1";
  if (t.startsWith("2")) return "2";
  if (t.startsWith("3")) return "3";
  if (t.includes("instant")) return "0";
  return "";
}

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("usage: npx tsx db/convert-propfirmmatch.ts <export.csv> <out.csv>");
  process.exit(1);
}

const table = parseCsv(fs.readFileSync(inPath, "utf8"));
const header = table[0].map((h) => h.trim());
const col = (r: string[], name: string) => (r[header.indexOf(name)] ?? "").trim();

const out: string[][] = [CHALLENGE_COLUMNS.slice()];
const notes: string[] = [];
let skippedFutures = 0;
const unknownDaily: string[] = [];

for (let i = 1; i < table.length; i++) {
  const r = table[i];
  const firm = col(r, "prop_firm");
  if (!firm) continue;

  if (col(r, "category").toLowerCase() === "futures" && SPECS_FIRMS.has(firm.toLowerCase())) {
    skippedFutures++;
    continue;
  }

  const rowNote = (m: string) => notes.push(`  ${firm}: ${m}`);
  const size = accountSize(col(r, "starting_account_size"));

  const target = toPercent(col(r, "profit_target"), size);
  const maxDd = toPercent(col(r, "maximum_drawdown"), size);
  const dailyRaw = col(r, "daily_loss_limit");
  const daily = toPercent(dailyRaw, size);
  const dd = drawdownType(col(r, "drawdown_type"));

  if (target.note) rowNote(target.note);
  if (maxDd.note) rowNote(maxDd.note);
  if (daily.note) rowNote(daily.note);
  if (dd.note) rowNote(dd.note);

  // A blank daily cell reads as "no daily loss rule" to the engine, which is a
  // claim, not an absence. The export leaves it blank for most futures firms,
  // and futures firms very often do have one — so these get listed loudly.
  if (!dailyRaw) unknownDaily.push(firm);

  const activation = col(r, "activation_fee");
  const conditions: string[] = [];
  const freqRaw = col(r, "payout_frequency");
  const freq = PAYOUT_DAYS[freqRaw.toLowerCase()] ?? "";
  if (freqRaw && !freq) conditions.push(`Payout frequency: ${freqRaw}`);
  if (activation && activation.toLowerCase() !== "none") {
    conditions.push(`Activation fee ${activation} on top of the evaluation price`);
  }

  const consistency = col(r, "consistency_rule_funded");
  const consistencyPct = toPercent(consistency, size);

  const record: Record<string, string> = {
    firm_name: firm,
    firm_website: col(r, "official_website"),
    // The size is appended so challenges stay distinguishable once a firm has
    // more than one, but not when the export already names it ("50K 1-Step").
    challenge_name: (() => {
      const name = col(r, "challenge_name");
      const sizeLabel = col(r, "starting_account_size");
      if (!sizeLabel) return name;
      if (!name) return sizeLabel;
      return name.toLowerCase().includes(sizeLabel.toLowerCase()) ? name : `${name} ${sizeLabel}`;
    })(),
    markets: markets(col(r, "category"), col(r, "tradable_assets")),
    account_size: size === null ? "" : String(size),
    price: col(r, "challenge_price"),
    currency: col(r, "account_currency") || "USD",
    profit_target_pct: target.value === null ? "" : String(target.value),
    max_drawdown_pct: maxDd.value === null ? "" : String(maxDd.value),
    daily_drawdown_pct: daily.value === null ? "" : String(daily.value),
    drawdown_type: dd.value,
    minimum_days: col(r, "minimum_trading_days"),
    maximum_days: col(r, "maximum_trading_days"),
    payout_frequency_days: freq,
    payout_split_pct: toPercent(col(r, "profit_split"), size).value?.toString() ?? "",
    payout_conditions: conditions.join(". "),
    platforms: col(r, "platform").split(/\s*,\s*/).filter(Boolean).join(";"),
    leverage: col(r, "leverage") === "N/A" ? "" : col(r, "leverage"),
    refund_policy: col(r, "refund_policy"),
    country_restrictions: col(r, "country_restrictions"),
    phases: phases(col(r, "evaluation_steps")),
    news_trading: RULE_MAP[col(r, "news_trading").toLowerCase()] ?? "",
    overnight: RULE_MAP[col(r, "overnight_holding").toLowerCase()] ?? "",
    weekend: RULE_MAP[col(r, "weekend_holding").toLowerCase()] ?? "",
    ea_allowed: RULE_MAP[col(r, "ea_algorithmic_trading").toLowerCase()] ?? "",
    copy_trading: RULE_MAP[col(r, "copy_trading").toLowerCase()] ?? "",
    scalping: "",
    hedging: RULE_MAP[col(r, "hedging").toLowerCase()] ?? "",
    consistency_rule: consistency ? "required" : "unknown",
    consistency_pct: consistencyPct.value === null ? "" : String(consistencyPct.value),
    source_url: col(r, "propfirmmatch_url"),
    source_type: "aggregator_unverified",
    confidence: "needs_review",
    status: "draft",
  };

  out.push(CHALLENGE_COLUMNS.map((c) => record[c] ?? ""));
}

const csv = out
  .map((row) =>
    row.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(","),
  )
  .join("\n");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, csv + "\n");

console.log(`Wrote ${out.length - 1} rows to ${outPath}`);
if (skippedFutures) {
  console.log(`Skipped ${skippedFutures} futures rows whose firm is covered by data/futures-specs.json.`);
}
if (notes.length) {
  console.log(`\nConversion notes (${notes.length}):`);
  console.log(notes.join("\n"));
}
if (unknownDaily.length) {
  console.log(
    `\n!! ${unknownDaily.length} rows have NO daily loss limit in the export.\n` +
      `   The engine reads a blank daily cell as "this firm has no daily loss rule".\n` +
      `   For futures firms that is usually false. Confirm each before publishing:\n   ` +
      unknownDaily.join(", "),
  );
}
