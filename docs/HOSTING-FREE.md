# Putting it online for free, on a domain you own

Server hosting: **$0/month.** If you already have a domain, that is the whole
bill — you are only pointing it somewhere new.

There are two different things you can put online, and they need different
hosts. Decide which one you want before reading further.

| | Single file | The real app |
| --- | --- | --- |
| What it is | `dist/propfirm-standalone.html` — one 1.1 MB file | The Next.js site with its database |
| Questionnaire, matching, comparison, psychology tools | Yes | Yes |
| Newsletter signup | **No** | Yes |
| Admin, saved challenges, reviews, outcome tracking | **No** | Yes |
| Updating the catalogue | Rebuild and re-upload the file | Edit in `/admin`, live immediately |
| Host | Netlify drag-and-drop, 2 minutes | A small virtual machine, ~30 minutes |
| Cost | $0 | $0 |

The single file is a genuine version of the product, not a mock-up — the real
recommendation engine is compiled into it and all 324 challenges are embedded.
What it cannot do is remember anything, because there is no server to remember
it. Put it up today to test the idea and share the link; move to the real app
when you want signups and admin editing.

---

## The fast route — one file on Netlify

Use this for the standalone file only. It takes about two minutes and needs no
command line.

1. Go to **app.netlify.com**, sign up free (GitHub or email).
2. On the Sites page, find the **"Deploy manually"** drop zone (also reachable
   at **app.netlify.com/drop**).
3. Put `propfirm-standalone.html` in a folder on its own and **rename it
   `index.html`** — a web server looks for that name, and a folder without one
   shows a file listing instead of your site.
4. Drag **the folder** onto the drop zone. Not the file — Netlify deploys
   folders. It goes live in seconds at a `something-random.netlify.app` address.
5. **Site configuration → Domain management → Add a domain** → type your
   Namecheap domain. Netlify shows you the DNS records it wants.
6. In Namecheap: **Domain List → Manage → Advanced DNS**. First confirm the
   nameservers on the **Domain** tab say **Namecheap BasicDNS** — if they point
   somewhere else, the Advanced DNS records are ignored and nothing you do here
   takes effect. Then add what Netlify asked for, normally:
   - `ALIAS` or `CNAME` record, host `@`, value `<your-site>.netlify.app`
   - `CNAME` record, host `www`, value `<your-site>.netlify.app`
7. Wait. DNS usually takes 15–30 minutes and can take a few hours. Netlify
   issues the HTTPS certificate automatically once it sees the records.

To update the site later, rebuild and drag the new folder onto the same site's
**Deploys** tab.

> **Netlify cannot host the real app.** It is serverless: the filesystem resets
> between requests, so every admin edit, saved challenge and newsletter signup
> would vanish. That is not a configuration you can change — it is what
> serverless means. For the full app, use the virtual-machine route below.

---

## Why most free hosts will not work

This app **writes to disk**. Admin edits, rule approvals, reviews, saved
challenges, outcome journeys and every trader profile go into a SQLite file.
That single fact rules out most of the free tier of the internet:

| Host | Free tier | Works? |
| ---- | --------- | ------ |
| **Oracle Cloud** | Always Free ARM VM, 2 OCPU / 12 GB | **Yes** — recommended |
| **Google Cloud** | Always Free `e2-micro`, 30 GB disk | **Yes** — tighter, see below |
| Vercel / Netlify | Generous, but serverless | **No** — the filesystem resets between requests. Every admin edit vanishes |
| Render | Free web service | **No** — free instances have no persistent disk and spin down when idle |
| Fly.io | Retired in 2024 | **No** — new signups get a short trial, not a free tier |
| Railway | Trial credit only | **No** |

The two that work do so for the same reason: they give you a real virtual
machine with a real disk, free, indefinitely.

> **Check the current limits before you start.** Free tiers move. Oracle
> halved its Always Free ARM allowance in June 2026 — from 4 OCPU / 24 GB to
> 2 OCPU / 12 GB — and terminated instances above the new limit from
> 18 August 2026. 2 OCPU and 12 GB is still far more than this app needs, but
> size your instance to the limit that is published on the day you create it,
> not to the one in this document.

---

## Option A — Oracle Cloud Always Free (recommended)

More memory than you need, which matters because `npm run build` is the
heaviest thing that will ever run on this box.

### 1. Create the machine

1. Sign up at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/). A
   card is required for identity verification. Stay on **Always Free** and you
   are not charged.
2. **Compute → Instances → Create instance.**
   - Image: **Ubuntu 22.04** or 24.04
   - Shape: **VM.Standard.A1.Flex** (Ampere ARM) — this is the free one
   - **2 OCPUs, 12 GB memory** — the current Always Free ceiling
   - Download the SSH private key when offered. You cannot get it later.
3. **Networking → Virtual Cloud Networks → your VCN → Security Lists →
   Default.** Add two ingress rules, or the site is unreachable no matter what
   else you do:

   | Source CIDR | Protocol | Destination port |
   | ----------- | -------- | ---------------- |
   | `0.0.0.0/0` | TCP | `80` |
   | `0.0.0.0/0` | TCP | `443` |

4. Note the **public IP address** on the instance page.

> **"Out of capacity" is normal.** Free ARM capacity is genuinely scarce in
> popular regions. Either retry over a few days, or pick a quieter home region
> when you sign up — the home region cannot be changed afterwards. If you
> cannot get ARM capacity at all, use Option B instead.

### 2. Open the firewall inside the machine as well

Oracle's Ubuntu images ship with iptables rules that block everything except
SSH, *in addition* to the cloud security list. Both have to be opened. This is
the single most common reason an Oracle instance appears dead.

```bash
ssh -i your-key.pem ubuntu@YOUR_IP

sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

Then go to **[step 3](#3-install-docker)**.

---

## Option B — Google Cloud `e2-micro`

Free forever, but 1 GB of RAM. Everything runs fine; the *build* is what
struggles, so add swap.

1. Sign up at [cloud.google.com/free](https://cloud.google.com/free).
2. **Compute Engine → Create instance.**
   - Region: **`us-west1`, `us-central1` or `us-east1`** — the free `e2-micro`
     is only free in those three. Anywhere else is billed at the normal rate.
   - Machine type: **`e2-micro`**
   - Boot disk: **Ubuntu 22.04, 30 GB standard persistent disk**
   - Tick **Allow HTTP traffic** and **Allow HTTPS traffic**
3. SSH in from the browser button, then give it swap so the build does not get
   killed by the OOM reaper:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

4. Reserve a **static external IP** (VPC network → IP addresses). The default
   ephemeral IP changes when the instance restarts, and your DNS record will
   then point at someone else's server.

---

## 3. Install Docker

Same on either host:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker          # or log out and back in
docker --version
```

---

## 4. Point your domain at the server

Do this **before** you start the app. Caddy proves it owns the domain over HTTP
to get a certificate, and it cannot do that until DNS resolves to your machine.

Whatever registrar you use, you want the same two records:

| Type | Host / Name | Value | TTL |
| ---- | ----------- | ----- | --- |
| A | `@` | your server's public IP | Automatic |
| A | `www` | your server's public IP | Automatic |

Two A records rather than a CNAME for `www`: the stack serves both names, and a
CNAME pointing at a name that is itself an A record works but adds a lookup for
nothing.

**Delete whatever is already there first.** A domain you have owned for a while
almost certainly has a parking-page A record, a forwarding rule, or a wildcard
CNAME from a previous host. Any of those will fight the new records, and a
forwarding rule in particular will keep sending visitors somewhere else long
after DNS looks correct.

### Namecheap, click by click

1. Sign in, then **Domain List** in the left sidebar, and **Manage** next to
   the domain.
2. **Check the Nameservers box on the `Domain` tab first.** It has to read
   **Namecheap BasicDNS** (PremiumDNS and FreeDNS also work). If it says
   *Custom DNS* — pointing at a previous host — then the Advanced DNS tab is
   not what serves your domain, and records you add there are ignored
   completely. Switch it to BasicDNS and give it a few minutes before going on.
   This is the single most common reason a correct-looking record does nothing.
3. Open the **Advanced DNS** tab.
4. Under **Host Records**, delete what is already there:
   - the `@` A record pointing at a Namecheap parking IP (`192.64.119.x`),
   - the `www` CNAME pointing at `parkingpage.namecheap.com`,
   - anything in the **Redirect Domain** section further down. A URL redirect
     survives a DNS change and keeps sending visitors to the old destination.
5. **Add New Record** twice:

   | Type | Host | Value | TTL |
   | ---- | ---- | ----- | --- |
   | A Record | `@` | your server's IP | Automatic |
   | A Record | `www` | your server's IP | Automatic |

   Save each with the green tick on the right of the row — a row left in edit
   mode is not saved.

**Leave MX records alone.** If email runs on this domain, deleting the MX
records breaks it, and nothing about this deployment needs them touched.

Namecheap usually propagates within about half an hour.

### Other registrars

| Registrar | Where |
| --------- | ----- |
| GoDaddy | My Products → DNS → **Manage Zones**. Remove the `@` A record pointing at their parking IP. |
| Cloudflare | DNS → Records. See the warning below — this one has a real trap. |
| Google Domains / Squarespace | DNS → **Custom records**. |
| Porkbun | Details → **DNS Records**. |

> **If your DNS is on Cloudflare, turn the proxy OFF first.** Set both records
> to **DNS only** — the grey cloud, not the orange one. With the proxy on,
> Cloudflare terminates TLS itself and Caddy cannot complete the HTTP challenge,
> so you get a certificate error that looks like a server fault and is not one.
>
> Once the site is up and you have seen the padlock, you may switch the proxy
> back on — but only with SSL/TLS mode set to **Full (strict)**. The default
> "Flexible" mode talks plain HTTP to your server while promising HTTPS to the
> visitor, which produces an infinite redirect loop.

Wait for it to take effect, and **check before continuing**:

```bash
dig +short your-domain.com
dig +short www.your-domain.com
```

Both must print your server's IP. Usually a few minutes; it can be up to an
hour if the old records had a long TTL. Starting the stack before this resolves
burns a Let's Encrypt failure against your rate limit, so it is worth the wait.

If `dig` still shows the old address long after you changed it, your local
resolver is caching. Check what the internet sees instead:

```bash
dig +short your-domain.com @1.1.1.1
```

---

## 5. Deploy

```bash
sudo apt update && sudo apt install -y git
git clone https://github.com/GadMunezero/bigman.git
cd bigman

cp deploy/.env.example deploy/.env
nano deploy/.env
```

Fill in four values:

```ini
SITE_DOMAIN=your-domain.com
ACME_EMAIL=you@example.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
ADMIN_PASSWORD=paste-a-generated-password-here
```

Generate the password rather than inventing one — `openssl rand -base64 24`.
Leave `SEED_PUBLISH` commented out.

Then:

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

The first build takes 5–10 minutes on these machines. When it finishes, open
`https://your-domain.com`. The certificate arrives automatically within a few
seconds of the first request.

```bash
docker compose -f deploy/docker-compose.yml logs -f      # watch it come up
```

---

## What happens on first boot

1. The schema is created on the volume at `/data/app.db`.
2. The catalogue is loaded: **38 firms, 324 challenges** across futures and CFDs.
3. Everything lands as **draft**, so the public site shows an empty catalogue
   until you publish challenges yourself in `/admin`.

That last point is deliberate and worth not overriding. The figures are
unverified research. Publishing all 324 at once puts numbers in front of
traders that nobody has checked against the firm's own page.

Every boot after the first finds an existing database and leaves it alone, so
restarting and redeploying never overwrite work done in `/admin`.

---

## The three things to do before traders arrive

1. **Verify and publish, firm by firm.** `/admin/challenges`. A challenge you
   have checked against the firm's own page gets published; the rest stay
   draft. This is the actual work, and it is what makes the site worth
   visiting.
2. **Click every outbound link once.** All 23 firm websites came from search
   results, not from opening the pages. Several firms run a near-identical
   sister domain for a different product — Goat Funded Futures is not Goat
   Funded Trader. A lookalike domain in an outbound link is the most damaging
   error this site can make.
3. **Fill in what is still missing.** 79 of 324 challenges have no price and
   176 have no drawdown figure — most of the latter are the CFD rows, which
   arrived as a price list with no rules attached. They rank last by design and
   say "Not confirmed" rather than guessing, but a challenge with no numbers is
   not a recommendation.

---

## Running it

### Updating after a code change

```bash
cd bigman && git pull
docker compose -f deploy/docker-compose.yml up -d --build
```

The database is on a volume, so this replaces the app and keeps every row.

### Changing your domain

Rebuild, do not just restart. `NEXT_PUBLIC_SITE_URL` is compiled into the
prerendered sitemap and robots.txt, so a restart alone leaves the old domain in
both.

```bash
nano deploy/.env                                              # new domain
docker compose -f deploy/docker-compose.yml up -d --build
```

### Backups

The volume is the entire site — catalogue, edits, reviews, everything.

```bash
docker run --rm \
  -v bigman_propfirm-data:/data -v "$PWD":/backup alpine \
  cp /data/app.db /backup/app-$(date +%F).db
```

Copy that file off the server. A free-tier instance can be reclaimed for
inactivity, and a backup that lives only on the machine it protects is not a
backup. To restore, stop the stack and copy the file back the other way.

Worth automating once you have real data in it:

```bash
(crontab -l 2>/dev/null; echo "0 4 * * * cd $HOME/bigman && docker run --rm -v bigman_propfirm-data:/data -v \$HOME/backups:/backup alpine cp /data/app.db /backup/app-\$(date +\%F).db") | crontab -
```

### Useful commands

```bash
docker compose -f deploy/docker-compose.yml ps            # what's running
docker compose -f deploy/docker-compose.yml logs -f app   # app logs
docker compose -f deploy/docker-compose.yml restart app   # restart just the app
docker compose -f deploy/docker-compose.yml down          # stop (keeps the volume)
```

---

## When it does not work

**The site does not load at all.** Check DNS first — `dig +short your-domain.com @1.1.1.1`
must return your IP. If it returns something else, an old record survived. Then check that ports 80 and 443 are open in *both* places:
the cloud firewall (Oracle security list / GCP firewall rules) and, on Oracle,
the machine's own iptables. Opening only one is the usual cause.

**"Your connection is not private."** Caddy has not got a certificate yet.
`docker compose -f deploy/docker-compose.yml logs caddy` will say why. Almost
always one of two things: the domain was not resolving to this server when
Caddy first asked, or Cloudflare's proxy is on and intercepting the challenge.
Fix whichever it is, then `restart caddy`.

**The page redirects forever.** Cloudflare proxy with SSL/TLS set to
"Flexible". Switch it to **Full (strict)**, or turn the proxy off.

**The build is killed partway through.** Out of memory — the `e2-micro` case.
Add the swap file from Option B and build again.

**`/admin` rejects the password.** `ADMIN_PASSWORD` is read at container start.
Editing `deploy/.env` does nothing until you `up -d` again.

**The catalogue looks empty.** Correct. Everything seeds as draft. Publish in
`/admin/challenges`.

---

## What this costs later

Free until you outgrow it, and the ceiling is high — this is a read-heavy site
in front of a SQLite file, which a small VM serves comfortably at far more
traffic than a new site gets. If you eventually want managed backups and
zero-touch deploys rather than a machine you maintain, the same Dockerfile runs
unchanged on Railway or Render for about $5–7 a month plus a small volume
charge. Nothing in the app has to change.

**Sources for the free-tier claims above**, all checked in August 2026:
[Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) ·
[Oracle's June 2026 ARM limit cut](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/) ·
[Google Cloud Free Tier](https://cloud.google.com/free) ·
[Fly.io's retired free tier](https://www.saaspricepulse.com/blog/flyio-free-tier-2026)
