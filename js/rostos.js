// Detecta ONDE há rostos numa foto (só caixas; não identifica ninguém e não guarda nada).
// Roda no próprio navegador com face-api (modelo SSD MobileNet, ~5,6 MB, baixado só na primeira análise).
const BASE = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13";
let carregando = null;

function carregar() {
  if (!carregando) {
    carregando = import(`${BASE}/dist/face-api.esm.js`).then(async faceapi => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(`${BASE}/model`);
      return faceapi;
    }).catch(e => { carregando = null; throw e; });
  }
  return carregando;
}

const imagem = src => new Promise((ok, erro) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = () => erro(new Error("imagem"));
  img.src = src;
});

// Retorna { largura, altura, rostos: [{ x, y, w, h, confianca }] } em pixels da imagem.
export async function detectarRostos(dataURL) {
  const [faceapi, img] = await Promise.all([carregar(), imagem(dataURL)]);
  const opcoes = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35, maxResults: 80 });
  const achados = await faceapi.detectAllFaces(img, opcoes);
  return {
    largura: img.naturalWidth, altura: img.naturalHeight,
    rostos: achados.map(f => ({ x: f.box.x, y: f.box.y, w: f.box.width, h: f.box.height, confianca: f.score }))
  };
}
