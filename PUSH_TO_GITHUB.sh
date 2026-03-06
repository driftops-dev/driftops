# ─────────────────────────────────────────────────────────────────
# PIPELINEIQ — PUSH TO GITHUB
# Run these commands exactly, in order
# ─────────────────────────────────────────────────────────────────

# 1. Extract the archive (wherever you downloaded it)
tar -xzf pipelineiq-final.tar.gz
cd pipelineiq

# 2. Initialize git
git init
git branch -M main

# 3. Connect to your GitHub org (use HTTPS or SSH — pick one)
git remote add origin https://github.com/pipelineiq1/pipelineiq.git
# OR with SSH:
# git remote add origin git@github.com:pipelineiq1/pipelineiq.git

# 4. Stage everything
git add .

# 5. First commit
git commit -m "feat: PipelineIQ POC — scanner, differ, NIST engine, AI reports, worker, dashboard"

# 6. Push
git push -u origin main

# ─────────────────────────────────────────────────────────────────
# AFTER PUSH — create develop branch for clean workflow
# ─────────────────────────────────────────────────────────────────
git checkout -b develop
git push -u origin develop

# ─────────────────────────────────────────────────────────────────
# NEXT: Go to github.com/pipelineiq1/pipelineiq
# You should see all 29 files live
# ─────────────────────────────────────────────────────────────────