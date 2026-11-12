(function () {
  'use strict';

  // ---------- State ----------
  var slots = [null, null, null];
  // Who filled each slot: 'user' (picked in search) or 'suggested' (by Suggest For Me).
  // Tapping Suggest For Me again swaps the suggested colours and keeps the person's own.
  var slotOrigin = [null, null, null];
  var activeSlotIndex = null;
  var query = '';
  var RESULT_LIMIT = 60;
  var SUGGEST_HINT_START = 'Not sure where to start? Pick one colour you like, or tap with nothing selected for a full palette.';
  var SUGGEST_HINT_AGAIN_OFFICIAL = "Benjamin Moore's own pairings. Tap Suggest For Me again for their next ones, or tap any colour to swap it yourself.";
  var SUGGEST_HINT_AGAIN = 'Not quite right? Tap Suggest For Me again for another idea, or tap any colour to swap it yourself.';
  var lastSuggestionWasOfficial = false;

  var CONTACT_EMAIL = 'info@villapaint.ca';

  // ---------- DOM refs ----------
  var slotsEl = document.getElementById('slots');
  var paintStripEl = document.getElementById('paintStrip');
  var saveBtn = document.getElementById('saveBtn');
  var resetBtn = document.getElementById('resetBtn');
  var suggestBtn = document.getElementById('suggestBtn');
  var suggestHintEl = document.getElementById('suggestHint');
  var overlayEl = document.getElementById('overlay');
  var sheetCloseEl = document.getElementById('sheetClose');
  var searchInputEl = document.getElementById('searchInput');
  var resultsEl = document.getElementById('results');
  var toastEl = document.getElementById('toast');

  // ---------- Helpers ----------
  function getContrastColor(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#24272A' : '#FBFAF7';
  }

  function subtitleFor(color) {
    return color.code || '';
  }

  // Search is forgiving: case, accents and apostrophes are ignored, so "cefalu" finds
  // Cefalú Beach and "jack olantern" finds Jack O'Lantern.
  function fold(s) {
    s = String(s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/['\u2018\u2019`\u00b4]/g, '');
  }

  // Letters and digits only, so "oc117" and "hc 145" find OC-117 and HC-145.
  function compact(s) {
    return s.replace(/[^a-z0-9]+/g, '');
  }

  // ---------- Suggest For Me: colour coordination ----------
  function hexToHSL(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  // Three practical roles a paint colour plays in a real scheme, rather than
  // abstract colour-wheel categories -- this is what "Suggest For Me" fills.
  function classifyRole(hsl) {
    var isAccent = hsl.s >= 28 && hsl.l >= 20 && hsl.l <= 80;
    var isVividPale = hsl.s >= 45 && hsl.l > 80 && hsl.l < 92; // vivid pastels, not barely-tinted whites
    var isDeepJewelTone = hsl.l < 30 && hsl.s >= 18; // navy, forest, burgundy, eggplant read as bold, not "neutral"
    var isNearBlack = hsl.l < 22; // true near-blacks read as dramatic regardless of saturation
    if (isAccent || isVividPale || isDeepJewelTone || isNearBlack) return 'accent';
    if (hsl.l >= 70) return 'neutral-light';
    return 'neutral-mid';
  }

  // Precompute once so suggesting doesn't re-parse 3,800+ hex codes every tap.
  COLORS_DATA.forEach(function (c) {
    c.hsl = hexToHSL(c.hex);
    c.role = classifyRole(c.hsl);
  });

  var codeIndex = {}; // colour code (exact) -> COLORS_DATA entry
  COLORS_DATA.forEach(function (c) {
    codeIndex[c.code] = c;
    c.hay = fold(c.name + ' ' + c.code + (c.aka ? ' ' + c.aka : '') + (c.alt ? ' ' + c.alt.join(' ') : ''));
    c.hayCompact = compact(c.hay);
  });

  // ---------- Benjamin Moore Favourites: what the colour picker shows before anything is typed ----------
  // The 75 colours of Benjamin Moore's Favourites fan deck, in the order Villa Paint wants them
  // shown. The first 14 were chosen by hand; the rest follow the order printed on Benjamin Moore's
  // Favorites colour card. Codes are the ones printed on the card, and a colour sold under two
  // codes is found by either (Cloud White is CC-40 and OC-130). To change the list or its order,
  // edit these lines. Typing in the search box still searches every Benjamin Moore colour.
  var FAVOURITE_CODES = [
    'OC-45',   //  1  Swiss Coffee
    'HC-171',  //  2  Wickham Gray
    'HC-6',    //  3  Windham Cream
    'OC-57',   //  4  White Heron
    'HC-168',  //  5  Chelsea Gray
    '2142-40', //  6  Dry Sage
    'OC-22',   //  7  Calm
    'HC-166',  //  8  Kendall Charcoal
    'HC-154',  //  9  Hale Navy
    'AF-290',  // 10  Caliente
    'OC-20',   // 11  Pale Oak
    'OC-130',  // 12  Cloud White
    'HC-81',   // 13  Manchester Tan
    'HC-144',  // 14  Palladian Blue
    'OC-65',   // 15  Chantilly Lace
    'OC-152',  // 16  Super White
    'OC-68',   // 17  Distant Gray
    'OC-151',  // 18  White
    'OC-149',  // 19  Decorator's White
    'OC-66',   // 20  Snow White
    'OC-54',   // 21  White Wisp
    'OC-53',   // 22  Horizon
    'OC-52',   // 23  Gray Owl
    'OC-145',  // 24  Atrium White
    'OC-26',   // 25  Silver Satin
    'OC-27',   // 26  Balboa Mist
    '1471',    // 27  Shoreline
    'OC-17',   // 28  White Dove
    'OC-141',  // 29  China White
    'OC-23',   // 30  Classic Gray
    'OC-38',   // 31  Acadia White
    'OC-146',  // 32  Linen White
    'OC-50',   // 33  November Rain
    'OC-49',   // 34  Titanium
    'HC-170',  // 35  Stonington Gray
    'HC-169',  // 36  Coventry Gray
    '2137-50', // 37  Sea Haze
    '1479',    // 38  Alaskan Husky
    '1598',    // 39  Silver Lake
    'HC-165',  // 40  Boothbay Gray
    '2134-40', // 41  Whale Gray
    '1465',    // 42  Nimbus
    '2108-50', // 43  Silver Fox
    'HC-105',  // 44  Rockport Gray
    '2112-60', // 45  Cement Gray
    '2112-50', // 46  Stormy Monday
    'HC-173',  // 47  Edgecomb Gray
    'HC-172',  // 48  Revere Pewter
    'AF-100',  // 49  Pashmina
    'HC-87',   // 50  Ashley Gray
    '2111-40', // 51  Taos Taupe
    'HC-45',   // 52  Shaker Beige
    'HC-44',   // 53  Lenox Tan
    'HC-77',   // 54  Alexandria Beige
    'AF-170',  // 55  French Press
    'HC-4',    // 56  Hawthorne Yellow
    '2144-40', // 57  Soft Fern
    'HC-125',  // 58  Cushing Green
    '2138-60', // 59  Gray Cashmere
    '1564',    // 60  Beach Glass
    '2138-40', // 61  Carolina Gull
    'HC-134',  // 62  Tarrytown Green
    '2122-40', // 63  Smoke
    'HC-162',  // 64  Brewster Gray
    '2119-60', // 65  Silver Lining
    '2125-40', // 66  Shadow Gray
    '2127-40', // 67  Wolf Gray
    '2128-60', // 68  Beacon Gray
    '2128-50', // 69  November Skies
    '2130-50', // 70  New Hope Gray
    'HC-156',  // 71  Van Deusen Blue
    'AF-260',  // 72  Proposal
    'HC-182',  // 73  Classic Burgundy
    '2116-20', // 74  Vintage Wine
    'HC-190',  // 75  Black
  ];

  var altCodeIndex = {}; // other codes a colour is sold under -> COLORS_DATA entry
  COLORS_DATA.forEach(function (c) {
    (c.alt || []).forEach(function (a) { if (!altCodeIndex[a]) altCodeIndex[a] = c; });
  });

  var FAVOURITES = [];
  (function () {
    var seen = {};
    FAVOURITE_CODES.forEach(function (code) {
      var c = codeIndex[code] || altCodeIndex[code];
      if (c && !seen[c.id]) { seen[c.id] = true; FAVOURITES.push(c); }
    });
  })();

  // Benjamin Moore's own "Color Combinations": the expert-picked coordinating colours shown on
  // each colour's page at benjaminmoore.com. They were collected by scrape_bm_coordinates.py and
  // turned into coordinates.js by build_coordinates.py. Keyed by colour code; each list holds
  // partner codes in the order the page shows them. (Sherwin-Williams, Dulux and Cloverdale
  // don't publish an equivalent, and this tool is Benjamin Moore only.)
  var OFFICIAL_COORDINATES = (typeof OFFICIAL_COORDINATES_DATA !== 'undefined') ? OFFICIAL_COORDINATES_DATA : {};
  if (typeof OFFICIAL_COORDINATES_DATA === 'undefined') {
    // index.html normally loads coordinates.js. An older copy of index.html (or one a browser
    // still has cached) doesn't know about it, so ask for the file here instead.
    var coordinatesScript = document.createElement('script');
    coordinatesScript.src = 'coordinates.js?v=4';
    coordinatesScript.onload = function () {
      if (typeof OFFICIAL_COORDINATES_DATA !== 'undefined') OFFICIAL_COORDINATES = OFFICIAL_COORDINATES_DATA;
      starterPool = null;
    };
    coordinatesScript.onerror = function () {
      if (typeof console !== 'undefined') {
        console.warn("coordinates.js did not load, so Suggest For Me can't use Benjamin Moore's own pairings. Check that the file sits next to index.html.");
      }
    };
    document.head.appendChild(coordinatesScript);
  }

  function officialMatchesFor(color) {
    var codes = OFFICIAL_COORDINATES[color.code];
    if (!codes) return [];
    return codes.map(function (code) { return codeIndex[code]; }).filter(Boolean);
  }

  // Colours offered by Suggest For Me since the person last changed one of their own picks.
  // It lets a second tap show Benjamin Moore's next combination instead of the same one again.
  var recentOfficial = {};

  // Partners of everything already in the palette, best first: a colour that is a partner of
  // several picks comes first, then ones not offered yet, then in the order Benjamin Moore lists them.
  function rankedOfficialCandidates(excludeIds) {
    var byId = {};
    var list = [];
    slots.forEach(function (s, slotIdx) {
      if (!s) return;
      officialMatchesFor(s).forEach(function (match, pos) {
        if (excludeIds.indexOf(match.id) !== -1) return;
        var rec = byId[match.id];
        if (!rec) {
          rec = byId[match.id] = { color: match, shared: 0, slotIdx: slotIdx, pos: pos };
          list.push(rec);
        }
        rec.shared++;
      });
    });

    // Once everything has been offered, start the rotation over.
    if (list.length && list.every(function (r) { return recentOfficial[r.color.id]; })) {
      list.forEach(function (r) { delete recentOfficial[r.color.id]; });
    }

    list.sort(function (a, b) {
      if (a.shared !== b.shared) return b.shared - a.shared;
      var ra = recentOfficial[a.color.id] ? 1 : 0;
      var rb = recentOfficial[b.color.id] ? 1 : 0;
      if (ra !== rb) return ra - rb;
      if (a.slotIdx !== b.slotIdx) return a.slotIdx - b.slotIdx;
      return a.pos - b.pos;
    });
    return list.map(function (r) { return r.color; });
  }

  // With nothing chosen, Suggest For Me opens with a colour from the designer-favourite
  // collections (codes starting HC, OC, AF, CC or CSP) that has plenty of official partners.
  var DESIGNER_CODE = /^(HC|OC|AF|CC|CSP)-/;
  var starterPool = null;

  function randomStarterColor() {
    if (!starterPool) {
      starterPool = COLORS_DATA.filter(function (c) {
        return DESIGNER_CODE.test(c.code) && officialMatchesFor(c).length >= 3;
      });
    }
    if (!starterPool.length) return null;
    return starterPool[Math.floor(Math.random() * starterPool.length)];
  }

  var ROLE_PRIORITY = ['neutral-light', 'accent', 'neutral-mid'];
  var CURATED_ACCENT_HUES = [15, 40, 150, 185, 215, 265]; // terracotta, ochre, forest, teal, navy, plum

  function circularHueDist(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  function pickTargetRoles(existingRoles, numNeeded) {
    var missing = ROLE_PRIORITY.filter(function (r) { return existingRoles.indexOf(r) === -1; });
    var pool = missing.concat(ROLE_PRIORITY);
    return pool.slice(0, numNeeded);
  }

  function pickAnchorHue(hslList) {
    var withHue = hslList.filter(function (h) { return h.s > 8; });
    if (!withHue.length) return null;
    withHue.sort(function (a, b) { return b.s - a.s; });
    return withHue[0].h;
  }

  function targetHueForRole(role, anchorHue) {
    if (role === 'accent') {
      if (anchorHue === null) return CURATED_ACCENT_HUES[Math.floor(Math.random() * CURATED_ACCENT_HUES.length)];
      var offsets = [180, 150, -150, 130, -130];
      var off = offsets[Math.floor(Math.random() * offsets.length)];
      return (anchorHue + off + 360) % 360;
    }
    // neutrals: stay in the same hue family as the anchor so undertones agree
    // (e.g. a warm accent gets warm neutrals, not a muddy mismatch)
    if (anchorHue === null) return Math.random() * 360;
    var jitter = (Math.random() * 30) - 15;
    return (anchorHue + jitter + 360) % 360;
  }

  function findCandidate(role, targetHue, excludeIds) {
    var pool = COLORS_DATA.filter(function (c) {
      return c.role === role && excludeIds.indexOf(c.id) === -1;
    });
    if (!pool.length) return null;
    var scored = pool.map(function (c) { return { c: c, d: circularHueDist(c.hsl.h, targetHue) }; });
    scored.sort(function (a, b) { return a.d - b.d; });
    var topN = scored.slice(0, Math.min(14, scored.length));
    return topN[Math.floor(Math.random() * topN.length)].c;
  }

  function suggestPalette() {
    // Tapping again replaces what an earlier tap suggested, and keeps anything the person picked.
    slots.forEach(function (s, i) {
      if (slotOrigin[i] === 'suggested') { slots[i] = null; slotOrigin[i] = null; }
    });

    var emptyIndices = [];
    slots.forEach(function (s, i) { if (!s) emptyIndices.push(i); });
    if (!emptyIndices.length) { updateSuggestState(); return; }

    // Nothing chosen: open with a well-known colour and build the palette around it.
    var startedFromScratch = emptyIndices.length === slots.length;
    var starter = null;
    if (startedFromScratch) {
      recentOfficial = {};
      starter = randomStarterColor();
      if (starter) {
        slots[emptyIndices[0]] = starter;
        slotOrigin[emptyIndices[0]] = 'suggested';
        emptyIndices.shift();
      }
    }

    var excludeIds = slots.filter(Boolean).map(function (s) { return s.id; });

    // 1. Prefer Benjamin Moore's own pairings for whatever is already in the palette.
    var ranked = rankedOfficialCandidates(excludeIds);
    var officialFilled = starter ? 1 : 0;
    var officialPicks = 0;
    emptyIndices.forEach(function (idx) {
      if (officialPicks >= ranked.length) return;
      var pick = ranked[officialPicks++];
      slots[idx] = pick;
      slotOrigin[idx] = 'suggested';
      recentOfficial[pick.id] = true;
      excludeIds.push(pick.id);
      officialFilled++;
    });

    // 2. Fill anything still empty (a colour with no official pairings) using the coordination algorithm.
    var generatedFilled = 0;
    var stillEmpty = [];
    slots.forEach(function (s, i) { if (!s) stillEmpty.push(i); });

    if (stillEmpty.length) {
      var existingRoles = slots.filter(Boolean).map(function (s) { return s.role; });
      var rolesToFill = pickTargetRoles(existingRoles, stillEmpty.length);

      var pickOrder = rolesToFill.slice();
      if (existingRoles.length === 0 && pickOrder.indexOf('accent') > 0) {
        pickOrder.splice(pickOrder.indexOf('accent'), 1);
        pickOrder.unshift('accent');
      }

      var workingHsls = slots.filter(Boolean).map(function (s) { return s.hsl; });
      var picked = {};

      pickOrder.forEach(function (role) {
        var anchorHue = pickAnchorHue(workingHsls);
        var targetHue = targetHueForRole(role, anchorHue);
        var candidate = findCandidate(role, targetHue, excludeIds);
        if (!candidate) return;
        picked[role] = candidate;
        excludeIds.push(candidate.id);
        workingHsls.push(candidate.hsl);
      });

      var DISPLAY_ORDER = ['neutral-light', 'neutral-mid', 'accent'];
      var displayRoles = rolesToFill.slice().sort(function (a, b) {
        return DISPLAY_ORDER.indexOf(a) - DISPLAY_ORDER.indexOf(b);
      });
      stillEmpty.forEach(function (idx, n) {
        var role = displayRoles[n];
        if (picked[role]) {
          slots[idx] = picked[role];
          slotOrigin[idx] = 'suggested';
          generatedFilled++;
        }
      });
    }

    // A palette Benjamin Moore built around a starting colour reads best from light to dark.
    if (starter && slots.every(Boolean)) {
      slots.sort(function (a, b) { return b.hsl.l - a.hsl.l; });
    }

    lastSuggestionWasOfficial = officialFilled > 0;
    renderSlots();
    renderPreview();
    updateSaveState();
    updateSuggestState();

    if (officialFilled > 0 && generatedFilled === 0) {
      showToast("Using Benjamin Moore's official pairings.");
    } else if (officialFilled > 0) {
      showToast("Benjamin Moore's pairings, plus a generated match for the rest.");
    } else {
      showToast("Here's a palette to get you started.");
    }
  }

  function slugify(s) {
    return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Wraps text to fit maxWidth, up to maxLines. If it still doesn't fit, the
  // last line is ellipsized. Used for canvas text, which doesn't wrap on its own.
  function wrapText(ctx, text, maxWidth, maxLines) {
    var words = text.split(' ');
    var lines = [];
    var current = '';
    var i = 0;
    while (i < words.length) {
      var test = current ? current + ' ' + words[i] : words[i];
      if (current && ctx.measureText(test).width > maxWidth) {
        lines.push(current);
        current = '';
        if (lines.length === maxLines) break;
      } else {
        current = test;
        i++;
      }
    }
    if (lines.length < maxLines && current) {
      lines.push(current);
      i = words.length;
    }
    if (i < words.length && lines.length) {
      var last = lines[lines.length - 1];
      while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) {
        last = last.slice(0, -1).replace(/\s+$/, '');
      }
      lines[lines.length - 1] = last + '…';
    }
    return lines;
  }

  var toastTimer = null;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  // ---------- Slots ----------
  function renderSlots() {
    slotsEl.innerHTML = '';
    slots.forEach(function (color, i) {
      var el = document.createElement('div');
      el.className = 'slot' + (color ? ' filled' : '');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', color ? ('Colour ' + (i + 1) + ': ' + color.name + '. Tap to change.') : ('Add colour ' + (i + 1)));

      if (color) {
        var textColor = getContrastColor(color.hex);
        el.style.color = textColor;
        el.innerHTML =
          '<div class="slot-filled-inner" style="background:' + color.hex + '">' +
            '<div class="slot-swatch" style="background:' + color.hex + '"></div>' +
            '<div class="slot-meta">' +
              '<div class="name">' + escapeHtml(color.name) + '</div>' +
              '<div class="sub">' + escapeHtml(subtitleFor(color)) + '</div>' +
            '</div>' +
            '<button class="slot-clear" aria-label="Remove colour ' + (i + 1) + '" data-clear-index="' + i + '">✕</button>' +
          '</div>';
      } else {
        el.innerHTML =
          '<span class="slot-index">' + (i + 1) + '</span>' +
          '<span class="slot-empty-text"><span class="label">Colour ' + (i + 1) + '</span><span class="hint">Tap to search</span></span>' +
          '<span class="slot-plus" aria-hidden="true">+</span>';
      }

      el.addEventListener('click', function (e) {
        if (e.target && e.target.hasAttribute('data-clear-index')) return;
        openSearch(i);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSearch(i); }
      });

      slotsEl.appendChild(el);
    });

    slotsEl.querySelectorAll('[data-clear-index]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute('data-clear-index'), 10);
        var removed = slots[idx];
        // The person is curating this palette, so what is left stays put; Suggest For Me
        // fills just the gap, and doesn't offer back the colour that was just removed.
        claimSuggestions();
        slots[idx] = null;
        slotOrigin[idx] = null;
        recentOfficial = {};
        if (removed) recentOfficial[removed.id] = true;
        renderSlots();
        renderPreview();
        updateSaveState();
        updateSuggestState();
      });
    });
  }

  // ---------- Preview ----------
  function renderPreview() {
    paintStripEl.innerHTML = '';
    slots.forEach(function (color, i) {
      var band = document.createElement('div');
      if (color) {
        band.className = 'strip-band';
        var textColor = getContrastColor(color.hex);
        band.style.background = color.hex;
        band.style.color = textColor;
        band.innerHTML =
          '<div class="name">' + escapeHtml(color.name) + '</div>' +
          '<div class="sub">' + escapeHtml(subtitleFor(color)) + '</div>';
      } else {
        band.className = 'strip-band empty';
        band.innerHTML = '<div class="name">Colour ' + (i + 1) + '</div>';
      }
      paintStripEl.appendChild(band);
    });
  }

  function updateSaveState() {
    var complete = slots.every(function (s) { return !!s; });
    saveBtn.disabled = !complete;
  }

  // Turns every colour Suggest For Me placed into one the person is keeping.
  function claimSuggestions() {
    slotOrigin = slotOrigin.map(function (o) { return o ? 'user' : null; });
  }

  // Suggest For Me stays available after a suggestion, so another tap gives another idea.
  // It is only switched off once all three colours were chosen by the person.
  function updateSuggestState() {
    var complete = slots.every(function (s) { return !!s; });
    var hasSuggestion = slotOrigin.indexOf('suggested') !== -1;
    suggestBtn.disabled = complete && !hasSuggestion;
    if (suggestHintEl) {
      suggestHintEl.textContent = !hasSuggestion ? SUGGEST_HINT_START
        : (lastSuggestionWasOfficial ? SUGGEST_HINT_AGAIN_OFFICIAL : SUGGEST_HINT_AGAIN);
    }
  }

  // ---------- Search overlay ----------
  function openSearch(slotIndex) {
    activeSlotIndex = slotIndex;
    query = '';
    searchInputEl.value = '';
    renderResults();
    resultsEl.scrollTop = 0;
    overlayEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { searchInputEl.focus(); }, 60);
  }

  function closeSearch() {
    overlayEl.classList.remove('open');
    document.body.style.overflow = '';
    activeSlotIndex = null;
  }

  // With nothing typed the picker opens on Benjamin Moore's Favourites (the whole list, in the
  // order set above). Once something is typed it searches every colour.
  function isFavouritesView() {
    return FAVOURITES.length > 0 && !fold(query.trim());
  }

  function formatCount(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // A colour matches when every word typed appears in its name, code, former name or other
  // code, or when the letters and digits typed (ignoring spaces and dashes) appear in a row.
  function getFilteredResults() {
    var q = fold(query.trim());
    if (!q) return FAVOURITES.length ? FAVOURITES : COLORS_DATA;
    var tokens = q.split(/\s+/);
    var qCompact = compact(q);
    return COLORS_DATA.filter(function (c) {
      var allWords = tokens.every(function (t) { return c.hay.indexOf(t) !== -1; });
      return allWords || (qCompact.length > 0 && c.hayCompact.indexOf(qCompact) !== -1);
    });
  }

  // Under the name in the results: the code, a former name if Benjamin Moore has renamed the
  // colour, and the other code when that is what was searched for (e.g. OC-130 finds Cloud White).
  function resultMeta(color) {
    var meta = subtitleFor(color);
    if (color.aka) meta += ' \u00b7 formerly ' + color.aka;
    var qCompact = compact(fold(query.trim()));
    if (qCompact && color.alt && compact(fold(color.code + color.name)).indexOf(qCompact) === -1) {
      for (var i = 0; i < color.alt.length; i++) {
        if (compact(fold(color.alt[i])).indexOf(qCompact) !== -1) {
          meta += ' \u00b7 also ' + color.alt[i];
          break;
        }
      }
    }
    return meta;
  }

  function renderResults() {
    var all = getFilteredResults();
    resultsEl.innerHTML = '';

    if (all.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'result-empty';
      empty.textContent = query
        ? ('No colours match "' + query + '". Try a different name or code.')
        : 'No colours in this brand yet.';
      resultsEl.appendChild(empty);
      return;
    }

    var favouritesView = isFavouritesView();
    if (favouritesView) {
      var heading = document.createElement('div');
      heading.className = 'result-heading';
      heading.innerHTML =
        '<span class="result-heading-title">Benjamin Moore Favourites</span>' +
        '<span class="result-heading-note">Type a name or code to search all ' + formatCount(COLORS_DATA.length) + ' colours.</span>';
      resultsEl.appendChild(heading);
    }

    var shown = favouritesView ? all : all.slice(0, RESULT_LIMIT);
    shown.forEach(function (color) {
      var row = document.createElement('button');
      row.className = 'result-row';
      row.innerHTML =
        '<span class="result-swatch" style="background:' + color.hex + '"></span>' +
        '<span class="result-text">' +
          '<span class="name">' + escapeHtml(color.name) + '</span>' +
          '<span class="meta">' + escapeHtml(resultMeta(color)) + '</span>' +
        '</span>';
      row.addEventListener('click', function () { selectColor(color); });
      resultsEl.appendChild(row);
    });

    if (!favouritesView && all.length > RESULT_LIMIT) {
      var hint = document.createElement('div');
      hint.className = 'result-hint';
      hint.textContent = 'Showing ' + RESULT_LIMIT + ' of ' + all.length + ' — keep typing to narrow it down.';
      resultsEl.appendChild(hint);
    }
  }

  function selectColor(color) {
    if (activeSlotIndex === null) return;
    var replaced = slots[activeSlotIndex];
    slots[activeSlotIndex] = color;
    slotOrigin[activeSlotIndex] = 'user';
    // A new pick starts a fresh round of suggestions around it. Suggested colours that are
    // still showing stay until the next tap, but colours already shown (the one just replaced,
    // and those suggestions) go to the back of the queue so they aren't handed straight back.
    recentOfficial = {};
    if (replaced) recentOfficial[replaced.id] = true;
    slots.forEach(function (s, i) {
      if (s && slotOrigin[i] === 'suggested') recentOfficial[s.id] = true;
    });
    closeSearch();
    renderSlots();
    renderPreview();
    updateSaveState();
    updateSuggestState();
  }

  // ---------- Export as PNG ----------
  var logoImg = new Image();
  var logoReady = new Promise(function (resolve) {
    logoImg.onload = function () { resolve(true); };
    logoImg.onerror = function () { resolve(false); };
  });
  logoImg.src = 'villa-logo.png';

  function exportPalette() {
    if (slots.some(function (s) { return !s; })) return;

    var canvas = document.createElement('canvas');
    var W = 1080, H = 1350;
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');

    var bandW = W / 3;
    var footerH = 210;
    var stripH = H - footerH;
    var pad = 26;
    var namePx = 36, nameLineH = 42;
    var subPx = 19;

    function draw() {
      slots.forEach(function (color, i) {
        var x = i * bandW;
        ctx.fillStyle = color.hex;
        ctx.fillRect(x, 0, bandW, stripH);

        var textColor = getContrastColor(color.hex);
        ctx.textBaseline = 'alphabetic';
        var maxTextWidth = bandW - pad * 2;

        ctx.font = '700 ' + namePx + 'px "Archivo", sans-serif';
        var nameLines = wrapText(ctx, color.name, maxTextWidth, 2);

        var subBaselineY = stripH - pad;
        var nameBottom = subBaselineY - subPx - 14;

        ctx.fillStyle = textColor;
        ctx.font = '700 ' + namePx + 'px "Archivo", sans-serif';
        for (var li = 0; li < nameLines.length; li++) {
          var lineY = nameBottom - (nameLines.length - 1 - li) * nameLineH;
          ctx.fillText(nameLines[li], x + pad, lineY, maxTextWidth);
        }

        ctx.globalAlpha = 0.82;
        ctx.font = '400 ' + subPx + 'px "Space Mono", monospace';
        ctx.fillText(subtitleFor(color), x + pad, subBaselineY, maxTextWidth);
        ctx.globalAlpha = 1;
      });

      // footer: logo + contact, on the paper background
      ctx.fillStyle = '#F7F5F1';
      ctx.fillRect(0, stripH, W, footerH);

      var logoDrawH = 46;
      var logoDrawW = logoReady && logoImg.naturalWidth
        ? logoDrawH * (logoImg.naturalWidth / logoImg.naturalHeight)
        : 220;
      var logoY = stripH + 34;
      try {
        ctx.drawImage(logoImg, 56, logoY, logoDrawW, logoDrawH);
      } catch (e) { /* logo not ready; skip gracefully */ }

      ctx.fillStyle = '#5F6569';
      ctx.font = '600 22px "Archivo", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Benjamin Moore colours', W - 56, logoY + logoDrawH / 2 + 8);
      ctx.textAlign = 'left';

      ctx.fillStyle = '#24272A';
      ctx.font = '700 24px "Archivo", sans-serif';
      ctx.fillText(CONTACT_EMAIL, 56, logoY + logoDrawH + 34);

      ctx.fillStyle = '#5F6569';
      ctx.font = '400 18px "Archivo", sans-serif';
      ctx.fillText('Digital approximation — confirm with a physical sample.', 56, logoY + logoDrawH + 62);

      var filenameBase = slots.map(function (s) { return s.name; }).join('-');
      var filename = 'villa-paint-palette-' + slugify(filenameBase) + '.png';

      canvas.toBlob(function (blob) {
        if (!blob) { showToast('Could not create the image. Please try again.'); return; }
        deliverImage(blob, filename);
      }, 'image/png');
    }

    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.all([fontsReady, logoReady]).then(draw).catch(draw);
  }

  // iOS Safari doesn't reliably honour <a download> on a blob URL -- instead of
  // saving the file, it just opens the image full-screen in the same tab, which is
  // what was being reported. The fix is to hand the image to the native share sheet
  // instead (Web Share API with files), where "Save Image" is one of the options
  // -- this is the standard, well-supported approach for this exact WebKit behaviour.
  // Falls back to the direct download anywhere the share API isn't available.
  // iPhones and iPads (every browser on them runs on Safari's engine) won't save a file from a
  // download link: they open the picture full screen instead. The share sheet, with its
  // "Save Image" option, is the way to save on those. Everything else, including Macs and
  // Android phones, downloads the file straight away, so only iOS is sent to the share sheet.
  function isIOS() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua)) return true;
    // iPadOS asks websites for the desktop version and calls itself a Mac, but it has a touch screen.
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  }

  function deliverImage(blob, filename) {
    var file = null;
    try { file = new File([blob], filename, { type: blob.type }); } catch (e) { /* File constructor unsupported */ }

    if (isIOS() && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Villa Paint colour palette' }).catch(function (err) {
        if (err && err.name === 'AbortError') return; // user cancelled the share sheet, not a failure
        downloadDirectly(blob, filename);
      });
      return;
    }

    downloadDirectly(blob, filename);
  }

  function downloadDirectly(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    showToast('Palette saved.');
  }

  // ---------- Reset ----------
  function resetAll() {
    slots = [null, null, null];
    slotOrigin = [null, null, null];
    recentOfficial = {};
    lastSuggestionWasOfficial = false;
    renderSlots();
    renderPreview();
    updateSaveState();
    updateSuggestState();
  }

  // ---------- Events ----------
  searchInputEl.addEventListener('input', function () {
    query = searchInputEl.value;
    renderResults();
    resultsEl.scrollTop = 0;
  });
  sheetCloseEl.addEventListener('click', closeSearch);
  overlayEl.addEventListener('click', function (e) { if (e.target === overlayEl) closeSearch(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlayEl.classList.contains('open')) closeSearch();
  });
  saveBtn.addEventListener('click', exportPalette);
  resetBtn.addEventListener('click', resetAll);
  suggestBtn.addEventListener('click', suggestPalette);

  // ---------- Init ----------
  renderSlots();
  renderPreview();
  updateSaveState();
  updateSuggestState();

  // ---------- Iframe auto-resize (for the Squarespace embed) ----------
  // Posts this page's rendered height to the parent window whenever it changes, so the
  // embedding page can resize the iframe to fit -- no fixed height guessing, no scrollbars.
  (function () {
    if (window.parent === window) return; // not embedded, nothing to do

    var lastSent = 0;
    function notifyHeight() {
      var height = document.documentElement.scrollHeight;
      if (Math.abs(height - lastSent) < 2) return;
      lastSent = height;
      window.parent.postMessage({ type: 'villa-palette-resize', height: height }, '*');
    }

    if (window.ResizeObserver) {
      new ResizeObserver(notifyHeight).observe(document.body);
    } else {
      setInterval(notifyHeight, 700);
    }
    window.addEventListener('load', notifyHeight);
    setTimeout(notifyHeight, 300);
  })();
})();
