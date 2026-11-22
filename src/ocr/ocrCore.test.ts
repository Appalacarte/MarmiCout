// Tests du cœur OCR (sans modèle) : node --experimental-strip-types src/ocr/ocrCore.test.ts
import {
  ctcDecode,
  dbPostprocess,
  detInputSize,
  fixFrenchLine,
  groupLines,
  minAreaRect,
  parseDict,
  type OcrItem,
} from './ocrCore.ts';

// mini-assertions (pas de dépendance aux types Node dans le projet)
const assert = {
  ok(cond: unknown, msg = 'assertion échouée') { if (!cond) throw new Error(msg); },
  equal(a: unknown, b: unknown) { if (a !== b) throw new Error(`attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`); },
  deepEqual(a: unknown, b: unknown) {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`);
  },
};

let passed = 0;
const test = (name: string, fn: () => void) => {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    throw err;
  }
};

test('detInputSize : multiples de 32, côté max plafonné', () => {
  const s = detInputSize(3000, 4000, 1280);
  assert.equal(s.h, 1280);
  assert.equal(s.w % 32, 0);
  assert.ok(Math.abs(s.w - 960) <= 32);
});

test('detInputSize : petite image agrandie (x2 max)', () => {
  const s = detInputSize(400, 500, 1280);
  assert.equal(s.w, 800);
  assert.equal(s.h, 992);
});

test('parseDict : dictionnaire « nu » → blank + caractères + espace', () => {
  const t = parseDict('a\nb\nc\n', 5);
  assert.deepEqual(t, ['', 'a', 'b', 'c', ' ']);
});

test('parseDict : dictionnaire complet (une ligne par classe)', () => {
  const t = parseDict('<blank>\na\nb\n \n', 4);
  assert.deepEqual(t, ['<blank>', 'a', 'b', ' ']);
});

test('ctcDecode : fusion des répétitions et blanks', () => {
  const dict = ['', 'A', 'B', ' '];
  // pas de temps : A A blank A B blank
  const seq = [1, 1, 0, 1, 2, 0];
  const logits = new Float32Array(seq.length * 4);
  seq.forEach((c, t) => { logits[t * 4 + c] = 0.9; });
  const r = ctcDecode(logits, 0, seq.length, 4, dict);
  assert.equal(r.text, 'AAB');
  assert.ok(Math.abs(r.score - 0.9) < 1e-6);
});

test('minAreaRect : rectangle tourné de 30°', () => {
  const a = Math.PI / 6, w = 100, h = 20;
  const c = Math.cos(a), s = Math.sin(a);
  const pts: [number, number][] = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
    .map(([x, y]) => [x * c - y * s + 200, x * s + y * c + 100]);
  const r = minAreaRect(pts);
  assert.ok(Math.abs(r.w * r.h - w * h) < 1);
  assert.ok(Math.abs(r.cx - 200) < 1e-6 && Math.abs(r.cy - 100) < 1e-6);
});

test('dbPostprocess : deux lignes de texte sur la carte', () => {
  const W = 200, H = 100;
  const prob = new Float32Array(W * H);
  const fill = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) prob[y * W + x] = 0.95;
  };
  fill(10, 10, 150, 20);
  fill(10, 50, 90, 60);
  const boxes = dbPostprocess(prob, W, H, 400, 200);
  assert.equal(boxes.length, 2);
  const [b1] = boxes;
  assert.ok(b1.w > b1.h, 'la largeur suit le sens du texte');
  assert.ok(Math.abs(b1.cx - 160) < 4 && Math.abs(b1.cy - 30) < 4, `centre ${b1.cx},${b1.cy}`);
});

test('groupLines : libellé et prix sur la même ligne, ordre de lecture', () => {
  const item = (text: string, cx: number, cy: number, w: number): OcrItem =>
    ({ text, score: 0.9, box: { cx, cy, w, h: 20, angle: 0.02, score: 0.9 } });
  const lines = groupLines([
    item('2,49', 400, 103, 60),
    item('BEURRE DOUX', 100, 100, 180),
    item('TOTAL', 80, 160, 90),
    item('13,89', 400, 158, 70),
  ]);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].text, 'BEURRE DOUX  2,49');
  assert.equal(lines[1].text, 'TOTAL  13,89');
});

test('fixFrenchLine : corrections courantes', () => {
  assert.equal(fixFrenchLine("avec I'ail"), "avec l'ail");
  assert.equal(fixFrenchLine('BEURRE D0UX 250G'), 'BEURRE DOUX 250G');
  assert.equal(fixFrenchLine('2 x 1, 15'), '2 x 1,15');
  assert.equal(fixFrenchLine('four à 180 *C.'), 'four à 180 °C.');
  assert.equal(fixFrenchLine('TEL 05 61 00 00'), 'TEL 05 61 00 00');
  assert.equal(fixFrenchLine('X12  3,89'), 'X12  3,89');
});

console.log(`ocrCore : ${passed} tests OK`);
