/// <reference lib="webworker" />
/**
 * Web Worker OCR (PaddleOCR PP-OCRv5 mobile, ONNX Runtime Web / WebAssembly).
 *
 * Le service (ocrService.ts) orchestre plusieurs workers identiques :
 *  - « prepare »      (worker 0) : décode l'image, corrige le contraste, prépare l'entrée du
 *                                  détecteur découpée en bandes horizontales qui se chevauchent ;
 *  - « detBand »      (tous)     : détection sur une bande → carte de probabilité ;
 *  - « finishDetect » (worker 0) : recolle les bandes, extrait les zones et les découpes redressées ;
 *  - « recognize »    (tous)     : lecture des découpes (CTC).
 * Sans SharedArrayBuffer (pas d'isolation cross-origin), c'est ce découpage qui permet
 * d'utiliser plusieurs cœurs.
 */
import * as ort from 'onnxruntime-web/wasm';
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import {
  type RGBAImage,
  type RotatedBox,
  autoContrast,
  ctcDecode,
  dbPostprocess,
  detInputSize,
  normalizeText,
  parseDict,
  recCropWidth,
  cropToRecTensor,
  toDetTensor,
  CLS_WIDTH,
  REC_HEIGHT,
  REC_MIN_WIDTH,
} from './ocrCore.ts';

declare const self: DedicatedWorkerGlobalScope;

ort.env.wasm.wasmPaths = { wasm: ortWasmUrl };
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.logLevel = 'error';

let det: ort.InferenceSession | null = null;
let rec: ort.InferenceSession | null = null;
let cls: ort.InferenceSession | null = null;
let dict: string[] = [];

/** Côté max de l'image gardée en mémoire pour les découpes (qualité / mémoire). */
const MAX_WORK_SIDE = 2560;
/** Recouvrement entre bandes de détection (pixels de l'entrée du détecteur, multiple de 32). */
const BAND_OVERLAP = 64;

// État du document en cours (worker 0 uniquement)
let currentBitmap: ImageBitmap | null = null;
let work: RGBAImage | null = null;
let detW = 0, detH = 0;
let bandCores: { y0: number; y1: number }[] = [];
let prepareMs = 0;

export interface Band {
  /** Début de la bande (ligne de l'entrée détecteur) */
  top: number;
  height: number;
  width: number;
  data: Float32Array;
}

export interface ProbBand {
  top: number;
  height: number;
  width: number;
  data: Float32Array;
}

export interface CropPayload {
  index: number;
  width: number;
  data: Float32Array;
}

export type WorkerRequest =
  | { id: number; type: 'init'; detModel: ArrayBuffer; recModel: ArrayBuffer; clsModel?: ArrayBuffer; dictText: string }
  | { id: number; type: 'prepare'; bitmap?: ImageBitmap; rotation: 0 | 90 | 180 | 270; detLimit: number; bands: number }
  | { id: number; type: 'detBand'; band: Band }
  | { id: number; type: 'finishDetect'; probs: ProbBand[] }
  | { id: number; type: 'recognize'; crops: CropPayload[] }
  | { id: number; type: 'release' };

export interface PrepareResult { bands: Band[]; prepareMs: number }
export interface DetBandResult { prob: ProbBand; ms: number }
export interface DetectResult {
  boxes: RotatedBox[];
  crops: CropPayload[];
  /** Part des lignes allongées qui sont verticales (photo prise de côté) */
  verticalRatio: number;
  /** Part des lignes échantillonnées lues « à l'envers » par le classifieur (photo retournée) */
  flipRatio: number;
  postMs: number;
}
export interface RecognizeResult {
  results: { index: number; text: string; score: number }[];
  recMs: number;
}

const sessionOptions: ort.InferenceSession.SessionOptions = {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
};

async function handleInit(msg: Extract<WorkerRequest, { type: 'init' }>) {
  if (!det) det = await ort.InferenceSession.create(new Uint8Array(msg.detModel), sessionOptions);
  if (msg.clsModel && !cls) cls = await ort.InferenceSession.create(new Uint8Array(msg.clsModel), sessionOptions);
  if (!rec) {
    rec = await ort.InferenceSession.create(new Uint8Array(msg.recModel), sessionOptions);
    const meta = rec.outputMetadata?.[0] as { shape?: (number | string)[] } | undefined;
    const classes = typeof meta?.shape?.[2] === 'number' ? (meta.shape[2] as number) : msg.dictText.split('\n').length;
    dict = parseDict(msg.dictText, classes);
  }
  // Préchauffage : la première inférence alloue la mémoire et prépare les noyaux
  const warmRec = new ort.Tensor('float32', new Float32Array(3 * REC_HEIGHT * 96), [1, 3, REC_HEIGHT, 96]);
  await rec.run({ [rec.inputNames[0]]: warmRec });
  const warmDet = new ort.Tensor('float32', new Float32Array(3 * 64 * 64), [1, 3, 64, 64]);
  await det.run({ [det.inputNames[0]]: warmDet });
  return { ok: true };
}

function drawRotated(bitmap: ImageBitmap, rotation: number, maxSide: number) {
  const swap = rotation === 90 || rotation === 270;
  const srcW = swap ? bitmap.height : bitmap.width;
  const srcH = swap ? bitmap.width : bitmap.height;
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(w / 2, h / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  const dw = swap ? h : w, dh = swap ? w : h;
  ctx.drawImage(bitmap, -dw / 2, -dh / 2, dw, dh);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas, ctx };
}

function handlePrepare(msg: Extract<WorkerRequest, { type: 'prepare' }>): { result: PrepareResult; transfer: Transferable[] } {
  const t0 = performance.now();
  if (msg.bitmap) {
    currentBitmap?.close();
    currentBitmap = msg.bitmap;
  }
  if (!currentBitmap) throw new Error('Aucune image à analyser');

  // 1. Image de travail (pleine résolution plafonnée), contraste corrigé
  const { canvas, ctx } = drawRotated(currentBitmap, msg.rotation, MAX_WORK_SIDE);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  autoContrast(imageData);
  ctx.putImageData(imageData, 0, 0);
  work = imageData;

  // 2. Entrée du détecteur
  const size = detInputSize(canvas.width, canvas.height, msg.detLimit);
  detW = size.w;
  detH = size.h;
  const small = new OffscreenCanvas(detW, detH);
  const sctx = small.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(canvas, 0, 0, detW, detH);
  const tensor = toDetTensor(sctx.getImageData(0, 0, detW, detH));

  // 3. Découpage en bandes horizontales (multiples de 32) avec recouvrement
  const rows32 = detH / 32;
  const n = Math.max(1, Math.min(msg.bands, Math.floor(rows32 / 4), detW * detH < 300_000 ? 1 : msg.bands));
  const core = Math.ceil(rows32 / n) * 32;
  bandCores = [];
  const bands: Band[] = [];
  const plane = detW * detH;
  for (let i = 0; i < n; i++) {
    const y0 = i * core, y1 = Math.min(detH, (i + 1) * core);
    if (y0 >= y1) break;
    bandCores.push({ y0, y1 });
    const top = Math.max(0, y0 - BAND_OVERLAP);
    const bottom = Math.min(detH, y1 + BAND_OVERLAP);
    const height = bottom - top;
    const bandPlane = height * detW;
    const data = new Float32Array(3 * bandPlane);
    for (let c = 0; c < 3; c++) {
      data.set(tensor.subarray(c * plane + top * detW, c * plane + bottom * detW), c * bandPlane);
    }
    bands.push({ top, height, width: detW, data });
  }
  prepareMs = performance.now() - t0;
  return { result: { bands, prepareMs }, transfer: bands.map(b => b.data.buffer) };
}

async function handleDetBand(msg: Extract<WorkerRequest, { type: 'detBand' }>): Promise<{ result: DetBandResult; transfer: Transferable[] }> {
  if (!det) throw new Error('Modèle de détection non chargé');
  const t0 = performance.now();
  const { band } = msg;
  const input = new ort.Tensor('float32', band.data, [1, 3, band.height, band.width]);
  const out = await det.run({ [det.inputNames[0]]: input });
  const probT = out[det.outputNames[0]];
  const data = probT.data as Float32Array;
  input.dispose();
  const prob: ProbBand = { top: band.top, height: band.height, width: band.width, data };
  return { result: { prob, ms: performance.now() - t0 }, transfer: [data.buffer] };
}

/**
 * Sens de lecture : le classifieur PaddleOCR (0° / 180°) est appliqué aux lignes
 * les plus longues ; renvoie la part des lignes jugées à l'envers.
 */
async function estimateFlip(image: RGBAImage, boxes: RotatedBox[]): Promise<number> {
  if (!cls || boxes.length === 0) return 0;
  const sample = boxes
    .filter(b => Math.max(b.w, b.h) > 2.5 * Math.min(b.w, b.h))
    .sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h))
    .slice(0, 8);
  if (sample.length === 0) return 0;
  const per = 3 * REC_HEIGHT * CLS_WIDTH;
  const buf = new Float32Array(per * sample.length);
  sample.forEach((box, k) => cropToRecTensor(image, box, buf, k * per, CLS_WIDTH, CLS_WIDTH));
  const input = new ort.Tensor('float32', buf, [sample.length, 3, REC_HEIGHT, CLS_WIDTH]);
  const out = await cls.run({ [cls.inputNames[0]]: input });
  const probs = out[cls.outputNames[0]].data as Float32Array;
  let flipped = 0;
  for (let k = 0; k < sample.length; k++) if (probs[2 * k + 1] > 0.8) flipped++;
  input.dispose();
  return flipped / sample.length;
}

async function handleFinishDetect(msg: Extract<WorkerRequest, { type: 'finishDetect' }>): Promise<{ result: DetectResult; transfer: Transferable[] }> {
  if (!work) throw new Error('Aucune image préparée');
  const t0 = performance.now();
  // Recollage : chaque bande fournit uniquement sa partie centrale
  const prob = new Float32Array(detW * detH);
  for (const core of bandCores) {
    const band = msg.probs.find(p => p.top <= core.y0 && p.top + p.height >= core.y1);
    if (!band) throw new Error('Bande de détection manquante');
    const from = (core.y0 - band.top) * detW;
    const to = (core.y1 - band.top) * detW;
    prob.set(band.data.subarray(from, to), core.y0 * detW);
  }
  const image = work;
  const boxes = dbPostprocess(prob, detW, detH, image.width, image.height);

  // Découpes redressées, prêtes pour la reconnaissance
  const crops: CropPayload[] = boxes.map((box, index) => {
    const width = Math.max(REC_MIN_WIDTH, Math.ceil(recCropWidth(box) / 8) * 8);
    const data = new Float32Array(3 * REC_HEIGHT * width);
    cropToRecTensor(image, box, data, 0, width);
    return { index, width, data };
  });

  const elongated = boxes.filter(b => Math.max(b.w, b.h) > 2 * Math.min(b.w, b.h));
  const verticalRatio = elongated.length ? elongated.filter(b => b.h > b.w).length / elongated.length : 0;
  const flipRatio = verticalRatio > 0.6 ? 0 : await estimateFlip(image, boxes);
  return {
    result: { boxes, crops, verticalRatio, flipRatio, postMs: performance.now() - t0 },
    transfer: crops.map(c => c.data.buffer),
  };
}

async function handleRecognize(msg: Extract<WorkerRequest, { type: 'recognize' }>): Promise<RecognizeResult> {
  if (!rec) throw new Error('Modèle de reconnaissance non chargé');
  const t0 = performance.now();
  const results: RecognizeResult['results'] = [];
  for (const crop of msg.crops) {
    const input = new ort.Tensor('float32', crop.data, [1, 3, REC_HEIGHT, crop.width]);
    const out = await rec.run({ [rec.inputNames[0]]: input });
    const logits = out[rec.outputNames[0]];
    const [, steps, classes] = logits.dims as number[];
    const { text, score } = ctcDecode(logits.data as Float32Array, 0, steps, classes, dict);
    logits.dispose();
    input.dispose();
    results.push({ index: crop.index, text: normalizeText(text), score });
  }
  return { results, recMs: performance.now() - t0 };
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case 'init':
        self.postMessage({ id: msg.id, ok: true, result: await handleInit(msg) });
        break;
      case 'prepare': {
        const { result, transfer } = handlePrepare(msg);
        self.postMessage({ id: msg.id, ok: true, result }, transfer);
        break;
      }
      case 'detBand': {
        const { result, transfer } = await handleDetBand(msg);
        self.postMessage({ id: msg.id, ok: true, result }, transfer);
        break;
      }
      case 'finishDetect': {
        const { result, transfer } = await handleFinishDetect(msg);
        self.postMessage({ id: msg.id, ok: true, result }, transfer);
        break;
      }
      case 'recognize':
        self.postMessage({ id: msg.id, ok: true, result: await handleRecognize(msg) });
        break;
      case 'release':
        currentBitmap?.close();
        currentBitmap = null;
        work = null;
        self.postMessage({ id: msg.id, ok: true, result: { ok: true } });
        break;
    }
  } catch (err) {
    self.postMessage({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
