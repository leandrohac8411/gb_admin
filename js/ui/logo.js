// Logo da academia (Configurações › Academia). Cada academia tem a sua; sem logo cadastrada, usa a padrão.
// Fica no banco (config.academia.logo) e é lembrada no aparelho para a tela de login, que aparece antes
// de alguém entrar (quando o banco ainda não pode ser lido).
import { logoValida } from "../logica/portal.js";

export const LOGO_PADRAO = "img/logo-sobradinho.png";
const CHAVE = "gb-admin:logo";

export const logoAcademia = config => logoValida(config?.academia?.logo);
export const urlDaLogo = config => logoAcademia(config) || LOGO_PADRAO;

// Lembra a logo e o nome da academia no aparelho (para a tela de login, antes de entrar).
export function lembrarAcademia(config) {
  try {
    const l = logoAcademia(config);
    if (l) localStorage.setItem(CHAVE, l); else localStorage.removeItem(CHAVE);
    if (config?.academia?.nome) localStorage.setItem(CHAVE + ":nome", String(config.academia.nome).slice(0, 80));
  } catch { /* modo privado */ }
}
export function academiaLembrada(padrao = LOGO_PADRAO) {
  try { return { logo: logoValida(localStorage.getItem(CHAVE)) || padrao, nome: localStorage.getItem(CHAVE + ":nome") || "GB Sobradinho" }; }
  catch { return { logo: padrao, nome: "GB Sobradinho" }; }
}

// Reduz a imagem escolhida para no máximo 320 px, em PNG (mantém o fundo transparente);
// se ainda ficar grande, vira JPEG.
export async function reduzirLogo(arquivo) {
  if (!/^image\/(png|jpeg|webp)$/.test(arquivo?.type || "")) throw new Error("tipo");
  const img = await createImageBitmap(arquivo);
  const escala = Math.min(1, 320 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * escala)); c.height = Math.max(1, Math.round(img.height * escala));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  let url = c.toDataURL("image/png");
  if (url.length > 250000) url = c.toDataURL("image/jpeg", 0.85);
  if (!logoValida(url)) throw new Error("grande");
  return url;
}
