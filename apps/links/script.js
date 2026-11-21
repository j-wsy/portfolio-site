import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PORTRAIT_SRC = 'assets/cutout.webp';
const NAME = 'Justin Yap';
const ROLE_LINES = ['Cyber Security', '& Creative'];
const SITE = 'JUSTINYAP.COM';
const DISPLAY_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const MONO_FONT = '"Courier Prime", "Courier New", Courier, monospace';

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 60px ' + MONO_FONT),
        document.fonts.load('700 60px ' + MONO_FONT),
      ]),
      new Promise(r => setTimeout(r, 2000)),
    ]);
  } catch (e) {}
}

// SCALE grows the physical card/lanyard; BASE_* stay fixed so the camera
// framing (see layout()) doesn't zoom out to compensate — the card actually
// reads bigger on screen instead of just being bigger "in the void".
const SCALE = 1.44;
const BASE_CH = 1.6 * 1000 / 750, BASE_CW = 1.42;

/* ---------- Renderer / scene ---------- */
const heroEl = document.querySelector('.hero');
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
function studioEnv() {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x777777, side: THREE.BackSide }));
  room.scale.set(30, 20, 30); room.position.y = 4; s.add(room);
  const panel = (x, y, z, sx, sy, sz, v) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v) }));
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); s.add(m);
  };
  panel(0, 13, 0, 10, 0.2, 10, 3);
  panel(-14, 5, 0, 0.2, 6, 12, 2.2);
  panel(14, 5, 3, 0.2, 5, 8, 1.6);
  panel(0, 5, 14, 12, 6, 0.2, 2.4);
  return pmrem.fromScene(s, 0.04).texture;
}
scene.environment = studioEnv();
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 200);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
// Sized off SCALE (the card's own size), never the camera distance D —
// D can grow huge on a long page (see layout()), and a directional light's
// shadow frustum tied to that would push the scene toward its far plane
// and wash out in shadow-acne. The light only needs to comfortably frame
// the card + rope, which stays a small, fixed region near the origin.
sun.position.set(-3 * SCALE, 6 * SCALE, 10 * SCALE);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -4 * SCALE; sun.shadow.camera.right = 4 * SCALE;
sun.shadow.camera.top = 5 * SCALE; sun.shadow.camera.bottom = -5 * SCALE;
sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 22 * SCALE;
sun.shadow.radius = 8;
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

// invisible plane that only renders its shadow, so the card appears to
// cast a soft shadow onto whatever is behind the (transparent) canvas
const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.16 }));
shadowPlane.position.z = -0.7;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

/* ---------- Dimensions ---------- */
const CW = BASE_CW * SCALE, CH = BASE_CH * SCALE, CT = 0.022 * SCALE, CR = 0.08 * SCALE;
const HOLE_Y = CH / 2 - 0.12 * SCALE;
const CLIP_UP = 0.34 * SCALE;
const STRAP_W = 0.3 * SCALE;
const HINGE = Math.hypot(CW / 2, CLIP_UP);

/* ---------- Texture helpers ---------- */
function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function makeTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawSlot(ctx, W, H) {
  const sw = W * 0.22, sh = W * 0.032, sx = (W - sw) / 2;
  const cy = (CH / 2 - HOLE_Y) / CH * H;
  roundRect(ctx, sx, cy - sh / 2, sw, sh, sh / 2);
  const g = ctx.createLinearGradient(0, cy - sh / 2, 0, cy + sh / 2);
  g.addColorStop(0, '#bcbab3'); g.addColorStop(1, '#e7e5de');
  ctx.fillStyle = g; ctx.fill();
}
function drawCover(ctx, img, w, h) {
  const ir = img.width / img.height, tr = w / h;
  let sw, sh, sx, sy;
  if (ir > tr) { sh = img.height; sw = sh * tr; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / tr; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

// Classic newspaper-style halftone: a dot grid (on a ~18 degree screen
// angle, like real print halftones use, so the regular grid doesn't beat
// against the GPU's texture sampling grid and moire when the card is
// viewed at an angle) whose radius follows how dark/opaque the source
// portrait is at that cell.
function halftonePortrait(img, W, H) {
  const paper = '#f3f1ea', ink = '#110f0a';
  const cell = Math.max(4, Math.round(W / 115));
  const step = cell <= 10 ? 1 : 2;
  const src = document.createElement('canvas'); src.width = W; src.height = H;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  drawCover(sctx, img, W, H);
  const data = sctx.getImageData(0, 0, W, H).data;

  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = paper; x.fillRect(0, 0, W, H);

  const half = cell / 2, maxR = cell * 0.5;
  const angle = 18 * Math.PI / 180, ca = Math.cos(angle), sa = Math.sin(angle);
  const diag = Math.hypot(W, H) / 2 + cell;
  x.fillStyle = ink;
  for (let gy = -diag; gy < diag; gy += cell) {
    for (let gx = -diag; gx < diag; gx += cell) {
      const sx = gx * ca - gy * sa + W / 2;
      const y = gx * sa + gy * ca + H / 2;
      if (sx < -half || sx >= W + half || y < -half || y >= H + half) continue;
      let rS = 0, gS = 0, bS = 0, aS = 0, n = 0;
      for (let yy = Math.max(0, y - half); yy < Math.min(H, y + half); yy += step) {
        for (let xx = Math.max(0, sx - half); xx < Math.min(W, sx + half); xx += step) {
          const i = (Math.floor(yy) * W + Math.floor(xx)) * 4;
          rS += data[i]; gS += data[i + 1]; bS += data[i + 2]; aS += data[i + 3]; n++;
        }
      }
      if (!n) continue;
      const a = aS / n / 255;
      if (a < 0.1) continue;
      let luma = (0.299 * rS + 0.587 * gS + 0.114 * bS) / n / 255;
      luma = Math.min(1, Math.max(0, (luma - 0.2) / 0.5)); // aggressive contrast stretch
      const amount = (1 - luma) * a;
      const r = maxR * Math.pow(amount, 0.4); // <0.5 exponent = deeper, blacker shadows
      if (r < 0.5) continue;
      x.beginPath(); x.arc(sx, y, r, 0, Math.PI * 2); x.fill();
    }
  }
  return { canvas: c, paper, ink };
}

function setFont(ctx, size, weight, family, trackingEm = 0) {
  ctx.font = `${weight} ${size}px ${family}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = (size * trackingEm) + 'px';
}

// Grows (or shrinks) a font until the text just fits maxWidth, accounting
// for any letter-spacing (as an em fraction of the font size) up front
function fitFontSize(ctx, text, maxWidth, maxPx, minPx, weight, family, trackingEm = 0) {
  let size = maxPx;
  setFont(ctx, size, weight, family, trackingEm);
  while (size > minPx && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    setFont(ctx, size, weight, family, trackingEm);
  }
  return size;
}

function frontTexture(img) {
  const W = 1536, H = Math.round(W * CH / CW);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.textAlign = 'center';

  // Name: ~11% of card width, baseline inside the 11-17%-of-height band
  const nameFont = fitFontSize(x, NAME, W * 0.9, W * 0.11, W * 0.08, 800, DISPLAY_FONT, -0.04);
  const nameBaseline = H * 0.165;

  // Portrait: 48% of card width, centered, raised slightly from the spec's
  // 25-72% band
  const portraitW = Math.round(W * 0.48);
  const portraitTop = H * 0.22, portraitBottom = H * 0.685;
  const { canvas: dots, paper } = halftonePortrait(img, portraitW, Math.round(portraitBottom - portraitTop));

  // Job title: same font/weight/size as the name, two tight lines (0.98
  // line-height), vertically centered between the portrait and the card's
  // bottom edge
  const roleFont = Math.min(
    nameFont,
    fitFontSize(x, ROLE_LINES[0], W * 0.9, nameFont, nameFont * 0.7, 800, DISPLAY_FONT, -0.04),
    fitFontSize(x, ROLE_LINES[1], W * 0.9, nameFont, nameFont * 0.7, 800, DISPLAY_FONT, -0.04)
  );
  const lineGap = roleFont * 0.98;
  const titleMidY = (portraitBottom + H) / 2;
  const roleLine1Baseline = titleMidY + roleFont * 0.73 - (lineGap + roleFont) / 2;
  const roleLine2Baseline = roleLine1Baseline + lineGap;

  x.fillStyle = paper; x.fillRect(0, 0, W, H);
  drawSlot(x, W, H);
  x.fillStyle = '#15140f';
  setFont(x, nameFont, 800, DISPLAY_FONT, -0.04);
  x.fillText(NAME, W / 2, nameBaseline);
  // a touch of blur keeps the fine dot-screen from aliasing into moire
  // when the GPU minifies/samples it at an angle on the 3D card
  x.filter = 'blur(1.1px)';
  x.drawImage(dots, (W - portraitW) / 2, portraitTop);
  x.filter = 'none';
  setFont(x, roleFont, 800, DISPLAY_FONT, -0.04);
  x.fillText(ROLE_LINES[0], W / 2, roleLine1Baseline);
  x.fillText(ROLE_LINES[1], W / 2, roleLine2Baseline);
  if ('letterSpacing' in x) x.letterSpacing = '0px';
  return makeTex(c);
}

function backTexture() {
  const W = 1024, H = Math.round(W * CH / CW);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#15140f'; x.fillRect(0, 0, W, H);
  // faint repeating halftone field, echoing the front
  x.fillStyle = 'rgba(243,241,234,0.08)';
  for (let yy = H * 0.14; yy < H * 0.86; yy += 22) {
    for (let xx = W * 0.08; xx < W * 0.92; xx += 22) {
      const n = Math.sin(xx * 0.02 + yy * 0.015) * 0.5 + 0.5;
      const r = 6 * (0.3 + 0.7 * n);
      x.beginPath(); x.arc(xx, yy, r, 0, Math.PI * 2); x.fill();
    }
  }
  x.fillStyle = '#f3f1ea';
  x.textAlign = 'center';
  setFont(x, 48, 800, DISPLAY_FONT, -0.02);
  x.fillText(NAME, W / 2, H * 0.48);
  x.fillStyle = 'rgba(243,241,234,0.75)';
  setFont(x, 26, 400, MONO_FONT, 0.08);
  x.fillText(SITE, W / 2, H * 0.53);
  if ('letterSpacing' in x) x.letterSpacing = '0px';
  drawSlot(x, W, H);
  return makeTex(c);
}

// Woven-look strap: a dark base with a repeating printed wordmark
// Woven nylon webbing: a row of longitudinal ribs (the raised cords real
// lanyard webbing is woven from) plus faint diagonal weave threads, with a
// matching grayscale bump map so directional light actually catches the
// ridges — not just a flat printed color.
function strapTexture() {
  const H = 256, tileW = 640, n = 8, W = tileW * n;
  const RIBS = 11, ribH = H / RIBS;

  function drawRibs(ctx, base, hi, lo) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < RIBS; i++) {
      const y = i * ribH;
      const g = ctx.createLinearGradient(0, y, 0, y + ribH);
      g.addColorStop(0, hi); g.addColorStop(0.45, base);
      g.addColorStop(0.9, lo); g.addColorStop(1, lo);
      ctx.fillStyle = g; ctx.fillRect(0, y, W, ribH);
    }
    ctx.globalAlpha = 0.22; ctx.strokeStyle = lo; ctx.lineWidth = 1;
    for (let xx = -H; xx < W; xx += 7) { ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx + H, H); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  drawRibs(x, '#23241f', 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.24)');
  x.fillStyle = 'rgba(243,241,234,0.85)';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  setFont(x, 72, 700, MONO_FONT, 0.06);
  for (let i = 0; i < n; i++) x.fillText(SITE, tileW * (i + 0.5), H / 2);

  // bump map: ribs only (no text — the print should read as flat ink, not
  // embossed into the weave)
  const bc = document.createElement('canvas'); bc.width = W; bc.height = H;
  const bx = bc.getContext('2d');
  drawRibs(bx, '#808080', '#c2c2c2', '#404040');

  const map = makeTex(c); map.wrapS = THREE.RepeatWrapping;
  const bump = makeTex(bc); bump.wrapS = THREE.RepeatWrapping;
  return { map, bump, aspect: W / H };
}

/* ---------- Card mesh ---------- */
function cardShape() {
  const s = new THREE.Shape(), w = CW / 2, h = CH / 2, r = CR;
  s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r);
  s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h); s.lineTo(-w + r, h);
  s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
  return s;
}
function faceGeo(shape) {
  const g = new THREE.ShapeGeometry(shape, 12);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + CW / 2) / CW, (p.getY(i) + CH / 2) / CH);
  uv.needsUpdate = true;
  return g;
}
const cardGroup = new THREE.Group();
cardGroup.matrixAutoUpdate = false;
scene.add(cardGroup);

function faceMat(map) {
  return new THREE.MeshPhysicalMaterial({
    map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.3,
    roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.15, metalness: 0,
  });
}
const shape = cardShape();
const front = new THREE.Mesh(faceGeo(shape), faceMat(null));
front.position.z = CT / 2 + 0.0005;
const back = new THREE.Mesh(faceGeo(shape), faceMat(null));
back.rotation.y = Math.PI; back.position.z = -CT / 2 - 0.0005;
const edgeGeo = new THREE.ExtrudeGeometry(shape, { depth: CT, bevelEnabled: false, curveSegments: 12 });
edgeGeo.translate(0, 0, -CT / 2);
const edge = new THREE.Mesh(edgeGeo, [new THREE.MeshBasicMaterial({ visible: false }), new THREE.MeshStandardMaterial({ color: 0xe9e7e1, roughness: 0.5 })]);
[front, back, edge].forEach(m => { m.castShadow = true; cardGroup.add(m); });
const pickables = [front, back, edge];

/* ---------- Clip ---------- */
const metal = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, metalness: 1, roughness: 0.28 });
const clip = new THREE.Group();
clip.matrixAutoUpdate = false;
const ringR = 0.07 * SCALE;
const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.016 * SCALE, 16, 48), metal);
const bar = new THREE.Mesh(new THREE.BoxGeometry(0.075 * SCALE, 1, 0.026 * SCALE), metal);
const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * SCALE, 0.02 * SCALE, 0.15 * SCALE, 20), metal);
pin.rotation.z = Math.PI / 2;
[ring, bar, pin].forEach(m => { m.castShadow = true; clip.add(m); });
scene.add(clip);

/* ---------- Strap ribbon ---------- */
const SAMPLES = 110;
const strapGeo = new THREE.BufferGeometry();
const sPos = new Float32Array(SAMPLES * 2 * 3), sUv = new Float32Array(SAMPLES * 2 * 2);
const sIdx = [];
for (let i = 0; i < SAMPLES - 1; i++) { const a = i * 2; sIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
strapGeo.setIndex(sIdx);
strapGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
strapGeo.setAttribute('uv', new THREE.BufferAttribute(sUv, 2));
const strapMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, side: THREE.DoubleSide });
const strap = new THREE.Mesh(strapGeo, strapMat);
strap.castShadow = true; strap.frustumCulled = false;
scene.add(strap);

/* ---------- Verlet physics ---------- */
const N = 16;
const P = [], PREV = [], INV = [];
const addPt = (v, inv) => { P.push(v.clone()); PREV.push(v.clone()); INV.push(inv); return P.length - 1; };
const rope = [];
for (let i = 0; i <= N; i++) rope.push(addPt(new THREE.Vector3(), i === 0 ? 0 : 1));
const TL = addPt(new THREE.Vector3(), 0.22), TR = addPt(new THREE.Vector3(), 0.22),
      BR = addPt(new THREE.Vector3(), 0.22), BL = addPt(new THREE.Vector3(), 0.22);
const END = rope[N];

const cons = [];
const link = (a, b, len, k = 1) => { cons.push({ a, b, len, k }); };
const ropeCons = [], ropeBend = [];
for (let i = 0; i < N; i++) { const c = { a: rope[i], b: rope[i + 1], len: 0.1, k: 1 }; cons.push(c); ropeCons.push(c); }
for (let i = 0; i < N - 1; i++) { const c = { a: rope[i], b: rope[i + 2], len: 0.2, k: 0.04 }; cons.push(c); ropeBend.push(c); }
link(END, TL, HINGE); link(END, TR, HINGE);
const diag = Math.hypot(CW, CH);
link(TL, TR, CW); link(TR, BR, CH); link(BR, BL, CW); link(BL, TL, CH); link(TL, BR, diag); link(TR, BL, diag);

const anchor = new THREE.Vector3();
let view = { w: 1, h: 1 };
let initialised = false;

// How far the resting card hangs from the anchor — a direct world-unit
// target (scaled with the card) rather than something squeezed out of the
// camera framing, so it stays correct even though the canvas now spans the
// whole page (not just a small "stage" box) and can be dragged past it.
const ROPE_LEN = 0.68 * SCALE;

function layout() {
  const W = canvas.clientWidth, Hfull = canvas.clientHeight;
  if (!W || !Hfull) return;
  renderer.setSize(W, Hfull, false);
  camera.aspect = W / Hfull;

  // frameH is the reference "how much world-height the first screenful
  // shows" — based on the viewport, NOT the full (page-length) canvas
  // height, and NOT scaled by SCALE, so the bigger card actually reads as
  // bigger on screen instead of the camera just zooming out to fit it.
  // Desktop gets a much bigger reference window (card reads large); mobile
  // is tuned so the resting card occupies roughly 50-60% of screen height.
  const isDesktop = window.innerWidth > 760;
  const refH = isDesktop
    ? Math.min(window.innerHeight * 0.52, 760)
    : Math.min(window.innerHeight * 0.4, 480);
  const aspectRef = W / refH;
  const frameH = Math.max(BASE_CH / 0.62, BASE_CW / (0.55 * aspectRef));
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const D = frameH * Hfull / (2 * refH * tanHalfFov);
  camera.position.set(0, 0, D); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();

  // total visible world extent across the FULL (page-length) canvas —
  // used only to bound how far the card can be dragged
  const totalH = frameH * (Hfull / refH);
  view = { w: totalH * (W / Hfull), h: totalH };

  // card is centered (x = 0); lanyard anchored just off the top edge
  anchor.set(0, totalH / 2 + 0.4 * SCALE, 0);
  const restCenterY = anchor.y - ROPE_LEN - CH / 2 - CLIP_UP;
  const seg = ROPE_LEN / N;
  ropeCons.forEach(c => c.len = seg);
  ropeBend.forEach(c => c.len = seg * 2);
  if (!initialised) { placeInitial(restCenterY); initialised = true; }

  // Project the resting card's bottom edge (plus a little for the soft
  // shadow) to an actual screen pixel, so the page content below can be
  // pinned "just under" it exactly, at any viewport size — rather than
  // guessing with hand-tuned dvh/px values that only line up by chance at
  // one window size.
  const shadowMargin = 0.28 * SCALE;
  const cardBottomWorldY = restCenterY - CH / 2 - shadowMargin;
  const ndcY = cardBottomWorldY / (D * tanHalfFov);
  const clearPx = Math.max(0, (1 - ndcY) / 2 * Hfull);
  heroEl.style.setProperty('--content-offset', clearPx + 'px');
}

function placeInitial(cy) {
  const theta = reduceMotion ? 0 : 0.6;
  const pts = [];
  const top = new THREE.Vector3(anchor.x, cy + CH / 2 + CLIP_UP, 0);
  for (let i = 0; i <= N; i++) pts[rope[i]] = new THREE.Vector3().lerpVectors(anchor, top, i / N);
  pts[TL] = new THREE.Vector3(anchor.x - CW / 2, cy + CH / 2, 0.02);
  pts[TR] = new THREE.Vector3(anchor.x + CW / 2, cy + CH / 2, -0.02);
  pts[BR] = new THREE.Vector3(anchor.x + CW / 2, cy - CH / 2, -0.02);
  pts[BL] = new THREE.Vector3(anchor.x - CW / 2, cy - CH / 2, 0.02);
  const c = Math.cos(theta), s = Math.sin(theta);
  pts.forEach((p, i) => {
    const dx = p.x - anchor.x, dy = p.y - anchor.y;
    p.set(anchor.x + dx * c - dy * s, anchor.y + dx * s + dy * c, p.z);
    P[i].copy(p); PREV[i].copy(p);
  });
}

/* card frame */
const fx = new THREE.Vector3(), fy = new THREE.Vector3(), fz = new THREE.Vector3(), fc = new THREE.Vector3();
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function cardFrame() {
  fc.copy(P[TL]).add(P[TR]).add(P[BR]).add(P[BL]).multiplyScalar(0.25);
  fx.copy(P[TR]).sub(P[TL]).add(tmp.copy(P[BR]).sub(P[BL])).normalize();
  fy.copy(P[TL]).sub(P[BL]).add(tmp.copy(P[TR]).sub(P[BR]));
  fy.addScaledVector(fx, -fx.dot(fy)).normalize();
  fz.crossVectors(fx, fy);
}

const drag = { on: false, w: [0, 0, 0, 0], target: new THREE.Vector3(), z0: 0, lift: 0, downAt: 0, sx: 0, sy: 0, moved: false, id: null };
let targetYaw = 0, lastYaw = 0;
const corners = [TL, TR, BR, BL];
const G = -15 * SCALE, DT = 1 / 120, DAMP = 0.987, ITER = 14;

function wrap(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

function step() {
  P[rope[0]].copy(anchor); PREV[rope[0]].copy(anchor);
  for (let i = 0; i < P.length; i++) {
    if (!INV[i]) continue;
    const p = P[i], q = PREV[i];
    const vx = (p.x - q.x) * DAMP, vy = (p.y - q.y) * DAMP, vz = (p.z - q.z) * DAMP;
    q.copy(p);
    p.x += vx; p.y += vy + G * DT * DT; p.z += vz;
  }
  cardFrame();
  const yaw = Math.atan2(fz.x, fz.z);
  const rate = wrap(yaw - lastYaw) / DT; lastYaw = yaw;
  const k = drag.on ? 6 : 26, c = drag.on ? 3 : 4.2;
  const dw = (wrap(targetYaw - yaw) * k - rate * c) * DT;
  for (const i of corners) {
    const rx = P[i].x - fc.x, rz = P[i].z - fc.z;
    P[i].x += rz * dw * DT; P[i].z += -rx * dw * DT;
  }
  if (drag.on) drag.lift = Math.min(1, drag.lift + DT * 4);
  for (let it = 0; it < ITER; it++) {
    for (const cn of cons) {
      const a = P[cn.a], b = P[cn.b], wa = INV[cn.a], wb = INV[cn.b], ws = wa + wb;
      if (!ws) continue;
      tmp.subVectors(b, a);
      const d = tmp.length() || 1e-6;
      const diff = (d - cn.len) / d * cn.k / ws;
      a.addScaledVector(tmp, diff * wa);
      b.addScaledVector(tmp, -diff * wb);
    }
    if (drag.on) {
      const w = drag.w;
      tmp.set(0, 0, 0);
      for (let j = 0; j < 4; j++) tmp.addScaledVector(P[corners[j]], w[j]);
      tmp2.copy(drag.target); tmp2.z = drag.z0 + 0.35 * SCALE * drag.lift;
      tmp2.sub(tmp);
      const s2 = w[0] * w[0] + w[1] * w[1] + w[2] * w[2] + w[3] * w[3];
      for (let j = 0; j < 4; j++) P[corners[j]].addScaledVector(tmp2, w[j] / s2 * 0.6);
    }
    P[rope[0]].copy(anchor);
  }
}

/* ---------- Render sync ---------- */
const ropeVecs = rope.map(() => new THREE.Vector3());
const curve = new THREE.CatmullRomCurve3(ropeVecs, false, 'centripetal');
const samples = Array.from({ length: SAMPLES }, () => new THREE.Vector3());
const hole = new THREE.Vector3(), up = new THREE.Vector3(), side = new THREE.Vector3(), T = new THREE.Vector3(), X = new THREE.Vector3();
const m4 = new THREE.Matrix4(), bx = new THREE.Vector3(), bz = new THREE.Vector3();
let TEX_LEN = STRAP_W * 16;

function sync() {
  cardFrame();
  m4.makeBasis(fx, fy, fz).setPosition(fc);
  cardGroup.matrix.copy(m4); cardGroup.matrixWorldNeedsUpdate = true;

  hole.copy(fc).addScaledVector(fy, HOLE_Y);
  up.subVectors(P[END], hole); const span = up.length(); up.normalize();
  bx.copy(fx).addScaledVector(up, -fx.dot(up)).normalize();
  bz.crossVectors(bx, up);
  const ringC = tmp.copy(P[END]).addScaledVector(up, -ringR * 0.6);
  clip.matrix.makeBasis(bx, up, bz).setPosition(ringC); clip.matrixWorldNeedsUpdate = true;
  const barLen = Math.max(0.05, span - ringR * 1.6);
  ring.position.set(0, 0, 0);
  bar.scale.set(1, barLen, 1); bar.position.set(0, -ringR - barLen / 2 + 0.01, 0);
  pin.position.set(0, -ringR - barLen + 0.01, 0);

  rope.forEach((r, i) => ropeVecs[i].copy(P[r]));
  ropeVecs[N].copy(P[END]).addScaledVector(up, -ringR * 0.25);
  for (let i = 0; i < SAMPLES; i++) curve.getPoint(i / (SAMPLES - 1), samples[i]);
  // Total arc length first, so the UV origin can be pinned at the card end
  // (bottom) instead of the anchor (top): when the strap is pulled longer,
  // the new texture/text should appear to pay out from the anchor at the
  // top, not stretch/unravel out of the card at the bottom.
  let totalLen = 0;
  for (let i = 1; i < SAMPLES; i++) totalLen += samples[i].distanceTo(samples[i - 1]);
  let along = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const a = samples[Math.max(0, i - 1)], b = samples[Math.min(SAMPLES - 1, i + 1)];
    T.subVectors(b, a).normalize();
    if (i > 0) along += samples[i].distanceTo(samples[i - 1]);
    const t = i / (SAMPLES - 1), e = t * t * (3 - 2 * t);
    X.set(1, 0, 0).multiplyScalar(1 - e).addScaledVector(fx, e);
    if (X.lengthSq() < 1e-4) X.set(0, 0, 1);
    side.copy(X).addScaledVector(T, -X.dot(T));
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize().multiplyScalar(STRAP_W / 2);
    const s = samples[i], o = i * 6;
    sPos[o] = s.x - side.x; sPos[o + 1] = s.y - side.y; sPos[o + 2] = s.z - side.z;
    sPos[o + 3] = s.x + side.x; sPos[o + 4] = s.y + side.y; sPos[o + 5] = s.z + side.z;
    const u = (totalLen - along) / TEX_LEN;
    sUv[i * 4] = u; sUv[i * 4 + 1] = 1; sUv[i * 4 + 2] = u; sUv[i * 4 + 3] = 0;
  }
  strapGeo.attributes.position.needsUpdate = true;
  strapGeo.attributes.uv.needsUpdate = true;
  strapGeo.computeVertexNormals();
}

/* ---------- Pointer (window-level so links underneath stay clickable) ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function setNdc(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
function pick(e) { setNdc(e); cardGroup.updateMatrixWorld(true); return ray.intersectObjects(pickables, false)[0]; }
function planePoint(z, out) {
  const o = ray.ray.origin, d = ray.ray.direction;
  const t = (z - o.z) / (d.z || -1e-6);
  return out.copy(o).addScaledVector(d, t);
}

let suppressNextClick = false;

window.addEventListener('pointerdown', e => {
  if (e.button !== undefined && e.button !== 0) return;
  const hit = pick(e);
  if (!hit) return;
  e.preventDefault();
  const local = cardGroup.worldToLocal(hit.point.clone());
  const u = THREE.MathUtils.clamp((local.x + CW / 2) / CW, 0, 1);
  const v = THREE.MathUtils.clamp((CH / 2 - local.y) / CH, 0, 1);
  drag.w = [(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v];
  drag.z0 = hit.point.z; drag.lift = 0;
  drag.target.copy(hit.point);
  drag.on = true; drag.id = e.pointerId; drag.downAt = performance.now(); drag.sx = e.clientX; drag.sy = e.clientY; drag.moved = false;
  suppressNextClick = true;
  document.body.style.cursor = 'grabbing';
}, { passive: false });

window.addEventListener('pointermove', e => {
  if (drag.on && e.pointerId === drag.id) {
    e.preventDefault();
    setNdc(e);
    planePoint(drag.z0, drag.target);
    drag.target.x = THREE.MathUtils.clamp(drag.target.x, -view.w / 2, view.w / 2);
    drag.target.y = THREE.MathUtils.clamp(drag.target.y, -view.h / 2, view.h / 2);
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
  } else if (e.pointerType === 'mouse') {
    document.body.style.cursor = pick(e) ? 'grab' : '';
  }
}, { passive: false });

function release(e) {
  if (!drag.on || e.pointerId !== drag.id) return;
  drag.on = false;
  document.body.style.cursor = e.pointerType === 'mouse' && pick(e) ? 'grab' : '';
  if (!drag.moved && performance.now() - drag.downAt < 350) flip();
}
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);

// a drag/flip gesture that started on the card shouldn't also activate a
// link that happened to be rendered underneath it
window.addEventListener('click', e => {
  if (suppressNextClick) { e.preventDefault(); e.stopPropagation(); suppressNextClick = false; }
}, true);

function flip() {
  targetYaw = wrap(targetYaw + Math.PI);
  cardFrame();
  for (const i of corners) {
    const rx = P[i].x - fc.x;
    PREV[i].z += rx * 0.06;
    PREV[i].y -= 0.012;
  }
}
canvas.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });

/* ---------- Boot ---------- */
let img;
await fontsReady();
try { img = await loadImage(PORTRAIT_SRC); } catch (e) { img = null; }
const blank = document.createElement('canvas'); blank.width = blank.height = 2;
front.material.map = front.material.emissiveMap = img ? frontTexture(img) : makeTex(blank);
const bt = backTexture();
back.material.map = back.material.emissiveMap = bt;
front.material.needsUpdate = back.material.needsUpdate = true;

const st = strapTexture();
strapMat.map = st.map; strapMat.bumpMap = st.bump; strapMat.bumpScale = 0.4;
strapMat.needsUpdate = true;
TEX_LEN = STRAP_W * st.aspect;

layout();
new ResizeObserver(() => layout()).observe(heroEl);
window.addEventListener('resize', layout);

let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(0.05, (now - last) / 1000); last = now;
  let n = 0;
  while (acc >= DT && n < 6) { step(); acc -= DT; n++; }
  sync();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
cardFrame(); lastYaw = Math.atan2(fz.x, fz.z);
requestAnimationFrame(frame);
