const SOURCES = {
  gare:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbVMTTTiCPOY3HFMNnN2XogbHSiFPr_7v2Q1v5ISzgrHt5xNXMgxJfpFIOiTuZtrZ0fsarubb5aGj6/pubhtml?gid=813287810&single=true",
  giocatori:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-Ydr4imn_k8Hb1lhSIpBOLJ7UEaBk9wR9W03z9eiXosaDoJH_jmvUigsu5ltbUafRoW5ZKfG3Z-lG/pubhtml?gid=813287810&single=true",
  staff:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQyO4UDX21aX-lSQUNFoD9hd5Xqnw_CLS5zlKscuP27edZTBKE_LW6zPqrKgYmFCgXPYKxQ7LcUUT8K/pubhtml?gid=0&single=true"
};

const state = {
  squadre: [],
  gare: [],
  giocatori: [],
  staff: [],
  selectedTeam: "",
  selectedMatch: null
};

const teamSelect = document.getElementById("team-select");
const matchSelect = document.getElementById("match-select");
const matchInfo = document.getElementById("match-info");
const playersList = document.getElementById("players-list");
const staffList = document.getElementById("staff-list");
const messageField = document.getElementById("message");
const statusNode = document.getElementById("status");

function toCsvUrl(pubHtmlUrl) {
  return pubHtmlUrl.includes("output=csv")
    ? pubHtmlUrl
    : `${pubHtmlUrl.replace("/pubhtml", "/pub")}&output=csv`;
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
      obj[header?.trim() || `col_${index}`] = record[index] || "";
    });
    return obj;
  });
}

function pickColumn(row, keywords) {
  const headers = Object.keys(row || {});
  return headers.find((header) =>
    keywords.some((keyword) => header.toLowerCase().includes(keyword))
  );
}

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.style.color = isError ? "#dc2626" : "#6b7280";
}

function matchLabel(match) {
  return `${match.data || "Data da definire"} • ${match.squadra || "Squadra"} vs ${match.avversario || "Avversario"}`;
}

function renderCheckboxes(container, items, type) {
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = "<p class='hint'>Nessun elemento disponibile.</p>";
    return;
  }

  items.forEach((item) => {
    const wrapper = document.createElement("label");
    wrapper.className = "checkbox-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.type = type;
    input.value = item.nome;

    const text = document.createElement("span");
    text.textContent = item.extra ? `${item.nome} (${item.extra})` : item.nome;

    wrapper.append(input, text);
    container.append(wrapper);
  });
}

function filterByTeam(items, team) {
  if (!team) return [];
  return items.filter((item) => !item.squadra || item.squadra.toLowerCase() === team.toLowerCase());
}

function refreshMatchesForTeam() {
  matchSelect.innerHTML = "";
  messageField.value = "";

  if (!state.selectedTeam) {
    matchSelect.innerHTML = "<option value=''>Seleziona prima una squadra</option>";
    state.selectedMatch = null;
    renderCheckboxes(playersList, [], "player");
    renderCheckboxes(staffList, [], "staff");
    matchInfo.textContent = "";
    return;
  }

  const filteredMatches = filterByTeam(state.gare, state.selectedTeam);

  if (!filteredMatches.length) {
    matchSelect.innerHTML = "<option value=''>Nessuna gara disponibile</option>";
    state.selectedMatch = null;
    renderCheckboxes(playersList, filterByTeam(state.giocatori, state.selectedTeam), "player");
    renderCheckboxes(staffList, filterByTeam(state.staff, state.selectedTeam), "staff");
    matchInfo.textContent = "Nessuna gara trovata per la squadra selezionata.";
    return;
  }

  filteredMatches.forEach((match, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = matchLabel(match);
    matchSelect.append(option);
  });

  state.selectedMatch = filteredMatches[0];
  refreshSelections();
}

function refreshSelections() {
  const match = state.selectedMatch;
  if (!state.selectedTeam) return;

  const players = filterByTeam(state.giocatori, state.selectedTeam);
  const staff = filterByTeam(state.staff, state.selectedTeam);

  renderCheckboxes(playersList, players, "player");
  renderCheckboxes(staffList, staff, "staff");

  matchInfo.textContent = match
    ? `📍 ${match.luogo || "Luogo da definire"} • 🕒 ${match.ora || "Orario da definire"}`
    : "Seleziona una gara.";
}

function selectedNames(type) {
  return [...document.querySelectorAll(`input[data-type='${type}']:checked`)].map((node) => node.value);
}

function generateMessage() {
  const match = state.selectedMatch;
  if (!state.selectedTeam) {
    setStatus("Seleziona prima una squadra.", true);
    return;
  }

  if (!match) {
    setStatus("Seleziona una gara.", true);
    return;
  }

  const players = selectedNames("player");
  const staff = selectedNames("staff");

  const message = [
    `📣 Convocazione ${state.selectedTeam}`,
    `📅 ${match.data || "Data da definire"} - 🕒 ${match.ora || "Orario da definire"}`,
    `⚽ ${match.avversario ? `Vs ${match.avversario}` : "Avversario da definire"}`,
    `📍 ${match.luogo || "Luogo da definire"}`,
    "",
    `Giocatori convocati (${players.length}):`,
    players.length ? players.map((name) => `- ${name}`).join("\n") : "- Da confermare",
    "",
    `Staff (${staff.length}):`,
    staff.length ? staff.map((name) => `- ${name}`).join("\n") : "- Da confermare"
  ].join("\n");

  messageField.value = message;
  setStatus("Messaggio generato.");
}

async function copyMessage() {
  if (!messageField.value.trim()) {
    setStatus("Genera prima un messaggio.", true);
    return;
  }

  await navigator.clipboard.writeText(messageField.value);
  setStatus("Messaggio copiato negli appunti.");
}

function shareMessage() {
  const text = messageField.value.trim();
  if (!text) {
    setStatus("Genera prima un messaggio.", true);
    return;
  }

  if (navigator.share) {
    navigator.share({ text }).catch(() => {
      setStatus("Condivisione annullata.");
    });
    return;
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, "_blank");
}

function normalizeMatches(rows) {
  return rows
    .map((row) => {
      const dataCol = pickColumn(row, ["data", "giorno"]);
      const teamCol = pickColumn(row, ["squadra", "categoria", "team"]);
      const oppCol = pickColumn(row, ["avvers", "opponent"]);
      const placeCol = pickColumn(row, ["campo", "luogo", "impianto"]);
      const hourCol = pickColumn(row, ["ora"]);

      return {
        data: row[dataCol] || "",
        squadra: row[teamCol] || "",
        avversario: row[oppCol] || "",
        luogo: row[placeCol] || "",
        ora: row[hourCol] || ""
      };
    })
    .filter((row) => row.data || row.squadra || row.avversario);
}

function normalizePeople(rows, type) {
  return rows
    .map((row) => {
      const nameCol = pickColumn(row, ["nome", "giocatore", "atleta", "cognome"]);
      const teamCol = pickColumn(row, ["squadra", "categoria", "team"]);
      const roleCol = type === "staff" ? pickColumn(row, ["ruolo", "funzione"]) : null;

      return {
        nome: row[nameCol] || "",
        squadra: row[teamCol] || "",
        extra: roleCol ? row[roleCol] || "" : ""
      };
    })
    .filter((row) => row.nome);
}

function normalizeTeamsFromData(matches, players, staff) {
  const unique = new Set();

  matches.forEach((match) => {
    const team = (match.squadra || "").trim();
    if (team) unique.add(team);
  });

  players.forEach((player) => {
    const team = (player.squadra || "").trim();
    if (team) unique.add(team);
  });

  staff.forEach((member) => {
    const team = (member.squadra || "").trim();
    if (team) unique.add(team);
  });

  return [...unique].sort((a, b) => a.localeCompare(b, "it"));
}

function renderTeams() {
  teamSelect.innerHTML = "<option value=''>Seleziona squadra</option>";
  state.squadre.forEach((team) => {
    const option = document.createElement("option");
    option.value = team;
    option.textContent = team;
    teamSelect.append(option);
  });
}

async function loadData() {
  setStatus("Caricamento dati...");
  try {
    const [gareCsv, giocatoriCsv, staffCsv] = await Promise.all(
      Object.values(SOURCES).map((url) => fetch(toCsvUrl(url)).then((response) => response.text()))
    );

    state.gare = normalizeMatches(parseCsv(gareCsv));
    state.giocatori = normalizePeople(parseCsv(giocatoriCsv), "players");
    state.staff = normalizePeople(parseCsv(staffCsv), "staff");
    state.squadre = normalizeTeamsFromData(state.gare, state.giocatori, state.staff);

    renderTeams();
    refreshMatchesForTeam();
    setStatus(`Dati caricati: ${state.squadre.length} squadre disponibili.`);
  } catch (error) {
    console.error(error);
    setStatus("Errore nel caricamento dei fogli Google. Controlla che i link siano pubblici.", true);
  }
}

teamSelect.addEventListener("change", (event) => {
  state.selectedTeam = event.target.value;
  refreshMatchesForTeam();
});

matchSelect.addEventListener("change", (event) => {
  const filteredMatches = filterByTeam(state.gare, state.selectedTeam);
  state.selectedMatch = filteredMatches[Number(event.target.value)] || null;
  refreshSelections();
});

document.getElementById("select-all-players").addEventListener("click", () => {
  document.querySelectorAll("input[data-type='player']").forEach((input) => {
    input.checked = true;
  });
});

document.getElementById("clear-all-players").addEventListener("click", () => {
  document.querySelectorAll("input[data-type='player']").forEach((input) => {
    input.checked = false;
  });
});

document.getElementById("generate-message").addEventListener("click", generateMessage);
document.getElementById("copy-message").addEventListener("click", () => {
  copyMessage().catch(() => setStatus("Impossibile copiare automaticamente.", true));
});
document.getElementById("share-message").addEventListener("click", shareMessage);

loadData();
