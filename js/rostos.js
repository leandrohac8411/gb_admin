// Rostos na foto da aula, tudo no próprio navegador (nada é enviado):
//  - detectarRostos: só ONDE há rostos (caixas), para contar;
//  - descreverRostos: também os 128 números de cada rosto, para reconhecer alunos cadastrados.
// Roda no próprio navegador com face-api (modelo SSD MobileNet, ~5,6 MB, servido pelo próprio site e baixado só na primeira análise).
import { compactar } from "./logica/reconhecimento.js";

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

// Retorna { largura, altura, rostos: [{ x, y, w, h, confianca, descritor: number[128] }] }.
export async function descreverRostos(dataURL) {
  const [faceapi, img] = await Promise.all([carregarReconhecimento(), imagem(dataURL)]);
  const opcoes = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35, maxResults: 80 });
  const achados = await faceapi.detectAllFaces(img, opcoes).withFaceLandmarks().withFaceDescriptors();
  return {
    largura: img.naturalWidth, altura: img.naturalHeight,
    rostos: achados.map(f => ({ x: f.detection.box.x, y: f.detection.box.y, w: f.detection.box.width, h: f.detection.box.height,
      confianca: f.detection.score, descritor: compactar(f.descriptor) }))
  };
}
