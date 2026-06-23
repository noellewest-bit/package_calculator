/* ══════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════ */
const SHEET_ID = "1-QD9UJ99Rjl1JPlBdKPo7hz5MBOiJKkMyD-qWlD520s";

const ALL_SHEETS = [
  "BGS","BGI","PGS","PGI","MOH","BMG","FGG","PGC","FIL",
  "MG","CD","MS","CS","PET-#","PET","BCPO","BOY","BPSC",
  "BPO","BPOL","BPS","COAT BARONG","BCC","BPOC","VST",
  "S-UPPER","POLO","ACC","PEN","PANTS","PACKAGE COLORS"
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
async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.replace(/^[^{]*/, "").replace(/\);?\s*$/, ""));
  const rows = json.table?.rows || [];
  const cols = json.table?.cols || [];

  // Find RENTAL RATE column by label
  let rateColIdx = -1;
  cols.forEach((c, i) => {
    if (c.label && c.label.toString().toUpperCase().includes("RENTAL RATE")) {
      rateColIdx = i;
    }
  });
  console.log(`[${sheetName}] cols:`, cols.map((c,i) => `${i}:${c.label}`), `| rateColIdx: ${rateColIdx}`);
  const items = [];
  // Skip row 0 — it is always the header row regardless of what it says
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const code = row.c?.[0]?.v != null ? String(row.c[0].v).trim() : "";
    if (!code) continue;

    let rentalRate = null;
    if (rateColIdx >= 0) {
      const rateCell = row.c?.[rateColIdx];
      if (rateCell?.v != null && rateCell.v !== "" && rateCell.v !== 0) {
        rentalRate = parseFloat(String(rateCell.v).replace(/[^0-9.]/g, "")) || null;
        if (rentalRate === 0) rentalRate = null;
      }
    }
    items.push({ code, rentalRate });
  }
  return items;
}

async function loadAllSheets() {
  const results = await Promise.allSettled(
    ALL_SHEETS.map(name => fetchSheet(name).then(items => ({ name, items })))
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
const ADDON_CATS = ALL_SHEETS.filter(s => s !== "PACKAGE COLORS");

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

  const itemSearch = createSearchSelect({
    placeholder: "— Item Code —",
    options: [],
    onSelect: (code) => {
      const cat = catSel.value;
      const found = (sheetData[cat] || []).find(i => i.code === code);
      if (found && found.rentalRate != null) {
        row._rentalRate = found.rentalRate;
        regularSpan.textContent = "₱ " + money(found.rentalRate);
      } else {
        row._rentalRate = 0;
        regularSpan.textContent = "—";
      }
      calc();
    }
  });

  catSel.addEventListener("change", () => {
    const cat = catSel.value;
    itemSearch.setOptions(cat && sheetData[cat] ? sheetData[cat].map(r => r.code) : []);
    row._rentalRate = 0;
    regularSpan.textContent = "—";
    calc();
  });

  // Col 3: Quantity
  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.min = "1";
  qtyInput.step = "1";
  qtyInput.value = "1";
  qtyInput.className = "addon-qty";
  qtyInput.addEventListener("input", calc);

  // Col 5: Charged
  const chargedSpan = document.createElement("div");
  chargedSpan.className = "addon-subtotal-val";
  chargedSpan.textContent = "₱ 0.00";

  // Col 6: Remove
  const removeBtn = document.createElement("button");
  removeBtn.className = "btn-remove";
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", () => { row.remove(); calc(); });

  row._rentalRate = 0;
  row._itemSearch = itemSearch;
  row._qtyInput   = qtyInput;
  row._chargedSpan = chargedSpan;

  row.appendChild(catSel);
  row.appendChild(itemSearch);
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
    const rate     = row._rentalRate || 0;
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

  window.latestSubmissionText = lines.join("\n");
  broadcastToJotform();
}

/* ══════════════════════════════════════════════
   JOTFORM INTEGRATION
══════════════════════════════════════════════ */
function broadcastToJotform() {
  const value = window.latestSubmissionText || "";

  // 1. Standard widget API
  if (typeof JFCustomWidget !== "undefined") {
    try { JFCustomWidget.sendData({ value }); } catch(e) {}
  }

  // 2. Direct DOM injection into parent JotForm field

  try {
    if (window.parent && window.parent !== window) {
      const t = window.parent.document.getElementById("input_110");
      if (t) {
        t.value = value;
        t.dispatchEvent(new Event("input",  { bubbles: true }));
        t.dispatchEvent(new Event("change", { bubbles: true }));
      }
      window.parent.postMessage(JSON.stringify({ type: "widgetValue", value, valid: true }), "*");
    }
  } catch(e) {}
}

function setupJotform() {
  if (typeof JFCustomWidget === "undefined") return;
  JFCustomWidget.subscribe("submit", () =>
    JFCustomWidget.sendSubmit({ valid: true, value: window.latestSubmissionText || "" }));
  JFCustomWidget.subscribe("ready", broadcastToJotform);
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("packageType").addEventListener("change", render);
  document.getElementById("packageColor").addEventListener("change", calc);
  document.getElementById("addAddonBtn").addEventListener("click", addAddonRow);
  setupJotform();
  await loadAllSheets();
});
