// Rostos na foto da aula, tudo no próprio navegador (nada é enviado):
//  - detectarRostos: só ONDE há rostos (caixas), para contar;
//  - descreverRostos: também os 128 números de cada rosto, para reconhecer alunos cadastrados.
// Roda no próprio navegador com face-api (modelo SSD MobileNet, ~5,6 MB, servido pelo próprio site e baixado só na primeira análise).
import { compactar } from "./logica/reconhecimento.js";
import { ladrilhos, juntarRostos, tocaBordaInterna, semFundo } from "./logica/ladrilhos.js";

const BASE = "/vendor/face-api";
let carregando = null;

function carregar() {
  if (!carregando) {
    carregando = import(`${BASE}/face-api.esm.js`).then(async faceapi => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(`${BASE}/model`);
      return faceapi;
    }).catch(e => { carregando = null; throw e; });
  }
  return carregando;
}

// Modelos extras do reconhecimento (~6,5 MB), carregados só quando há alunos com rosto cadastrado.
let carregandoRec = null;
function carregarReconhecimento() {
  if (!carregandoRec) {
    carregandoRec = carregar().then(async faceapi => {
      await Promise.all([faceapi.nets.faceLandmark68Net.loadFromUri(`${BASE}/model`), faceapi.nets.faceRecognitionNet.loadFromUri(`${BASE}/model`)]);
      return faceapi;
    }).catch(e => { carregandoRec = null; throw e; });
  }
  return carregandoRec;
}

const imagem = src => new Promise((ok, erro) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = () => erro(new Error("imagem"));
  img.src = src;
});

// Procura na foto inteira e em pedaços sobrepostos (ver logica/ladrilhos.js) e junta sem repetir.
// "procurar" recebe a imagem (ou o pedaço) e devolve [{ box, score, descriptor? }].
async function procurarPorPartes(img, procurar) {
  const largura = img.naturalWidth, altura = img.naturalHeight, achados = [];
  for (const t of ladrilhos(largura, altura)) {
    let alvo = img;
    if (t.w !== largura || t.h !== altura) {
      alvo = document.createElement("canvas"); alvo.width = t.w; alvo.height = t.h;
      alvo.getContext("2d").drawImage(img, t.x, t.y, t.w, t.h, 0, 0, t.w, t.h);
    }
    for (const f of await procurar(alvo)) {
      const r = { x: f.box.x + t.x, y: f.box.y + t.y, w: f.box.width, h: f.box.height, confianca: f.score };
      if (f.descriptor) r.descritor = compactar(f.descriptor);
      if (alvo === img || !tocaBordaInterna(r, t, largura, altura)) achados.push(r);
    }
  }
  return { largura, altura, rostos: semFundo(juntarRostos(achados)) };
}

const opcoesDe = faceapi => new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35, maxResults: 80 });

// Retorna { largura, altura, rostos: [{ x, y, w, h, confianca }] } em pixels da imagem.
export async function detectarRostos(dataURL) {
  const [faceapi, img] = await Promise.all([carregar(), imagem(dataURL)]);
  return procurarPorPartes(img, alvo => faceapi.detectAllFaces(alvo, opcoesDe(faceapi)));
}

// Retorna { largura, altura, rostos: [{ x, y, w, h, confianca, descritor: number[128] }] }.
export async function descreverRostos(dataURL) {
  const [faceapi, img] = await Promise.all([carregarReconhecimento(), imagem(dataURL)]);
  return procurarPorPartes(img, async alvo => (await faceapi.detectAllFaces(alvo, opcoesDe(faceapi)).withFaceLandmarks().withFaceDescriptors())
    .map(f => ({ box: f.detection.box, score: f.detection.score, descriptor: f.descriptor })));
}
