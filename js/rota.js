// Lê "#rota/param" sem lançar erro em escapes quebrados (ex.: "%E0").
const decodificar = s => { try { return decodeURIComponent(s); } catch { return s; } };

export function lerRota(hash) {
  const [rota, ...params] = (String(hash || "").replace(/^#/, "") || "dashboard").split("/").map(decodificar);
  return { rota: rota || "dashboard", params };
}
