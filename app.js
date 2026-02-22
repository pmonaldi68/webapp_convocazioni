const BASE_PUB_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbVMTTTiCPOY3HFMNnN2XogbHSiFPr_7v2Q1v5ISzgrHt5xNXMgxJfpFIOiTuZtrZ0fsarubb5aGj6/pub";
const BASE_DOC_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbVMTTTiCPOY3HFMNnN2XogbHSiFPr_7v2Q1v5ISzgrHt5xNXMgxJfpFIOiTuZtrZ0fsarubb5aGj6";

const SOCIETA = {
  ALBA: "ALBACYNTHIA",
  ACADEMY: "ACADEMY CYNTHIA GENZANO"
};

const CATEGORIA_SOCIETA_OVERRIDES = {
  UNDER14I: SOCIETA.ALBA,
  UNDER14F: SOCIETA.ACADEMY
};

const EXTRA_CATEGORY_RULES = {
  UNDER14I: [],
  UNDER14F: [],
  UNDER15F: ["UNDER14F"],
  UNDER16D: ["UNDER15F"],
  UNDER17E: ["UNDER16D"]
};

const EXCLUDED_CHAMPIONSHIPS = new Set(["SECONDA CATEGORIA"]);
const MAX_CONVOCATI = 20;

const SOURCES = {
  gare: `${BASE_PUB_URL}?output=csv`,
  squadre: `${BASE_PUB_URL}?gid=698820797&single=true&output=csv`,
  calciatori: [
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-Ydr4imn_k8Hb1lhSIpBOLJ7UEaBk9wR9W03z9eiXosaDoJH_jmvUigsu5ltbUafRoW5ZKfG3Z-lG/pub?gid=813287810&single=true&output=csv",
    `${BASE_DOC_URL}/gviz/tq?tqx=out:csv&sheet=CALCIATORI`
  ]
};

const state = {
  gare: [],
  calciatori: [],
  mappaCategoriaSocieta: new Map(),
  societa: "",
  campionato: "",
  currentMatch: null,
  selectedPlayers: new Set()
};

const societaSelect = document.getElementById("societa-select");
const campionatoSelect = document.getElementById("campionato-select");
const statusNode = document.getElementById("status");
const playersMainNode = document.getElementById("players-main");
const playersLoansNode = document.getElementById("players-loans");
const loansSectionNode = document.getElementById("loans-section");
const playerCounter = document.getElementById("players-counter");
const convocazioneTimeInput = document.getElementById("f-convocazione");
const messageOutput = document.getElementById("message-output");

const fields = {
  data: document.getElementById("f-data"),
  ora: document.getElementById("f-ora"),
  campionato: document.getElementById("f-campionato"),
  girone: document.getElementById("f-girone"),
  gara: document.getElementById("f-gara"),
  casa: document.getElementById("f-casa"),
  ospite: document.getElementById("f-ospite"),
  campo: document.getElementById("f-campo"),
  maps: document.getElementById("f-maps")
};

async function fetchFirstAvailableText(sources) {
  for (const url of (Array.isArray(sources) ? sources : [sources])) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const text = await response.text();
      if (text?.trim()) return text;
    } catch (_) {}
  }
  throw new Error("Nessuna fonte dati disponibile");
}

function normalizeCategory(value) {
  return (value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? "#dc2626" : "#6b7280";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }

  const [headers = [], ...records] = rows;
  return records.map((record) => {
    const obj = { __values: record };
    headers.forEach((header, index) => {
      obj[(header || `col_${index}`).trim()] = record[index] || "";
    });
    return obj;
  });
}

function findColumn(row, keys) {
  return Object.keys(row || {}).find((h) => keys.some((k) => h.toLowerCase().includes(k)));
}

function extract(row, keys) {
  const col = findColumn(row, keys);
  return col ? (row[col] || "").replace(/\s+/g, " ").trim() : "";
}

function isExcludedCampionato(campionato) {
  return EXCLUDED_CHAMPIONSHIPS.has((campionato || "").replace(/\s+/g, " ").trim().toUpperCase());
}

function extractCampoEsteso(row) {
  const fromHeader = extract(row, ["campo esteso", "campo", "indirizzo"]);
  const fromColumnJ = ((row.__values || [])[9] || "").replace(/\s+/g, " ").trim();
  return fromColumnJ || fromHeader;
}

function parseItalianDate(dateStr) {
  const m = (dateStr || "").trim().match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (!m) return null;
  const d = new Date(Number(m[3].length === 2 ? `20${m[3]}` : m[3]), Number(m[2]) - 1, Number(m[1]));
  d.setHours(0, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeGare(rows) {
  return rows
    .map((row) => ({
      data: extract(row, ["data"]),
      ora: extract(row, ["ora"]),
      campionato: extract(row, ["campionato"]),
      girone: extract(row, ["girone"]),
      gara: extract(row, ["gara", "incontro"]),
      squadraCasa: extract(row, ["squadra casa", "casa"]),
      squadraOspite: extract(row, ["squadra ospite", "ospite"]),
      campoEsteso: extractCampoEsteso(row),
      lnkMaps: extract(row, ["lnk maps", "maps", "google"]),
      categoria: extract(row, ["categoria"]),
      societa: extract(row, ["societ", "societa"])
    }))
    .filter((row) => (row.data || row.campionato || row.categoria) && !isExcludedCampionato(row.campionato));
}

function normalizeSocietaName(value) {
  const cleaned = (value || "").replace(/\s+/g, " ").trim().toUpperCase();
  if (cleaned.includes("ALBACYNTHIA")) return SOCIETA.ALBA;
  if (cleaned.includes("ACADEMY") || cleaned.includes("CYNTHIA GENZANO")) return SOCIETA.ACADEMY;
  return "";
}

function buildCategoriaSocietaMap(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const categoria = normalizeCategory(extract(row, ["categoria"]));
    const societa = normalizeSocietaName(extract(row, ["societ", "societa"]));
    if (categoria && societa) map.set(categoria, societa);
  });
  return map;
}

function resolveSocietaForMatch(match) {
  const cat = normalizeCategory(match.categoria);
  if (CATEGORIA_SOCIETA_OVERRIDES[cat]) return CATEGORIA_SOCIETA_OVERRIDES[cat];
  return normalizeSocietaName(match.societa) || state.mappaCategoriaSocieta.get(cat) || "";
}

function normalizeCalciatori(rows) {
  return rows
    .map((row) => ({
      nome: extract(row, ["nome", "giocatore", "calciatore", "cognome"]),
      categoria: normalizeCategory(extract(row, ["categoria"]))
    }))
    .filter((row) => row.nome && row.categoria);
}

function getEligibleCategories(baseCategory, includeLoans) {
  const base = normalizeCategory(baseCategory);
  const extra = includeLoans ? (EXTRA_CATEGORY_RULES[base] || []) : [];
  return [base, ...extra];
}

function getEligiblePlayers(baseCategory, includeLoans) {
  const allowed = new Set(getEligibleCategories(baseCategory, includeLoans));
  return state.calciatori
    .filter((p) => [...allowed].some((cat) => p.categoria === cat || p.categoria.includes(cat) || cat.includes(p.categoria)))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

function updateCounter() {
  playerCounter.textContent = `${state.selectedPlayers.size}/${MAX_CONVOCATI}`;
}

function formatTimeForInput(oraRaw) {
  const match = (oraRaw || "").match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return "";
  const hours = String(Math.min(23, Number(match[1]))).padStart(2, "0");
  const mins = String(Math.min(59, Number(match[2]))).padStart(2, "0");
  return `${hours}:${mins}`;
}

function minus75Minutes(timeValue) {
  const m = (timeValue || "").match(/^(\d{2}):(\d{2})$/);
  if (!m) return "";
  const total = Number(m[1]) * 60 + Number(m[2]);
  const adjusted = (total - 75 + 24 * 60) % (24 * 60);
  const h = String(Math.floor(adjusted / 60)).padStart(2, "0");
  const mm = String(adjusted % 60).padStart(2, "0");
  return `${h}:${mm}`;
}

function getSelectedPlayers() {
  return [...state.selectedPlayers].sort((a, b) => a.localeCompare(b, "it"));
}

function generateMessage() {
  const selected = getSelectedPlayers();
  const convTime = convocazioneTimeInput.value || "--:--";
  const maps = fields.maps.value || "-";
  const playersBlock = selected.length
    ? selected.map((name, idx) => `${idx + 1}. ${name}`).join("\n")
    : "Nessun giocatore selezionato";

  messageOutput.value = [
    "CONVOCAZIONE GARA",
    `DATA: ${fields.data.value || "-"}`,
    `ORA: ${fields.ora.value || "-"}`,
    `ORA CONVOCAZIONE: ${convTime}`,
    `CAMPIONATO: ${fields.campionato.value || "-"}`,
    `GIRONE: ${fields.girone.value || "-"}`,
    `GARA: ${fields.gara.value || "-"}`,
    `SQUADRA CASA: ${fields.casa.value || "-"}`,
    `SQUADRA OSPITE: ${fields.ospite.value || "-"}`,
    `CAMPO ESTESO: ${fields.campo.value || "-"}`,
    `LNK MAPS: ${maps}`,
    "",
    "CONVOCATI:",
    playersBlock
  ].join("\n");
}

function createRoleIcon(label, icon, name, playerName) {
  const wrapper = document.createElement("label");
  wrapper.className = "role-tag";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = `${name}-${playerName}`;
  const text = document.createElement("span");
  text.textContent = `${icon} ${label}`;
  wrapper.append(input, text);
  return wrapper;
}

function renderPlayerRow(player, container) {
  const item = document.createElement("div");
  item.className = "player-item";

  const select = document.createElement("input");
  select.type = "checkbox";
  select.value = player.nome;
  select.className = "convocato-checkbox";
  select.checked = state.selectedPlayers.has(player.nome);

  const name = document.createElement("span");
  name.className = "player-name";
  name.textContent = player.nome;

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = player.categoria;

  const roles = document.createElement("div");
  roles.className = "roles";
  roles.append(
    createRoleIcon("Capitano", "🅲", "cap", player.nome),
    createRoleIcon("Vice", "🆅", "vice", player.nome),
    createRoleIcon("Guardalinee", "🚩", "guard", player.nome)
  );

  select.addEventListener("change", () => {
    if (select.checked && state.selectedPlayers.size >= MAX_CONVOCATI) {
      select.checked = false;
      setStatus(`Puoi convocare al massimo ${MAX_CONVOCATI} giocatori.`, true);
      return;
    }

    if (select.checked) state.selectedPlayers.add(player.nome);
    else state.selectedPlayers.delete(player.nome);
    updateCounter();
    generateMessage();
  });

  item.append(select, name, badge, roles);
  container.append(item);
}

function renderPlayers(baseCategory, includeLoans) {
  const targetNode = includeLoans ? playersLoansNode : playersMainNode;
  targetNode.innerHTML = "";

  const players = getEligiblePlayers(baseCategory, includeLoans);
  const baseNorm = normalizeCategory(baseCategory);
  const filtered = includeLoans
    ? players.filter((p) => p.categoria !== baseNorm)
    : players.filter((p) => p.categoria === baseNorm || p.categoria.includes(baseNorm) || baseNorm.includes(p.categoria));

  if (!filtered.length) {
    targetNode.innerHTML = `<p class="hint">Nessun giocatore ${includeLoans ? "in prestito" : "della categoria principale"}.</p>`;
    return;
  }

  filtered.forEach((player) => renderPlayerRow(player, targetNode));
}

function clearSelectedPlayers() {
  [...document.querySelectorAll(".convocato-checkbox")].forEach((cb) => {
    cb.checked = false;
  });
  state.selectedPlayers.clear();
  updateCounter();
  generateMessage();
}

function quickSelect(limit) {
  const checkboxes = [...document.querySelectorAll(".convocato-checkbox")];
  state.selectedPlayers.clear();
  checkboxes.forEach((cb, idx) => {
    cb.checked = idx < limit;
    if (cb.checked) state.selectedPlayers.add(cb.value);
  });
  updateCounter();
  generateMessage();
}

function clearFields() {
  Object.values(fields).forEach((f) => {
    f.value = "";
  });
  convocazioneTimeInput.value = "";
  messageOutput.value = "";
  playersMainNode.innerHTML = '<p class="hint">Seleziona campionato per vedere i giocatori.</p>';
  playersLoansNode.innerHTML = "";
  loansSectionNode.classList.add("hidden");
  state.selectedPlayers.clear();
  updateCounter();
}

function campionatiPerSocieta(societa) {
  return [
    ...new Set(
      state.gare
        .filter((match) => resolveSocietaForMatch(match) === societa && match.campionato)
        .map((match) => match.campionato)
    )
  ].sort((a, b) => a.localeCompare(b, "it"));
}

function renderCampionati() {
  const campionati = state.societa ? campionatiPerSocieta(state.societa) : [];
  campionatoSelect.innerHTML = "";
  if (!state.societa) {
    campionatoSelect.innerHTML = "<option value=''>Seleziona prima la società</option>";
    return;
  }
  if (!campionati.length) {
    campionatoSelect.innerHTML = "<option value=''>Nessun campionato disponibile</option>";
    return;
  }
  campionatoSelect.innerHTML = "<option value=''>Seleziona campionato</option>";
  campionati.forEach((campionato) => {
    const option = document.createElement("option");
    option.value = campionato;
    option.textContent = campionato;
    campionatoSelect.append(option);
  });
}

function prossimaGara() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    state.gare
      .filter((match) => resolveSocietaForMatch(match) === state.societa)
      .filter((match) => !state.campionato || match.campionato === state.campionato)
      .map((match) => ({ match, dateObj: parseItalianDate(match.data) }))
      .filter((x) => x.dateObj && x.dateObj >= today)
      .sort((a, b) => a.dateObj - b.dateObj)[0]?.match || null
  );
}

function renderProssimaGara() {
  clearFields();
  if (!state.societa || !state.campionato) {
    setStatus("Seleziona società e campionato.");
    return;
  }

  const match = prossimaGara();
  state.currentMatch = match;
  if (!match) {
    setStatus("Nessuna prossima gara trovata per i filtri selezionati.", true);
    return;
  }

  fields.data.value = match.data;
  fields.ora.value = match.ora;
  fields.campionato.value = match.campionato;
  fields.girone.value = match.girone;
  fields.gara.value = match.gara;
  fields.casa.value = match.squadraCasa;
  fields.ospite.value = match.squadraOspite;
  fields.campo.value = match.campoEsteso;
  fields.maps.value = match.lnkMaps;

  const oraPartita = formatTimeForInput(match.ora);
  convocazioneTimeInput.value = minus75Minutes(oraPartita);

  renderPlayers(match.categoria, false);
  generateMessage();
  setStatus(`Prossima gara caricata (${match.categoria}).`);
}

async function loadData() {
  setStatus("Caricamento dati...");
  try {
    const [gareCsv, squadreCsv, calciatoriCsv] = await Promise.all([
      fetch(SOURCES.gare).then((r) => r.text()),
      fetch(SOURCES.squadre).then((r) => r.text()),
      fetchFirstAvailableText(SOURCES.calciatori)
    ]);

    state.gare = normalizeGare(parseCsv(gareCsv));
    state.calciatori = normalizeCalciatori(parseCsv(calciatoriCsv));
    state.mappaCategoriaSocieta = buildCategoriaSocietaMap(parseCsv(squadreCsv));

    renderCampionati();
    clearFields();
    setStatus(`Dati caricati: ${state.gare.length} gare, ${state.calciatori.length} calciatori.`);
  } catch (error) {
    console.error(error);
    setStatus("Errore nel caricamento dati.", true);
  }
}

societaSelect.addEventListener("change", (event) => {
  state.societa = event.target.value;
  state.campionato = "";
  renderCampionati();
  renderProssimaGara();
});

campionatoSelect.addEventListener("change", (event) => {
  state.campionato = event.target.value;
  renderProssimaGara();
});

convocazioneTimeInput.addEventListener("input", generateMessage);

document.getElementById("select-20").addEventListener("click", () => quickSelect(MAX_CONVOCATI));
document.getElementById("clear-selected").addEventListener("click", clearSelectedPlayers);
document.getElementById("load-loans").addEventListener("click", () => {
  if (!state.currentMatch) {
    setStatus("Seleziona prima una gara valida.", true);
    return;
  }

  loansSectionNode.classList.remove("hidden");
  renderPlayers(state.currentMatch.categoria, true);
  generateMessage();
});

document.getElementById("copy-message").addEventListener("click", async () => {
  if (!messageOutput.value.trim()) {
    setStatus("Nessun messaggio da copiare.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(messageOutput.value);
    setStatus("Messaggio copiato negli appunti.");
  } catch (_) {
    messageOutput.select();
    document.execCommand("copy");
    setStatus("Messaggio copiato negli appunti.");
  }
});

document.getElementById("share-whatsapp").addEventListener("click", () => {
  if (!messageOutput.value.trim()) {
    setStatus("Nessun messaggio da inviare.", true);
    return;
  }

  const encoded = encodeURIComponent(messageOutput.value);
  window.open(`https://wa.me/?text=${encoded}`, "_blank");
});

updateCounter();
loadData();
