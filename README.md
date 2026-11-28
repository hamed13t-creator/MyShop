# MyShop

A fun shop simulator for kids (ages 5-14). Kids photograph the things they want to "sell", set prices in different currencies, create customers who shop with a cart, and run the shop like a real online store. Installable on Android and iOS as a PWA. English and Arabic (RTL).

Everything is stored on the device (IndexedDB). No accounts, no servers, no real payments.

## Features
- **Profiles** (up to 6) protected by a parent PIN. Each kid picks one of 14 mascots, a dark or cream theme, an accent color, a shop name and a currency.
- **Items**: photo from camera or gallery, name, price, currency, category, discount (-10% to -50%), quantity. A **price meter** (😀 cheap, 🙂 fair, 😬 pricey) compares the price with a hidden market price while the kid types; Starter gets a "good price" button. Each item keeps the **cost price** it was bought at: restocking uses it, and Merchant and Tycoon also pay for the first stock. Merchant and Tycoon see cost, profit and **margin %** per item.
- **Customers**: create your own (name, mascot, hat, color, personality). Each has a hidden daily budget (never shown as a number, different every day) and a mood face that tells how ready they are to spend.
- **Storefront**: search, categories, favorites, product pages, **Add to cart**, cart with quantities, coupon codes, checkout.
- **Four levels** per profile, chosen by the parent when creating it and changeable any time in the Parents panel (PIN): **Starter** (ages 5-7, the app does all the maths, no coupons), **Explorer** (7-9, add up and give change), **Merchant** (9-12, percent coupons, costs and profit), **Tycoon** (12-15, profit questions, delivery fee, currency exchange game, savings goal, daily events). Single features can be switched on or off per kid. The app only suggests a level change; the parent decides.
- **Shop maths**: the cart hides the total. The kid adds up the prices, then gives the right change. Parents choose per kid: *No math*, *Easy* (sum of items) or *Normal* (total after a coupon). Bonus XP, math stats in the Parents panel.
- **Cash**: every sale adds the real value of the order to the shop's cash. A sale or a delivery is saved all at once, so closing the app mid-way never leaves half a sale.
- **Fair play**: customer budgets follow market prices (a giant price does not make customers rich), and setting the phone clock back or forward does not give extra missions or budgets.
- **Picture mode** (on for Starter, optional for others): big picture messages that stay longer, a 🔔 message log and bigger buttons.
- **Daily sales** (tap the cash pill): revenue, orders, items sold, 7-day chart, and orders with a status flow *Ordered > Packed > Shipped > Delivered*. Delivery brings a star review and sometimes a tip.
- **Game**: levels, daily missions, badges, leaderboard between profiles, shop decorations (sign, poster, counter, pet, plant), **10 shop themes** that unlock with level (Classic, Ocean, Candy, Winter, Space, Pirate, Arcade, Jungle, Souk, Sunset), each with its own wallpaper, plus a theme studio (wallpaper on/off, custom awning color), an Open/Closed sign, and sound effects (with a mute button).
- **Phone back button**: closes dialogs, goes back one screen. In the shop it offers *Stay / Back to profiles / Exit the app*; on the profiles screen, pressing back twice leaves the app.
- **Any screen**: phones, tablets, landscape and rotation. On wide screens the cart sits beside the shelf.
- **Money** is kept in each shop's own currency (no hidden conversions), and kids can type Arabic digits.
- **Parents**: progress summary per kid, exchange rates, change PIN, backup and restore to a file (checked first, then restored all at once, or not at all), a reminder after 7 days without a backup, and whether the browser keeps the data safe. The PIN lockout survives a reload.
- **Robot customers** (v8): when a kid creates a customer they choose *I play this customer* or *Robot customer*; only a parent (PIN) can change it later. Robots visit the shop on their own, even while the app is closed, and order what they like at fair prices. They pay when they order. The kid packs, ships and delivers; late deliveries lose stars from Explorer up (never at Starter). Robots skip a closed shop, a sold-out item or a price that is too high, and the kid sees these lost sales with a hint. At Tycoon, robot orders need an invoice check when packing.
- **Week report** (v8): a report card with sales, best seller, lost sales and one tip. **Low-stock alerts** and a **stock planner** question (Merchant, Tycoon).
- **Jars** (v8): every coin earned (sales, tips, rewards) is shared between the **Spend**, **Save** and **Share** jars. Starter sees pictures and a fixed split; from Explorer the kid chooses the split (at least 30% stays for spending). The Share jar can be given to a cause; savings can be moved back to Spend. Tycoon savings earn **2% interest** each week.
- **People skills** (v8): **honesty moments** (a customer pays too much by mistake: give it back or keep it), **complaints** about late or broken deliveries (say sorry, send a new one or give money back), **quests** that last several days, a **discount decision** for items that do not sell, and a **daily plan** (guess today's sales, check it tomorrow).
- **Cash book** (v8, Merchant and Tycoon): every coin in and out, with what is left in the Spend jar.
- **Parents skills dashboard** (v8): correct answers per maths skill and money habits (savings, giving, honest choices, complaints, quests, plans).
- Works offline after the first visit. A new version is downloaded all at once, so old and new files are never mixed.

## Publish on GitHub Pages
1. Create a repository and upload **all files** in the repository root (no folders).
2. Settings > Pages > Source: **Deploy from a branch**, Branch: `main`, folder `/ (root)`.
3. Open `https://<your-username>.github.io/<repo-name>/`.

## Install on a phone
- **Android (Chrome):** open the link, tap the menu, then **Install app** (or use the Install button in the Parents panel).
- **iPhone / iPad (Safari):** open the link, tap **Share**, then **Add to Home Screen**.

## Updating the app
Replace the files in the repository. Then change `VERSION` in `sw.js` (for example `myshop-v9`) so phones download the new files. Phones may need the app opened twice to show the new version. Existing profiles, items and orders are kept.

## Files
`index.html`, `style.css`, the app code (`core.js` helpers, `money.js` prices and dates, `economy.js` cash, jars and orders, `cpu.js` robot customers and reports, `skills.js` jars, cash book, quests and other money and people skills, `views.js` screens, `nav.js` back button, `actions.js` buttons, `app.js` start-up and backup), `db.js` (storage), `i18n.js` (English and Arabic text), `sfx.js` (sounds), `mascots.js`, `data.js` (catalogs for decor, missions, badges), `sw.js`, `manifest.webmanifest`, and the icons (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`).

## Notes
- Exchange rates are approximate defaults; parents can edit them in the Parents panel.
- Sounds are generated by the browser, so there are no audio files. On iPhone, sound plays after the first tap and may be silent when the ring/silent switch is on.
- Clearing the browser's site data erases everything. Use Backup in the Parents panel to keep a copy.
