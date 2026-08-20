# Putting it online for free, on a Namecheap domain

Server hosting: **$0/month.** Domain: whatever Namecheap charges you, usually
$10–15 a year. Nothing else.

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

## 4. Point the Namecheap domain at the server

Do this **before** you start the app. Caddy proves domain ownership over HTTP
to get a certificate, and it cannot do that until DNS resolves to your machine.

In Namecheap: **Domain List → Manage → Advanced DNS.** Delete the default
"parking page" CNAME and URL redirect records — they will fight you — and add:

| Type | Host | Value | TTL |
| ---- | ---- | ----- | --- |
| A Record | `@` | your server's public IP | Automatic |
| A Record | `www` | your server's public IP | Automatic |

Two A records, not a CNAME for `www`: the compose stack serves both names, and
a CNAME at `www` pointing to a domain that is itself an A record works but adds
a lookup for no benefit.

Wait for it to take effect, and **check before continuing**:

```bash
dig +short your-domain.com
dig +short www.your-domain.com
```

Both must print your server's IP. Namecheap is usually a few minutes; it can be
up to an hour. Trying to start the stack before this resolves will burn a
Let's Encrypt failure against your rate limit.

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

**The site does not load at all.** Check DNS first — `dig +short your-domain.com`
must return your IP. Then check that ports 80 and 443 are open in *both* places:
the cloud firewall (Oracle security list / GCP firewall rules) and, on Oracle,
the machine's own iptables. Opening only one is the usual cause.

**"Your connection is not private."** Caddy has not got a certificate yet.
`docker compose -f deploy/docker-compose.yml logs caddy` will say why. Almost
always DNS: the domain was not resolving to this server when Caddy first asked.
Fix DNS, then `restart caddy`.

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
