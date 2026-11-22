/**
 * Cœur de l'OCR PaddleOCR (PP-OCRv5 mobile) — fonctions pures, sans DOM.
 *
 * Utilisé par le Web Worker (src/ocr/ocr.worker.ts) et testable sous Node.
 * Pipeline : détection DB (carte de probabilité) → rectangles orientés →
 * découpe redressée de chaque ligne → reconnaissance CTC → regroupement en lignes.
 */

export interface RGBAImage {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

/** Rectangle orienté : centre, largeur (sens du texte), hauteur, angle en radians. */
export interface RotatedBox {
  cx: number;
  cy: number;
  w: number;
  h: number;
  angle: number;
  score: number;
}

export interface OcrItem {
  text: string;
  score: number;
  box: RotatedBox;
}

export interface OcrLine {
  text: string;
  score: number;
  items: OcrItem[];
}

// ---------------------------------------------------------------------------
// Détection
// ---------------------------------------------------------------------------

/**
 * Taille d'entrée du détecteur (multiples de 32) : côté max ≤ limit.
 * Les petites images sont agrandies (jusqu'à x2) pour que le texte fin reste détectable.
 */
export function detInputSize(width: number, height: number, limit: number, minSide = 960): { w: number; h: number } {
  let scale = Math.min(limit / Math.max(width, height), Math.max(1, minSide / Math.min(width, height)));
  scale = Math.min(scale, 2);
  const w = Math.max(32, Math.round((width * scale) / 32) * 32);
  const h = Math.max(32, Math.round((height * scale) / 32) * 32);
  return { w, h };
}

/**
 * Étirement automatique du contraste (percentiles 1 % / 99 % de la luminance), en place.
 * Rattrape les tickets thermiques pâlis et les photos sous-exposées.
 */
export function autoContrast(img: RGBAImage): void {
  const { data } = img;
  const hist = new Uint32Array(256);
  const step = data.length > 4_000_000 ? 16 : 4; // échantillonnage sur les grandes images
  let total = 0;
  for (let i = 0; i < data.length; i += step) {
    hist[(data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8]++;
    total++;
  }
  const lowTarget = total * 0.01, highTarget = total * 0.99;
  let acc = 0, lo = 0, hi = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= lowTarget) { lo = v; break; } }
  acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= highTarget) { hi = v; break; } }
  if (hi - lo < 20 || hi - lo > 235) return; // déjà contrasté ou image uniforme
  const lut = new Uint8Array(256);
  const k = 255 / (hi - lo);
  for (let v = 0; v < 256; v++) lut[v] = Math.max(0, Math.min(255, Math.round((v - lo) * k)));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
}

const DET_MEAN = [0.485, 0.456, 0.406];
const DET_STD = [0.229, 0.224, 0.225];

/** Image RGBA (déjà à la taille du détecteur) → tenseur CHW float32, ordre BGR comme PaddleOCR. */
export function toDetTensor(img: RGBAImage): Float32Array {
  const { data, width, height } = img;
  const plane = width * height;
  const out = new Float32Array(3 * plane);
  // Coefficients précalculés : (v/255 - mean) / std = v * a + b
  const a = [0, 1, 2].map(c => 1 / (255 * DET_STD[c]));
  const b = [0, 1, 2].map(c => -DET_MEAN[c] / DET_STD[c]);
  for (let i = 0, p = 0; p < plane; p++, i += 4) {
    const r = data[i], g = data[i + 1], bl = data[i + 2];
    // canal 0 = B, 1 = G, 2 = R (lecture cv2 en BGR côté Paddle)
    out[p] = bl * a[0] + b[0];
    out[plane + p] = g * a[1] + b[1];
    out[2 * plane + p] = r * a[2] + b[2];
  }
  return out;
}

export interface DbOptions {
  thresh: number;       // binarisation de la carte de probabilité
  boxThresh: number;    // score moyen minimal d'une zone
  unclipRatio: number;  // dilatation des zones (le DB rétrécit le texte)
  minSize: number;      // côté minimal (pixels de la carte)
  maxBoxes: number;
}

export const DEFAULT_DB_OPTIONS: DbOptions = {
  thresh: 0.3,
  boxThresh: 0.55,
  unclipRatio: 1.6,
  minSize: 3,
  maxBoxes: 1000,
};

/**
 * Post-traitement DB : composantes connexes de la carte binarisée,
 * rectangle d'aire minimale (enveloppe convexe + rotating calipers), dilatation.
 * Les coordonnées renvoyées sont dans le repère de l'image d'origine.
 */
export function dbPostprocess(
  prob: Float32Array,
  mapW: number,
  mapH: number,
  origW: number,
  origH: number,
  opts: DbOptions = DEFAULT_DB_OPTIONS,
): RotatedBox[] {
  const n = mapW * mapH;
  const labels = new Int32Array(n); // 0 = fond, -1 = à visiter
  for (let i = 0; i < n; i++) labels[i] = prob[i] > opts.thresh ? -1 : 0;

  const sums: number[] = [0];
  const counts: number[] = [0];
  const stack = new Int32Array(n);
  let next = 1;

  // Étiquetage 8-connexe par pile (pas de récursion)
  for (let start = 0; start < n; start++) {
    if (labels[start] !== -1) continue;
    const label = next++;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = label;
    let sum = 0, count = 0;
    while (sp > 0) {
      const idx = stack[--sp];
      sum += prob[idx];
      count++;
      const x = idx % mapW;
      const y = (idx - x) / mapW;
      const x0 = x > 0 ? x - 1 : x, x1 = x < mapW - 1 ? x + 1 : x;
      const y0 = y > 0 ? y - 1 : y, y1 = y < mapH - 1 ? y + 1 : y;
      for (let yy = y0; yy <= y1; yy++) {
        const row = yy * mapW;
        for (let xx = x0; xx <= x1; xx++) {
          const j = row + xx;
          if (labels[j] === -1) {
            labels[j] = label;
            stack[sp++] = j;
          }
        }
      }
    }
    sums.push(sum);
    counts.push(count);
  }

  const numLabels = next - 1;
  if (numLabels === 0) return [];

  // Points de bord des segments horizontaux (suffisent pour l'enveloppe convexe)
  const pts: number[][] = new Array(next);
  for (let l = 1; l < next; l++) pts[l] = [];
  for (let y = 0; y < mapH; y++) {
    const row = y * mapW;
    for (let x = 0; x < mapW; x++) {
      const l = labels[row + x];
      if (l <= 0) continue;
      const left = x > 0 ? labels[row + x - 1] : 0;
      const right = x < mapW - 1 ? labels[row + x + 1] : 0;
      if (left !== l) { pts[l].push(x, y, x, y + 1); }
      if (right !== l) { pts[l].push(x + 1, y, x + 1, y + 1); }
    }
  }

  const sx = origW / mapW;
  const sy = origH / mapH;
  const boxes: RotatedBox[] = [];

  for (let l = 1; l < next; l++) {
    if (counts[l] < 4) continue;
    const score = sums[l] / counts[l];
    if (score < opts.boxThresh) continue;
    const hull = convexHull(pts[l]);
    if (hull.length < 3) continue;
    const r = minAreaRect(hull);
    if (Math.min(r.w, r.h) < opts.minSize) continue;
    // Dilatation (équivalent de l'« unclip » Clipper de PaddleOCR)
    const area = r.w * r.h;
    const perim = 2 * (r.w + r.h);
    const d = (area * opts.unclipRatio) / perim;
    let w = r.w + 2 * d;
    let h = r.h + 2 * d;
    if (Math.min(w, h) < opts.minSize + 2) continue;
    // Passage au repère de l'image d'origine (échelles x/y éventuellement différentes)
    const cos = Math.cos(r.angle), sin = Math.sin(r.angle);
    const ux = cos * sx, uy = sin * sy;      // axe largeur
    const vx = -sin * sx, vy = cos * sy;     // axe hauteur
    const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    w *= lu;
    h *= lv;
    let angle = Math.atan2(uy, ux);
    // Le sens « largeur » doit être le plus horizontal possible
    if (angle > Math.PI / 2) angle -= Math.PI;
    if (angle <= -Math.PI / 2) angle += Math.PI;
    if (angle > Math.PI / 4) { angle -= Math.PI / 2; const t = w; w = h; h = t; }
    else if (angle < -Math.PI / 4) { angle += Math.PI / 2; const t = w; w = h; h = t; }
    boxes.push({ cx: r.cx * sx, cy: r.cy * sy, w, h, angle, score });
    if (boxes.length >= opts.maxBoxes) break;
  }
  return boxes;
}

/** Enveloppe convexe (chaîne monotone d'Andrew). Entrée : [x0,y0,x1,y1,...]. */
export function convexHull(flat: number[]): [number, number][] {
  const p: [number, number][] = [];
  for (let i = 0; i < flat.length; i += 2) p.push([flat[i], flat[i + 1]]);
  p.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  if (p.length < 3) return p;
  const cross = (o: number[], a: number[], b: number[]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
    lower.push(pt);
  }
  const upper: [number, number][] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const pt = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
    upper.push(pt);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Rectangle d'aire minimale d'une enveloppe convexe (un côté du rectangle porte une arête). */
export function minAreaRect(hull: [number, number][]): { cx: number; cy: number; w: number; h: number; angle: number } {
  let best = { area: Infinity, cx: 0, cy: 0, w: 0, h: 0, angle: 0 };
  const m = hull.length;
  for (let i = 0; i < m; i++) {
    const a = hull[i], b = hull[(i + 1) % m];
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    if (len === 0) continue;
    const ux = ex / len, uy = ey / len;
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const q of hull) {
      const u = q[0] * ux + q[1] * uy;
      const v = -q[0] * uy + q[1] * ux;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const w = maxU - minU, h = maxV - minV;
    const area = w * h;
    if (area < best.area) {
      const cu = (minU + maxU) / 2, cv = (minV + maxV) / 2;
      best = { area, cx: cu * ux - cv * uy, cy: cu * uy + cv * ux, w, h, angle: Math.atan2(uy, ux) };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Reconnaissance
// ---------------------------------------------------------------------------

export const REC_HEIGHT = 48;
export const REC_MIN_WIDTH = 64;
export const REC_MAX_WIDTH = 2400;
export const CLS_WIDTH = 192;

/** Largeur de la découpe redimensionnée à 48 px de haut. */
export function recCropWidth(box: RotatedBox): number {
  const vertical = box.h / box.w >= 1.5;
  const w = vertical ? box.h : box.w;
  const h = vertical ? box.w : box.h;
  return Math.max(8, Math.min(REC_MAX_WIDTH, Math.round((REC_HEIGHT * w) / Math.max(1, h))));
}

/**
 * Découpe redressée d'une zone, échantillonnée en bilinéaire directement dans le tenseur
 * de reconnaissance (CHW, BGR, normalisé (v/255-0.5)/0.5). Le reste de la ligne est laissé à 0.
 */
export function cropToRecTensor(
  img: RGBAImage,
  box: RotatedBox,
  out: Float32Array,
  offset: number,
  tensorW: number,
  maxWidth?: number,
): void {
  const { data, width, height } = img;
  const vertical = box.h / box.w >= 1.5;
  const cropW = recCropWidth(box);
  // maxWidth : la découpe est comprimée horizontalement au-delà (classifieur d'orientation)
  const outW = Math.min(cropW, tensorW, maxWidth ?? Infinity);
  const H = REC_HEIGHT;
  // Dimensions de la zone dans le sens de lecture
  const srcW = vertical ? box.h : box.w;
  const srcH = vertical ? box.w : box.h;
  // Axe de lecture (u) et axe vertical (v) dans l'image
  let ux = Math.cos(box.angle), uy = Math.sin(box.angle);
  let vx = -uy, vy = ux;
  if (vertical) {
    // texte vertical : lecture de haut en bas → rotation de 90°
    const tx = ux, ty = uy;
    ux = -vx; uy = -vy; vx = tx; vy = ty;
  }
  const su = srcW / outW;   // pixels source par pixel de sortie (lecture)
  const sv = srcH / H;      // pixels source par pixel de sortie (vertical)
  // Sur-échantillonnage quand on réduit fortement (anti-crénelage simple)
  const ss = Math.max(su, sv) > 1.8 ? 2 : 1;
  const plane = H * tensorW;
  const x0 = box.cx - (ux * srcW) / 2 - (vx * srcH) / 2;
  const y0 = box.cy - (uy * srcW) / 2 - (vy * srcH) / 2;
  const inv = 1 / (ss * ss);
  const k = 2 / 255;
  for (let v = 0; v < H; v++) {
    for (let u = 0; u < outW; u++) {
      let r = 0, g = 0, b = 0;
      for (let a = 0; a < ss; a++) {
        const fv = (v + (a + 0.5) / ss) * sv;
        for (let c = 0; c < ss; c++) {
          const fu = (u + (c + 0.5) / ss) * su;
          let x = x0 + ux * fu + vx * fv - 0.5;
          let y = y0 + uy * fu + vy * fv - 0.5;
          if (x < 0) x = 0; else if (x > width - 1) x = width - 1;
          if (y < 0) y = 0; else if (y > height - 1) y = height - 1;
          const xi = x | 0, yi = y | 0;
          const xf = x - xi, yf = y - yi;
          const xi1 = xi < width - 1 ? xi + 1 : xi;
          const yi1 = yi < height - 1 ? yi + 1 : yi;
          const i00 = (yi * width + xi) * 4, i10 = (yi * width + xi1) * 4;
          const i01 = (yi1 * width + xi) * 4, i11 = (yi1 * width + xi1) * 4;
          const w00 = (1 - xf) * (1 - yf), w10 = xf * (1 - yf), w01 = (1 - xf) * yf, w11 = xf * yf;
          r += data[i00] * w00 + data[i10] * w10 + data[i01] * w01 + data[i11] * w11;
          g += data[i00 + 1] * w00 + data[i10 + 1] * w10 + data[i01 + 1] * w01 + data[i11 + 1] * w11;
          b += data[i00 + 2] * w00 + data[i10 + 2] * w10 + data[i01 + 2] * w01 + data[i11 + 2] * w11;
        }
      }
      const p = offset + v * tensorW + u;
      out[p] = b * inv * k - 1;
      out[plane + p] = g * inv * k - 1;
      out[2 * plane + p] = r * inv * k - 1;
    }
  }
}

/**
 * Charge le dictionnaire et renvoie la table « classe → caractère » (classe 0 = blank CTC).
 * Gère les deux formats rencontrés : fichier contenant déjà le blank et l'espace
 * (autant de lignes que de classes), ou dictionnaire « nu » de PaddleOCR.
 */
export function parseDict(text: string, numClasses: number): string[] {
  const lines = text.split(/\r?\n/);
  while (lines.length > numClasses - 2 && lines[lines.length - 1] === '') lines.pop();
  if (lines.length >= numClasses) return lines.slice(0, numClasses);
  const table = ['', ...lines];
  while (table.length < numClasses) table.push(' ');
  return table;
}

/** Décodage CTC glouton d'un élément du lot. */
export function ctcDecode(
  logits: Float32Array,
  batchIndex: number,
  steps: number,
  classes: number,
  dict: string[],
): { text: string; score: number } {
  let text = '';
  let scoreSum = 0, kept = 0;
  let prev = -1;
  const base = batchIndex * steps * classes;
  for (let t = 0; t < steps; t++) {
    const o = base + t * classes;
    let best = 0, bestV = logits[o];
    for (let c = 1; c < classes; c++) {
      const v = logits[o + c];
      if (v > bestV) { bestV = v; best = c; }
    }
    if (best !== 0 && best !== prev) {
      const ch = dict[best];
      if (ch !== undefined) {
        text += ch;
        scoreSum += bestV;
        kept++;
      }
    }
    prev = best;
  }
  return { text, score: kept ? scoreSum / kept : 0 };
}

// ---------------------------------------------------------------------------
// Regroupement en lignes
// ---------------------------------------------------------------------------

/** Remplace les caractères « exotiques » fréquents par leurs équivalents latins. */
export function normalizeText(s: string): string {
  return s
    .replace(/[\u3000\u00a0]/g, ' ')
    .replace(/[，]/g, ',')
    .replace(/[．。]/g, '.')
    .replace(/[：]/g, ':')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[－—–]/g, '-')
    .replace(/[＊]/g, '*')
    .replace(/[％]/g, '%')
    .replace(/[／]/g, '/')
    .replace(/[×]/g, 'x')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Corrections fréquentes et sans risque sur une ligne de texte français (tickets, recettes). */
export function fixFrenchLine(s: string): string {
  return s
    .replace(/\bI'(?=[a-zà-ÿ])/g, "l'")                 // I'ail → l'ail
    .replace(/([A-Z])0(?=[A-Z])/g, '$1O')               // D0UX → DOUX
    .replace(/([A-Z]{2})0\b/g, '$1O')
    .replace(/(\d)\s?[,.]\s(\d{2})(?!\d)/g, '$1,$2')    // 1, 15 → 1,15
    .replace(/(\d)\s?\*\s?C\b/g, '$1 °C')                // 180 *C → 180 °C
    .replace(/\bjusqu'a\b/g, "jusqu'à");
}

/**
 * Regroupe les zones en lignes de lecture (ticket légèrement penché compris) :
 * on redresse les centres selon l'angle médian, puis on fusionne les zones
 * qui se chevauchent verticalement.
 */
export function groupLines(items: OcrItem[]): OcrLine[] {
  if (items.length === 0) return [];
  const angles = items
    .filter(it => it.box.w > 2 * it.box.h)
    .map(it => it.box.angle)
    .sort((a, b) => a - b);
  const theta = angles.length ? angles[angles.length >> 1] : 0;
  const c = Math.cos(theta), s = Math.sin(theta);
  const prepared = items.map(it => {
    const x = c * it.box.cx + s * it.box.cy;
    const y = -s * it.box.cx + c * it.box.cy;
    const vertical = it.box.h / it.box.w >= 1.5;
    const h = vertical ? it.box.w : it.box.h;
    const w = vertical ? it.box.h : it.box.w;
    return { it, x, y, h, w };
  }).sort((a, b) => a.y - b.y);

  const rows: { y: number; h: number; members: typeof prepared }[] = [];
  for (const p of prepared) {
    let target: (typeof rows)[number] | null = null;
    let bestDist = Infinity;
    for (let r = rows.length - 1; r >= 0 && r >= rows.length - 4; r--) {
      const row = rows[r];
      const dist = Math.abs(row.y - p.y);
      if (dist < 0.5 * Math.min(row.h, p.h) && dist < bestDist) {
        bestDist = dist;
        target = row;
      }
    }
    if (target) {
      const n = target.members.length;
      target.y = (target.y * n + p.y) / (n + 1);
      target.h = (target.h * n + p.h) / (n + 1);
      target.members.push(p);
    } else {
      rows.push({ y: p.y, h: p.h, members: [p] });
    }
  }

  return rows.map(row => {
    row.members.sort((a, b) => a.x - b.x);
    let text = '';
    let prevRight = -Infinity;
    for (const m of row.members) {
      const left = m.x - m.w / 2;
      if (text) {
        // grand écart (ex. libellé ... prix) → double espace, utile au découpage
        text += left - prevRight > 1.2 * row.h ? '  ' : ' ';
      }
      text += m.it.text;
      prevRight = m.x + m.w / 2;
    }
    const score = row.members.reduce((acc, m) => acc + m.it.score, 0) / row.members.length;
    return { text: fixFrenchLine(text), score, items: row.members.map(m => m.it) };
  });
}
