# Villa Paint colour palette tool — for villapaint.ca

Search real Benjamin Moore and Sherwin-Williams colours, build a 3-colour palette, save it as an image with your logo and email on it. Built to embed directly into a Squarespace page.

## Step 1 — Host the 6 files

Squarespace can't run this itself (Code Blocks embed a page, they don't host one), so it needs a real web address first. Free, easy options:

**Netlify Drop (simplest):** go to [app.netlify.com/drop](https://app.netlify.com/drop), drag all 6 files in (`index.html`, `app.js`, `colors.js`, `coordinates.js`, `sw-data.js`, `villa-logo.png` — as a folder or all selected at once), and you'll get a live link in seconds. No account required, though creating a free account lets you keep the same link permanently instead of it being randomly generated.

**GitHub Pages:** create a repo, upload the 6 files, turn on Pages in Settings. A bit more setup, but free and permanent, and easy to update later by re-uploading files.

Either way, you'll end up with a URL like `https://your-site-name.netlify.app/index.html`. That's what goes into the embed code below.

## Step 2 — Embed it in Squarespace

In the page editor, add a **Code Block** where you want the tool to appear, and paste this in — replacing the `src` with your actual hosted URL:

```html
<iframe id="villa-palette-iframe" src="https://YOUR-HOSTED-LINK-HERE/index.html"
  allow="web-share"
  style="width:100%; border:none; display:block; min-height:500px;"
  title="Villa Paint colour palette tool"></iframe>
<script>
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'villa-palette-resize') {
      var f = document.getElementById('villa-palette-iframe');
      if (f) f.style.height = e.data.height + 'px';
    }
  });
</script>
```

The tool automatically tells the page how tall it is and the script resizes the iframe to match — so there's no fixed height to guess at, and no scrollbar inside a too-small box. The `min-height:500px` is just what shows briefly while it first loads.

The `allow="web-share"` line is what lets iPhones and iPads open the share sheet for **Save palette as image** from inside your page (see "The iPhone/Safari download issue is fixed" below). It does nothing on other devices, so it's safe to leave in.

This requires a Squarespace plan with custom code enabled (Core, Plus, Advanced, Business, or Commerce) — you confirmed you're on Business, so you're set.

## New: Sherwin-Williams

- **A brand switch** (Benjamin Moore | Sherwin-Williams) sits above the three colour slots, and again inside the colour picker. Whichever brand is selected is the one the picker searches, and the one **Suggest For Me** starts from when nothing is picked yet. Switching never changes colours already in your palette, and a palette can mix the two brands.
- **1,526 Sherwin-Williams colours**, with their SW numbers (SW 7029 and so on) and on-screen colour values, taken from Sherwin-Williams' own downloadable colour list. Search works the way it does for Benjamin Moore: by name or number, with or without capitals, accents, apostrophes or the "SW", so "agreeable gray", "sw7029" and "7029" all find the same colour.
- **The picker opens on "Popular Sherwin-Williams colours"** — 68 well-known colours, in an order you can change. Type anything and it searches every Sherwin-Williams colour. The starting list is my own choice of well-known colours, **not** an official Sherwin-Williams list; it is easy to edit (see "Changing the popular list or the suggestions" below).
- **Suggest For Me works for Sherwin-Williams too**, using **Villa Paint's own suggestions** (next section). The page always calls them "Villa Paint's suggestions", never Sherwin-Williams' pairings.
- **The saved image names whose colours they are**: "Benjamin Moore colours", "Sherwin-Williams colours", or "Benjamin Moore & Sherwin-Williams colours" for a mixed palette.

If the brand switch isn't there when you open the page, you are looking at an older copy of `index.html` — see "If Suggest For Me seems stuck" below.

### How Suggest For Me works for Sherwin-Williams

The steps are the same as for Benjamin Moore (below): one colour picked gives its first two partners, and each further tap gives the next two; each colour has six, so three taps show them all and a fourth starts again. Two colours picked: a colour both lists share comes first. Nothing picked: it starts from one of the popular colours. Colours you chose yourself are never replaced, and Suggest For Me only turns grey when you picked all three colours yourself.

What's different is where the partners come from. Sherwin-Williams' own coordinating colours aren't used here; these are **Villa Paint's suggestions**, made by written colour rules that give the same answer every time:

- **Each colour gets a role from its lightness:** a white (very light, hardly any colour), a wall colour (light to mid), or an anchor (dark).
- **A white is the trim**, so it is paired with wall colours and deep anchors. **A wall colour** gets a trim white, a deep anchor and a neighbour of the same undertone. **An anchor** gets lighter partners: a trim white, a soft wall colour, and a warm accent.
- **Whites match the undertone:** a warm colour gets a white that leans warm, a cool colour a cleaner white.
- **Anchors suit the undertone too** — navy, deep green, charcoal, bronze, clay, deep teal or plum, depending on the colour — and are always clearly darker than the colour they sit with.
- **Partners are never near-twins**, and dark colours are kept further apart than light ones, because dark colours look alike on a screen even when they aren't.
- **The same few colours aren't used everywhere:** a colour that has been used a lot is passed over when an equally good one is available.
- The small line under the button says what happened: *"Villa Paint's suggestions, matched to the undertone of your colour. Tap Suggest For Me again for more, or tap any colour to swap it yourself."*

If a palette holds colours from both brands, each colour's own list is used, starting with the first colour you picked. If a colour ever has no list, Suggest For Me falls back to the generated suggestions described below, using colours from the same brand as the ones you picked.

### Changing the popular list or the suggestions

All of this is in the separate **`sw-kit`** folder (its README explains each step):

- **The popular list:** edit `popular_sw.txt` (one name or number per line, in the order shown), rebuild, and upload the new `sw-data.js`.
- **Pairings you'd rather make yourself:** list them in `villa_picks.csv`. Yours come first, and everything you don't list keeps the rules' choices.
- **A newer Sherwin-Williams colour list:** `import_sw_excel.py` reads Sherwin-Williams' downloadable Excel file straight from its `.zip`, and reports what changed.

## What's different from the version we built earlier

Same underlying search and palette engine, restyled and re-tooled specifically for living on your site:

- **"Suggest For Me"** — pick one colour you like (or none at all) and tap it; it fills the empty slots with the colours Benjamin Moore's own experts pair with it, taken from the "Color Combinations" on that colour's page at benjaminmoore.com. Tap it again for Benjamin Moore's next suggestion for the same colour. Details below.
- **Real brand colours**, sampled directly from your logo file (`#6F888D` slate, `#AB5440` terracotta) — not a separate invented palette
- **Your logo** (background removed, so it drops cleanly onto any colour) in the header, the footer, and baked into every downloaded image
- **info@villapaint.ca** displayed on the tool and on every downloaded image
- Downloads as **PNG** instead of JPEG — no compression artifacts shifting the colour, which matters more here than file size
- **Opens on Benjamin Moore's Favourites** — tap a colour slot and the list starts with the 75 colours of Benjamin Moore's Favourites fan deck, with Swiss Coffee, Wickham Gray, Windham Cream, White Heron, Chelsea Gray, Dry Sage, Calm, Kendall Charcoal, Hale Navy, Caliente, Pale Oak, Cloud White, Manchester Tan and Palladian Blue first. A heading above the list says so. As soon as someone types, the search covers all 3,883 Benjamin Moore colours.
- **Forgiving search** — capital letters, accents and apostrophes don't matter ("cefalu" finds Cefalú Beach, "jack olantern" finds Jack O'Lantern), words can be in any order, and codes work with or without the dash ("oc117" finds OC-117)
- No app-install machinery (manifest, service worker, Android bridge) — none of that applies inside a browser tab/iframe, so it's gone, which keeps this version simpler and leaner
- Auto-resizes to fit inside the Squarespace embed, as above

## About the colour database

**Benjamin Moore: 3,883 colours**, with names, codes and on-screen colour values from the public Benjamin Moore colour list. **Sherwin-Williams: 1,526 colours**, with names, SW numbers and on-screen colour values from Sherwin-Williams' own downloadable colour list. (Dulux and Cloverdale were removed from this version; the Android app's files still hold them if you ever want them back.)

Benjamin Moore renames a colour now and then. Three are handled so far — **Cefalú Beach** (formerly Champion Cobalt, 2061-20), **Gray Cardigan** (formerly Timber Wolf, 1600) and **Satin Shoes** (formerly White Cloud, 2159-70) — and searching either the new or the old name finds them. Other renames may exist that I haven't spotted; the list of colour names comes from a public copy of Benjamin Moore's catalogue rather than live from their site.

Some colours are sold under two or three codes (Cloud White is CC-40, OC-130 and 967). The tool lists each colour once, and searching any of its codes finds it.

**The Benjamin Moore Favourites list.** The 75 colours come from Benjamin Moore's Favorites colour card, which has the same count and wording as the Favourites fan deck. Benjamin Moore's current online Favourites palette has since grown to 110 colours and is a somewhat different selection (only 34 colours in common). To change which colours open the list, or their order, edit the `FAVOURITE_CODES` lines near the top of `app.js` (one colour per line, with its name beside it), then upload `app.js`.

## How "Suggest For Me" decides what goes together (Benjamin Moore)

**Benjamin Moore's own pairings (3,854 colours).** Every colour page on benjaminmoore.com shows two "Color Combinations", their experts' picks. The scraper you ran collected them, and the tool uses them directly:

- **One colour picked:** the first tap fills the other two slots with the first two colours Benjamin Moore lists for it. Tap **Suggest For Me** again for the next two. Most colours have four, so that's all four seen in two taps, and a third tap starts over from the first two. (A few colours list three, and Cloud White lists seven; it works through whatever there is, two at a time.) Van Courtland Blue, for example: Wedgewood Gray + Simply White, then Milkyway + Coronado Cream, then back to the first pair.
- **Two colours picked:** the tool looks for a colour Benjamin Moore pairs with both. If there isn't one, it takes the next colour on the first pick's list.
- **Nothing picked:** it starts from a well-known Benjamin Moore colour (one from the collections with codes beginning HC-, OC-, AF-, CC- or CSP-) and adds that colour's pairings, shown from light to dark. Tap again for a different starting colour.
- **Colours you chose yourself are never replaced.** Suggest For Me only ever changes the colours it filled in itself, so you can mix freely:
  - Tap any colour (even one that was suggested) and pick another to swap it for your own. Suggest For Me stays available and builds around what you've kept. If you swap the first colour, the next tap gives the new colour's own pairings, starting from their first two.
  - Tap the ✕ on a colour to take it out. Tap Suggest For Me and it fills just that gap, with a different colour from the one you removed.
  - Suggest For Me only turns grey when you picked all three colours yourself, because then there is nothing left for it to suggest.
- The small line under the button tells you what a tap will do. After a Benjamin Moore suggestion it reads *"Benjamin Moore's own pairings. Tap Suggest For Me again for their next ones, or tap any colour to swap it yourself."*

**The 29 Benjamin Moore colours with no Benjamin Moore pairings** fall back to generated suggestions, using the colour logic from the earlier version: every colour in the database is sorted into one of three practical roles by its actual lightness and saturation (not its name) — a light neutral, a mid-tone neutral, or a bolder accent. The tool figures out which roles are missing from what you've picked, then searches for well-matched real colours in those roles (always from the same brand as the colours you picked), favouring a harmonious undertone (warm with warm, cool with cool) and, for accents, a hue that classically pairs with what's already there. There's randomness built in on purpose, so tapping again gives a different but still coordinated option.

Those 29 are: 26 colours (codes beginning ES-, SC-, PT-, plus AC-17 and AC-39) that had no "Color Combinations" on their page when the scraper ran, and 3 colours (Silver Gray 2131-60, Black PM-9, Chrome Green PM-10) that were added to the list after the scraper's run, so it never looked at them. The kit in the `bm-scraper` folder can fetch those in about half a minute — see its README.

A small message under the page tells you which one happened — "Using Benjamin Moore's official pairings", "Using Villa Paint's suggestions", or the generic starting-point message — so it's never ambiguous where the colours came from.

**How it was checked.** Before folding the Benjamin Moore data in, I compared it with lists I had read by hand from benjaminmoore.com for 14 well-known colours (Van Courtland Blue, Simply White, Hale Navy, Revere Pewter and ten more): all 14 matched, in the same order. (Three of the lists also contain a colour Benjamin Moore has since renamed, which wasn't in my list at the time, and Cloud White's includes the combinations from its second code's page.) The tool was then run in a real browser through every colour in the database: pick it, tap Suggest For Me, and confirm the colours that appear are exactly the ones the data lists, in rotation — all 3,854 Benjamin Moore colours with their own pairings, and all 1,526 Sherwin-Williams colours with Villa Paint's. The Sherwin-Williams file itself was also checked: every colour has six different partners, none a twin of the colour or of each other, and no one colour makes up more than 2% of all the partners. Other runs covered a missing `sw-data.js`, an older `index.html` beside the new files, the page inside an iframe, and real phone taps.

## The iPhone/Safari download issue is fixed

What was happening: iOS Safari doesn't reliably respect a webpage's request to download a file directly — instead of saving it, it just opens the image full-screen in the same tab, which is what you ran into. This is a long-standing, well-documented Safari behaviour, not a bug specific to this tool.

The fix: on **iPhones and iPads** (iOS 15 and up — effectively all of them in active use), tapping **Save palette as image** opens the native share sheet, with **Save Image** as one of the options right there — which saves it straight to Photos. On **everything else — Macs, Windows PCs, Android phones and tablets — it downloads the PNG straight away**, with no share menu, exactly as you'd expect.

(An earlier version of this tool opened the share menu on any device that could share, which wrongly included Macs and Android phones. It now does that only on iPhone and iPad.)

**One thing the iPhone needs from your Squarespace embed code:** the `allow="web-share"` in the `<iframe>` tag in Step 2. Safari only lets an embedded page open the share sheet if the page embedding it says so. Without it, the iPhone falls back to the old behaviour (the picture opening full screen). If you set the tool up before that line was in the embed code, open the Code Block and add `allow="web-share"` to the `<iframe …>` tag.

I tested each kind of device directly (iPhone, iPad in both its phone-style and desktop-style modes, Android, Mac with Safari and with Chrome, Windows, and the share sheet accepting, being cancelled, being blocked, or missing altogether) to make sure each one behaves correctly, though I can't fully test real Safari from here — if anything looks off on an actual iPhone, let me know what happened and I'll dig in.

## If Suggest For Me seems stuck, or the brand switch is missing

In this version, tapping Suggest For Me again always gives something new, and the button only turns grey when you picked all three colours yourself. If it greys out or does nothing right after a suggestion, or the Benjamin Moore | Sherwin-Williams switch isn't above the colour slots, you are almost certainly looking at an older copy of the files. A 20-second check:

1. Look for the **Benjamin Moore | Sherwin-Williams** switch above the three colour slots. If it isn't there, the page is an older one.
2. Pick one ordinary colour (Van Courtland Blue is a good test), then tap **Suggest For Me** once.
3. Look at the small line under the button and at the button's colour.
   - **New files:** the line begins "Benjamin Moore's own pairings. Tap Suggest For Me again for their next ones…" and the button stays its normal colour. (Switch to Sherwin-Williams, pick a colour and tap: the line begins "Villa Paint's suggestions…".)
   - **Older files:** the line says something else ("Not sure where to start?" or "Not quite right?"), or the button turns grey.

If it's the old files:

- Check that all 6 files are in the GitHub repository's main folder and were replaced, not just added: `index.html`, `app.js`, `colors.js`, `coordinates.js`, `sw-data.js` and `villa-logo.png`. `app.js` is the one that decides what the button does, and `sw-data.js` is the one that holds the Sherwin-Williams colours; those are the easiest to miss. If `sw-data.js` is missing, the page still works, with Benjamin Moore only and no brand switch.
- Wait a minute or two for GitHub Pages to publish, then reload. On a computer, hold Shift while clicking reload. On an iPhone, close the tab and open it again (or Settings → Safari → Clear History and Website Data), and check the Squarespace page in a private tab.
- Open the GitHub Pages address directly, without Squarespace in the way (`https://YOUR-HOSTED-LINK-HERE/index.html`), and run the check there first.

## Updating the live site later

Since this lives on GitHub Pages (or wherever you hosted it), updating it just means uploading new versions of these files to the same place — no changes needed to the Squarespace embed code, since the URL stays the same. Upload **all 6 files** each time so they stay in step (`index.html` and `app.js` are the page, `colors.js`, `coordinates.js` and `sw-data.js` are the data). Browsers and GitHub Pages hold on to files for a few minutes, so if you don't see a change straight away, wait a minute or two and refresh the page.

`index.html` loads the four script files as `colors.js?v=5`, `coordinates.js?v=5`, `sw-data.js?v=5` and `app.js?v=5`. The `?v=5` makes a browser fetch fresh copies whenever that number changes. If you ever update these files and some visitors still seem to be getting the old behaviour, change the 5 to a 6 in all four lines of `index.html` (and so on for later updates), then upload `index.html` with the rest.

**Refreshing the Benjamin Moore data** (new colours, or Benjamin Moore changing a combination): the separate `bm-scraper` folder has the tool for it. Its README walks through running it and ends with two fresh files, `colors.js` and `coordinates.js`, to upload here.

**Refreshing the Sherwin-Williams data** (a new colour list, a different popular list, or your own picks): the separate `sw-kit` folder has the tools for it. Its README walks through each job and ends with one fresh file, `sw-data.js`, to upload here. The Benjamin Moore tool doesn't touch `sw-data.js`, and the Sherwin-Williams kit doesn't touch `colors.js` or `coordinates.js`, so either can be refreshed on its own.

## Good to know about the colour data

- Colour names, codes and numbers belong to their owners: Benjamin Moore and Sherwin-Williams are trademarks of those companies.
- The Sherwin-Williams colour list comes from the file Sherwin-Williams offers for download. The Benjamin Moore list comes from a public copy of their catalogue, and the combinations from the scraper, and Benjamin Moore's website terms ask for written permission before their content is republished. A written OK from them (and from Sherwin-Williams for this use) is the cleanest way to be sure you're covered.
- On-screen colours are always approximations. The page and every saved image say to confirm with a physical sample before committing, and that line is worth keeping.
