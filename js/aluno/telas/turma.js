// Portal do aluno: uma aula da grade num dia (#turma/<turmaId>/<data>), aberta para todos os alunos:
// qual foi a aula (tema e técnicas do ciclo), o roteiro, a foto e quem participou. Quem fez check-in
// abre e edita o próprio diário; hoje, no horário, dá para fazer o check-in.
import { hojeISO, dataValida } from "../logica/datas.js";
import { aulaPrevista } from "../logica/ciclo.js";
import { presentesDaAula } from "../nuvem.js";
import { esc, dataLonga, horaTexto, temaCurto, posicaoDoTema } from "../ui/util.js";
import { conteudoPrevisto, etiquetaPrograma, pintarFoto, minutosAgora, minutosDe } from "./comum.js";

const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default {
  menu: null,
  vivo: true,
  classe: "sem-padding",
  montar(el, [turmaId, data], { estado: e }) {
    const t = e.grade.find(x => x.id === turmaId);
    if (!t || !dataValida(data || "")) { el.innerHTML = '<p class="vazio">Aula não encontrada. <a class="link" href="#grade">Voltar à grade</a></p>'; return; }
    const hoje = hojeISO(), minha = e.aulas.find(a => a.turmaId === turmaId && a.data === data);
    const programas = String(t.programa).includes("+") ? ["GB1", "GB2"] : [t.programa];
    const conteudos = programas.map(p => {
      const prev = aulaPrevista(data, { programa: p, aula: t.aula }, e.ancoras);
      return { p, prev, c: conteudoPrevisto(e.curriculo, prev) };
    });
    const ini = minutosDe(t.horario), fim = ini + (Number(t.duracaoMin) || 60), agora = minutosAgora();
    const podeCheckin = !minha && data === hoje && agora >= ini - 30 && agora <= fim + 60;
    let acum = 0;
    const roteiro = e.roteiros?.[t.modeloAulaId] || [];
    el.innerHTML = `
      <div class="hero-ph" id="hero">
        <div class="ph-top"><a class="back" href="#grade" aria-label="Voltar">←</a></div>
        <div class="ph-cap"><small>${dataLonga(data)} · ${horaTexto(t.horario)}${t.professor ? " · " + esc(t.professor) : ""}</small>
          <b>${esc(conteudos.map(x => x.c ? temaCurto(x.c.tema) : `${x.p} · semana ${x.prev.semana ?? "?"}`).join(" · "))}</b></div>
      </div>
      <div class="aula-corpo">
        <div style="display:flex;align-items:center;gap:8px">${etiquetaPrograma(t.programa)}<small class="muted">${conteudos.map(x => x.prev.semana ? `${x.p}: semana ${x.prev.semana}${x.prev.aula ? " · aula " + x.prev.aula : ""}` : "").filter(Boolean).join(" · ")}</small></div>
        ${minha ? `<div class="local ok"><span>✓ Você treinou nesta aula</span></div>
          <a class="btn" href="#aula/${encodeURIComponent(minha.id)}" style="text-decoration:none">Ver meu diário</a>
          <a class="btn ghost" href="#checkin/editar/${encodeURIComponent(minha.id)}" style="text-decoration:none">Editar: dificuldades, técnicas e anotações</a>`
        : podeCheckin ? `<a class="btn" href="#checkin/${encodeURIComponent(t.id)}/${hoje}" style="text-decoration:none">Fazer check-in</a>`
        : `<div class="local neutro"><span>${data > hoje || (data === hoje && agora < ini - 30) ? "O check-in abre 30 minutos antes da aula." : "Você não fez check-in nesta aula. Dá para ver a aula, mas o diário é só de quem treinou."}</span></div>`}
        ${conteudos.filter(x => x.c).map(x => `<div class="card"><div class="k">${esc(x.p)} · o que foi passado</div>
          <b style="display:block;margin-top:6px">${esc(temaCurto(x.c.tema))}</b>${posicaoDoTema(x.c.tema) ? `<small class="muted">${esc(posicaoDoTema(x.c.tema))}</small>` : ""}
          ${x.c.tecnicas?.length ? `<ol style="margin:8px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:4px">${x.c.tecnicas.map(tc => `<li>${esc(tc.nome)}${tc.categoria ? ` <small class="muted">${esc(tc.categoria)}</small>` : ""}</li>`).join("")}</ol>` : ""}</div>`).join("")
          || '<div class="card"><div class="k">O que foi passado</div><p class="muted" style="margin:6px 0 0">O tema desta semana ainda não foi cadastrado pela academia.</p></div>'}
        ${roteiro.length ? `<div class="card"><div class="k">Roteiro</div>${roteiro.map(b => { const h = ini + acum; acum += Number(b.min) || 0;
          return `<div style="display:flex;gap:10px;padding:6px 0;border-top:1px solid var(--line)"><small class="muted" style="width:44px">${horaTexto(hhmm(h))}</small><span style="flex:1">${esc(b.nome)}</span><small class="muted">${esc(b.min)} min</small></div>`; }).join("")}</div>` : ""}
        <div class="card" id="presentes"><div class="k">Quem participou</div><p class="muted" style="margin:6px 0 0">Carregando…</p></div>
      </div>`;
    const hero = el.querySelector("#hero");
    hero.style.background = "linear-gradient(135deg,#2c2c33,#5b5257)"; // a foto da academia, se houver, entra por cima
    pintarFoto(e.uid, `aula:${turmaId}_${data}`, hero);
    presentesDaAula(turmaId, data).then(lista => {
      const box = el.querySelector("#presentes");
      if (!box) return;
      box.innerHTML = `<div class="k">Quem participou${lista?.length ? ` · ${lista.length}` : ""}</div>` + (lista?.length
        ? `<div class="chips" style="margin-top:8px">${lista.map(n => `<span class="chip">${esc(n)}</span>`).join("")}</div>`
        : `<p class="muted" style="margin:6px 0 0">${lista === null && data < hojeISO() ? "Sem registro de presença nesta aula (a lista mostra os últimos 30 dias)." : "Ninguém registrado ainda."}</p>`);
    }).catch(() => { const box = el.querySelector("#presentes"); if (box) box.querySelector("p").textContent = "Não consegui carregar a lista."; });
  }
};
