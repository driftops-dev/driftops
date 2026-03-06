# DriftOps — Complete Setup Guide
# From zero to deployed in under 30 minutes

---

## Prerequisites
- GitHub account
- Node.js 20+ installed locally
- Cloudflare account (free)
- Supabase account (free)

---

## Step 1 — GitHub Setup (5 min)

1. Create org at github.com/organizations/new
   - Name: driftops
   - Plan: Free

2. Create repo: github.com/driftops-dev/driftops
   - Visibility: Private
   - Add README: No (we have one)

3. Push the code:
   ```bash
   cd driftops
   git init
   git remote add origin git@github.com:driftops-dev/driftops.git
   git add .
   git commit -m "feat: initial POC — scanner, differ, NIST engine, worker, dashboard"
   git push -u origin main
   ```

---

## Step 2 — Supabase Setup (5 min)

1. Go to supabase.com → New Project
   - Name: driftops
   - Password: save it somewhere safe
   - Region: pick closest to you

2. Once created, go to SQL Editor
   - Paste the contents of supabase/schema.sql
   - Click Run

3. Go to Settings → API, copy:
   - Project URL → SUPABASE_URL
   - anon/public key → SUPABASE_ANON_KEY
   - service_role key → SUPABASE_SERVICE_KEY

---

## Step 3 — Cloudflare Setup (10 min)

### Worker:
1. Install Wrangler: npm install -g wrangler
2. Login: wrangler login
3. Create KV namespace:
   ```bash
   wrangler kv:namespace create DRIFTOPS_KV
   # Copy the ID into wrangler.toml
   wrangler kv:namespace create DRIFTOPS_KV --preview
   # Copy preview ID into wrangler.toml
   ```
4. Set secrets:
   ```bash
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_SERVICE_KEY
   ```
5. Deploy worker:
   ```bash
   wrangler deploy
   # Note the worker URL: driftops-worker.YOUR-SUBDOMAIN.workers.dev
   ```

### Pages (dashboard):
1. cd dashboard && npm install
2. cp .env.example .env.local
3. Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_WORKER_URL
4. npm run build
5. wrangler pages deploy dist --project-name=driftops
   - Note your dashboard URL: driftops.pages.dev

---

## Step 4 — Get Free AI Key (2 min)

1. Go to console.groq.com
2. Sign up (no credit card)
3. Create API key
4. Save as GROQ_API_KEY

---

## Step 5 — GitHub Secrets (3 min)

In your GitHub repo → Settings → Secrets → Actions, add:

| Secret Name              | Value |
|--------------------------|-------|
| CLOUDFLARE_API_TOKEN     | From cloudflare.com → My Profile → API Tokens |
| CLOUDFLARE_ACCOUNT_ID    | From cloudflare.com → right sidebar |
| SUPABASE_URL             | From Supabase Settings → API |
| SUPABASE_ANON_KEY        | From Supabase Settings → API |
| WORKER_URL               | Your deployed worker URL |
| GROQ_API_KEY             | From console.groq.com |

---

## Step 6 — Test It Locally (5 min)

```bash
cd action
npm install
cp ../.env.example .env
# Fill in .env with your values

# Create a test terraform file
mkdir -p /tmp/test-infra
cat > /tmp/test-infra/main.tf << 'EOF'
resource "aws_s3_bucket" "test" {
  bucket = "my-test-bucket"
}

resource "aws_security_group" "web" {
  name = "web-sg"
}
EOF

# Run the scanner
INPUT_IAC_PATH=/tmp/test-infra node src/index.js
```

You should see:
- Resources found
- NIST violations flagged
- Compliance score calculated
- AI report (if GROQ_API_KEY set)

---

## Step 7 — Install In Any Repo

Copy docs/example-workflow.yml to:
.github/workflows/driftops.yml

Add your DRIFTOPS_TOKEN secret (generate from dashboard → Settings).

Push a commit with a .tf file. Watch DriftOps run in the Actions tab.

---

## What's Running Now (POC Complete)

| Component        | Status | URL |
|-----------------|--------|-----|
| Terraform Scanner | ✅ Done | action/src/scanner.js |
| Drift Differ      | ✅ Done | action/src/differ.js |
| NIST Engine       | ✅ Done | action/src/nist.js |
| AI Reports        | ✅ Done | action/src/ai.js (Groq free) |
| GitHub Action     | ✅ Done | action.yml |
| CF Worker API     | ✅ Done | worker/index.js |
| Supabase Schema   | ✅ Done | supabase/schema.sql |
| Dashboard Auth    | ✅ Done | dashboard/src/components/AuthPage.jsx |
| Dashboard UI      | ✅ Done | dashboard/src/components/Overview.jsx |
| CI/CD Pipeline    | ✅ Done | .github/workflows/deploy.yml |

## What's Next (Phase 2)

- [ ] Auto-diagram generation (L1-L4)
- [ ] Azure DevOps extension
- [ ] Scan history page
- [ ] Compliance breakdown page
- [ ] Drift timeline page
- [ ] CIS Benchmark support
- [ ] GitHub Marketplace listing
- [ ] Product Hunt launch

---

## Cost Tracker

| Service      | Cost    | Notes |
|-------------|---------|-------|
| GitHub       | $0      | Free org + private repo |
| Cloudflare   | $0      | Pages + Workers free tier |
| Supabase     | $0      | Free tier (500MB) |
| Groq AI      | $0      | Free tier (unlimited for now) |
| Domain       | $0      | use driftops.pages.dev |
| **TOTAL**    | **$0**  | |
