# MyShop

A fun shop simulator for kids (ages 5-14). Kids take or upload photos of things they want to "sell", set prices in different currencies, and play customers to earn coins and level up. Installable on Android and iOS as a PWA. English and Arabic (RTL).

Everything is stored on the device (IndexedDB). No accounts, no servers, no real payments.

## Features
- Multiple profiles (up to 6), protected by a parent PIN for adding or deleting
- 6 mascots, dark and cream themes, 6 accent colors, shop name and currency per profile
- Photo from camera or gallery, name, price, currency, quantity
- Customer simulation with coins, XP and levels
- EN / AR with automatic right-to-left layout
- Currencies: USD, EUR, GBP, SAR, AED, DZD, EGP, MAD, TND, CAD, TRY (rates editable by parents)
- Works offline after the first visit

## Publish on GitHub Pages
1. Create a repository and upload **all files** in the repository root (no folders).
2. Settings > Pages > Source: **Deploy from a branch**, Branch: `main`, folder `/ (root)`.
3. Open `https://<your-username>.github.io/<repo-name>/`.

## Install on a phone
- **Android (Chrome):** open the link, tap the menu, then **Install app** (or use the Install button inside the parent panel).
- **iPhone / iPad (Safari):** open the link, tap **Share**, then **Add to Home Screen**.

## Updating the app
After changing any file, edit `VERSION` in `sw.js` (for example `myshop-v2`) so phones download the new files.

## Files
`index.html`, `style.css`, `app.js`, `db.js`, `i18n.js`, `mascots.js`, `sw.js`, `manifest.webmanifest`, and the icons (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`).

## Notes
- Exchange rates are approximate defaults; parents can edit them in the Parents panel.
- Clearing the browser's site data erases profiles and items. A backup/export feature can be added later.
