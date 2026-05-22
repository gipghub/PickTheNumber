# Spin, Deal & Draw

Spin, Deal & Draw is an installable static PWA for casual lottery players who want entertainment-first, data-aware picks for Powerball and Mega Millions. It also includes simple strategy helpers for blackjack, Jacks or Better video poker, craps, 3 card poker, slots, and bankroll planning.

## What It Does

- Stores up to five years of lottery draw history in IndexedDB.
- Syncs public Powerball and Mega Millions CSV feeds from Data.gov / NY Open Data.
- Supports CSV import if a browser blocks live data requests.
- Shows hot, cold, overdue, and pattern summaries.
- Generates balanced entertainment picks while avoiding common birthday-number bias.
- Caches the app shell for offline PWA use.

## Responsible Play

Lottery drawings are independent random events. Historical data cannot predict future winning numbers or improve the underlying jackpot odds in a reliable way. This app is for entertainment, organization, and basic strategy reference only.

## Local Use

Serve the folder with any static server:

```powershell
python -m http.server 8766 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8766/
```

## Testing

This project intentionally uses Node's built-in test runner and no external npm dependencies.

```powershell
npm run ci
```

That command runs syntax checks for the browser scripts and unit tests for the pure lottery and strategy logic.

## CI/CD

GitHub Actions runs checks and tests on every pull request and on pushes to `main` or `master`. Pushes to `main` or `master` also deploy the static PWA to GitHub Pages using the official Pages actions.

If Pages is not already enabled for the repository, set the Pages source to **GitHub Actions** in the repository settings after the first push.
