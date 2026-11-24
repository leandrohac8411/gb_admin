// Foto de grupo: o detector de rostos reduz a imagem inteira para 512 px, e numa turma cada rosto
// vira uns 20 px — no limite do que ele acha. Por isso a procura é feita na foto inteira e também
// em 4 pedaços sobrepostos (cada rosto fica ~2× maior). Depois os achados são juntados sem repetir.
const LADO_MIN = 700;   // foto menor que isso já é analisada inteira com folga
const FRACAO = 0.6;     // cada pedaço cobre 60% da largura e da altura (sobreposição de 20% no meio)

export function ladrilhos(largura, altura) {
  const inteira = { x: 0, y: 0, w: largura, h: altura };
  if (Math.max(largura, altura) < LADO_MIN) return [inteira];
  const w = Math.round(largura * FRACAO), h = Math.round(altura * FRACAO);
  const xs = [0, largura - w], ys = [0, altura - h];
  return [inteira, ...ys.flatMap(y => xs.map(x => ({ x, y, w, h })))];
}

// Rosto encostado numa borda do pedaço que não é borda da foto: provavelmente cortado ao meio.
// Ele aparece inteiro em outro pedaço (ou na foto inteira), então este é descartado.
export function tocaBordaInterna(r, t, largura, altura, folga = 2) {
  return (t.x > 0 && r.x <= t.x + folga)
    || (t.y > 0 && r.y <= t.y + folga)
    || (t.x + t.w < largura && r.x + r.w >= t.x + t.w - folga)
    || (t.y + t.h < altura && r.y + r.h >= t.y + t.h - folga);
}

function sobreposicao(a, b) {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = x * y;
  return inter / Math.min(a.w * a.h, b.w * b.h);
}

// O mesmo rosto achado mais de uma vez vira um só: fica o de maior certeza.
export function juntarRostos(rostos, limite = 0.5) {
  const ordem = [...rostos].sort((a, b) => b.confianca - a.confianca), ficam = [];
  for (const r of ordem) if (!ficam.some(f => sobreposicao(f, r) > limite)) ficam.push(r);
  return ficam;
}

// Gente lá no fundo da sala aparece como rosto bem menor que os da turma: fica de fora.
// Referência: 60% da mediana da largura dos rostos achados (criança na mesma fileira fica bem acima disso).
export function semFundo(rostos, fracao = 0.6) {
  if (rostos.length < 3) return rostos;
  const larguras = rostos.map(r => r.w).sort((a, b) => a - b), mediana = larguras[Math.floor(larguras.length / 2)];
  return rostos.filter(r => r.w >= mediana * fracao);
}
