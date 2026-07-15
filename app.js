/* ══════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════ */
const SHEET_ID = "1-QD9UJ99Rjl1JPlBdKPo7hz5MBOiJKkMyD-qWlD520s";

const ALL_SHEETS = [
  "BGS","BGI","PGS","PGI","MOH","BMG","FGG","PGC","FIL",
  "MG","CD","MS","CS","PET-#","PET","BCPO","BOY","BPSC",
  "BPO","BPOL","BPS","COAT BARONG","BCC","BPOC","VST",
  "S-UPPER","POLO","ACC","PEN","PANTS","PACKAGE COLORS",
  "BGI-ADD ON","PGI-ADD ON"
];

// All categories available in Add-On dropdown (excludes PACKAGE COLORS, BGI, PGI)
const ADDON_CATS = [
  "BGS","BGI-ADD ON","PGS","PGI-ADD ON","MOH","BMG","FGG","PGC","FIL",
  "MG","CD","MS","CS","PET-#","PET","BCPO","BOY","BPSC",
  "BPO","BPOL","BPS","COAT BARONG","BCC","BPOC","VST",
  "S-UPPER","POLO","ACC","PEN","PANTS"
];

const BG_CATS = ["BGI","BGS","PGI","PGS","CD"];
const MG_CATS = ["MG","PGI","PGS","CD","BGI","BGS"];

/* ══════════════════════════════════════════════
   PACKAGE PRICES
══════════════════════════════════════════════ */
const packageNames = {
  "5200": "PACKAGE 1C (SPANDEX)",
  "6200": "PACKAGE 2C (CHIFFON)",
  "7000": "PACKAGE 3C (SPANDEX)",
  "8200": "PACKAGE 4C (CHIFFON)"
};

const packagePrices = {
  "5200": {
    bridal_gown: ["Bridal Gown",    600.00],
    groom:       ["Groom Barong",   175.00],
    maid:        ["Maid of Honor",  280.50],
    bridesmaid:  ["Bridesmaid",     280.50],
    flower:      ["Flower Girl",    196.35],
    child:       ["BPO Child",       84.15],
    mother:      ["Mother's Gown",  252.45],
    men:         ["Men's Barong",   100.98]
  },
  "6200": {
    bridal_gown: ["Bridal Gown",    659.04],
    groom:       ["Groom Barong",   192.22],
    maid:        ["Maid of Honor",  384.44],
    bridesmaid:  ["Bridesmaid",     384.44],
    flower:      ["Flower Girl",    302.06],
    child:       ["BPO Child",       82.38],
    mother:      ["Mother's Gown",  247.14],
    men:         ["Men's Barong",    98.86]
  },
  "7000": {
    bridal_gown: ["Bridal Gown",    615.48],
    groom:       ["Groom Suit",     461.61],
    maid:        ["Maid of Honor",  256.45],
    bridesmaid:  ["Bridesmaid",     256.45],
    flower:      ["Flower Girl",    179.52],
    child:       ["Child Suit",     256.45],
    mother:      ["Mother's Gown",  230.81],
    men:         ["Men's Set",      282.10]
  },
  "8200": {
    bridal_gown: ["Bridal Gown",    620.88],
    groom:       ["Groom Suit",     465.66],
    maid:        ["Maid of Honor",  362.18],
    bridesmaid:  ["Bridesmaid",     362.18],
    flower:      ["Flower Girl",    284.57],
    child:       ["Child Suit",     258.70],
    mother:      ["Mother's Gown",  232.83],
    men:         ["Men's Set",      284.57]
  }
};

const pkgKeys = Object.keys(packagePrices["5200"]);

/* ══════════════════════════════════════════════
   STATE
══════════════════════════════════════════════ */
const sheetData = {};
let dataReady = false;
window.latestSubmissionText = "";

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function money(x) {
  return Number(x || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

/* ══════════════════════════════════════════════
   FETCH SHEET DATA
══════════════════════════════════════════════ */
async function fetchSheet(sheetName, gid = null) {
  const url = gid
    ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();

  // Parse CSV manually
  const rows = text.trim().split("\n").map(line => {
    const cells = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cells.push(cur.trim());
    return cells;
  });

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.replace(/^"|"$/g, "").toUpperCase().trim());
  let rateColIdx      = headers.findIndex(h => h.includes("RENTAL RATE"));
  let firstUserColIdx = headers.findIndex(h => h.includes("FIRST USER"));
  console.log(`[${sheetName}] headers:`, headers, `| rentalCol: ${rateColIdx} | fuCol: ${firstUserColIdx}`);

  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const row  = rows[i];
    const code = row[0]?.replace(/^"|"$/g, "").trim();
    if (!code) continue;

    let rentalRate = null;
    if (rateColIdx >= 0 && row[rateColIdx]) {
      const v = parseFloat(row[rateColIdx].replace(/[^0-9.]/g, ""));
      if (v > 0) rentalRate = v;
    }

    let firstUser = null;
    if (firstUserColIdx >= 0 && row[firstUserColIdx]) {
      const v = parseFloat(row[firstUserColIdx].replace(/[^0-9.]/g, ""));
      if (v > 0) firstUser = v;
    }

    items.push({ code, rentalRate, firstUser });
  }
  return items;
}

// Sheets that need to be fetched by gid instead of name (spaces/special chars in name)
const SHEET_GIDS = {
  "BGI-ADD ON": "1816801973",
  "PGI-ADD ON": "549742471"
};

async function loadAllSheets() {
  const results = await Promise.allSettled(
    ALL_SHEETS.map(name => {
      const gid = SHEET_GIDS[name] || null;
      return fetchSheet(name, gid).then(items => ({ name, items }));
    })
  );
  for (const r of results) {
    if (r.status === "fulfilled") {
      sheetData[r.value.name] = r.value.items;
    } else {
      const idx = results.indexOf(r);
      sheetData[ALL_SHEETS[idx]] = [];
      console.warn("Failed to load sheet:", r.reason);
    }
  }
  populateColorDropdown();
  dataReady = true;
  document.getElementById("loadingOverlay").style.display = "none";
  render();
}

/* ══════════════════════════════════════════════
   PACKAGE COLOR DROPDOWN
══════════════════════════════════════════════ */
function populateColorDropdown() {
  const sel = document.getElementById("packageColor");
  const colors = sheetData["PACKAGE COLORS"] || [];
  while (sel.options.length > 1) sel.remove(1);
  for (const { code } of colors) {
    if (!code) continue;
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code;
    sel.appendChild(opt);
  }
}

/* ══════════════════════════════════════════════
   SEARCHABLE SELECT COMPONENT
══════════════════════════════════════════════ */
function createSearchSelect({ placeholder, options, onSelect, required = false }) {
  const wrap = document.createElement("div");
  wrap.className = "search-select-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "search-input";
  input.placeholder = placeholder;
  input.autocomplete = "off";

  const arrow = document.createElement("span");
  arrow.className = "dropdown-arrow";
  arrow.textContent = "▾";

  const list = document.createElement("div");
  list.className = "options-list";

  wrap.appendChild(input);
  wrap.appendChild(arrow);
  wrap.appendChild(list);

  let selectedValue = "";
  let allOptions = [...options];

  function buildList(filter) {
    list.innerHTML = "";
    const lower = filter.toLowerCase();
    const filtered = allOptions.filter(o => o.toLowerCase().includes(lower));
    if (!filtered.length) {
      const d = document.createElement("div");
      d.className = "opt no-results";
      d.textContent = "No results";
      list.appendChild(d);
    } else {
      for (const o of filtered) {
        const d = document.createElement("div");
        d.className = "opt";
        d.textContent = o;
        d.addEventListener("mousedown", e => {
          e.preventDefault();
          selectedValue = o;
          input.value = o;
          if (required) wrap.classList.remove("required-empty");
          list.classList.remove("open");
          onSelect(o);
        });
        list.appendChild(d);
      }
    }
  }

  input.addEventListener("focus", () => { buildList(input.value); list.classList.add("open"); });
  input.addEventListener("input", () => { selectedValue = ""; buildList(input.value); list.classList.add("open"); });
  input.addEventListener("blur", () => {
    setTimeout(() => {
      list.classList.remove("open");
      if (input.value !== selectedValue) input.value = selectedValue;
      if (required && !selectedValue) wrap.classList.add("required-empty");
    }, 150);
  });

  wrap.getValue  = () => selectedValue;
  wrap.setValue  = (v) => { selectedValue = v; input.value = v; };
  wrap.setOptions = (newOptions) => { allOptions = [...newOptions]; selectedValue = ""; input.value = ""; };
  wrap.markRequired = () => { if (!selectedValue) wrap.classList.add("required-empty"); };

  return wrap;
}

/* ══════════════════════════════════════════════
   GOWN PICKERS
══════════════════════════════════════════════ */
function buildGownPickers(containerId, qty, allowedCats, labelPrefix) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  if (qty <= 0) return;

  for (let i = 0; i < qty; i++) {
    const set = document.createElement("div");
    set.className = "gown-picker-set";

    const label = document.createElement("div");
    label.className = "gown-picker-label";
    label.textContent = qty === 1
      ? labelPrefix + " Item Code"
      : labelPrefix + " #" + (i + 1) + " Item Code";
    set.appendChild(label);

    const row = document.createElement("div");
    row.className = "gown-picker-row";

    // Category select
    const catSel = document.createElement("select");
    catSel.className = "gown-cat-sel";
    const defOpt = document.createElement("option");
    defOpt.value = ""; defOpt.textContent = "— Category —";
    catSel.appendChild(defOpt);
    for (const cat of allowedCats) {
      const o = document.createElement("option");
      o.value = cat; o.textContent = cat;
      catSel.appendChild(o);
    }

    // Item code searchable select
    const itemSearch = createSearchSelect({
      placeholder: "— Item Code —",
      options: [],
      onSelect: () => calc(),
      required: true
    });
    itemSearch.classList.add("gown-item-sel");

    catSel.addEventListener("change", () => {
      const cat = catSel.value;
      itemSearch.setOptions(cat && sheetData[cat] ? sheetData[cat].map(r => r.code) : []);
      calc();
    });

    row.appendChild(catSel);
    row.appendChild(itemSearch);
    set.appendChild(row);
    container.appendChild(set);
  }
}

/* ══════════════════════════════════════════════
   RENDER PACKAGE ITEMS
══════════════════════════════════════════════ */
function render() {
  const pkg = document.getElementById("packageType").value;
  const wrap = document.getElementById("itemRows");
  wrap.innerHTML = "";

  pkgKeys.forEach(k => {
    const [name, price] = packagePrices[pkg][k];

    const row = document.createElement("div");
    row.className = "pkg-row";
    row.dataset.k = k;

    // Col 1: label + gown pickers
    const labelCol = document.createElement("div");
    const itemLabel = document.createElement("div");
    itemLabel.className = "item-label";
    itemLabel.textContent = name;
    labelCol.appendChild(itemLabel);

    if (k === "bridal_gown") {
      const pc = document.createElement("div");
      pc.id = "bgPickers"; pc.className = "gown-pickers";
      labelCol.appendChild(pc);
    }
    if (k === "mother") {
      const pc = document.createElement("div");
      pc.id = "mgPickers"; pc.className = "gown-pickers";
      labelCol.appendChild(pc);
    }

    // Col 2: Quantity
    const qtyCol = document.createElement("div");
    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "0";
    qtyInput.step = "1";
    qtyInput.value = "0";
    qtyInput.dataset.k = k;
    qtyInput.className = "package-qty";
    qtyCol.appendChild(qtyInput);

    // Col 3: Unit price
    const priceCol = document.createElement("div");
    priceCol.className = "unit-price";
    priceCol.innerHTML = `₱&nbsp;${money(price)}`;

    // Col 4: Subtotal
    const subCol = document.createElement("div");
    subCol.className = "subtotal-val";
    subCol.innerHTML = `₱&nbsp;<span id="sub_${k}">0.00</span>`;

    row.appendChild(labelCol);
    row.appendChild(qtyCol);
    row.appendChild(priceCol);
    row.appendChild(subCol);
    wrap.appendChild(row);

    qtyInput.addEventListener("input", () => {
      const q = Math.max(0, parseInt(qtyInput.value) || 0);
      if (k === "bridal_gown") buildGownPickers("bgPickers", q, BG_CATS, "Bridal Gown");
      if (k === "mother")      buildGownPickers("mgPickers", q, MG_CATS, "Mother's Gown");
      calc();
    });
  });

  calc();
}

/* ══════════════════════════════════════════════
   ADD-ON ROWS
══════════════════════════════════════════════ */


function addAddonRow() {
  const row = document.createElement("div");
  row.className = "addon-row";

  // Col 1: Category
  const catSel = document.createElement("select");
  catSel.className = "addon-cat";
  const defOpt = document.createElement("option");
  defOpt.value = ""; defOpt.textContent = "— Category —";
  catSel.appendChild(defOpt);
  for (const cat of ADDON_CATS) {
    const o = document.createElement("option");
    o.value = cat; o.textContent = cat;
    catSel.appendChild(o);
  }

  // Col 2: Item code searchable
  const regularSpan = document.createElement("div");
  regularSpan.className = "addon-regular-val";
  regularSpan.textContent = "—";

  // Col 3: Price type selector (shown/hidden based on available prices)
  const priceTypeSel = document.createElement("select");
  priceTypeSel.className = "addon-price-type";
  priceTypeSel.style.display = "none";
  const ptDefault = document.createElement("option");
  ptDefault.value = "rental"; ptDefault.textContent = "Rental";
  priceTypeSel.appendChild(ptDefault);

  function updatePriceType() {
    const found = row._foundItem;
    if (!found) { priceTypeSel.style.display = "none"; return; }

    const hasRental    = found.rentalRate != null;
    const hasFirstUser = found.firstUser  != null;

    // Rebuild options based on what's available
    priceTypeSel.innerHTML = "";
    if (hasRental) {
      const o = document.createElement("option");
      o.value = "rental"; o.textContent = "Rental Rate";
      priceTypeSel.appendChild(o);
    }
    if (hasFirstUser) {
      const o = document.createElement("option");
      o.value = "firstuser"; o.textContent = "First User";
      priceTypeSel.appendChild(o);
    }

    // Only show the selector if both options exist
    priceTypeSel.style.display = (hasRental && hasFirstUser) ? "" : "none";
    applySelectedPrice();
  }

  function applySelectedPrice() {
    const found = row._foundItem;
    if (!found) { row._activeRate = 0; regularSpan.textContent = "—"; calc(); return; }
    const type = priceTypeSel.value;
    const price = (type === "firstuser" && found.firstUser != null)
      ? found.firstUser
      : (found.rentalRate ?? 0);
    row._activeRate = price;
    regularSpan.textContent = price ? "₱ " + money(price) : "—";
    calc();
  }

  priceTypeSel.addEventListener("change", applySelectedPrice);

  const itemSearch = createSearchSelect({
    placeholder: "— Item Code —",
    options: [],
    onSelect: (code) => {
      const cat = catSel.value;
      const found = (sheetData[cat] || []).find(i => i.code === code);
      row._foundItem = found || null;
      updatePriceType();
    }
  });

  catSel.addEventListener("change", () => {
    const cat = catSel.value;
    itemSearch.setOptions(cat && sheetData[cat] ? sheetData[cat].map(r => r.code) : []);
    row._foundItem = null;
    row._activeRate = 0;
    priceTypeSel.style.display = "none";
    regularSpan.textContent = "—";
    calc();
  });

  // Col 4: Quantity
  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.min = "1";
  qtyInput.step = "1";
  qtyInput.value = "1";
  qtyInput.className = "addon-qty";
  qtyInput.addEventListener("input", calc);

  // Col 6: Charged
  const chargedSpan = document.createElement("div");
  chargedSpan.className = "addon-subtotal-val";
  chargedSpan.textContent = "₱ 0.00";

  // Col 7: Remove
  const removeBtn = document.createElement("button");
  removeBtn.className = "btn-remove";
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", () => { row.remove(); calc(); });

  row._foundItem    = null;
  row._activeRate   = 0;
  row._itemSearch   = itemSearch;
  row._qtyInput     = qtyInput;
  row._chargedSpan  = chargedSpan;
  row._priceTypeSel = priceTypeSel;
  row._updatePriceType = updatePriceType;

  row.appendChild(catSel);
  row.appendChild(itemSearch);
  row.appendChild(priceTypeSel);
  row.appendChild(qtyInput);
  row.appendChild(regularSpan);
  row.appendChild(chargedSpan);
  row.appendChild(removeBtn);

  document.getElementById("addonRows").appendChild(row);
  calc();
}

/* ══════════════════════════════════════════════
   CALC
══════════════════════════════════════════════ */
function calc() {
  if (!dataReady) return;

  const pkg = document.getElementById("packageType").value;
  const packageColor = document.getElementById("packageColor").value;

  let packTotal = 0;
  let addonTotal = 0;
  let anySelected = false;
  const pkgLines = [];
  const addonLines = [];

  // Package items
  document.querySelectorAll(".package-qty").forEach(input => {
    const k = input.dataset.k;
    const qty = Math.max(0, parseInt(input.value) || 0);
    const [name, price] = packagePrices[pkg][k];
    const sub = qty * price;
    packTotal += sub;

    const subEl = document.getElementById("sub_" + k);
    if (subEl) subEl.textContent = money(sub);

    if (qty > 0) {
      anySelected = true;
      const codes = [];
      if (k === "bridal_gown") {
        document.querySelectorAll("#bgPickers .gown-picker-set").forEach(set => {
          const cat  = set.querySelector(".gown-cat-sel")?.value || "";
          const item = set.querySelector(".gown-item-sel")?.getValue?.() || "";
          codes.push((cat && item) ? `${cat}/${item}` : (item || ""));
        });
      }
      if (k === "mother") {
        document.querySelectorAll("#mgPickers .gown-picker-set").forEach(set => {
          const cat  = set.querySelector(".gown-cat-sel")?.value || "";
          const item = set.querySelector(".gown-item-sel")?.getValue?.() || "";
          codes.push((cat && item) ? `${cat}/${item}` : (item || ""));
        });
      }
      let line = name;
      if (codes.length) line += ` | ${codes.map((c,i) => c ? `#${i+1}: ${c}` : `#${i+1}: (not selected)`).join(", ")}`;
      line += ` x ${qty} @ ₱${money(price)} = ₱${money(sub)}`;
      pkgLines.push(line);
    }
  });

  // Add-on items
  document.querySelectorAll(".addon-row").forEach(row => {
    const qty      = Math.max(0, parseInt(row._qtyInput?.value) || 0);
    const rate     = row._activeRate || 0;
    const cat      = row.querySelector(".addon-cat")?.value || "";
    const itemCode = row._itemSearch?.getValue?.() || "";
    const charged  = rate * 0.8;
    const sub      = qty * charged;
    addonTotal += sub;

    if (row._chargedSpan) row._chargedSpan.textContent = "₱ " + money(sub);

    if (qty > 0 && rate > 0 && itemCode) {
      anySelected = true;
      addonLines.push(
        `${cat ? cat + "/" : ""}${itemCode} x ${qty} | Regular: ₱${money(rate)} | Less 20%: ₱${money(charged)} | Subtotal: ₱${money(sub)}`
      );
    }
  });

  document.getElementById("packageSubtotal").textContent = money(packTotal);
  document.getElementById("addonSubtotal").textContent   = money(addonTotal);
  document.getElementById("grandTotal").textContent      = money(packTotal + addonTotal);

  // Build summary — blank if nothing selected
  if (!anySelected && !packageColor) {
    window.latestSubmissionText = "";
    broadcastToJotform();
    return;
  }

  const lines = [];
  lines.push("PACKAGE: " + packageNames[pkg]);
  if (packageColor) lines.push("PACKAGE COLOR: " + packageColor);
  lines.push("");
  lines.push(...pkgLines);
  if (addonLines.length) {
    lines.push("");
    lines.push("ADD-ONS:");
    lines.push(...addonLines);
  }
  lines.push("");
  lines.push("PACKAGE SUBTOTAL: ₱" + money(packTotal));
  lines.push("ADD-ON SUBTOTAL: ₱"  + money(addonTotal));
  lines.push("GRAND TOTAL: ₱"      + money(packTotal + addonTotal));
  lines.push((packTotal + addonTotal).toFixed(2));

  window.latestSubmissionText = lines.join("\n");
  broadcastToJotform();
}

/* ══════════════════════════════════════════════
   JOTFORM INTEGRATION
══════════════════════════════════════════════ */
function broadcastToJotform() {
  const value = window.latestSubmissionText || "";
  const totalText = document.getElementById("grandTotal")?.textContent || "0.00";
  const totalNum = parseFloat(totalText.replace(/,/g, "")) || 0;

  // Save to localStorage keyed by submission ID
  if (window._jfSid) saveToLocalStorage(window._jfSid, value);

  // 1. Send full summary as widget value (so JotForm condition copies it to field 110)
  if (typeof JFCustomWidget !== "undefined") {
    try { JFCustomWidget.sendData({ value }); } catch(e) {}
  }

  // 2. Direct DOM injection into parent JotForm fields
  try {
    if (window.parent && window.parent !== window) {
      const summary = window.parent.document.getElementById("input_110");
      if (summary) {
        summary.value = value;
        summary.dispatchEvent(new Event("input",  { bubbles: true }));
        summary.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  } catch(e) {}

  try {
    if (window.parent && window.parent !== window) {
      const totalField = window.parent.document.getElementById("input_141");
      console.log("[DOM] input_141 found:", !!totalField, "| value:", totalNum.toFixed(2));
      if (totalField) {
        totalField.value = totalNum.toFixed(2);
        totalField.dispatchEvent(new Event("input",  { bubbles: true }));
        totalField.dispatchEvent(new Event("change", { bubbles: true }));
        totalField.dispatchEvent(new Event("keyup",  { bubbles: true }));
        console.log("[DOM] input_141 after write:", totalField.value);
      }
    }
  } catch(e) { console.log("[DOM] input_141 error:", e.message); }

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(JSON.stringify({ type: "widgetValue", value, valid: true }), "*");
    }
  } catch(e) {}
}

function getSubmissionId() {
  // Extract submission ID from parent URL (jotform.com/edit/SUBMISSION_ID)
  // or from the ready event's sid field
  try {
    const parentUrl = window.parent.location.href;
    const m = parentUrl.match(/\/edit\/(\d+)/);
    if (m) return m[1];
  } catch(e) {}
  // Fallback: try our own URL params
  try {
    const m = window.location.href.match(/[?&]sid=(\d+)/);
    if (m) return m[1];
  } catch(e) {}
  return null;
}

function saveToLocalStorage(sid, text) {
  if (!sid || !text) return;
  try { localStorage.setItem("jf_calc_" + sid, text); } catch(e) {}
}

function loadFromLocalStorage(sid) {
  if (!sid) return null;
  try { return localStorage.getItem("jf_calc_" + sid) || null; } catch(e) { return null; }
}

function setupJotform() {
  if (typeof JFCustomWidget === "undefined") return;

  JFCustomWidget.subscribe("submit", () => {
    JFCustomWidget.sendSubmit({ valid: true, value: window.latestSubmissionText || "" });
  });

  JFCustomWidget.subscribe("ready", function(data) {
    console.log("[JotForm ready] data:", JSON.stringify(data));

    // Extract submission ID
    let sid = null;
    if (data) {
      sid = data.sid || data.submissionID || data.submissionId || null;
      if (sid) sid = String(sid);
    }
    if (!sid) {
      try {
        const m = JSON.stringify(data).match(/"sid"\s*:\s*"?(\d+)"?/);
        if (m) sid = m[1];
      } catch(e) {}
    }
    if (!sid) sid = getSubmissionId();
    console.log("[JotForm ready] sid:", sid);
    window._jfSid = sid;

    // Try localStorage first (fastest)
    const fromStorage = sid ? loadFromLocalStorage(sid) : null;
    if (fromStorage) {
      console.log("[JotForm ready] restoring from localStorage");
      restoreFromSummary(fromStorage);
      return;
    }

    // Fetch from JotForm API (works for all submissions, old and new)
    if (sid) {
      console.log("[JotForm ready] fetching from JotForm API...");
      const apiUrl = `https://api.jotform.com/submission/${sid}?apiKey=6b9359da26ff8421a11c7f9dca4553a9&nocache=${Date.now()}`;
      fetch(apiUrl, { mode: "cors" })
        .then(r => {
          console.log("[JotForm API] status:", r.status);
          return r.json();
        })
        .then(json => {
          console.log("[JotForm API] responseCode:", json?.responseCode);
          const answer = json?.content?.answers?.["110"];
          console.log("[JotForm API] field 110:", JSON.stringify(answer));
          const saved = (answer?.answer && answer.answer.trim()) ? answer.answer.trim()
                      : (answer?.prettyFormat && answer.prettyFormat.trim()) ? answer.prettyFormat.trim()
                      : null;
          if (saved) {
            console.log("[JotForm API] restoring:", saved.substring(0, 80));
            saveToLocalStorage(sid, saved);
            restoreFromSummary(saved);
          } else {
            console.log("[JotForm API] no value in field 110");
            broadcastToJotform();
          }
        })
        .catch(err => {
          console.log("[JotForm API] fetch error:", err.message || err);
          broadcastToJotform();
        });
    } else {
      broadcastToJotform();
    }
  });
}

/* ══════════════════════════════════════════════
   RESTORE FROM SAVED SUMMARY
══════════════════════════════════════════════ */
async function restoreFromSummary(text) {
  // Wait until sheet data is ready
  if (!dataReady) {
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (dataReady) { clearInterval(check); resolve(); }
      }, 100);
    });
  }

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // ── Package type ──
  const pkgLine = lines.find(l => l.startsWith("PACKAGE:"));
  if (pkgLine) {
    const pkgName = pkgLine.replace("PACKAGE:", "").trim();
    const pkgSel = document.getElementById("packageType");
    for (const [val, name] of Object.entries(packageNames)) {
      if (name === pkgName) { pkgSel.value = val; break; }
    }
    render(); // rebuild package rows for this package
  }

  // ── Package color ──
  const colorLine = lines.find(l => l.startsWith("PACKAGE COLOR:"));
  if (colorLine) {
    const color = colorLine.replace("PACKAGE COLOR:", "").trim();
    const colorSel = document.getElementById("packageColor");
    colorSel.value = color;
  }

  // ── Package item name → key map ──
  const pkg = document.getElementById("packageType").value;
  const nameToKey = {};
  for (const [k, [name]] of Object.entries(packagePrices[pkg])) {
    nameToKey[name] = k;
  }

  // ── Parse package item lines ──
  // Format: "Bridal Gown | #1: BGI/BGI001, #2: BGS/BGS002 x 2 @ ₱600.00 = ₱1,200.00"
  // Or:     "Maid of Honor x 3 @ ₱280.50 = ₱841.50"
  const addonStartIdx = lines.findIndex(l => l === "ADD-ONS:");
  const pkgItemLines = lines.filter((l, i) => {
    if (l.startsWith("PACKAGE:") || l.startsWith("PACKAGE COLOR:") ||
        l.startsWith("PACKAGE SUBTOTAL:") || l.startsWith("ADD-ON SUBTOTAL:") ||
        l.startsWith("GRAND TOTAL:") || l === "ADD-ONS:") return false;
    if (addonStartIdx >= 0 && i > addonStartIdx) return false;
    return l.includes(" x ") && l.includes("@");
  });

  for (const line of pkgItemLines) {
    // Extract qty — it's the number after " x " and before " @"
    const qtyMatch = line.match(/ x (\d+) @/);
    if (!qtyMatch) continue;
    const qty = parseInt(qtyMatch[1]);

    // Determine item name (before any " | " or " x ")
    const itemName = line.split(/\s*\|\s*|\s+x\s+\d+\s+@/)[0].trim();
    const k = nameToKey[itemName];
    if (!k) continue;

    // Set quantity
    const qtyInput = document.querySelector(`.package-qty[data-k="${k}"]`);
    if (qtyInput) {
      qtyInput.value = qty;
      qtyInput.dispatchEvent(new Event("input"));
    }

    // Restore gown codes if present
    // Format: "Bridal Gown | #1: BGI/BGI001, #2: BGS/BGS002 x 2 @..."
    if (k === "bridal_gown" || k === "mother") {
      const containerId = k === "bridal_gown" ? "bgPickers" : "mgPickers";
      const allowedCats = k === "bridal_gown" ? BG_CATS : MG_CATS;
      const labelPrefix = k === "bridal_gown" ? "Bridal Gown" : "Mother's Gown";

      // Parse codes: "#1: BGI/BGI001" → { cat: "BGI", code: "BGI001" }
      const codeMatches = [...line.matchAll(/#\d+:\s*([^/,]+)\/([^,\s]+)/g)];
      if (codeMatches.length > 0) {
        buildGownPickers(containerId, codeMatches.length, allowedCats, labelPrefix);
        const sets = document.querySelectorAll(`#${containerId} .gown-picker-set`);
        codeMatches.forEach((m, i) => {
          const cat  = m[1].trim();
          const code = m[2].trim();
          const set  = sets[i];
          if (!set) return;
          const catSel = set.querySelector(".gown-cat-sel");
          const itemSel = set.querySelector(".gown-item-sel");
          if (catSel) {
            catSel.value = cat;
            // Populate item codes for this category
            if (sheetData[cat]) {
              itemSel.setOptions(sheetData[cat].map(r => r.code));
            }
          }
          if (itemSel) itemSel.setValue(code);
        });
      }
    }
  }

  // ── Parse add-on lines ──
  // Format: "BGS/BGS001 x 1 | Regular: ₱1,500.00 | Less 20%: ₱1,200.00 | Subtotal: ₱1,200.00"
  if (addonStartIdx >= 0) {
    const addonLines = lines.filter((l, i) => {
      if (i <= addonStartIdx) return false;
      if (l.startsWith("PACKAGE SUBTOTAL:") || l.startsWith("ADD-ON SUBTOTAL:") ||
          l.startsWith("GRAND TOTAL:")) return false;
      return l.includes(" x ") && l.includes("Regular:");
    });

    for (const line of addonLines) {
      // Parse: "CAT/CODE x QTY | Regular: ₱PRICE | ..."
      const m = line.match(/^([^/]+)\/(\S+)\s+x\s+(\d+)\s+\|\s*Regular:\s*₱([\d,]+\.?\d*)/);
      if (!m) continue;
      const cat      = m[1].trim();
      const code     = m[2].trim();
      const qty      = parseInt(m[3]);
      const regular  = parseFloat(m[4].replace(/,/g, ""));

      // Add the row
      addAddonRow();
      const rows = document.querySelectorAll(".addon-row");
      const row  = rows[rows.length - 1];

      // Set category
      const catSel = row.querySelector(".addon-cat");
      if (catSel) {
        catSel.value = cat;
        catSel.dispatchEvent(new Event("change"));
      }

      // Wait a tick for item codes to populate, then set values
      await new Promise(r => setTimeout(r, 0));

      // Set item code
      if (row._itemSearch && sheetData[cat]) {
        row._itemSearch.setOptions(sheetData[cat].map(r => r.code));
        const found = sheetData[cat].find(i => i.code === code);
        row._foundItem = found || null;
        row._itemSearch.setValue(code);

        // Determine price type by matching regular price to rental vs first user
        if (found) {
          const ptSel = row._priceTypeSel;
          if (found.firstUser && Math.abs(found.firstUser - regular) < 0.01) {
            ptSel.value = "firstuser";
          } else {
            ptSel.value = "rental";
          }
          // Trigger price type update
          const updateFn = row._updatePriceType;
          if (updateFn) updateFn();
          else {
            row._activeRate = regular;
            row.querySelector(".addon-regular-val").textContent = "₱ " + money(regular);
          }
        }
      }

      // Set quantity
      if (row._qtyInput) row._qtyInput.value = qty;
    }
  }

  calc();
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("packageType").addEventListener("change", render);
  document.getElementById("packageColor").addEventListener("change", calc);
  document.getElementById("addAddonBtn").addEventListener("click", addAddonRow);

  // Poll for JFCustomWidget — JotForm injects it asynchronously
  const waitForJotform = () => new Promise(resolve => {
    if (typeof JFCustomWidget !== "undefined") { resolve(); return; }
    const interval = setInterval(() => {
      if (typeof JFCustomWidget !== "undefined") {
        clearInterval(interval);
        resolve();
      }
    }, 50);
    // Give up after 5s and proceed without JotForm (standalone mode)
    setTimeout(() => { clearInterval(interval); resolve(); }, 5000);
  });

  await waitForJotform();
  setupJotform();
  await loadAllSheets();
});
