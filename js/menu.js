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
  portal: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  restaurar: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'
};

const item = (rota, nome, pronto = true) => ({ rota, nome, pronto });

export const MENU = [
  { grupo: "Visão geral", itens: [item("dashboard", "Dashboard", true), item("agenda", "Agenda & turmas", true), item("checkins", "Check-ins", true)] },
  { grupo: "Gestão acadêmica", itens: [item("alunos", "Alunos", true), item("graduacoes", "Graduações", true), item("professores", "Professores"),
    item("acompanhamentos", "Acompanhamentos"), item("cronogramas", "Cronogramas"), item("modelos-aula", "Modelos de aula"),
    item("habilidades", "Habilidades")] },
  { grupo: "Operação", itens: [item("financeiro", "Financeiro", true), item("planos", "Planos"),
    item("contratos", "Contratos"), item("prospects", "Prospects"), item("comunicacao", "Comunicação"), item("relatorios", "Relatórios")] },
  { grupo: "Administração", itens: [item("documentos", "Modelos de documentos"), item("mensagens", "Modelos de mensagens"),
    item("permissoes", "Permissões"), item("portal", "Portal do aluno"), item("config", "Configurações")] }
];

export const icone = nome => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ""}</svg>`;

export function itemDoMenu(rota) {
  for (const g of MENU) for (const i of g.itens) if (i.rota === rota) return i;
  return null;
}

export function desenharMenu(ativa) {
  return `<div class="lat-marca"><img src="img/logo-gb.png" alt=""><div><b>GB Sobradinho</b><small>Admin da academia</small></div></div>` +
    `<nav class="lat-nav">` + MENU.map(g => `<div class="lat-grupo"><span>${g.grupo}</span>` + g.itens.map(i =>
      `<a href="#${i.rota}" class="${i.rota === ativa ? "on" : ""}"${i.rota === ativa ? ' aria-current="page"' : ""}>` +
      `${icone(i.rota)}<span>${i.nome}</span>${i.pronto ? "" : '<em>em breve</em>'}</a>`).join("") + `</div>`).join("") +
    `</nav><button class="lat-restaurar" id="restaurar">${icone("restaurar")}Restaurar dados de exemplo</button>`;
}
