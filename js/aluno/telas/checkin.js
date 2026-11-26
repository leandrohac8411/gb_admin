// Portal do aluno: check-in pelo celular (só no dia, a até 50 m da academia e na aula que está acontecendo).
import { hojeISO, diaSemana } from "../../logica/datas.js";
import { turmaDoCheckin, idCheckinAluno } from "../../logica/portal-checkin.js";
import { avaliarLocal, distanciaTexto } from "../../logica/local.js";
import { esteveNaAula } from "../../logica/portal-aluno.js";
import { esc, horaTexto, toast } from "../ui/util.js";
import { minutosAgora, horaAgora, etiqueta } from "./comum.js";

function pegarPosicao() {
  return new Promise((ok, falha) => {
    if (!navigator.geolocation) return falha({ code: 99 });
    navigator.geolocation.getCurrentPosition(p => ok({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: p.coords.accuracy }),
      falha, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  });
}

export default {
  menu: null,
  vivo: false,
  montar(el, params, ctx) {
    const hoje = hojeISO();
    const turmas = Object.entries(ctx.grade?.turmas || {}).map(([id, t]) => ({ ...t, id }));
    const achou = turmaDoCheckin(turmas, diaSemana(hoje), minutosAgora());
    const titulo = '<div class="ttl"><a class="back" href="#inicio" aria-label="Voltar">←</a>Check-in</div>';
    if (achou.nenhuma) { el.innerHTML = `${titulo}<p class="aviso">Não tem aula acontecendo agora. O check-in abre 30 minutos antes da aula e vai até o fim dela.</p>`; return; }
    const opcoes = achou.turma ? [achou.turma] : achou.escolher;
    const fazer = async turma => {
      if (esteveNaAula(ctx.portal, ctx.pendentes, turma.id, hoje)) { el.querySelector("#msg").textContent = "Você já fez check-in nesta aula."; return; }
      el.querySelector("#msg").textContent = "Conferindo sua localização…";
      let pos;
      try { pos = await pegarPosicao(); }
      catch (e) { el.querySelector("#msg").textContent = e?.code === 1 ? "Permita o uso da localização para fazer o check-in." : "Não consegui pegar sua localização. Tente de novo."; return; }
      const local = avaliarLocal(pos);
      if (!local.ok) { el.querySelector("#msg").textContent = `Você está a ${distanciaTexto(local.distancia)} da academia. O check-in só vale lá.`; return; }
      try {
        await ctx.nuvem.fazerCheckin({ id: idCheckinAluno(ctx.acesso.alunoId, turma.id, hoje), alunoId: ctx.acesso.alunoId, turmaId: turma.id, data: hoje, hora: horaAgora(), distancia: Math.min(100, local.distancia) });
        toast("Check-in feito! Bom treino.");
        location.hash = `#aula/${encodeURIComponent(turma.id)}/${hoje}`;
      } catch (e) {
        console.error(e);
        el.querySelector("#msg").textContent = e?.code === "permission-denied" ? "Você já fez check-in nesta aula." : "Não consegui registrar. Confira a internet e tente de novo.";
      }
    };
    el.innerHTML = `${titulo}<p class="muted">${opcoes.length > 1 ? "Tem mais de uma aula agora. Qual é a sua?" : "Confirme a aula. O celular vai conferir se você está na academia."}</p>
      <div class="cls">${opcoes.map((t, i) => `<button class="row next" data-i="${i}"><span class="t">${horaTexto(t.horario)}</span>
        <span class="d">${etiqueta(t.programa)}${t.professor ? ` ${esc(t.professor)}` : ""}</span><span class="go">Fazer check-in</span></button>`).join("")}</div>
      <p class="aviso" id="msg" role="status" aria-live="polite"></p>`;
    el.querySelectorAll("[data-i]").forEach(b => b.onclick = () => fazer(opcoes[Number(b.dataset.i)]));
  }
};
