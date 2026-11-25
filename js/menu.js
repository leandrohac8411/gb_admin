// Menu lateral: mesmos grupos do mockup do "GB Sobradinho Manager".
// pronto:false = tela da próxima leva (abre "em breve").
export const ICONES = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
  agenda: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  checkins: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 13l2 2 4-4"/>',
  alunos: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .7 3.2 2.3 3.5 5"/>',
  graduacoes: '<circle cx="12" cy="9" r="5"/><path d="M8.5 13 7 21l5-3 5 3-1.5-8"/>',
  professores: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  acompanhamentos: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  cronogramas: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  "modelos-aula": '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>',
  habilidades: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  financeiro: '<rect x="2" y="6" width="20" height="14" rx="3"/><path d="M2 10h20"/><circle cx="16" cy="15" r="1.5"/>',
  planos: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/>',
  produtos: '<path d="m12 3 8 4v10l-8 4-8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/>',
  contratos: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/>',
  prospects: '<circle cx="10" cy="8" r="4"/><path d="M3 20c1-4 4-6 7-6 1.5 0 3 .4 4 1.2M19 14v6M16 17h6"/>',
  comunicacao: '<path d="M4 5h16v11H9l-5 4z"/>',
  relatorios: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  documentos: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/>',
  mensagens: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  permissoes: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  alerta: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.5"/>',
  presente: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M12 9C9 9 7 7.5 7 6s1.5-2.5 3-1.5S12 9 12 9zm0 0c3 0 5-1.5 5-3s-1.5-2.5-3-1.5S12 9 12 9z"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  eventos: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  kimono: '<path d="M8 3h8l4 4-3 3v11H7V10L4 7z"/><path d="m8 3 4 6 4-6M12 9v12"/>',
  restaurar: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  sair: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M21 12H10M17 8l4 4-4 4"/>'
};

const item = (rota, nome, pronto = true) => ({ rota, nome, pronto });

export const MENU = [
  { grupo: "Visão geral", itens: [item("dashboard", "Dashboard", true), item("agenda", "Agenda & turmas", true), item("checkins", "Check-ins", true)] },
  { grupo: "Gestão acadêmica", itens: [item("alunos", "Alunos", true), item("graduacoes", "Graduações", true), item("eventos", "Eventos"), item("professores", "Professores"),
    item("acompanhamentos", "Acompanhamentos"), item("cronogramas", "Cronogramas"), item("modelos-aula", "Modelos de aula"),
    item("habilidades", "Habilidades")] },
  { grupo: "Operação", itens: [item("financeiro", "Financeiro", true), item("planos", "Planos"),
    item("contratos", "Contratos"), item("prospects", "Prospects"), item("comunicacao", "Comunicação"), item("relatorios", "Relatórios")] },
  { grupo: "Administração", itens: [item("documentos", "Modelos de documentos"), item("mensagens", "Modelos de mensagens"),
    item("permissoes", "Permissões"), item("config", "Configurações")] }
];

export const icone = nome => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ""}</svg>`;

export function itemDoMenu(rota) {
  for (const g of MENU) for (const i of g.itens) if (i.rota === rota) return i;
  return null;
}

// Grupos abrem e fecham; o grupo da tela atual abre sozinho.
const abertos = new Set();
let ultimaAtiva = null;
const SETA = '<svg class="ic seta" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
const textoSeguro = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function alternarGrupo(nome) { abertos.has(nome) ? abertos.delete(nome) : abertos.add(nome); }

export function desenharMenu(ativa, usuario = {}, { sair = false, restaurar = "Restaurar dados de exemplo" } = {}) {
  const grupoAtivo = MENU.find(g => g.itens.some(i => i.rota === ativa))?.grupo;
  // Ao trocar de tela, fica aberto só o grupo dela (sanfona); clicar num grupo abre/fecha à mão.
  if (ativa !== ultimaAtiva) { abertos.clear(); ultimaAtiva = ativa; }
  if (grupoAtivo) abertos.add(grupoAtivo);
  const link = i => `<a href="#${i.rota}" class="lat-item${i.rota === ativa ? " on" : ""}"${i.rota === ativa ? ' aria-current="page"' : ""}>` +
    `${icone(i.rota)}<span>${i.nome}</span>${i.pronto ? "" : "<em>em breve</em>"}</a>`;
  const [principal, ...grupos] = MENU;
  const nome = textoSeguro((usuario.nome || "").trim() || "Visitante");
  return `<a class="lat-marca" href="#dashboard" aria-label="GB Sobradinho — início"><img src="img/logo-sobradinho.png" alt="GB Sobradinho"></a>` +
    `<nav class="lat-nav">${principal.itens.map(link).join("")}` +
    grupos.map(g => {
      const aberto = abertos.has(g.grupo);
      return `<div class="lat-grupo${aberto ? " aberto" : ""}"><button class="lat-grupo-cab${g.grupo === grupoAtivo ? " tem-ativa" : ""}" data-grupo="${g.grupo}" aria-expanded="${aberto}"><span>${g.grupo}</span>${SETA}</button>` +
        `<div class="lat-sub">${g.itens.map(link).join("")}</div></div>`;
    }).join("") +
    `</nav><a class="lat-perfil" href="#config"><span class="av-foto">🥋</span><span class="quem"><b>${nome}</b><small>Administrador</small></span>${SETA}</a>` +
    (restaurar ? `<button class="lat-restaurar" id="restaurar">${icone("restaurar")}${textoSeguro(restaurar)}</button>` : "") +
    (sair ? `<button class="lat-sair" id="sair">${icone("sair")}Sair</button>` : "");
}
