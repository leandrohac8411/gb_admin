// Foto de cadastro do rosto: precisa ter UM rosto claro. Se aparecer alguém ao fundo,
// vale o rosto principal desde que seja bem maior (4× a área) que o segundo.
const CONFIANCA_MIN = 0.5, FOLGA_AREA = 4;

export function escolherRostoCadastro(resultado) {
  const rostos = (resultado?.rostos || []).filter(r => r.confianca >= CONFIANCA_MIN)
    .sort((a, b) => b.w * b.h - a.w * a.h);
  if (!rostos.length) return { ok: false, motivo: "nenhum" };
  if (rostos.length > 1 && rostos[0].w * rostos[0].h < FOLGA_AREA * rostos[1].w * rostos[1].h) return { ok: false, motivo: "varios" };
  return { ok: true, rosto: rostos[0] };
}

const idade = (nasc, hoje) => {
  if (!nasc) return null;
  const [a, m, d] = nasc.split("-").map(Number), [ha, hm, hd] = hoje.split("-").map(Number);
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
};

// Quem autoriza: o próprio aluno adulto; para criança (ou menor de 18), o responsável logado.
export function consentimentoPadrao(aluno, usuarioNome, hoje) {
  const anos = idade(aluno?.nascimento, hoje);
  const responsavel = aluno?.categoria === "kids" || (anos != null && anos < 18);
  return { por: responsavel ? usuarioNome : String(aluno?.nome || "").trim(), responsavel, data: hoje };
}

// Caixa do rosto ampliada (margem de 25% para cada lado), presa dentro da imagem.
export function recorte(r, largura, altura, margem = 0.25) {
  const x0 = Math.max(0, Math.round(r.x - r.w * margem)), y0 = Math.max(0, Math.round(r.y - r.h * margem));
  const x1 = Math.min(largura, Math.round(r.x + r.w * (1 + margem))), y1 = Math.min(altura, Math.round(r.y + r.h * (1 + margem)));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Arquivo escolhido para o rosto: "" se dá para analisar, senão o motivo (para mostrar na tela).
export const MAX_ARQUIVO_ROSTO = 30 * 1024 * 1024;
export function problemaNaFoto(arq) {
  if (!arq) return "";
  if (!/^image\//.test(arq.type || "")) return "Escolha uma foto (arquivo de imagem).";
  if (arq.size > MAX_ARQUIVO_ROSTO) return "A foto passa de 30 MB: escolha uma menor.";
  return "";
}
