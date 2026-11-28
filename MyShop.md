# MyShop: project guide for Claude Code

## What this is
MyShop is a PWA for kids (ages 5-15) to simulate running a small online shop. Kids photograph or upload items to sell, set prices in different currencies, create customers, and run the shop like a real store. It is hosted on GitHub Pages (flat files in the repo root, no build step) and installs on Android and iOS. Languages: English and Arabic (RTL). Everything is stored on the device (IndexedDB). No server, no accounts, no real payments.

The goal of the game is educational: teach kids how to run a small shop and do real-life money maths, with a game feel (levels, missions, badges, decorations, sounds).

## Stack and constraints
- Vanilla HTML/CSS/JS. No framework, no bundler, no npm. Classic `<script>` globals shared across files (load order in `index.html`: i18n, db, sfx, mascots, data, core, money, economy, cpu, skills, views, nav, actions, app).
- Must work offline (service worker), on small phones, tablets and landscape, in dark and cream themes, in LTR and RTL.
- Keep everything in the repo root (GitHub Pages deploy from branch root).

## Files
- `core.js`: state `S`, `t()`, icons, themes, `feat()`, toasts, sheets.
- `money.js`: `rnd`, `conv`, `fmt`, `bdi`/`iso`, dates, photo URL cache (`photoUrl`).
- `economy.js`: `normProfile`, cash paths (`earn`, `pay`, `jarMove`, `commit`, `saveP`), missions, badges, budgets, costs, `finishOrder`, `deliver`, `today()`.
- `cpu.js`: robot customers (`cpuCatchUp`, `cpuRun`), away and missed-sales sheets, invoice check, week report, stock planner.
- `skills.js`: jars, interest, honesty, complaints, cash book, quests, discount decision, daily plan, skills dashboard; `afterOpen()`.
- `views.js`: all screens. `nav.js`: back button. `actions.js`: the `ACT` map. `app.js`: listeners, backup/restore, boot.
- Views are functions returning HTML strings (`VIEWS` map, `render()`, `setView()`). Clicks use event delegation with `data-act` attributes mapped to the `ACT` object; handler signature `(dataset, element, event)`. Dialogs are "sheets" (`sheet()`, `closeSheet()`, overlay `#ov`).
- `data.js`: catalogs (levels and feature presets, decor, skins, missions, badges, categories, order statuses, events).
- `i18n.js`: `I18N.en` and `I18N.ar`. Use `t(key, {vars})`. Every key must exist in both languages.
- `db.js`: tiny IndexedDB wrapper (`DB`). Stores: profiles, products, meta, customers, orders, ledger (DB version 3). `DB.multi(stores, fn)` is one transaction.
- `sfx.js`: sounds synthesized with Web Audio (no audio files).
- `mascots.js`: inline SVG mascots (14) and customer avatars.
- `style.css`: all styles, themes via `data-theme` and `data-skin` on `<html>`, responsive breakpoints at 700px, 1000px and short landscape.
- `sw.js`: service worker. **Bump `VERSION` on every release** so phones fetch new files.
- `manifest.webmanifest` (orientation `any`), icons, `README.md`.

## Key design decisions (do not undo without asking)
- **Money is stored in each shop's own currency** (no USD base). Use `rnd()`, `conv()`, `fmt()`, `lp()` (nice local price from a USD constant), `minUnit()`. Currencies with rate >= 20 use whole numbers. Always `rnd()` after adding or subtracting money.
- **Customers have a hidden daily budget.** Never show it as a number. Only a mood face (😄🙂😬😴) and messages like "can't spend that much today". Budget depends on the average price, personality, a daily random factor and the Tycoon daily event.
- **Four profile levels** (`p.lvl`): Starter (5-7, app does all maths, no coupons), Explorer (7-9, add up and give change), Merchant (9-12, percent coupons, costs and profit), Tycoon (12-15, profit question, delivery fee, currency exchange game, savings goal, daily events). Features are flags in `PRESET`; parents can override single features (`p.ft`). `feat(p, 'name')` is the only way to check a feature.
- **Parents decide level changes** (PIN-protected panel). The app may show a suggestion (`lvlHint`) but never changes the level itself.
- **Starter is fully automatic**: no typing of answers, no coupons.
- **Checkout is a chain of stages** (`S.pay.stages`): `sum`, `change` (or `auto`), `profit`. Two tries, then the answer is revealed. Skipping is allowed.
- **Back button:** the app keeps one guard history entry above the root. Back closes a sheet, goes up one screen, in the shop offers Stay / Back to profiles / Exit app, and on the profiles screen needs a second press to leave. Do not add more history entries.
- **Busy lock:** async actions return a promise so double taps cannot repeat them. Keep async `ACT` handlers returning their promise.
- **Numbers typed by kids** must go through `parseNum()` / `normDigits()` (Arabic-Indic digits, comma decimals, thousands separators).
- No printed receipts (user said no).
- **Game day** (v7): use `today()` / `gameDay(p)`, never `dkey()`, for anything daily in a profile (missions, budgets, exchange cap, order day). It never goes backwards (`p.maxDay`).
- **Atomic saves** (v7): a change that touches several stores (sale, delivery, restock, new item, restore) goes through `DB.multi(stores, fn)`.
- **Cost price** (v7): `x.cost` is locked when stock is bought; `costOf(x)` reads it. Market prices live in `MKT` (data.js, USD) via `mktOf(cat)`; budgets use `avgPrice()` clamped to 0.5x-2x market.
- **Toasts** (v7): `toast(msg, emoji)`; every message leads with a picture. Picture mode is the `pic` feature.
- **Cash paths** (v8): never change `p.cash` directly. Income uses `earn(p, amt, kind)` (split into the jars for sale, tip, mission, quest, exch, keep), spending uses `pay()`, jar moves use `jarMove()`. Save with `commit(stores, fn)` or `saveP()`, which write the cash book lines in the same transaction. `p.cash` is the Spend jar; `p.jars = {save, share, given}`.
- **Service worker** (v8): only the install of a new `VERSION` fills a cache; the fetch handler never writes to it.

## Decisions for CPU customers (v8)
- The mode (manual or robot) is chosen when the customer is created; only parents (PIN) can change it.
- Robot orders pay when ordered. Manual customers work exactly as before.
- At Starter the kid still delivers robot orders, with no late penalty.
- The invoice check applies to robot orders at Tycoon only.
- Catch-up looks at most 24 h back, is seeded (same result for the same day) and never runs while a cart or question is open.

## Conventions
- Escape all user text with `esc()` when building HTML.
- Wrap browser storage access defensively; the app must render without it.
- New UI text: add to both `I18N.en` and `I18N.ar` (run a key-parity check).
- Prefer small targeted edits; test in a browser (Playwright) after each feature.

## Testing
Use Playwright (Python) with Chrome and a local `python3 -m http.server`, service workers blocked. Cover: back-button flows, tablet and landscape layouts (no horizontal overflow), each level's checkout flow, level switching, v2 to v3 data migration, double taps, Arabic digits, currency change, invalid backup restore, PIN lockout. Check for JS errors on every run.

## Release steps
1. Bump `VERSION` in `sw.js`.
2. Update `README.md` if features changed.
3. Zip the 24 root files (`core.js`, `money.js`, `economy.js`, `cpu.js`, `skills.js`, `views.js`, `nav.js`, `actions.js`, `app.js`, `data.js`, `db.js`, `i18n.js`, `sfx.js`, `mascots.js`, `style.css`, `sw.js`, `index.html`, `manifest.webmanifest`, `README.md`, `MyShop.md`, 4 icons; check `ASSETS` in `sw.js` lists every code file).
4. Upload to the GitHub repo root. Phones may need the app opened twice to show the new version.

## History
- v1: profiles with parent PIN, items with photos, currencies, 14 mascots, dark and cream themes.
- v2: storefront with cart, custom customers, orders (Ordered, Packed, Shipped, Delivered), reviews and tips, daily sales, missions, badges, decor, coupons, sounds, backup and restore.
- v3: history-driven back button, tablet and landscape layout, money in shop currency, hidden customer budgets, cashier maths, double-tap and digit fixes.
- v4: 10 shop themes with wallpapers and a theme studio.
- v5: four profile levels with per-feature controls, profit and cost, delivery fee, exchange game, savings goal, daily events.
- v6: hidden-bug fixes (comma numbers, restore safety, PIN lockout, currency change on goals, midnight refresh, and more).
- v7 (R1 "Fair shop"): atomic restore/sale/delivery (`DB.multi`), market-based budgets (`MKT`), locked cost price and margin, price meter, clock guard, rounding-friendly answers, change mission, RTL `<bdi>`, picture mode with message log, 44 px targets, reduced motion, backup reminder, persisted PIN lockout. 
- v8 (R2 + R3): `app.js` split into modules; service worker fills a cache only on a new VERSION; photo URL cache. Robot customers (mode, catch-up, away sheet, missed sales, late penalty, Tycoon invoice check), week report, low-stock alert, stock planner. Spend/Save/Share jars, Tycoon interest, honesty moments, complaints, cash book (`ledger` store, DB v3), quests, parents skills dashboard, discount decision, daily plan. Backups are v5 (with the cash book); v3 and v4 backups still import.

## Possible next steps
- Save the item form draft so a camera reload on some Android phones does not lose it.
- French language (postponed by the user).
- More educational content: supply and demand, percent quizzes, voice reading, suppliers, expenses and upgrades.
- Seasonal themes.

## Working style with the owner (HaMed)
Discuss options before building big features. Deliver one final tested zip when a phase is finished, not partial files. Keep answers short and modular.
