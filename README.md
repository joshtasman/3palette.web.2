# Villa Paint colour palette tool — for villapaint.ca

Search real Benjamin Moore colours, build a 3-colour palette, save it as an image with your logo and email on it. Built to embed directly into a Squarespace page.

## Step 1 — Host the 5 files

Squarespace can't run this itself (Code Blocks embed a page, they don't host one), so it needs a real web address first. Free, easy options:

**Netlify Drop (simplest):** go to [app.netlify.com/drop](https://app.netlify.com/drop), drag all 5 files in (`index.html`, `app.js`, `colors.js`, `coordinates.js`, `villa-logo.png` — as a folder or all selected at once), and you'll get a live link in seconds. No account required, though creating a free account lets you keep the same link permanently instead of it being randomly generated.

**GitHub Pages:** create a repo, upload the 5 files, turn on Pages in Settings. A bit more setup, but free and permanent, and easy to update later by re-uploading files.

Either way, you'll end up with a URL like `https://your-site-name.netlify.app/index.html`. That's what goes into the embed code below.

## Step 2 — Embed it in Squarespace

In the page editor, add a **Code Block** where you want the tool to appear, and paste this in — replacing the `src` with your actual hosted URL:

```html
<iframe id="villa-palette-iframe" src="https://YOUR-HOSTED-LINK-HERE/index.html"
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

This requires a Squarespace plan with custom code enabled (Core, Plus, Advanced, Business, or Commerce) — you confirmed you're on Business, so you're set.

## What's different from the version we built earlier

Same underlying search and palette engine, restyled and re-tooled specifically for living on your site:

- **"Suggest For Me"** — pick one colour you like (or none at all) and tap it; it fills the empty slots with the colours Benjamin Moore's own experts pair with it, taken from the "Color Combinations" on that colour's page at benjaminmoore.com. Tap it again for Benjamin Moore's next suggestion for the same colour. Details below.
- **Real brand colours**, sampled directly from your logo file (`#6F888D` slate, `#AB5440` terracotta) — not a separate invented palette
- **Your logo** (background removed, so it drops cleanly onto any colour) in the header, the footer, and baked into every downloaded image
- **info@villapaint.ca** displayed on the tool and on every downloaded image
- Downloads as **PNG** instead of JPEG — no compression artifacts shifting the colour, which matters more here than file size
- **Forgiving search** — capital letters, accents and apostrophes don't matter ("cefalu" finds Cefalú Beach, "jack olantern" finds Jack O'Lantern), words can be in any order, and codes work with or without the dash ("oc117" finds OC-117)
- No app-install machinery (manifest, service worker, Android bridge) — none of that applies inside a browser tab/iframe, so it's gone, which keeps this version simpler and leaner
- Auto-resizes to fit inside the Squarespace embed, as above

## About the colour database

Benjamin Moore only, at your request — **3,883 colours**, with names, codes and on-screen colour values from the public Benjamin Moore colour list. (Sherwin-Williams, Dulux, and Cloverdale were removed from this version; the Android app's files still hold them if you ever want them back.)

Benjamin Moore renames a colour now and then. Three are handled so far — **Cefalú Beach** (formerly Champion Cobalt, 2061-20), **Gray Cardigan** (formerly Timber Wolf, 1600) and **Satin Shoes** (formerly White Cloud, 2159-70) — and searching either the new or the old name finds them. Other renames may exist that I haven't spotted; the list of colour names comes from a public copy of Benjamin Moore's catalogue rather than live from their site.

Some colours are sold under two or three codes (Cloud White is CC-40, OC-130 and 967). The tool lists each colour once, and searching any of its codes finds it.

## How "Suggest For Me" decides what goes together

**Benjamin Moore's own pairings (3,854 colours).** Every colour page on benjaminmoore.com shows two "Color Combinations", their experts' picks. The scraper you ran collected them, and the tool uses them directly:

- **One colour picked:** the first tap fills the other two slots with the first two colours Benjamin Moore lists for it. Tap **Suggest For Me** again for the next two. Most colours have four, so that's all four seen in two taps, and a third tap starts over from the first two. (A few colours list three, and Cloud White lists seven; it works through whatever there is, two at a time.) Van Courtland Blue, for example: Wedgewood Gray + Simply White, then Milkyway + Coronado Cream, then back to the first pair.
- **Two colours picked:** the tool looks for a colour Benjamin Moore pairs with both. If there isn't one, it takes the next colour on the first pick's list.
- **Nothing picked:** it starts from a well-known Benjamin Moore colour (one from the collections with codes beginning HC-, OC-, AF-, CC- or CSP-) and adds that colour's pairings, shown from light to dark. Tap again for a different starting colour.
- **Colours you chose yourself are never replaced.** Suggest For Me only ever changes the colours it filled in itself, so you can mix freely:
  - Tap any colour (even one that was suggested) and pick another to swap it for your own. Suggest For Me stays available and builds around what you've kept. If you swap the first colour, the next tap gives the new colour's own pairings, starting from their first two.
  - Tap the ✕ on a colour to take it out. Tap Suggest For Me and it fills just that gap, with a different colour from the one you removed.
  - Suggest For Me only turns grey when you picked all three colours yourself, because then there is nothing left for it to suggest.
- The small line under the button tells you what a tap will do. After a Benjamin Moore suggestion it reads *"Benjamin Moore's own pairings. Tap Suggest For Me again for their next ones, or tap any colour to swap it yourself."*

**The 29 colours with no Benjamin Moore pairings** fall back to generated suggestions, using the colour logic from the earlier version: every colour in the database is sorted into one of three practical roles by its actual lightness and saturation (not its name) — a light neutral, a mid-tone neutral, or a bolder accent. The tool figures out which roles are missing from what you've picked, then searches for well-matched real colours in those roles, favouring a harmonious undertone (warm with warm, cool with cool) and, for accents, a hue that classically pairs with what's already there. There's randomness built in on purpose, so tapping again gives a different but still coordinated option.

Those 29 are: 26 colours (codes beginning ES-, SC-, PT-, plus AC-17 and AC-39) that had no "Color Combinations" on their page when the scraper ran, and 3 colours (Silver Gray 2131-60, Black PM-9, Chrome Green PM-10) that were added to the list after the scraper's run, so it never looked at them. The kit in the `bm-scraper` folder can fetch those in about half a minute — see its README.

A small message under the page tells you which one happened — "Using Benjamin Moore's official pairings" versus the generic starting-point message — so it's never ambiguous which colours came from Benjamin Moore directly.

**How it was checked.** Before folding the scraped data in, I compared it with lists I had read by hand from benjaminmoore.com for 14 well-known colours (Van Courtland Blue, Simply White, Hale Navy, Revere Pewter and ten more): all 14 matched, in the same order. (Three of the lists also contain a colour Benjamin Moore has since renamed, which wasn't in my list at the time, and Cloud White's includes the combinations from its second code's page.) The tool was then run in a real browser through every colour in the database: pick it, tap Suggest For Me, and confirm the colours that appear are exactly the ones Benjamin Moore lists, in rotation.

## The iPhone/Safari download issue is fixed

What was happening: iOS Safari doesn't reliably respect a webpage's request to download a file directly — instead of saving it, it just opens the image full-screen in the same tab, which is what you ran into. This is a long-standing, well-documented Safari behaviour, not a bug specific to this tool.

The fix: on devices that support it (iOS 15 and up — effectively all iPhones in active use), tapping **Save palette as image** now opens the native iOS share sheet instead, with **Save Image** as one of the options right there — which saves it straight to Photos. Everywhere else (desktop Chrome, Firefox, Edge, etc.), it still downloads directly like before, exactly as it did previously. I tested both code paths directly (simulating the share sheet accepting, cancelling, and failing, as well as browsers without it at all) to make sure each one behaves correctly, though I can't fully test real Safari from here — if anything looks off on an actual iPhone, let me know what happened and I'll dig in.

## If Suggest For Me seems stuck

In this version, tapping Suggest For Me again always gives something new, and the button only turns grey when you picked all three colours yourself. If it greys out or does nothing right after a suggestion, you are almost certainly looking at an older copy of the files. A 20-second check:

1. Pick one ordinary colour (Van Courtland Blue is a good test), then tap **Suggest For Me** once.
2. Look at the small line under the button and at the button's colour.
   - **New files:** the line begins "Benjamin Moore's own pairings. Tap Suggest For Me again for their next ones…" and the button stays its normal colour.
   - **Older files:** the line says something else ("Not sure where to start?" or "Not quite right?"), or the button turns grey.

If it's the old files:

- Check that all 5 files are in the GitHub repository's main folder and were replaced, not just added: `index.html`, `app.js` (about 29 KB), `colors.js`, `coordinates.js` and `villa-logo.png`. `app.js` is the one that decides what the button does, and it's the easiest one to miss.
- Wait a minute or two for GitHub Pages to publish, then reload. On a computer, hold Shift while clicking reload. On an iPhone, close the tab and open it again (or Settings → Safari → Clear History and Website Data), and check the Squarespace page in a private tab.
- Open the GitHub Pages address directly, without Squarespace in the way (`https://YOUR-HOSTED-LINK-HERE/index.html`), and run the check there first.

## Updating the live site later

Since this lives on GitHub Pages (or wherever you hosted it), updating it just means uploading new versions of these files to the same place — no changes needed to the Squarespace embed code, since the URL stays the same. Upload **all 5 files** each time so they stay in step (`index.html` and `app.js` are the page, `colors.js` and `coordinates.js` are the data). Browsers and GitHub Pages hold on to files for a few minutes, so if you don't see a change straight away, wait a minute or two and refresh the page.

`index.html` loads the three script files as `colors.js?v=2`, `coordinates.js?v=2` and `app.js?v=2`. The `?v=2` makes a browser fetch fresh copies whenever that number changes. If you ever update these files and some visitors still seem to be getting the old behaviour, change the 2 to a 3 in all three lines of `index.html` (and so on for later updates), then upload `index.html` with the rest.

**Refreshing the Benjamin Moore data** (new colours, or Benjamin Moore changing a combination): the separate `bm-scraper` folder has the tool for it. Its README walks through running it and ends with two fresh files, `colors.js` and `coordinates.js`, to upload here.
