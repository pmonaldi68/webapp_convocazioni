const BASE_PUB_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbVMTTTiCPOY3HFMNnN2XogbHSiFPr_7v2Q1v5ISzgrHt5xNXMgxJfpFIOiTuZtrZ0fsarubb5aGj6/pub";


const SOCIETA = {
  ALBA: "ALBACYNTHIA",
  ACADEMY: "ACADEMY CYNTHIA GENZANO"
};

const CATEGORIA_SOCIETA_OVERRIDES = {
  UNDER14I: SOCIETA.ALBA,
  UNDER14F: SOCIETA.ACADEMY
};

const SOURCES = {
  gare: `${BASE_PUB_URL}?output=csv`,
  squadre: `${BASE_PUB_URL}?gid=698820797&single=true&output=csv`,
  dirigenti: `${BASE_PUB_URL}?gid=0&single=true&output=csv`
};

const state = {
  gare: [],
  mappaCategoriaSocieta: new Map(),
  societa: "",
  campionato: ""
};

const societaSelect = document.getElementById("societa-select");
const campionatoSelect = document.getElementById("campionato-select");
const statusNode = document.getElementById("status");

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
    const obj = {};
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

function parseItalianDate(dateStr) {
  const raw = (dateStr || "").trim();
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  const year = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
  const d = new Date(year, month, day);
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
      campoEsteso: extract(row, ["campo esteso", "campo"]),
      lnkMaps: extract(row, ["lnk maps", "maps", "google"]),
      categoria: extract(row, ["categoria"]),
      societa: extract(row, ["societ", "societa"])
    }))
    .filter((row) => row.data || row.campionato || row.categoria);
}

function buildCategoriaSocietaMap(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const categoria = extract(row, ["categoria"]);
    const societa = extract(row, ["societ", "societa"]);
    if (categoria && societa) map.set(categoria.toLowerCase(), normalizeSocietaName(societa) || societa);
  });
  return map;
}

function normalizeSocietaName(value) {
  const cleaned = (value || "").replace(/\s+/g, " ").trim().toUpperCase();
  if (cleaned.includes("ALBACYNTHIA")) return SOCIETA.ALBA;
  if (cleaned.includes("ACADEMY") || cleaned.includes("CYNTHIA GENZANO")) return SOCIETA.ACADEMY;
  return "";
}

function inferSocietaFromCategoria(categoria) {
  const cat = (categoria || "").toUpperCase().replace(/\s+/g, "").trim();
  if (!cat) return "";
  if (cat.endsWith("I")) return SOCIETA.ALBA;
  if (cat.endsWith("F")) return SOCIETA.ACADEMY;
  return "";
}

function resolveSocietaForMatch(match) {
  const categoriaNorm = (match.categoria || "").toUpperCase().replace(/\s+/g, "").trim();

  if (categoriaNorm && CATEGORIA_SOCIETA_OVERRIDES[categoriaNorm]) {
    return CATEGORIA_SOCIETA_OVERRIDES[categoriaNorm];
  }

  const fromMatch = normalizeSocietaName(match.societa);
  if (fromMatch) return fromMatch;

  if (match.categoria) {
    const fromMap = normalizeSocietaName(state.mappaCategoriaSocieta.get(match.categoria.toLowerCase()) || "");
    if (fromMap) return fromMap;
  }

  return inferSocietaFromCategoria(match.categoria);
}

function clearFields() {
  Object.values(fields).forEach((f) => {
    f.value = "";
  });
}

function campionatiPerSocieta(societa) {
  const unique = new Set();
  state.gare.forEach((match) => {
    if (resolveSocietaForMatch(match) === societa && match.campionato) unique.add(match.campionato);
  });
  return [...unique].sort((a, b) => a.localeCompare(b, "it"));
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

  return state.gare
    .filter((match) => resolveSocietaForMatch(match) === state.societa)
    .filter((match) => !state.campionato || match.campionato === state.campionato)
    .map((match) => ({ match, dateObj: parseItalianDate(match.data) }))
    .filter((x) => x.dateObj && x.dateObj >= today)
    .sort((a, b) => a.dateObj - b.dateObj)[0]?.match;
}

function renderProssimaGara() {
  clearFields();

  if (!state.societa || !state.campionato) {
    setStatus("Seleziona società e campionato.");
    return;
  }

  const match = prossimaGara();
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

  setStatus("Prossima gara caricata automaticamente.");
}

async function loadData() {
  setStatus("Caricamento dati...");
  try {
    const [gareCsv, squadreCsv] = await Promise.all([
      fetch(SOURCES.gare).then((r) => r.text()),
      fetch(SOURCES.squadre).then((r) => r.text())
    ]);

    state.gare = normalizeGare(parseCsv(gareCsv));
    state.mappaCategoriaSocieta = buildCategoriaSocietaMap(parseCsv(squadreCsv));

    renderCampionati();
    clearFields();
    setStatus(`Dati caricati: ${state.gare.length} gare.`);
  } catch (error) {
    console.error(error);
    setStatus("Errore nel caricamento del foglio Google. Verifica pubblicazione e permessi.", true);
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

loadData();
