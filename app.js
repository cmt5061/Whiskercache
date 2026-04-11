/**
 * WhiskerCache · app.js
 * Core application logic
 * Offline-first · localStorage · Firebase sync
 */

"use strict";

// ──────────────────────────────────────────────
//  CONSTANTS
// ──────────────────────────────────────────────

const LS_KEY       = "whiskerCache_entries";    // localStorage key for entries array
const LS_SEEDED    = "whiskerCache_seeded";      // flag: seed data already loaded
const LS_DELETED   = "whiskerCache_deleted";     // tombstone IDs to prevent re-sync

// Confirmation messages shown after logging
const CONFIRMS = [
  "Whisker secured. 🐾",
  "Another one?! 😼",
  "Into the vault!",
  "Catalogued. Buns approves.",
  "The collection grows… 🌟",
  "Filed with care. ✨",
];

// ──────────────────────────────────────────────
//  SEED DATA
//  Parsed from the raw dataset.
//  Rules applied:
//    - No cat → Archie
//    - kevy/Kevy/Kevy Kake → Kevin
//    - Archibald → Archie
//    - Multi-cat entries split into separate records
// ──────────────────────────────────────────────

const SEED_ENTRIES = [
  // ── 2023 ────────────────────────────────────
  { id: "seed_2023_01", timestamp: d(2023, 11, 11), cat: "Archie", count: 2 },
  { id: "seed_2023_02", timestamp: d(2023, 11, 18), cat: "Archie", count: 1 },
  { id: "seed_2023_03", timestamp: d(2023, 11, 28), cat: "Archie", count: 1 },
  { id: "seed_2023_04", timestamp: d(2023, 12,  9), cat: "Archie", count: 1 },
  { id: "seed_2023_05", timestamp: d(2023, 12, 15), cat: "Archie", count: 1 },
  { id: "seed_2023_06", timestamp: d(2023, 12, 29), cat: "Archie", count: 1 },

  // ── 2024 ────────────────────────────────────
  { id: "seed_2024_01", timestamp: d(2024,  1,  4), cat: "Archie", count: 1 },
  { id: "seed_2024_02", timestamp: d(2024,  1, 31), cat: "Archie", count: 1 },
  { id: "seed_2024_03", timestamp: d(2024,  2, 13), cat: "Archie", count: 2 },
  { id: "seed_2024_04", timestamp: d(2024,  2, 16), cat: "Archie", count: 1 },
  { id: "seed_2024_05", timestamp: d(2024,  2, 24), cat: "Archie", count: 1 },
  { id: "seed_2024_06", timestamp: d(2024,  3, 12), cat: "Kevin",  count: 1, note: "small one" },
  { id: "seed_2024_07", timestamp: d(2024,  3, 17), cat: "Archie", count: 1, note: "small one" },
  { id: "seed_2024_08", timestamp: d(2024,  3, 17) + 1, cat: "Kevin",  count: 2, note: "big ones" },
  { id: "seed_2024_09", timestamp: d(2024,  3, 29), cat: "Archie", count: 1 },
  { id: "seed_2024_10", timestamp: d(2024,  4,  5), cat: "Kevin",  count: 1 },
  { id: "seed_2024_11", timestamp: d(2024,  4, 14), cat: "Kevin",  count: 1 },
  { id: "seed_2024_12", timestamp: d(2024,  4, 14) + 1, cat: "Archie", count: 1 },
  { id: "seed_2024_13", timestamp: d(2024,  4, 28), cat: "Archie", count: 1, note: "found in buns hair" },
  { id: "seed_2024_14", timestamp: d(2024,  6,  2), cat: "Archie", count: 1, note: "found on couch" },
  { id: "seed_2024_15", timestamp: d(2024,  6,  5), cat: "Kevin",  count: 1 },
  { id: "seed_2024_16", timestamp: d(2024,  6, 10), cat: "Archie", count: 1 },
  { id: "seed_2024_17", timestamp: d(2024,  6, 17), cat: "Archie", count: 1 },
  { id: "seed_2024_18", timestamp: d(2024,  6, 25), cat: "Archie", count: 1 },
  { id: "seed_2024_19", timestamp: d(2024,  7,  7), cat: "Kevin",  count: 1 },
  { id: "seed_2024_20", timestamp: d(2024,  9,  5), cat: "Archie", count: 1 },
  { id: "seed_2024_21", timestamp: d(2024,  9, 17), cat: "Kevin",  count: 1 },
  { id: "seed_2024_22", timestamp: d(2024, 10, 18), cat: "Archie", count: 1 },
  { id: "seed_2024_23", timestamp: d(2024, 10, 19), cat: "Archie", count: 1 },
  { id: "seed_2024_24", timestamp: d(2024, 10, 27), cat: "Archie", count: 1 },
  { id: "seed_2024_25", timestamp: d(2024, 11, 27), cat: "Archie", count: 1 },
  { id: "seed_2024_26", timestamp: d(2024, 12,  1), cat: "Archie", count: 1 },
  { id: "seed_2024_27", timestamp: d(2024, 12,  6), cat: "Archie", count: 2 },
  { id: "seed_2024_28", timestamp: d(2024, 12,  7), cat: "Archie", count: 2 },
  { id: "seed_2024_29", timestamp: d(2024, 12, 28), cat: "Kevin",  count: 1 },

  // ── 2025 ────────────────────────────────────
  { id: "seed_2025_01", timestamp: d(2025,  1, 10), cat: "Archie", count: 1 },
  { id: "seed_2025_02", timestamp: d(2025,  1, 12), cat: "Archie", count: 1 },
  { id: "seed_2025_03", timestamp: d(2025,  2,  2), cat: "Kevin",  count: 1 },
  { id: "seed_2025_04", timestamp: d(2025,  2, 10), cat: "Kevin",  count: 1 },
  { id: "seed_2025_05", timestamp: d(2025,  2, 23), cat: "Archie", count: 1 },   // Archibald
  { id: "seed_2025_06", timestamp: d(2025,  3,  1), cat: "Kevin",  count: 1 },
  { id: "seed_2025_07", timestamp: d(2025,  3,  2), cat: "Archie", count: 1 },
  { id: "seed_2025_08", timestamp: d(2025,  3,  9), cat: "Archie", count: 1 },
  { id: "seed_2025_09", timestamp: d(2025,  3, 18), cat: "Archie", count: 1 },
  { id: "seed_2025_10", timestamp: d(2025,  4, 11), cat: "Archie", count: 1 },
  { id: "seed_2025_11", timestamp: d(2025,  4, 13), cat: "Archie", count: 1 },
  { id: "seed_2025_12", timestamp: d(2025,  4, 28), cat: "Archie", count: 1 },
  { id: "seed_2025_13", timestamp: d(2025,  5,  3), cat: "Kevin",  count: 1 },
  { id: "seed_2025_14", timestamp: d(2025,  5,  9), cat: "Kevin",  count: 1, note: "small" },
  { id: "seed_2025_15", timestamp: d(2025,  5, 12), cat: "Archie", count: 1 },
  { id: "seed_2025_16", timestamp: d(2025,  5, 24), cat: "Archie", count: 1 },
  { id: "seed_2025_17", timestamp: d(2025,  7, 11), cat: "Archie", count: 1 },
  { id: "seed_2025_18", timestamp: d(2025,  7, 15), cat: "Kevin",  count: 1 },   // Kevy Kake
  { id: "seed_2025_19", timestamp: d(2025,  7, 17), cat: "Archie", count: 1 },
  { id: "seed_2025_20", timestamp: d(2025,  7, 21), cat: "Archie", count: 1 },
  { id: "seed_2025_21", timestamp: d(2025,  7, 24), cat: "Kevin",  count: 1 },
  { id: "seed_2025_22", timestamp: d(2025,  8, 15), cat: "Kevin",  count: 1 },
  { id: "seed_2025_23", timestamp: d(2025,  8, 17), cat: "Kevin",  count: 1 },
  { id: "seed_2025_24", timestamp: d(2025,  9, 26), cat: "Kevin",  count: 1 },
  { id: "seed_2025_25", timestamp: d(2025, 10, 10),     cat: "Archie", count: 1 },
  { id: "seed_2025_26", timestamp: d(2025, 10, 10) + 1, cat: "Archie", count: 1 },
  { id: "seed_2025_27", timestamp: d(2025, 10, 10) + 2, cat: "Kevin",  count: 1 },
  { id: "seed_2025_28", timestamp: d(2025, 10, 10) + 3, cat: "Kevin",  count: 1 },
  { id: "seed_2025_29", timestamp: d(2025, 11, 26), cat: "Archie", count: 1 },
  { id: "seed_2025_30", timestamp: d(2025, 12, 14), cat: "Archie", count: 2 },   // 2x

  // ── 2026 ────────────────────────────────────
  { id: "seed_2026_01", timestamp: d(2026,  1, 16), cat: "Kevin",  count: 1 },
  { id: "seed_2026_02", timestamp: d(2026,  1, 18), cat: "Archie", count: 1 },
  { id: "seed_2026_03", timestamp: d(2026,  1, 31),     cat: "Archie", count: 2 },
  { id: "seed_2026_04", timestamp: d(2026,  1, 31) + 1, cat: "Kevin",  count: 1 },
];

/** Helper: make a UTC midnight timestamp for a given year/month/day */
function d(year, month, day) {
  return Date.UTC(year, month - 1, day);
}

// ──────────────────────────────────────────────
//  APP STATE
// ──────────────────────────────────────────────

let entries = [];      // in-memory array of whisker entries (sorted desc)
let deleteTarget = null; // id pending delete confirmation

// ──────────────────────────────────────────────
//  LOCAL STORAGE HELPERS
// ──────────────────────────────────────────────

function lsLoadEntries() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch (_) { return []; }
}

function lsSaveEntries(arr) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("[WhiskerCache] localStorage write failed:", e);
  }
}

function lsLoadDeleted() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_DELETED) || "[]"));
  } catch (_) { return new Set(); }
}

function lsMarkDeleted(id) {
  const s = lsLoadDeleted();
  s.add(id);
  try {
    localStorage.setItem(LS_DELETED, JSON.stringify([...s]));
  } catch (_) {}
}

// ──────────────────────────────────────────────
//  SEED DATA
// ──────────────────────────────────────────────

function maybeSeed() {
  if (localStorage.getItem(LS_SEEDED)) return; // already done

  const existing = lsLoadEntries();
  const existingIds = new Set(existing.map((e) => e.id));

  // Merge seed entries that aren't already present
  const toAdd = SEED_ENTRIES.filter((e) => !existingIds.has(e.id));
  const merged = [...existing, ...toAdd];
  lsSaveEntries(merged);
  localStorage.setItem(LS_SEEDED, "1");

  console.info(`[WhiskerCache] Seeded ${toAdd.length} entries.`);

  // Push seed data to Firestore in background (don't await)
  toAdd.forEach((e) => window.WhiskerFirebase.save(e));
}

// ──────────────────────────────────────────────
//  DEDUPLICATION & MERGE
// ──────────────────────────────────────────────

/**
 * Merge local + remote arrays, deduplicate by id,
 * filter out tombstoned (deleted) ids, sort descending by timestamp.
 */
function mergeEntries(local, remote) {
  const deleted = lsLoadDeleted();
  const map = new Map();

  [...local, ...remote].forEach((e) => {
    if (!deleted.has(e.id)) {
      map.set(e.id, e); // remote overwrites local if same id
    }
  });

  return [...map.values()].sort((a, b) => b.timestamp - a.timestamp);
}

// ──────────────────────────────────────────────
//  CRUD
// ──────────────────────────────────────────────

function addEntry(cat, count, note) {
  const entry = {
    id:        `wc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    cat,
    count,
    note:      note || null,
  };

  // Write locally first
  const local = lsLoadEntries();
  local.push(entry);
  lsSaveEntries(local);

  // Sync to Firestore in background
  window.WhiskerFirebase.save(entry);

  // Update in-memory state
  entries = mergeEntries(local, []);
  renderAll();

  return entry;
}

function deleteEntry(id) {
  // Tombstone locally
  lsMarkDeleted(id);

  // Remove from localStorage entries
  const local = lsLoadEntries().filter((e) => e.id !== id);
  lsSaveEntries(local);

  // Remove from Firestore
  window.WhiskerFirebase.remove(id);

  // Update in-memory state
  entries = entries.filter((e) => e.id !== id);
  renderAll();
}

// ──────────────────────────────────────────────
//  RENDER
// ──────────────────────────────────────────────

function renderAll() {
  renderCards();
  renderLastFind();
  renderHistory();
  renderStats();
}

/** Dashboard cards */
function renderCards() {
  let kevinTotal = 0;
  let archieTotal = 0;

  entries.forEach((e) => {
    if (e.cat === "Kevin") kevinTotal += e.count;
    else archieTotal += e.count;
  });

  const total = kevinTotal + archieTotal;

  animateCount("kevinCount",  kevinTotal);
  animateCount("archieCount", archieTotal);
  animateCount("totalCount",  total);
}

/** Animate a number counting up (simple) */
function animateCount(elId, target) {
  const el = document.getElementById(elId);
  if (!el) return;

  const current = parseInt(el.textContent, 10) || 0;
  if (current === target) return;

  // Simple snap if large diff (initial load)
  if (Math.abs(target - current) > 20) {
    el.textContent = target;
    return;
  }

  let frame = current;
  const step = target > current ? 1 : -1;
  const tick = () => {
    frame += step;
    el.textContent = frame;
    if (frame !== target) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** "Latest find" line */
function renderLastFind() {
  const container = document.getElementById("lastFind");
  const textEl    = document.getElementById("lastFindText");
  if (!entries.length) {
    container.style.display = "none";
    return;
  }
  const latest = entries[0];
  const date   = formatDateShort(latest.timestamp);
  const icon   = latest.cat === "Kevin" ? "🐈‍⬛" : "🐈";
  const note   = latest.note ? ` · "${latest.note}"` : "";
  textEl.textContent = `${icon} ${latest.cat} · ${date}${note}`;
  container.style.display = "flex";
}

/** History view — grouped by date */
function renderHistory() {
  const container = document.getElementById("historyList");
  container.innerHTML = "";

  if (!entries.length) {
    container.innerHTML = '<div class="empty-state">No whiskers logged yet. 🐱</div>';
    return;
  }

  // Group by YYYY-MM-DD
  const groups = new Map();
  entries.forEach((e) => {
    const key = formatDateKey(e.timestamp);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  });

  groups.forEach((groupEntries, dateKey) => {
    const group = document.createElement("div");
    group.className = "date-group";

    const label = document.createElement("div");
    label.className = "date-group-label";
    label.textContent = formatDateFull(groupEntries[0].timestamp);
    group.appendChild(label);

    groupEntries.forEach((e) => {
      const row = document.createElement("div");
      row.className = "history-entry";
      row.dataset.id = e.id;

      const icon = e.cat === "Kevin" ? "🐈‍⬛" : "🐈";
      const countLabel = e.count === 1 ? "1 whisker" : `${e.count} whiskers`;
      const nameClass  = e.cat === "Kevin" ? "kevin" : "archie";

      row.innerHTML = `
        <div class="entry-cat-icon">${icon}</div>
        <div class="entry-body">
          <div class="entry-cat-name ${nameClass}">${e.cat}</div>
          <div class="entry-count">${countLabel}</div>
          ${e.note ? `<div class="entry-note">${escapeHtml(e.note)}</div>` : ""}
        </div>
        <button class="entry-delete" data-id="${e.id}" aria-label="Delete entry">🗑</button>
      `;

      group.appendChild(row);
    });

    container.appendChild(group);
  });

  // Delegate delete clicks
  container.addEventListener("click", (evt) => {
    const btn = evt.target.closest(".entry-delete");
    if (btn) openDeleteModal(btn.dataset.id);
  });
}

/** Stats view */
function renderStats() {
  const container = document.getElementById("statsContent");
  if (!entries.length) {
    container.innerHTML = '<div class="empty-state">Stats will appear once you log some whiskers. 🐾</div>';
    return;
  }

  let kevinTotal  = 0;
  let archieTotal = 0;

  // Yearly totals
  const yearlyMap = new Map();
  // Monthly totals (YYYY-MM → count)
  const monthlyMap = new Map();

  entries.forEach((e) => {
    if (e.cat === "Kevin") kevinTotal += e.count;
    else archieTotal += e.count;

    const date = new Date(e.timestamp);
    const year = date.getUTCFullYear();
    const ym   = `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

    yearlyMap.set(year, (yearlyMap.get(year) || 0) + e.count);
    monthlyMap.set(ym,  (monthlyMap.get(ym)  || 0) + e.count);
  });

  const total = kevinTotal + archieTotal;
  const kevinPct  = total ? Math.round((kevinTotal  / total) * 100) : 50;
  const archiePct = 100 - kevinPct;

  // Sort years ascending
  const years  = [...yearlyMap.entries()].sort((a, b) => a[0] - b[0]);
  // Recent 12 months, ascending
  const months = [...monthlyMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  const maxMonth = Math.max(...months.map((m) => m[1]), 1);
  const maxYear  = Math.max(...years.map((y)  => y[1]), 1);

  container.innerHTML = `
    <!-- Total + Cats comparison -->
    <div class="stat-block">
      <div class="stat-block-title">All-time totals</div>
      <div class="stat-big">${total}</div>
      <div class="stat-big-label">whiskers collected</div>

      <div style="margin-top: 20px; display:flex; flex-direction:column; gap:10px;">
        <!-- Kevin bar -->
        <div class="compare-bar-wrap">
          <div class="compare-bar-label">
            <span>🐈‍⬛ Kevin</span>
            <span>${kevinTotal}</span>
          </div>
          <div class="compare-bar-track">
            <div class="compare-bar-fill kevin" style="width:${kevinPct}%"></div>
          </div>
        </div>
        <!-- Archie bar -->
        <div class="compare-bar-wrap">
          <div class="compare-bar-label">
            <span>🐈 Archie</span>
            <span>${archieTotal}</span>
          </div>
          <div class="compare-bar-track">
            <div class="compare-bar-fill archie" style="width:${archiePct}%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Yearly totals -->
    <div class="stat-block">
      <div class="stat-block-title">By year</div>
      <div class="bar-chart">
        ${years.map(([year, count]) => `
          <div class="bar-row">
            <div class="bar-row-label">${year}</div>
            <div class="bar-row-track">
              <div class="bar-row-fill" style="width:${Math.round((count / maxYear) * 100)}%"></div>
            </div>
            <div class="bar-row-count">${count}</div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- Monthly totals (last 12 months) -->
    <div class="stat-block">
      <div class="stat-block-title">Recent months</div>
      <div class="bar-chart">
        ${months.map(([ym, count]) => {
          const [y, m] = ym.split("-");
          const label  = new Date(Number(y), Number(m) - 1).toLocaleString("en-US", { month: "short", year: "2-digit" });
          return `
          <div class="bar-row">
            <div class="bar-row-label">${label}</div>
            <div class="bar-row-track">
              <div class="bar-row-fill" style="width:${Math.round((count / maxMonth) * 100)}%"></div>
            </div>
            <div class="bar-row-count">${count}</div>
          </div>`;
        }).join("")}
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────
//  MODAL — LOG WHISKER
// ──────────────────────────────────────────────

let modalCount    = 1;
let noteVisible   = false;

function openLogModal() {
  // Reset form
  modalCount  = 1;
  noteVisible = false;
  document.getElementById("countValue").textContent = "1";
  document.getElementById("noteInput").value = "";
  document.getElementById("noteField").style.display = "none";
  document.getElementById("noteToggleLabel").textContent = "+ add a note";

  // Default cat: Archie
  document.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cat === "Archie");
  });

  document.getElementById("modalBackdrop").classList.add("open");
  document.getElementById("modalBackdrop").removeAttribute("aria-hidden");
}

function closeLogModal() {
  document.getElementById("modalBackdrop").classList.remove("open");
  document.getElementById("modalBackdrop").setAttribute("aria-hidden", "true");
}

function getSelectedCat() {
  const btn = document.querySelector(".cat-btn.active");
  return btn ? btn.dataset.cat : "Archie";
}

function saveFromModal() {
  const cat   = getSelectedCat();
  const count = modalCount;
  const note  = noteVisible ? document.getElementById("noteInput").value.trim() : "";

  addEntry(cat, count, note || null);
  closeLogModal();
  showToast(CONFIRMS[Math.floor(Math.random() * CONFIRMS.length)]);
}

// ──────────────────────────────────────────────
//  MODAL — DELETE CONFIRM
// ──────────────────────────────────────────────

function openDeleteModal(id) {
  deleteTarget = id;
  document.getElementById("deleteBackdrop").classList.add("open");
  document.getElementById("deleteBackdrop").removeAttribute("aria-hidden");
}

function closeDeleteModal() {
  deleteTarget = null;
  document.getElementById("deleteBackdrop").classList.remove("open");
  document.getElementById("deleteBackdrop").setAttribute("aria-hidden", "true");
}

// ──────────────────────────────────────────────
//  TOAST
// ──────────────────────────────────────────────

let toastTimer = null;

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

// ──────────────────────────────────────────────
//  NAVIGATION
// ──────────────────────────────────────────────

function showView(viewId) {
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("active", v.id === viewId);
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });
}

// ──────────────────────────────────────────────
//  DATE HELPERS
// ──────────────────────────────────────────────

/** "YYYY-MM-DD" key for grouping */
function formatDateKey(ts) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** "December 14, 2025" */
function formatDateFull(ts) {
  return new Date(ts).toLocaleDateString("en-US", {
    year:  "numeric",
    month: "long",
    day:   "numeric",
    timeZone: "UTC",
  });
}

/** "Dec 14, 2025" */
function formatDateShort(ts) {
  return new Date(ts).toLocaleDateString("en-US", {
    year:  "numeric",
    month: "short",
    day:   "numeric",
    timeZone: "UTC",
  });
}

function pad(n) { return String(n).padStart(2, "0"); }

/** Basic HTML escape to prevent XSS in notes */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ──────────────────────────────────────────────
//  FIREBASE SYNC CALLBACK
// ──────────────────────────────────────────────

/**
 * Called when Firestore sends a snapshot update.
 * Merges remote data with local, persists to localStorage, re-renders.
 */
function onFirestoreUpdate(remoteEntries) {
  const local = lsLoadEntries();
  entries = mergeEntries(local, remoteEntries);
  lsSaveEntries(entries);
  renderAll();
}

// ──────────────────────────────────────────────
//  BOOT
// ──────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  // 1. Init Firebase
  window.WhiskerFirebase.init();

  // 2. Seed data on first load
  maybeSeed();

  // 3. Load local entries
  entries = mergeEntries(lsLoadEntries(), []);

  // 4. Render immediately from local data
  renderAll();

  // 5. Start Firestore real-time listener
  window.WhiskerFirebase.listen(onFirestoreUpdate);

  // ── NAV ────────────────────────────────────
  document.getElementById("bottomNav").addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (btn) showView(btn.dataset.view);
  });

  // ── FAB ────────────────────────────────────
  document.getElementById("fabLog").addEventListener("click", openLogModal);

  // ── LOG MODAL ──────────────────────────────
  document.getElementById("modalClose").addEventListener("click", closeLogModal);

  document.getElementById("modalBackdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeLogModal();
  });

  // Cat selector
  document.getElementById("catSelector").addEventListener("click", (e) => {
    const btn = e.target.closest(".cat-btn");
    if (!btn) return;
    document.querySelectorAll(".cat-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });

  // Count stepper
  document.getElementById("countMinus").addEventListener("click", () => {
    if (modalCount > 1) {
      modalCount--;
      document.getElementById("countValue").textContent = modalCount;
    }
  });

  document.getElementById("countPlus").addEventListener("click", () => {
    if (modalCount < 20) {
      modalCount++;
      document.getElementById("countValue").textContent = modalCount;
    }
  });

  // Note toggle
  document.getElementById("noteToggle").addEventListener("click", () => {
    noteVisible = !noteVisible;
    document.getElementById("noteField").style.display = noteVisible ? "block" : "none";
    document.getElementById("noteToggleLabel").textContent = noteVisible ? "− hide note" : "+ add a note";
    if (noteVisible) document.getElementById("noteInput").focus();
  });

  // Save
  document.getElementById("btnSave").addEventListener("click", saveFromModal);

  // Allow Enter key in note field to save
  document.getElementById("noteInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveFromModal();
  });

  // ── DELETE MODAL ────────────────────────────
  document.getElementById("deleteBackdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeDeleteModal();
  });

  document.getElementById("btnDeleteCancel").addEventListener("click", closeDeleteModal);

  document.getElementById("btnDeleteConfirm").addEventListener("click", () => {
    if (deleteTarget) {
      // Animate the row out
      const row = document.querySelector(`.history-entry[data-id="${deleteTarget}"]`);
      if (row) row.classList.add("deleting");

      const id = deleteTarget;
      closeDeleteModal();
      setTimeout(() => deleteEntry(id), 200);
    }
  });

  // ── KEYBOARD ESC ─────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLogModal();
      closeDeleteModal();
    }
  });

});
