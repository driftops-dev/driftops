# PipelineIQ 🧠

> AI-powered infrastructure compliance, drift detection, and auto-diagramming — as a single pipeline step.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue)](https://github.com/marketplace)

---

## What It Does

PipelineIQ drops into any CI/CD pipeline as a single step and gives your infrastructure a brain:

| Stage | What happens |
|---|---|
| 🔍 **Scan** | Reads your Terraform / ARM / Bicep / CDK on every push |
| 📸 **Snapshot** | Captures infrastructure state, stores it |
| 🔄 **Diff** | Compares to prior state — what changed, what drifted |
| 🏛️ **Comply** | AI benchmarks every resource against NIST 800-53 + CIS |
| 📊 **Diagram** | Auto-generates L1–L4 architecture diagrams |
| 🚦 **Gate** | Blocks the deploy if critical violations found |
| 💬 **Report** | Posts AI-written summary to PR as a comment |

## Quick Start

Add this to your GitHub Actions workflow:

```yaml
- name: PipelineIQ Scan
  uses: pipelineiq1/pipelineiq@v1
  with:
    iac_path: './terraform'
    compliance_level: 'nist-800-53'
    enforce: false         # set true to block on violations
  env:
    PIPELINEIQ_TOKEN: ${{ secrets.PIPELINEIQ_TOKEN }}
```

## Stack

- **CI/CD**: GitHub Actions / Azure DevOps
- **Frontend**: Cloudflare Pages (React)
- **Backend**: Cloudflare Workers
- **Database**: Supabase (Postgres)
- **Auth**: Supabase Auth
- **AI**: Groq (free tier) → Claude Haiku at scale
- **SSL + Firewall**: Cloudflare

**Cost to run: $0/month at POC scale.**

## Project Structure

```
pipelineiq/
├── action/          # GitHub Action + ADO Extension
├── dashboard/       # Cloudflare Pages frontend
├── worker/          # Cloudflare Worker API
├── supabase/        # Database schema + migrations
└── docs/            # Documentation
```

## Roadmap

- [x] Repo scaffold
- [ ] Terraform scanner
- [ ] State diff engine  
- [ ] AI compliance mapping (NIST 800-53)
- [ ] GitHub Action packaging
- [ ] Dashboard (compliance score + drift timeline)
- [ ] Auto-diagram generation (L1–L4)
- [ ] Azure DevOps extension
- [ ] Enforce / auto-remediation mode
- [ ] CIS Benchmark support
- [ ] SOC2 mapping

## License

MIT
