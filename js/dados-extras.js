// Coleções das telas da segunda leva (fictícias, fixas e relativas a "hoje").
import { somarDias, diaSemana } from "./logica/datas.js";

export const CATEGORIAS_TECNICAS = ["Guarda", "Raspagem", "Passagem", "Costas", "Finalização", "Defesa de costas", "4 apoios", "Quedas"];
export const MODULOS = [
  ["dashboard", "Dashboard"], ["agenda", "Agenda & turmas"], ["checkins", "Check-ins"], ["alunos", "Alunos"], ["graduacoes", "Graduações"],
  ["professores", "Professores"], ["acompanhamentos", "Acompanhamentos"], ["cronogramas", "Cronogramas"], ["modelos-aula", "Modelos de aula"],
  ["habilidades", "Habilidades"], ["financeiro", "Financeiro"], ["planos", "Planos"], ["produtos", "Produtos & estoque"], ["contratos", "Contratos"],
  ["prospects", "Prospects"], ["comunicacao", "Comunicação"], ["relatorios", "Relatórios"], ["documentos", "Modelos de documentos"],
  ["mensagens", "Modelos de mensagens"], ["permissoes", "Permissões"], ["config", "Configurações"]
];

// Temas genéricos de 16 semanas (fictícios, editáveis em Cronogramas).
const TEMAS = [
  ["Quedas", "Single leg e defesa de sprawl"], ["Guarda", "Guarda fechada: postura e quebra"], ["Raspagem", "Raspagem de tesoura e pêndulo"],
  ["Passagem", "Passagem toreando"], ["Finalização", "Armlock da guarda fechada"], ["Costas", "Pegada de costas e ganchos"],
  ["Defesa de costas", "Saída das costas pelo lado do gancho"], ["4 apoios", "Ataques aos quatro apoios"], ["Guarda", "Guarda aberta com pegada na manga"],
  ["Raspagem", "Raspagem de gancho"], ["Passagem", "Passagem por baixo da perna"], ["Finalização", "Triângulo e omoplata"],
  ["Costas", "Estrangulamento com a gola por trás"], ["4 apoios", "Defesa dos quatro apoios"], ["Quedas", "O-goshi e controle no chão"],
  ["Finalização", "Kimura e americana"]
];

// Próxima data (depois de hoje) que cai no dia da semana pedido (0 = domingo).
const proximo = (hojeISO, dia) => { let x = somarDias(hojeISO, 1); while (diaSemana(x) !== dia) x = somarDias(x, 1); return x; };

// Cronograma fictício: cada semana com Aula A (seg/ter) e Aula B (qua/qui), tema e técnicas.
// Exportado para a importação do currículo real reconhecer (e tirar) as semanas que ainda são de exemplo.
export function cronogramaExemplo() {
  return ["GB1", "GB2"].flatMap(programa => TEMAS.map(([categoria, tema], i) => {
    const t = programa === "GB2" ? `${tema} (avançado)` : tema;
    const tec = (...nomes) => nomes.map(nome => ({ nome, categoria }));
    return {
      id: `${programa}-${i + 1}`, programa, semana: i + 1,
      aulaA: { tema: `${t}: fundamentos`, tecnicas: tec(`${tema}: entrada básica`, `${tema}: detalhe de pegada`, "Drill em dupla") },
      aulaB: { tema: `${t}: variações e defesa`, tecnicas: tec(`${tema}: variação`, `Defesa contra ${tema.toLowerCase()}`, "Rola específico da posição") }
    };
  }));
}

export function gerarExtras(hojeISO, alunos, turmas = []) {
  const d = n => somarDias(hojeISO, -n);
  const comp = n => { let [a, m] = hojeISO.slice(0, 7).split("-").map(Number); m -= n; while (m < 1) { m += 12; a--; } return `${a}-${String(m).padStart(2, "0")}`; };
  const kidsAtivos = alunos.filter(a => a.categoria === "kids" && a.status === "ativo");
  const adultosAtivos = alunos.filter(a => a.categoria !== "kids" && a.status === "ativo");
  const turmaId = (dia, hora) => turmas.find(t => t.diaSemana === dia && t.horario === hora)?.id || null;
  const cronograma = cronogramaExemplo();
  return {
    planos: [
      { id: "Mensal", nome: "Mensal", meses: 1, valor: 280, ativo: true, descricao: "Treinos livres na grade adulta." },
      { id: "Trimestral", nome: "Trimestral", meses: 3, valor: 750, ativo: true, descricao: "3 meses com desconto." },
      { id: "Anual", nome: "Anual", meses: 12, valor: 2700, ativo: true, descricao: "12 meses, melhor valor." },
      { id: "Kids", nome: "Kids", meses: 1, valor: 220, ativo: true, descricao: "Turmas infantis (4 a 15 anos)." }
    ],
    produtos: [
      { id: "p1", nome: "Kimono GB branco A1", categoria: "Uniformes", preco: 549, estoque: 6, minimo: 3 },
      { id: "p2", nome: "Kimono GB branco A2", categoria: "Uniformes", preco: 549, estoque: 2, minimo: 3 },
      { id: "p3", nome: "Kimono GB azul A2", categoria: "Uniformes", preco: 579, estoque: 4, minimo: 2 },
      { id: "p4", nome: "Faixa branca", categoria: "Faixas", preco: 59, estoque: 15, minimo: 5 },
      { id: "p5", nome: "Faixa azul", categoria: "Faixas", preco: 69, estoque: 3, minimo: 4 },
      { id: "p6", nome: "Faixa roxa", categoria: "Faixas", preco: 69, estoque: 2, minimo: 2 },
      { id: "p7", nome: "Rashguard GB M", categoria: "Uniformes", preco: 189, estoque: 0, minimo: 2 },
      { id: "p8", nome: "Bermuda de treino G", categoria: "Uniformes", preco: 149, estoque: 7, minimo: 2 },
      { id: "p9", nome: "Protetor bucal", categoria: "Acessórios", preco: 39, estoque: 11, minimo: 4 },
      { id: "p10", nome: "Garrafa térmica", categoria: "Acessórios", preco: 89, estoque: 9, minimo: 3 }
    ],
    prospects: [
      { id: "r1", nome: "Juliana Martins", telefone: "(61) 98123-4410", interesse: "Adulto iniciante", origem: "Instagram", etapa: "novo", criadoEm: d(1), obs: "" },
      { id: "r2", nome: "Carlos Eduardo Reis", telefone: "(61) 99654-0021", interesse: "Adulto iniciante", origem: "Indicação", etapa: "contato", criadoEm: d(4), obs: "Indicado pelo Lucas" },
      { id: "r3", nome: "Patrícia Moura", telefone: "(61) 98876-1123", interesse: "Feminino", origem: "Google", etapa: "experimental", criadoEm: d(6), obs: "Aula experimental sábado 10h", experimental: { data: proximo(hojeISO, 6), turmaId: turmaId(6, "10:00") } },
      { id: "r4", nome: "Rafael Assis", telefone: "(61) 99111-7788", interesse: "Volta aos treinos (azul)", origem: "Passou na porta", etapa: "experimental", criadoEm: d(9), obs: "" , experimental: { data: proximo(hojeISO, 2), turmaId: turmaId(2, "19:00") } },
      { id: "r5", nome: "Thiago Brandão", telefone: "(61) 98450-3399", interesse: "Adulto iniciante", origem: "Instagram", etapa: "novo", criadoEm: d(0), obs: "" },
      { id: "r6", nome: "Letícia Campos", telefone: "(61) 99302-5566", interesse: "Feminino", origem: "Indicação", etapa: "matriculado", criadoEm: d(20), obs: "Fechou plano trimestral" },
      { id: "r7", nome: "Marcos Vinícius", telefone: "(61) 98777-2200", interesse: "Adulto iniciante", origem: "Site", etapa: "perdido", criadoEm: d(30), obs: "Achou o horário ruim" }
    ],
    modelosAula: [
      { id: "ma1", nome: "Aula GB1 padrão", publico: "GB1", blocos: [["Aquecimento", 10], ["Técnica da semana", 20], ["Drills em dupla", 15], ["Rola específico", 10], ["Alongamento", 5]] },
      { id: "ma2", nome: "Aula GB2 padrão", publico: "GB2", blocos: [["Aquecimento com movimentação", 10], ["Técnica e variação", 20], ["Drill de combinação", 10], ["Rola livre", 20]] },
      { id: "ma3", nome: "Turma mista GB1 + GB2", publico: "GB1+GB2", blocos: [["Aquecimento", 10], ["Técnica GB1 / variação GB2", 25], ["Rola específico por nível", 15], ["Rola livre", 10]] },
      { id: "ma4", nome: "Aula de competição", publico: "GB2", blocos: [["Aquecimento intenso", 15], ["Situações de luta", 20], ["Rolas de 6 min", 25]] }
    ].map(m => ({ ...m, blocos: m.blocos.map(([nome, min]) => ({ nome, min })) })),
    habilidades: [
      ["Postura na guarda fechada", "Guarda", "Iniciante", "branca"], ["Quebra da guarda fechada em pé", "Passagem", "Iniciante", "branca"],
      ["Raspagem de tesoura", "Raspagem", "Iniciante", "branca"], ["Fuga de quadril (fuga de cotovelo)", "Defesa de costas", "Iniciante", "branca"],
      ["Montada e controle", "Finalização", "Iniciante", "branca"], ["Single leg", "Quedas", "Iniciante", "branca"],
      ["Armlock da guarda", "Finalização", "Iniciante", "branca"], ["Mata-leão", "Costas", "Iniciante", "branca"],
      ["Passagem toreando", "Passagem", "Intermediário", "azul"], ["Guarda aranha", "Guarda", "Intermediário", "azul"],
      ["Raspagem de gancho", "Raspagem", "Intermediário", "azul"], ["Estrangulamento relógio", "4 apoios", "Intermediário", "azul"],
      ["Triângulo", "Finalização", "Intermediário", "azul"], ["Berimbolo", "Costas", "Avançado", "roxa"],
      ["Passagem de pressão (over-under)", "Passagem", "Avançado", "roxa"], ["Ataques de perna (reta e chave de pé)", "Finalização", "Avançado", "marrom"]
    ].map(([nome, categoria, nivel, faixaMin], i) => ({ id: `h${i + 1}`, nome, categoria, nivel, faixaMin })),
    modelosDoc: [
      { id: "doc1", nome: "Contrato de matrícula", tipo: "Contrato", atualizadoEm: d(6), texto:
        "CONTRATO DE MATRÍCULA\n\n{{academia}} e {{nome}} ajustam a matrícula no plano {{plano}}, no valor de {{valor}}, a partir de {{desde}}.\n\nO aluno declara estar apto à prática de jiu-jítsu e se compromete a seguir as regras da academia.\n\nSobradinho, {{data}}.\n\n______________________\n{{nome}}" },
      { id: "doc2", nome: "Termo de responsabilidade", tipo: "Termo", atualizadoEm: d(12), texto:
        "TERMO DE RESPONSABILIDADE\n\nEu, {{nome}}, declaro estar ciente dos riscos inerentes à prática de artes marciais e assumo a responsabilidade pela minha participação nas aulas da {{academia}}.\n\nSobradinho, {{data}}." },
      { id: "doc3", nome: "Declaração de frequência", tipo: "Declaração", atualizadoEm: d(17), texto:
        "DECLARAÇÃO\n\nDeclaramos, para os devidos fins, que {{nome}} é aluno(a) da {{academia}} desde {{desde}}, faixa {{faixa}}, com {{aulas30}} aulas nos últimos 30 dias.\n\nSobradinho, {{data}}." }
    ],
    modelosMsg: [
      { id: "msg1", nome: "Boas-vindas", finalidade: "Novas matrículas", texto: "Oss, {{primeiro}}! Seja bem-vindo(a) à {{academia}}. Te esperamos no tatame! 🥋" },
      { id: "msg2", nome: "Sentimos sua falta", finalidade: "Retenção", texto: "Oi, {{primeiro}}! Faz um tempinho que não te vemos no tatame. Está tudo bem? Bora voltar esta semana? 💪" },
      { id: "msg3", nome: "Lembrete de pagamento", finalidade: "Financeiro", texto: "Oi, {{primeiro}}! Lembrete: a mensalidade de {{valor}} está em aberto. Qualquer dúvida, fale com a recepção." },
      { id: "msg4", nome: "Feliz aniversário", finalidade: "Relacionamento", texto: "Parabéns, {{primeiro}}! 🎉 Toda a equipe da {{academia}} deseja um ótimo ano, dentro e fora do tatame." },
      { id: "msg5", nome: "Graduação", finalidade: "Acadêmico", texto: "{{primeiro}}, você está apto(a) à próxima graduação! Fale com o professor no próximo treino. Oss!" },
      { id: "msg6", nome: "Aviso aos responsáveis", finalidade: "Kids", texto: "Olá, {{primeiro}}! Aviso da {{academia}}: no sábado tem aula especial de graduação na turma kids. Contamos com a presença de {{crianca}}! 🥋" }
    ],
    perfis: [
      { id: "admin", nome: "Administrador", descricao: "Acesso total", modulos: MODULOS.map(m => m[0]) },
      { id: "professor", nome: "Professor", descricao: "Turmas, alunos e graduações", modulos: ["dashboard", "agenda", "checkins", "alunos", "graduacoes", "acompanhamentos", "cronogramas", "modelos-aula", "habilidades"] },
      { id: "recepcao", nome: "Recepção", descricao: "Atendimento e cobrança", modulos: ["dashboard", "agenda", "checkins", "alunos", "financeiro", "planos", "produtos", "contratos", "prospects", "comunicacao", "mensagens"] }
    ],
    usuarios: [
      { id: "u1", nome: "Rafael Monteiro", email: "rafael@exemplo.com", perfilId: "admin", ativo: true },
      { id: "u2", nome: "Camila Duarte", email: "camila@exemplo.com", perfilId: "professor", ativo: true },
      { id: "u3", nome: "Bruno Teixeira", email: "bruno@exemplo.com", perfilId: "professor", ativo: true },
      { id: "u4", nome: "Diego Farias", email: "diego@exemplo.com", perfilId: "professor", ativo: true },
      { id: "u5", nome: "Aline Recepção", email: "recepcao@exemplo.com", perfilId: "recepcao", ativo: true }
    ],
    comunicacoes: [
      { id: "cm1", data: d(2), titulo: "Lembrete de pagamento", publico: "Mensalidades atrasadas", total: 4, canal: "WhatsApp" },
      { id: "cm2", data: d(9), titulo: "Sentimos sua falta", publico: "Sem treinar há 14 dias", total: 3, canal: "WhatsApp" },
      { id: "cm3", data: d(15), titulo: "Graduação", publico: "Aptos a graduar", total: 6, canal: "WhatsApp" }
    ],
    acompanhamentos: [
      { id: "ac1", alunoId: alunos[3].id, data: d(3), tipo: "Técnico", texto: "Trabalhar passagem de guarda; muito parado por baixo." },
      { id: "ac2", alunoId: alunos[8].id, data: d(5), tipo: "Contato", texto: "Mandou mensagem: viagem a trabalho, volta semana que vem." },
      { id: "ac3", alunoId: alunos[14].id, data: d(8), tipo: "Graduação", texto: "Avaliar no fim do mês junto com a turma das 19h." }
    ],
    contratos: alunos.map((a, i) => ({
      id: `ct${i + 1}`, numero: `CTR-${a.desde.slice(0, 4)}-${String(100 + i).padStart(3, "0")}`, alunoId: a.id, modeloId: "doc1",
      emissao: a.desde, status: a.desde >= d(30) ? "pendente" : "assinado"
    })),
    cronograma,
    despesas: [0, 1, 2].flatMap(n => {
      const c = comp(n), dia = dd => `${c}-${dd}`;
      return [
        ["Aluguel", "Aluguel do espaço", 4500, "05"], ["Professores", "Repasse dos professores", 6200, "05"],
        ["Contas", "Luz, água e internet", 780 + n * 45, "10"], ["Manutenção", "Limpeza e higienização do tatame", 420, "15"],
        ["Marketing", "Anúncios no Instagram", 300, "20"]
      ].map(([categoria, descricao, valor, dd], k) => ({ id: `dp${n}${k}`, data: dia(dd), categoria, descricao, valor, pago: dia(dd) <= hojeISO }));
    }).concat([
      { id: "dpx1", data: `${comp(1)}-18`, categoria: "Manutenção", descricao: "Conserto de placa do tatame", valor: 850, pago: true },
      { id: "dpx2", data: `${comp(0)}-08`, categoria: "Outros", descricao: "Faixas para a graduação kids", valor: 360, pago: true }
    ]),
    eventos: [
      { id: "ev1", titulo: "Graduação Kids", tipo: "Graduação", publico: "kids", data: proximo(hojeISO, 6), hora: "09:00", local: "Tatame principal", vagas: 30,
        inscritos: kidsAtivos.slice(0, 9).map(a => a.id), descricao: "Troca de faixas e graus das turmas infantis. Família convidada!" },
      { id: "ev2", titulo: "Seminário com professor convidado", tipo: "Seminário", publico: "adulto", data: somarDias(hojeISO, 15), hora: "10:00", local: "Tatame principal", vagas: 40,
        inscritos: adultosAtivos.slice(0, 14).map(a => a.id), descricao: "Passagem de guarda e controle de costas." },
      { id: "ev3", titulo: "Copa GB Sobradinho (interna)", tipo: "Campeonato", publico: "todos", data: somarDias(hojeISO, 30), hora: "08:00", local: "Ginásio da academia", vagas: 80,
        inscritos: [...adultosAtivos.slice(5, 20), ...kidsAtivos.slice(3, 12)].map(a => a.id), descricao: "Lutas por faixa e idade, adultos e kids." },
      { id: "ev4", titulo: "Confraternização de fim de ano", tipo: "Confraternização", publico: "todos", data: somarDias(hojeISO, 26), hora: "18:00", local: "Área externa", vagas: 120,
        inscritos: adultosAtivos.slice(0, 22).map(a => a.id), descricao: "Churrasco e entrega de certificados." },
      { id: "ev5", titulo: "Graduação de adultos", tipo: "Graduação", publico: "adulto", data: d(40), hora: "10:00", local: "Tatame principal", vagas: 50,
        inscritos: adultosAtivos.slice(10, 28).map(a => a.id), descricao: "Graduação do segundo semestre." }
    ],
    avaliacoes: kidsAtivos.flatMap((a, k) => [2, 1, 0].map(n => {
      const base = k === 8 ? 2 : 3 + (k % 3 === 0 ? 1 : 0), nota = i => Math.min(5, Math.max(1, base + ((k + i + n) % 3 === 0 ? 1 : 0) - (k === 8 && i === 1 ? 1 : 0)));
      return { id: `av${a.id}${n}`, alunoId: a.id, mes: comp(n), notas: { respeito: nota(0), disciplina: nota(1), atencao: nota(2), coleguismo: nota(3) },
        obs: k === 8 && n === 0 ? "Disperso nas últimas aulas; conversar com a família." : "" };
    })),
    config: {
      usuario: { nome: "Leandro", sexo: "M" },
      diarioUrl: "https://gracie-taupe.vercel.app",
      academia: { nome: "GB Sobradinho", endereco: "Sobradinho, Distrito Federal", telefone: "(61) 3000-0000", email: "contato@exemplo.com" },
      regras: { aulasPorGrau: 30, mesesPorGrau: 3, mesesMinFaixa: { branca: 12, azul: 24, roxa: 18, marrom: 12 } },
      regrasKids: { aulasPorGrau: 4, mesesPorGrau: 1, mesesMinFaixa: 6, idadeMin: { cinza: 4, amarela: 7, laranja: 10, verde: 13 } },
      metaAulas30: 12,
      vencimentoPadrao: 10,
      descontoIrmaos: 10,
      ancoras: [{ programa: "GB1", data: "2026-11-16", semana: 12 }, { programa: "GB2", data: "2026-11-16", semana: 12 }]
    }
  };
}

export const COLECOES_EXTRAS = ["despesas", "eventos", "avaliacoes", "planos", "produtos", "prospects", "modelosAula", "habilidades", "modelosDoc", "modelosMsg", "perfis", "usuarios", "comunicacoes", "acompanhamentos", "contratos", "cronograma"];
