(function () {
  'use strict';

  // ---------- State ----------
  var slots = [null, null, null];
  var activeSlotIndex = null;
  var brandFilter = 'All';
  var query = '';
  var RESULT_LIMIT = 60;

  var BRANDS = ['All', 'Benjamin Moore', 'Sherwin-Williams', 'Dulux', 'Cloverdale'];
  var CONTACT_EMAIL = 'info@villapaint.ca';

  // ---------- DOM refs ----------
  var slotsEl = document.getElementById('slots');
  var paintStripEl = document.getElementById('paintStrip');
  var saveBtn = document.getElementById('saveBtn');
  var resetBtn = document.getElementById('resetBtn');
  var suggestBtn = document.getElementById('suggestBtn');
  var overlayEl = document.getElementById('overlay');
  var sheetCloseEl = document.getElementById('sheetClose');
  var searchInputEl = document.getElementById('searchInput');
  var filterRowEl = document.getElementById('filterRow');
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
    return color.code ? (color.brand + ' · ' + color.code) : color.brand;
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

  // Precompute once so suggesting doesn't re-parse 6,000+ hex codes every tap.
  COLORS_DATA.forEach(function (c) {
    c.hsl = hexToHSL(c.hex);
    c.role = classifyRole(c.hsl);
  });

  var colorIndex = {}; // "brand|name" (lowercase) -> COLORS_DATA entry, for fast exact lookups
  COLORS_DATA.forEach(function (c) {
    colorIndex[(c.brand + '|' + c.name).toLowerCase()] = c;
  });

  // Real "Color Combinations" pulled directly from each colour's own page on
  // benjaminmoore.com -- these are the brand's own expert-picked pairings, not
  // generated. Only Benjamin Moore publishes this per-colour on their site (checked
  // Sherwin-Williams, Dulux and Cloverdale's color pages -- none have an equivalent),
  // so this only ever applies when a Benjamin Moore colour is in the palette. Covers
  // the most iconic, most-likely-to-be-picked colours for now; more can be added.
  var OFFICIAL_COORDINATES = {
    'benjamin moore|van courtland blue': ['Wedgewood Gray', 'Simply White', 'Milkyway', 'Coronado Cream'],
    'benjamin moore|simply white': ['Dove Wing', 'Somerville Red', 'Silver Satin', 'Casco Bay'],
    'benjamin moore|chantilly lace': ['White', 'Horizon', 'Seapearl', 'Edgecomb Gray'],
    'benjamin moore|white dove': ['Balboa Mist', 'Kendall Charcoal', 'Revere Pewter', 'Country Redwood'],
    'benjamin moore|revere pewter': ['Chelsea Gray', 'White Dove', 'Sparrow', 'Fog Mist'],
    'benjamin moore|hale navy': ['Coventry Gray', 'White Dove', 'Lenox Tan', 'Glacier White'],
    'benjamin moore|palladian blue': ['Elmira White', 'Persimmon', 'Willow Creek', 'Wood Grain Brown'],
    'benjamin moore|caliente': ['Frostine', 'Wish', 'White Diamond', 'Harbor Haze']
  };

  function officialMatchesFor(color) {
    var key = (color.brand + '|' + color.name).toLowerCase();
    var names = OFFICIAL_COORDINATES[key];
    if (!names) return [];
    return names
      .map(function (n) { return colorIndex[('benjamin moore|' + n).toLowerCase()]; })
      .filter(Boolean);
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
    var emptyIndices = [];
    slots.forEach(function (s, i) { if (!s) emptyIndices.push(i); });
    if (!emptyIndices.length) return;

    var excludeIds = slots.filter(Boolean).map(function (s) { return s.id; });

    // 1. Prefer the manufacturer's own official pairings, from any filled colour that has them.
    var officialPicks = [];
    slots.forEach(function (s) {
      if (!s) return;
      officialMatchesFor(s).forEach(function (match) {
        if (excludeIds.indexOf(match.id) === -1 && officialPicks.indexOf(match) === -1) {
          officialPicks.push(match);
        }
      });
    });

    var usedOfficial = 0;
    emptyIndices.forEach(function (idx) {
      if (usedOfficial < officialPicks.length) {
        slots[idx] = officialPicks[usedOfficial];
        excludeIds.push(officialPicks[usedOfficial].id);
        usedOfficial++;
      }
    });

    // 2. Fill anything still empty using the coordination algorithm.
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
        if (picked[role]) slots[idx] = picked[role];
      });
    }

    renderSlots();
    renderPreview();
    updateSaveState();
    updateSuggestState();
    showToast(usedOfficial > 0
      ? "Using Benjamin Moore's official pairings."
      : "Here's a palette to get you started.");
  }

  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
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
        slots[idx] = null;
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

  function updateSuggestState() {
    var complete = slots.every(function (s) { return !!s; });
    suggestBtn.disabled = complete;
  }

  // ---------- Search overlay ----------
  function openSearch(slotIndex) {
    activeSlotIndex = slotIndex;
    query = '';
    searchInputEl.value = '';
    renderFilterChips();
    renderResults();
    overlayEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { searchInputEl.focus(); }, 60);
  }

  function closeSearch() {
    overlayEl.classList.remove('open');
    document.body.style.overflow = '';
    activeSlotIndex = null;
  }

  function renderFilterChips() {
    filterRowEl.innerHTML = '';
    BRANDS.forEach(function (b) {
      var chip = document.createElement('button');
      chip.className = 'chip' + (brandFilter === b ? ' active' : '');
      chip.textContent = b;
      chip.addEventListener('click', function () {
        brandFilter = b;
        renderFilterChips();
        renderResults();
      });
      filterRowEl.appendChild(chip);
    });
  }

  function getFilteredResults() {
    var q = query.trim().toLowerCase();
    return COLORS_DATA.filter(function (c) {
      if (brandFilter !== 'All' && c.brand !== brandFilter) return false;
      if (!q) return true;
      var hay = (c.name + ' ' + c.code + ' ' + c.brand).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
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

    var shown = all.slice(0, RESULT_LIMIT);
    shown.forEach(function (color) {
      var row = document.createElement('button');
      row.className = 'result-row';
      row.innerHTML =
        '<span class="result-swatch" style="background:' + color.hex + '"></span>' +
        '<span class="result-text">' +
          '<span class="name">' + escapeHtml(color.name) + '</span>' +
          '<span class="meta">' + escapeHtml(subtitleFor(color)) + '</span>' +
        '</span>';
      row.addEventListener('click', function () { selectColor(color); });
      resultsEl.appendChild(row);
    });

    if (all.length > RESULT_LIMIT) {
      var hint = document.createElement('div');
      hint.className = 'result-hint';
      hint.textContent = 'Showing ' + RESULT_LIMIT + ' of ' + all.length + ' — keep typing to narrow it down.';
      resultsEl.appendChild(hint);
    }
  }

  function selectColor(color) {
    if (activeSlotIndex === null) return;
    slots[activeSlotIndex] = color;
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
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        showToast('Palette saved.');
      }, 'image/png');
    }

    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.all([fontsReady, logoReady]).then(draw).catch(draw);
  }

  // ---------- Reset ----------
  function resetAll() {
    slots = [null, null, null];
    renderSlots();
    renderPreview();
    updateSaveState();
    updateSuggestState();
  }

  // ---------- Events ----------
  searchInputEl.addEventListener('input', function () {
    query = searchInputEl.value;
    renderResults();
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
