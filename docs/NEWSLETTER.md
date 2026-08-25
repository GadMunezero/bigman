# Newsletter

People sign up to get trading psychology tips, prop firm rule changes and
discounts. This document covers what exists, what does not, and the one thing
you must do before mailing anybody.

## Read this first: no email is sent yet

The signup, the double opt-in flow, the database and the admin list are all
built and working. **There is no email provider wired in.** Nothing on this
site sends a message to anybody today.

That means the confirmation link never reaches the person who asked for it. In
development the API returns the link in its JSON response and the form shows a
"Dev only — confirm now" button, so the flow can be walked end to end. In
production that field is omitted deliberately — returning a confirmation token
to the browser would let anyone confirm an address they merely typed in, which
defeats the entire point of double opt-in.

So until a provider is connected, the honest state is: signups are collected as
`pending` and nobody is ever confirmed. Do not work around this by confirming
people by hand in the database. An unconfirmed address is an address that may
not belong to the person who typed it.

## Wiring in a provider

Anything that sends transactional email works — Resend, Postmark, Buttondown,
SES. The integration point is one function call in
`src/app/api/newsletter/route.ts`, right after `subscribeToNewsletter` returns
the token:

```ts
await sendConfirmationEmail(parsed.data.email, `${siteUrl}/newsletter/confirm?token=${token}`);
```

Three things that email must contain:

- The confirmation link, and a plain statement that nothing will be sent until
  it is clicked.
- Who it is from and why they are getting it ("you or someone using your
  address signed up at …"). If it was not them, doing nothing is the correct
  action and the email should say so.
- Nothing else. No offers, no articles. A confirmation email that already
  contains marketing is marketing sent without consent.

Every later email needs a `List-Unsubscribe` header pointing at
`/newsletter/unsubscribe?token=…` plus a visible unsubscribe link in the body.

## How the flow works

1. **Signup** — `POST /api/newsletter` with `email`, `topics[]`, and an
   optional `source`. Creates or updates a row with `status = 'pending'` and a
   token. Response is identical whether the address is new, pending or already
   confirmed: the form must not become a way to check whether a particular
   person subscribed.
2. **Confirm** — `/newsletter/confirm?token=…` sets `status = 'confirmed'`.
   Idempotent; confirming twice is not an error.
3. **Unsubscribe** — `/newsletter/unsubscribe?token=…` shows a button, and the
   POST does the work. It is not done on page load because mail scanners and
   link-preview bots fetch every URL in an email before the recipient sees it,
   and a GET-triggered unsubscribe removes people who never clicked anything.

The token is the only credential and the only thing in either URL. No email
address appears in a link, so a confirmation or unsubscribe URL pasted into a
chat or caught in a server log does not say whose it is.

## Where the form appears

| Placement | Topics pre-ticked | Why |
| --- | --- | --- |
| `/newsletter` | all three | The page someone arrived at on purpose |
| `/psychology` | psychology | They came for the behavioural material, not a discount |
| `/learn` | rule changes, psychology | Guides go stale when a firm moves a rule |
| Modal (site-wide) | all three | The pop-up most sites use, described below |

### The modal

`src/components/NewsletterPopup.tsx`. A centred card over a dimmed backdrop,
**15 seconds after someone arrives** — the shape and timing most sites use.

There is no account system here, so there is no login event to hang it off.
Arrival is what "on login" means on a site nobody signs into.

Because it blocks the page, everything about it is built to make leaving cheap:

- Four ways out — the ×, "No thanks", clicking the backdrop, and Escape.
- Focus is trapped while it is open, so a keyboard user cannot tab into a page
  they cannot see, and it goes back where it was on close.
- It focuses the dialog, not the email field. Opening straight into a text
  input throws the keyboard up over the whole thing on a phone.
- Page scroll is locked while open and restored on close, so dismissing it
  never drops the reader somewhere they did not choose.

Dismissing silences it for 45 days; signing up silences it for ten years. Both
live in `localStorage` under `ppf_newsletter`, and a browser that refuses to
store it is treated as "do not show" rather than "show every time" — a private
window should not get the modal on every page.

It never appears on `/find-my-challenge`. That is the one place a blocking
overlay genuinely costs something: interrupting someone halfway through
answering questions about their trading trades a recommendation for a
subscriber, which is a bad deal in both directions. It is also suppressed on
`/admin` and on the legal pages, where a reader deciding whether to trust us
should not be sold to.

**To make it less intrusive**, the knobs are at the top of the file:
`DELAY_MS` (how long before it appears) and `DISMISS_DAYS` (how long a "no"
lasts). Raising the delay to 30–45 seconds, or gating it behind a second page
view, both cost signups and annoy fewer people. That is a judgement call about
your audience, not a technical one.

## Admin

`/admin/newsletter` shows counts by status, the full list, and a CSV block to
paste into whatever sends the mail. **Filter to `confirmed` before importing.**
`pending` rows are addresses someone typed into a form and never confirmed;
some of them belong to people who did not type them.

## Data

`newsletter_subscribers` in `db/schema.sql`. `db/schema.sql` is re-executed on
every boot, so `CREATE TABLE IF NOT EXISTS` brings the table to existing
databases as well as fresh ones — no separate migration is needed.

Unsubscribing keeps the row rather than deleting it. A deleted address can be
re-added by the next form submission and start receiving mail again, and there
is no record that the person ever asked to stop. The row is that record. An
address that unsubscribed and signs up again returns to `pending`, never
straight back to `confirmed`.

## Discounts and the ranking algorithm

Discount emails may earn a commission. That changes nothing about the engine:
affiliate data lives in a separate table that the recommendation code does not
read, and the newsletter cannot reach it either. The topic hint on the signup
form says this in plain words rather than burying it in the privacy policy,
because someone ticking "discounts" is entitled to know before they tick it.
