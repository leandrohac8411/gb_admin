// Portal do aluno: ajudas comuns às telas.
import { nomeFaixa } from "../../ui/faixa.js";
import { esc } from "../ui/util.js";

export const minutosAgora = (d = new Date()) => d.getHours() * 60 + d.getMinutes();
export const horaAgora = (d = new Date()) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
export const etiqueta = p => `<span class="et-prog et-${esc(String(p || "").toLowerCase().replace(/[^a-z0-9]/g, ""))}">${esc(p || "")}</span>`;

// Próximo passo da graduação, a partir do que o GB Admin calculou (aptidao).
export function proximoPassoTexto(pp, faixa) {
  if (faixa === "preta") return "Faixa preta: os graus vêm por tempo de faixa.";
  if (!pp) return "";
  if (pp.tipo === "faixa") return `Pronto para a faixa ${nomeFaixa(pp.proximaFaixa).toLowerCase()}! Fale com o professor.`;
  if (pp.tipo === "grau") return "Pronto para o próximo grau! Fale com o professor.";
  if (pp.faltamAulas > 0) return `Faltam ${pp.faltamAulas} aula${pp.faltamAulas === 1 ? "" : "s"} para o próximo grau.`;
  return "Aulas completas. Agora é o tempo mínimo de graduação.";
}
