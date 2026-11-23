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
