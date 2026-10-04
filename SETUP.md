# Setup (5 min) — delete this file after

Profile repo must be named exactly `DP1110/DP1110` (public).

1. Copy everything in this folder into the repo root (keep `.github/`, `assets/`, `scripts/`, `README.md`).
2. Repo → Settings → Actions → General → Workflow permissions → **Read and write permissions** → Save.
3. Actions tab → run each once via **Run workflow**, in this order:
   1. `GitHub-Profile-Summary-Cards` (creates `profile-summary-card-output/`)
   2. `Generate Snake` (creates the `output` branch)
   3. `Update Trending` (fills the trending table)
4. Hard-refresh your profile (GitHub caches images 5–10 min).

If Summary Cards fails with "Resource not accessible by integration" or some cards are missing:
create a classic PAT (scopes: `repo`, `read:user`), save as repo secret `SUMMARY_GITHUB_TOKEN`, re-run.

If a card path 404s, open `profile-summary-card-output/radical/` in the repo and match the file names in README.
