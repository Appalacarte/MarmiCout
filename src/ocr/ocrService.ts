/**
 * Service OCR gratuit, exécuté dans le navigateur de l'utilisateur (aucun envoi serveur).
 *
 * - Modèles PaddleOCR PP-OCRv5 mobile (détection 4,9 Mo + reconnaissance latine 7,6 Mo),
 *   téléchargés une seule fois puis gardés dans le Cache Storage.
 * - Pool de Web Workers : le worker 0 détecte, tous les workers lisent les lignes en parallèle.
 * - Préchargement possible dès l'ouverture du scanner (preloadOcr) pour un premier scan rapide.
 * - Gère les photos tournées (90°, 180°, 270°).
 */
import detModelUrl from './models/PP-OCRv5_mobile_det.ort?url';
import recModelUrl from './models/PP-OCRv5_mobile_rec_latin.onnx?url';
import clsModelUrl from './models/ppocr_mobile_v2_cls.onnx?url';
import dictText from './models/rec_latin_dict.txt?raw';
import { groupLines, type OcrItem, type OcrLine, type RotatedBox } from './ocrCore.ts';
import type {
  CropPayload, DetBandResult, DetectResult, PrepareResult, RecognizeResult, WorkerRequest,
} from './ocr.worker.ts';

export interface OcrResult {
  text: string;
  lines: OcrLine[];
  /** Confiance moyenne 0-100 */
  confidence: number;
  timings: { loadMs: number; detMs: number; recMs: number; totalMs: number };
}

export interface OcrOptions {
  /** Progression 0..1 (téléchargement des modèles puis lecture) */
  onProgress?: (fraction: number, stage: 'download' | 'detect' | 'recognize') => void;
}

const CACHE_NAME = 'marmicout-ocr-v1';
const DET_LIMIT = 1280;          // côté max de l'image analysée par le détecteur
const MIN_SCORE = 0.5;           // confiance minimale d'une zone lue
const IDLE_TIMEOUT_MS = 3 * 60_000;

type WorkerMessage = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, 'id'> : never) : never;

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

class OcrWorker {
  readonly worker: Worker;
  private seq = 0;
  private pending = new Map<number, Pending>();

  constructor() {
    this.worker = new Worker(new URL('./ocr.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      this.pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error || 'Erreur OCR'));
    };
    this.worker.onerror = (e) => {
      const err = new Error(e.message || 'Le worker OCR a planté');
      this.pending.forEach(p => p.reject(err));
      this.pending.clear();
    };
  }

  call<T>(msg: WorkerMessage, transfer: Transferable[] = []): Promise<T> {
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker.postMessage({ ...msg, id }, transfer);
    });
  }

  terminate() {
    this.worker.terminate();
    this.pending.forEach(p => p.reject(new Error('OCR arrêté')));
    this.pending.clear();
  }
}

let pool: OcrWorker[] | null = null;
let initPromise: Promise<OcrWorker[]> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let loadMsAtInit = 0;

/** Nombre de workers selon l'appareil (cœurs et mémoire). */
function poolSize(): number {
  const forced = Number((globalThis as { __MARMICOUT_OCR_WORKERS__?: number }).__MARMICOUT_OCR_WORKERS__);
  if (forced > 0) return forced;
  const cores = navigator.hardwareConcurrency || 2;
  // deviceMemory n'existe pas sur Safari : on se fie alors au nombre de cœurs
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? (cores >= 6 ? 6 : 4);
  const max = memory <= 2 ? 1 : memory <= 4 ? 2 : 3;
  // le fil principal reste presque inactif pendant la lecture : 2 workers même sur 2 cœurs
  return Math.max(1, Math.min(max, Math.max(2, cores - 1)));
}

/** Est-ce que ce navigateur peut faire tourner l'OCR local ? (sinon : repli Tesseract) */
export function isLocalOcrSupported(): boolean {
  try {
    return typeof Worker !== 'undefined'
      && typeof OffscreenCanvas !== 'undefined'
      && typeof createImageBitmap === 'function'
      && typeof WebAssembly === 'object'
      && WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 30, 1, 28, 0, 65, 0, 253, 15, 253, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 253, 186, 1, 26, 11])); // SIMD
  } catch {
    return false;
  }
}

/** Télécharge un fichier en le gardant dans le Cache Storage (un seul téléchargement par version). */
async function fetchCached(url: string, onBytes?: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  const absolute = new URL(url, location.href).href;
  let cache: Cache | null;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(absolute);
    if (hit) {
      const buf = await hit.arrayBuffer();
      onBytes?.(buf.byteLength, buf.byteLength);
      return buf;
    }
  } catch {
    cache = null; // navigation privée, stockage indisponible…
  }
  const response = await fetch(absolute);
  if (!response.ok) throw new Error(`Téléchargement du modèle OCR impossible (${response.status})`);
  const total = Number(response.headers.get('Content-Length')) || 0;
  let buf: ArrayBuffer;
  if (response.body && onBytes) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      onBytes(loaded, total);
    }
    const all = new Uint8Array(loaded);
    let offset = 0;
    for (const c of chunks) { all.set(c, offset); offset += c.byteLength; }
    buf = all.buffer;
  } else {
    buf = await response.arrayBuffer();
  }
  if (cache) {
    try {
      await cache.put(absolute, new Response(buf.slice(0), { headers: { 'Content-Type': 'application/octet-stream' } }));
      // Ménage : on supprime les anciennes versions des modèles
      const keep = new Set([detModelUrl, recModelUrl, clsModelUrl].map(u => new URL(u, location.href).href));
      for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);
    } catch { /* quota dépassé : tant pis, on retéléchargera */ }
  }
  return buf;
}

function scheduleIdleShutdown() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    pool?.forEach(w => w.terminate());
    pool = null;
    initPromise = null;
  }, IDLE_TIMEOUT_MS);
}

function ensurePool(onProgress?: OcrOptions['onProgress']): Promise<OcrWorker[]> {
  if (idleTimer) clearTimeout(idleTimer);
  if (pool) return Promise.resolve(pool);
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const t0 = performance.now();
    const sizes = { det: 0, rec: 0 };
    const loaded = { det: 0, rec: 0 };
    const report = () => {
      const total = (sizes.det || 4.9e6) + (sizes.rec || 7.7e6);
      onProgress?.(Math.min(1, (loaded.det + loaded.rec) / total), 'download');
    };
    const [detModel, recModel, clsModel] = await Promise.all([
      fetchCached(detModelUrl, (l, t) => { loaded.det = l; sizes.det = t; report(); }),
      fetchCached(recModelUrl, (l, t) => { loaded.rec = l; sizes.rec = t; report(); }),
      fetchCached(clsModelUrl),
    ]);
    const workers = Array.from({ length: poolSize() }, () => new OcrWorker());
    try {
      await Promise.all(workers.map((w, i) => w.call({
        type: 'init',
        clsModel: i === 0 ? clsModel.slice(0) : undefined,
        detModel: detModel.slice(0),
        recModel: recModel.slice(0),
        dictText,
      })));
    } catch (err) {
      workers.forEach(w => w.terminate());
      throw err;
    }
    loadMsAtInit = performance.now() - t0;
    pool = workers;
    return workers;
  })();
  initPromise.catch(() => { initPromise = null; });
  return initPromise;
}

/** À appeler à l'ouverture d'un écran de scan : télécharge et prépare l'OCR en arrière-plan. */
export function preloadOcr(): void {
  if (!isLocalOcrSupported()) return;
  ensurePool().then(scheduleIdleShutdown).catch(() => { /* on réessaiera au scan */ });
}

/** Répartit les découpes entre les workers en équilibrant la largeur totale (≈ temps de calcul). */
function distribute(crops: CropPayload[], n: number): CropPayload[][] {
  const buckets: CropPayload[][] = Array.from({ length: n }, () => []);
  const load = new Array(n).fill(0);
  [...crops].sort((a, b) => b.width - a.width).forEach(c => {
    let k = 0;
    for (let i = 1; i < n; i++) if (load[i] < load[k]) k = i;
    buckets[k].push(c);
    load[k] += c.width + 40; // + coût fixe par inférence
  });
  return buckets;
}

async function recognizeAll(workers: OcrWorker[], crops: CropPayload[], onDone: (n: number) => void) {
  const buckets = distribute(crops, workers.length);
  const out: RecognizeResult['results'] = [];
  const perWorkerMs = new Array(workers.length).fill(0);
  await Promise.all(buckets.map(async (bucket, i) => {
    // petits paquets : progression régulière et meilleur équilibrage
    for (let s = 0; s < bucket.length; s += 6) {
      const part = bucket.slice(s, s + 6);
      const res = await workers[i].call<RecognizeResult>({ type: 'recognize', crops: part }, part.map(c => c.data.buffer));
      out.push(...res.results);
      perWorkerMs[i] += res.recMs;
      onDone(res.results.length);
    }
  }));
  return { results: out, recMs: Math.max(...perWorkerMs) };
}

function assemble(boxes: RotatedBox[], results: RecognizeResult['results']) {
  const items: OcrItem[] = [];
  for (const r of results) {
    if (r.text && r.score >= MIN_SCORE) items.push({ text: r.text, score: r.score, box: boxes[r.index] });
  }
  const lines = groupLines(items);
  const confidence = items.length ? (100 * items.reduce((a, b) => a + b.score, 0)) / items.length : 0;
  return { lines, confidence, count: items.length };
}

/**
 * Lit le texte d'une image (photo de ticket, facture, recette).
 * Lève une erreur si l'OCR local n'est pas disponible : l'appelant peut alors se replier sur Tesseract.
 */
export async function recognizeImage(source: Blob | ImageBitmap, options: OcrOptions = {}): Promise<OcrResult> {
  if (!isLocalOcrSupported()) throw new Error('OCR local non supporté par ce navigateur');
  const t0 = performance.now();
  const wasReady = pool !== null;
  const workers = await ensurePool(options.onProgress);
  const loadMs = wasReady ? 0 : loadMsAtInit;
  const progress = (f: number, stage: 'detect' | 'recognize') => options.onProgress?.(f, stage);

  try {
    let bitmap: ImageBitmap | undefined = source instanceof ImageBitmap
      ? source
      : await createImageBitmap(source, { imageOrientation: 'from-image' } as ImageBitmapOptions);

    // Détection seule pour une orientation donnée (la lecture n'est faite qu'une fois, à la fin)
    const detect = async (rotation: 0 | 90 | 180 | 270) => {
      // 1. Préparation (worker 0) : l'image n'est transférée qu'au premier passage
      const prep = await workers[0].call<PrepareResult>(
        { type: 'prepare', bitmap, rotation, detLimit: DET_LIMIT, bands: workers.length },
        bitmap ? [bitmap] : [],
      );
      bitmap = undefined;
      // 2. Détection répartie : une bande par worker
      const probs = await Promise.all(prep.bands.map((band, i) =>
        workers[i % workers.length].call<DetBandResult>({ type: 'detBand', band }, [band.data.buffer]).then(r => r.prob)));
      // 3. Recollage, zones, sens de lecture et découpes (worker 0)
      return workers[0].call<DetectResult>({ type: 'finishDetect', probs }, probs.map(p => p.data.buffer));
    };

    const tDet = performance.now();
    progress(0.05, 'detect');
    let det = await detect(0);
    if (det.verticalRatio > 0.6) {
      // Photo prise de côté : on redresse d'un quart de tour, puis on vérifie le sens
      det = await detect(90);
      if (det.flipRatio > 0.5) det = await detect(270);
    } else if (det.flipRatio > 0.5) {
      // Photo à l'envers
      det = await detect(180);
    }
    const detMs = performance.now() - tDet;
    progress(0.25, 'detect');

    // 4. Lecture répartie sur tous les workers
    let done = 0;
    const totalCrops = det.crops.length || 1;
    const rec = await recognizeAll(workers, det.crops, n => { done += n; progress(0.25 + 0.75 * (done / totalCrops), 'recognize'); });
    const best = { detMs, rec, ...assemble(det.boxes, rec.results) };

    const totalMs = performance.now() - t0;
    return {
      text: best.lines.map(l => l.text).join('\n'),
      lines: best.lines,
      confidence: best.confidence,
      timings: { loadMs, detMs: best.detMs, recMs: best.rec.recMs, totalMs },
    };
  } finally {
    workers[0].call({ type: 'release' }).catch(() => undefined);
    scheduleIdleShutdown();
  }
}
