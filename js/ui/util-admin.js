// Ajudas do painel que o Diário não tinha.
export const normalizar = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const reais = n => BRL.format(Number(n) || 0);

export const competenciaTexto = comp => {
  const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const [a, m] = comp.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
};

export function somarMeses(comp, n) {
  let [a, m] = comp.split("-").map(Number);
  m += n;
  while (m > 12) { m -= 12; a++; }
  while (m < 1) { m += 12; a--; }
  return `${a}-${String(m).padStart(2, "0")}`;
}

// Anel claro (fundo branco): trilho cinza + arco na cor pedida.
export function anelClaroSVG(fracao, cor = "#c8201b") {
  const f = Number.isFinite(fracao) ? Math.max(0, Math.min(1, fracao)) : 0;
  const c = 2 * Math.PI * 50, x = (f * c).toFixed(2);
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="#efecea" stroke-width="13"/>` +
    (f > 0 ? `<circle cx="60" cy="60" r="50" fill="none" stroke="${cor}" stroke-width="13" stroke-linecap="round" stroke-dasharray="${x} ${c.toFixed(2)}"/>` : "") + `</svg>`;
}

// CSV para Excel (separador ;). Células que começam com = + - @ ganham ' para não virar fórmula.
export function csv(linhas) {
  const cel = v => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + linhas.map(l => l.map(cel).join(";")).join("\n");
}
