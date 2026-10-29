// builds the design-project album for flat 20 (A3 landscape sheets, HTML → PDF) from the 3D model's data and renders
const fs = require('fs'), path = require('path');
const DIR = 'D:/cache/claude-scratch/udsd/album/', IMG = 'file:///D:/cache/claude-scratch/udsd/album/img/';
const d = JSON.parse(fs.readFileSync(DIR + 'data.json', 'utf8'));
const { W, D, H, OUT, TOPW, ROOMS, WALLS, DOORS, WIN } = d, C = d.colors;
const OFS = 0.30, MC = (9.79 - OFS + W) / 2;   // the office + wardrobe shift towards the living room; the master bedroom centre
const PROJECT = 'Дизайн-проект квартиры 20, 6 этаж', CODE = 'ДП-20', CITY = 'г. Салехард';
const mm = (v) => Math.round(v * 1000), fmt1 = (v) => v.toFixed(1).replace('.', ','), fmt2 = (v) => v.toFixed(2).replace('.', ',');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ---------- rooms: numbering, finishes ---------- */
const RN = { living: 1, hall: 2, corr: 3, wc: 4, bath: 5, kids: 6, office: 7, vest: 8, ward: 9, master: 10 };
const roomOf = (id) => ROOMS.find((r) => r.id === id);
const NAMES = { living: 'Кухня-гостиная', hall: 'Прихожая', corr: 'Холл', wc: 'Гостевой санузел', bath: 'Ванная', kids: 'Детская', office: 'Кабинет / вторая детская', vest: 'Тамбур спальни', ward: 'Гардеробная', master: 'Спальня' };
const WET = ['wc', 'bath'], STONE = ['hall', 'corr'];
const FLOOR = (id) => WET.includes(id) ? 'П-2' : STONE.includes(id) ? 'П-1' : 'П-3';
const FLOORS = { 'П-1': ['Керамогранит 600 × 600, светлый камень, матовый', 'прихожая, холл'], 'П-2': ['Керамогранит 600 × 600 R10 (нескользящий), под светлый камень', 'санузлы'], 'П-3': ['Инженерная доска, дуб натуральный, ёлочка 110 × 550', 'жилые комнаты, кухня-гостиная, кабинет, гардеробная'] };

/* ---------- SVG plan ---------- */
const S = 50 / 3;   // mm per metre, 1:60
const PX = (x) => (x + OUT + 0.9) * S, PZ = (z) => (z + TOPW + 0.9) * S;   // 0,9 m margin for the dimension chains
const PLAN_W = (W + 2 * OUT + 1.8) * S, PLAN_H = (D + OUT + TOPW + 1.8) * S;
const T = (x, y, t, o) => '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '"' + (o && o.a ? ' text-anchor="' + o.a + '"' : ' text-anchor="middle"') + (o && o.s ? ' font-size="' + o.s + '"' : '') + (o && o.r ? ' transform="rotate(' + o.r + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"' : '') + (o && o.c ? ' fill="' + o.c + '"' : '') + (o && o.w ? ' font-weight="' + o.w + '"' : '') + '>' + esc(t) + '</text>';
const R = (x, y, w, h, st) => '<rect x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + w.toFixed(2) + '" height="' + h.toFixed(2) + '" ' + (st || '') + '/>';
const L = (x1, y1, x2, y2, st) => '<line x1="' + x1.toFixed(2) + '" y1="' + y1.toFixed(2) + '" x2="' + x2.toFixed(2) + '" y2="' + y2.toFixed(2) + '" ' + (st || '') + '/>';

function wallsSVG(o) {
  o = o || {}; let s = '';
  WALLS.forEach((w, i) => {
    const outer = i < 4, [x1, z1, x2, z2, t, ops] = w, alongX = z1 === z2, len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1), x0 = Math.min(x1, x2), zz0 = Math.min(z1, z2);
    if (o.onlyOuter && !outer) return;
    const fill = (!outer && o.partFill) ? o.partFill : (o.fill || '#454545');
    const seg = (a, b) => { if (b - a < 1e-3) return; if (alongX) s += R(PX(x0 + a), PZ(z1 - t / 2), (b - a) * S, t * S, 'fill="' + fill + '" stroke="#222" stroke-width="0.15"'); else s += R(PX(x1 - t / 2), PZ(zz0 + a), t * S, (b - a) * S, 'fill="' + fill + '" stroke="#222" stroke-width="0.15"'); };
    let cur = 0;
    ops.slice().sort((p, q) => p.a - q.a).forEach((op) => { seg(cur, op.a); if (op.y0 > 0) {   // window: three lines across the wall
      if (alongX) { for (let k = -1; k <= 1; k++) s += L(PX(x0 + op.a), PZ(z1 + k * t / 2.6), PX(x0 + op.b), PZ(z1 + k * t / 2.6), 'stroke="#222" stroke-width="0.2"'); }
      else { for (let k = -1; k <= 1; k++) s += L(PX(x1 + k * t / 2.6), PZ(zz0 + op.a), PX(x1 + k * t / 2.6), PZ(zz0 + op.b), 'stroke="#222" stroke-width="0.2"'); s += L(PX(x1 - t / 2), PZ(zz0 + op.a), PX(x1 + t / 2), PZ(zz0 + op.a), 'stroke="#222" stroke-width="0.2"') + L(PX(x1 - t / 2), PZ(zz0 + op.b), PX(x1 + t / 2), PZ(zz0 + op.b), 'stroke="#222" stroke-width="0.2"'); }
    } cur = op.b; });
    seg(cur, len);
  });
  if (!o.onlyOuter) s += R(PX(1.01), PZ(4.68), 0.22 * S, 1.32 * S, 'fill="' + (o.fill || '#454545') + '" stroke="#222" stroke-width="0.15"');   // the column by the far windows
  return s;
}
function doorsSVG(st) {
  let s = ''; const stroke = st || 'stroke="#222" stroke-width="0.25" fill="none"';
  DOORS.forEach((o) => {
    const hx = o.ax ? (o.flip ? o.x + o.w : o.x) : o.x, hz = o.ax ? o.z : (o.flip ? o.z + o.w : o.z);
    const along = o.flip ? -1 : 1, perp = -Math.sign(o.ang);   // direction of the open leaf: ax doors swing in z, the others in x
    const ex = o.ax ? hx : hx + perp * o.w, ez = o.ax ? hz + perp * o.w : hz;   // leaf end when open
    const cx = o.ax ? hx + along * o.w : hx, cz = o.ax ? hz : hz + along * o.w;   // leaf end when closed
    s += L(PX(hx), PZ(hz), PX(ex), PZ(ez), stroke.replace('0.25', '0.35'));
    s += '<path d="M' + PX(ex).toFixed(2) + ' ' + PZ(ez).toFixed(2) + ' A' + (o.w * S).toFixed(2) + ' ' + (o.w * S).toFixed(2) + ' 0 0 ' + ((o.ax ? along * perp : -along * perp) > 0 ? 1 : 0) + ' ' + PX(cx).toFixed(2) + ' ' + PZ(cz).toFixed(2) + '" ' + stroke.replace('0.25', '0.18') + '/>';
  });
  // the wardrobe's sliding front
  s += L(PX(7.86 - OFS), PZ(3.98), PX(8.78 - OFS), PZ(3.98), 'stroke="#222" stroke-width="0.35"') + L(PX(8.76 - OFS), PZ(4.02), PX(9.68 - OFS), PZ(4.02), 'stroke="#222" stroke-width="0.35"');
  return s;
}
const FURN = d.boxes.filter((b) => (b.g === 'f' || (b.g === 'hi' && b.y < 0.9)) && b.w > 0.025 && b.d > 0.025 && !(b.w < 0.1 && b.d < 0.1) && b.m !== 'glass' && b.m !== 'sky' && b.m !== 'linen' || (b.g === 'f' && b.m === 'linen' && b.h > 0.15));
const CHAIRS = [[0.35, 1.95, 0], [1.55, 1.95, 90], [0.95, 1.35, 180], [0.95, 2.55, 270]];
function furnSVG(o) {
  o = o || {}; let s = '<g fill="' + (o.fill || '#fff') + '" stroke="' + (o.stroke || '#333') + '" stroke-width="0.2">';
  FURN.forEach((b) => {
    if (b.m === 'rug') { s += R(PX(b.x), PZ(b.z), b.w * S, b.d * S, 'fill="none" stroke-dasharray="1.2 0.8" stroke-width="0.18"'); return; }
    if (b.cyl) s += '<circle cx="' + PX(b.x + b.w / 2).toFixed(2) + '" cy="' + PZ(b.z + b.d / 2).toFixed(2) + '" r="' + (b.w / 2 * S).toFixed(2) + '"/>';
    else s += R(PX(b.x), PZ(b.z), b.w * S, b.d * S, b.m === 'screen' || b.m === 'mirror' ? 'fill="#777"' : '');
  });
  CHAIRS.forEach((c) => { s += '<g transform="translate(' + PX(c[0]).toFixed(2) + ' ' + PZ(c[1]).toFixed(2) + ') rotate(' + c[2] + ')">' + R(-0.21 * S, -0.21 * S, 0.42 * S, 0.42 * S, 'rx="1"') + R(-0.21 * S, -0.23 * S, 0.42 * S, 0.04 * S, 'fill="#333"') + '</g>'; });
  s += '<g transform="translate(' + PX(5.9 - OFS).toFixed(2) + ' ' + PZ(5.4).toFixed(2) + ') rotate(-34)">' + R(-0.4 * S, -0.4 * S, 0.8 * S, 0.8 * S, 'rx="1.5"') + R(-0.4 * S, -0.4 * S, 0.8 * S, 0.16 * S) + R(-0.4 * S, -0.4 * S, 0.14 * S, 0.8 * S) + R(0.26 * S, -0.4 * S, 0.14 * S, 0.8 * S) + '</g>';
  s += '<circle cx="' + PX(0.5).toFixed(2) + '" cy="' + PZ(3.7).toFixed(2) + '" r="' + (0.3 * S).toFixed(2) + '" stroke-dasharray="0.6 0.6"/><circle cx="' + PX(7.4 - OFS).toFixed(2) + '" cy="' + PZ(4.2).toFixed(2) + '" r="' + (0.27 * S).toFixed(2) + '" stroke-dasharray="0.6 0.6"/><circle cx="' + PX(12.65).toFixed(2) + '" cy="' + PZ(3.4).toFixed(2) + '" r="' + (0.3 * S).toFixed(2) + '" stroke-dasharray="0.6 0.6"/>';
  return s + '</g>';
}
// dimension chain: points in metres along an axis, drawn at a fixed offset line; horiz = along x at z-line
function chain(pts, at, horiz, o) {
  o = o || {}; let s = '<g stroke="#1a4f8a" stroke-width="0.18" fill="#1a4f8a" font-size="' + (o.fs || 2.4) + '">';
  const a = pts[0], b = pts[pts.length - 1];
  if (horiz) s += L(PX(a), PZ(at), PX(b), PZ(at)); else s += L(PX(at), PZ(a), PX(at), PZ(b));
  pts.forEach((p) => { if (horiz) s += L(PX(p), PZ(at) - 1.2, PX(p), PZ(at) + 1.2) + L(PX(p) - 0.9, PZ(at) + 0.9, PX(p) + 0.9, PZ(at) - 0.9, 'stroke-width="0.35"'); else s += L(PX(at) - 1.2, PZ(p), PX(at) + 1.2, PZ(p)) + L(PX(at) - 0.9, PZ(p) + 0.9, PX(at) + 0.9, PZ(p) - 0.9, 'stroke-width="0.35"'); });
  for (let i = 1; i < pts.length; i++) { const v = mm(pts[i] - pts[i - 1]), m = (pts[i] + pts[i - 1]) / 2; if (v <= 0) continue; const small = v < 260;
    if (horiz) s += T(PX(m) + (small ? 1.6 : 0), PZ(at) - 0.8 - (small ? 2.2 : 0), v, { s: small ? 1.9 : (o.fs || 2.4), r: small ? -60 : 0 }); else s += T(PX(at) - 0.8, PZ(m), v, { r: -90, s: small ? 1.9 : (o.fs || 2.4) }); }
  return s + '</g>';
}
const CH_TOP = [0, 4.63, 4.74, 6.19, 6.30, 6.92, 7.06, 8.87, 8.98, 13.0], CH_BOT = [0, 5.24 - OFS, 5.35 - OFS, 7.74 - OFS, 7.86 - OFS, 9.68 - OFS, 9.79 - OFS, 13.0], CH_L = [0, 0.43, 2.26, 3.52, 5.35, 6.0], CH_R = [0, 0.70, 2.24, 3.75, 5.29, 6.0], CH_R2 = [0, 3.01, 3.12, 6.0];
function dimsSVG(full) {
  let s = chain(CH_TOP, -TOPW - 0.35, true) + chain([-OUT, W + OUT], -TOPW - 0.7, true) + chain(CH_BOT, D + OUT + 0.35, true) + chain([-OUT, W + OUT], D + OUT + 0.7, true);
  s += chain(CH_L, -OUT - 0.35, false) + chain([-TOPW, D + OUT], -OUT - 0.7, false) + chain(CH_R, W + OUT + 0.35, false) + chain(CH_R2, W + OUT + 0.7, false);
  if (full) s += chain([0, 2.07, 2.18, 3.065 - 0.055, 3.065 + 0.055, 6.0], 6.19 + 0.01, false, { fs: 2 }) + chain([4.685, 6.19], 1.0, true, { fs: 2 }) + chain([6.19, 8.87], 2.55, true, { fs: 2 }) + chain([7.86 - OFS, 9.68 - OFS], 4.0 + 0.3, true, { fs: 2 }) + chain([3.12, 4.0, 6.0], 8.0 - OFS, false, { fs: 2 });
  return s;
}
function roomLabels(o) {
  o = o || {}; let s = '';
  ROOMS.forEach((r) => { if (r.id === 'vest' && !o.all) return; const cx = r.lab ? r.lab[0] : r.x + r.w / 2, cz = r.lab ? r.lab[1] : r.z + r.d / 2, sm = r.w < 1 || r.d < 1;
    s += '<g font-size="' + (sm ? 1.9 : 2.5) + '" fill="#111">' + T(PX(cx), PZ(cz) - (sm ? 0.4 : 1.2), (o.num !== false ? RN[r.id] + ' · ' : '') + (sm ? (r.short || r.n) : r.n), { w: 600 }) + (o.area !== false ? T(PX(cx), PZ(cz) + (sm ? 2.2 : 2.0), fmt1(r.a) + ' м²', { s: sm ? 1.8 : 2.2 }) : '') + '</g>'; });
  return s;
}
function planSVG(body, o) {
  o = o || {}; const w = o.w || PLAN_W, h = o.h || PLAN_H;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + 'mm" height="' + h + 'mm" viewBox="0 0 ' + w + ' ' + h + '" font-family="Segoe UI, Arial, sans-serif" style="' + (o.style || '') + '">' + DEFS + body + '</svg>';
}
const DEFS = '<defs><pattern id="hRed" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.6" stroke="#d33" stroke-width="0.4"/></pattern>' +
  '<pattern id="hGrey" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.4" stroke="#888" stroke-width="0.3"/></pattern>' +
  '<pattern id="hOak" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="2.2" stroke="#c9a06a" stroke-width="0.25"/></pattern>' +
  '<pattern id="hStone" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#eef0ee"/><path d="M0 0H12V12" fill="none" stroke="#9aa" stroke-width="0.2"/></pattern>' +
  '<pattern id="hTile" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#e4ecef"/><path d="M0 0H12V12" fill="none" stroke="#7a99a6" stroke-width="0.2"/></pattern>' +
  '<pattern id="hWarm" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="1.6" stroke="#e0774a" stroke-width="0.4"/></pattern>' +
  '<pattern id="hCeil" width="2" height="2" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="2" y2="0" stroke="#6a8fb5" stroke-width="0.25"/></pattern>' +
  '<pattern id="hBlue" width="1.8" height="1.8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.8" stroke="#3b7dd8" stroke-width="0.35"/></pattern></defs>';
const BASE = () => wallsSVG() + doorsSVG();
const base0 = (o) => '<g opacity="' + ((o && o.op) || 1) + '">' + wallsSVG({ fill: '#6b6b6b' }) + doorsSVG('stroke="#555" stroke-width="0.2" fill="none"') + '</g>';
const northArrow = (x, y) => '<g transform="translate(' + x + ' ' + y + ')" font-size="2.2" fill="#333" stroke="#333" stroke-width="0.25"><circle r="4" fill="none"/><path d="M0 -3.4 L1.6 2.2 L0 1.2 L-1.6 2.2 Z" fill="#333"/><text y="8" text-anchor="middle" stroke="none">вход</text></g>';
// the small key plan used on the visualisation sheets, with the camera position
function keyPlan(eye, look) {
  const k = 0.5; let s = '<g transform="scale(' + k + ')">' + wallsSVG() + doorsSVG() + furnSVG({ stroke: '#555' });
  if (eye) { const ang = Math.atan2(look[2] - eye[2], look[0] - eye[0]) * 180 / Math.PI;
    s += '<g transform="translate(' + PX(eye[0]).toFixed(2) + ' ' + PZ(eye[2]).toFixed(2) + ') rotate(' + ang.toFixed(1) + ')"><path d="M0 0 L22 -11 A24 24 0 0 1 22 11 Z" fill="#e3342f" opacity="0.18"/><path d="M-2 -3 L4 0 L-2 3 Z" fill="#e3342f"/><circle r="1.6" fill="#e3342f"/></g>'; }
  return planSVG(s + '</g>', { w: PLAN_W * k, h: PLAN_H * k });
}

/* ---------- elevations (развёртки) ---------- */
const ES = 20;   // 1:50
const boxesIn = (r, pad) => d.boxes.filter((b) => (b.g === 'f' || b.g === 'hi') && b.m !== 'sky' && b.x + b.w > r.x - (pad || 0.02) && b.x < r.x + r.w + (pad || 0.02) && b.z + b.d > r.z - (pad || 0.02) && b.z < r.z + r.d + (pad || 0.02));
// side: n = wall at z=r.z (viewer looks -z), s = z+d, w = x, e = x+w; returns {svg, w, h} in mm
function elevation(r, side, o) {
  o = o || {}; const len = (side === 'n' || side === 's') ? r.w : r.d, Wmm = len * ES, Hmm = H * ES, pad = 14;
  // u: horizontal coordinate in the view (0..len), depth: distance from the wall
  const U = (x, z) => side === 'n' ? x - r.x : side === 's' ? r.x + r.w - x : side === 'w' ? r.z + r.d - z : z - r.z;
  const depth = (b) => side === 'n' ? b.z - r.z : side === 's' ? r.z + r.d - (b.z + b.d) : side === 'w' ? b.x - r.x : r.x + r.w - (b.x + b.w);
  const X = (u) => pad + u * ES, Y = (y) => pad + Hmm - y * ES;
  let s = R(X(0), Y(H), Wmm, Hmm, 'fill="' + (o.wallFill || (WET.includes(r.id) ? '#e6eef1' : '#f4f1ec')) + '" stroke="#222" stroke-width="0.35"');
  if (WET.includes(r.id)) for (let v = 0.6; v < len; v += 0.6) s += L(X(v), Y(0), X(v), Y(H), 'stroke="#b8c4ca" stroke-width="0.12"'); if (WET.includes(r.id)) for (let v = 0.6; v < H; v += 0.6) s += L(X(0), Y(v), X(len), Y(v), 'stroke="#b8c4ca" stroke-width="0.12"');
  // openings on this wall
  const items = [];
  DOORS.forEach((o2) => { const onWall = o2.ax ? ((side === 'n' && Math.abs(o2.z - r.z) < 0.12) || (side === 's' && Math.abs(o2.z - (r.z + r.d)) < 0.12)) && o2.x >= r.x - 0.05 && o2.x + o2.w <= r.x + r.w + 0.05
    : ((side === 'w' && Math.abs(o2.x - r.x) < 0.12) || (side === 'e' && Math.abs(o2.x - (r.x + r.w)) < 0.12)) && o2.z >= r.z - 0.05 && o2.z + o2.w <= r.z + r.d + 0.05;
    if (!onWall) return; const u1 = o2.ax ? U(o2.x, 0) : U(0, o2.z), u2 = o2.ax ? U(o2.x + o2.w, 0) : U(0, o2.z + o2.w), a = Math.min(u1, u2);
    s += R(X(a) - 1, Y(2.1) - 1, o2.w * ES + 2, 2.1 * ES + 1, 'fill="#fff" stroke="#222" stroke-width="0.3"') + R(X(a), Y(2.04), o2.w * ES, 2.04 * ES, 'fill="' + (o2.entry ? C.graphite : C.greige) + '" stroke="#222" stroke-width="0.25"') + '<circle cx="' + (X(a) + (o2.flip ? 2.5 : o2.w * ES - 2.5)).toFixed(1) + '" cy="' + Y(1.0).toFixed(1) + '" r="0.8" fill="#777"/>'; });
  WIN.forEach((wn) => { const onWall = (side === 'w' && r.x < 0.05 && wn.side === 'w') || (side === 'e' && r.x + r.w > W - 0.05 && wn.side === 'e'); if (!onWall || wn.b < r.z || wn.a > r.z + r.d) return;
    const a = Math.max(wn.a, r.z), b = Math.min(wn.b, r.z + r.d), u1 = U(0, a), u2 = U(0, b), ua = Math.min(u1, u2), ww = (b - a) * ES;
    s += R(X(ua), Y(2.25), ww, 1.45 * ES, 'fill="#dbe8ef" stroke="#222" stroke-width="0.3"') + L(X(ua) + ww / 2, Y(2.25), X(ua) + ww / 2, Y(0.8), 'stroke="#222" stroke-width="0.3"') + R(X(ua) - 2, Y(0.78), ww + 4, 0.04 * ES, 'fill="#fff" stroke="#222" stroke-width="0.25"'); });
  // furniture, far first
  const bx = boxesIn(r).filter((b) => b.m !== 'glass' || b.h > 0.5).sort((p, q) => depth(q) - depth(p));
  bx.forEach((b) => { if (b.m === 'rug' || (b.h < 0.03 && b.y < 0.03)) return;
    const u1 = (side === 'n' || side === 's') ? U(b.x, 0) : U(0, b.z), u2 = (side === 'n' || side === 's') ? U(b.x + b.w, 0) : U(0, b.z + b.d), ua = Math.max(0, Math.min(u1, u2)), ub = Math.min(len, Math.max(u1, u2)); if (ub - ua < 0.005) return;
    const col = b.m === 'glass' ? '#dbe8ef' : (C[b.m] || '#ccc');
    s += R(X(ua), Y(b.y + b.h), (ub - ua) * ES, b.h * ES, 'fill="' + col + '" stroke="#222" stroke-width="0.18"' + (b.m === 'glass' ? ' opacity="0.7"' : '')); });
  // dimensions: length, height
  s += '<g stroke="#1a4f8a" stroke-width="0.18" fill="#1a4f8a" font-size="2.3">' + L(X(0), Y(0) + 6, X(len), Y(0) + 6) + L(X(0), Y(0) + 4.5, X(0), Y(0) + 7.5) + L(X(len), Y(0) + 4.5, X(len), Y(0) + 7.5) + T(X(len / 2), Y(0) + 5.2, mm(len)) +
    L(X(0) - 6, Y(0), X(0) - 6, Y(H)) + L(X(0) - 7.5, Y(0), X(0) - 4.5, Y(0)) + L(X(0) - 7.5, Y(H), X(0) - 4.5, Y(H)) + T(X(0) - 6.8, Y(H / 2), mm(H), { r: -90 }) + '</g>';
  // the three biggest pieces get a width figure
  const big = bx.filter((b) => b.h > 0.3 && b.y < 0.5).map((b) => { const u1 = (side === 'n' || side === 's') ? U(b.x, 0) : U(0, b.z), u2 = (side === 'n' || side === 's') ? U(b.x + b.w, 0) : U(0, b.z + b.d); return { a: Math.max(0, Math.min(u1, u2)), b: Math.min(len, Math.max(u1, u2)), top: b.y + b.h }; }).filter((p) => p.b - p.a > 0.35).sort((p, q) => (q.b - q.a) - (p.b - p.a));
  const used = []; big.forEach((p) => { if (used.some((u) => p.a < u.b - 0.05 && p.b > u.a + 0.05)) return; if (used.length >= 3) return; used.push(p);
    s += '<g stroke="#1a4f8a" stroke-width="0.18" fill="#1a4f8a" font-size="2">' + L(X(p.a), Y(0) + 2.5, X(p.b), Y(0) + 2.5) + L(X(p.a), Y(0) + 1.5, X(p.a), Y(0) + 3.5) + L(X(p.b), Y(0) + 1.5, X(p.b), Y(0) + 3.5) + T(X((p.a + p.b) / 2), Y(0) + 1.9, mm(p.b - p.a)) + '</g>'; });
  const title = o.title || ('Вид ' + { n: 'А', e: 'Б', s: 'В', w: 'Г' }[side]);
  s = '<g font-family="Segoe UI, Arial, sans-serif">' + T(X(len / 2), 8, title, { s: 3.2, w: 600 }) + s + '</g>';
  return { svg: s, w: Wmm + 2 * pad, h: Hmm + 2 * pad + 2 };
}
const roomKey = (r) => { const k = 0.42; let s = '<g transform="scale(' + k + ')">' + wallsSVG() + doorsSVG() + R(PX(r.x), PZ(r.z), r.w * S, r.d * S, 'fill="#e3342f" opacity="0.18"');
  const cx = PX(r.x + r.w / 2), cz = PZ(r.z + r.d / 2), f = 'font-size="6" font-weight="600" fill="#e3342f" text-anchor="middle"';
  s += '<text x="' + cx + '" y="' + (PZ(r.z) + 7) + '" ' + f + '>А</text><text x="' + (PX(r.x + r.w) - 4) + '" y="' + (cz + 2) + '" ' + f + '>Б</text><text x="' + cx + '" y="' + (PZ(r.z + r.d) - 2) + '" ' + f + '>В</text><text x="' + (PX(r.x) + 4) + '" y="' + (cz + 2) + '" ' + f + '>Г</text>';
  return planSVG(s + '</g>', { w: PLAN_W * k, h: PLAN_H * k }); };

/* ---------- furniture drawings ---------- */
function furnDrawing(name, region, front, o) {   // region [x0,z0,x1,z1]; front = side the viewer looks at ('n','s','w','e'); scale 1:25
  o = o || {}; const FS = 40, r = { x: region[0], z: region[1], w: region[2] - region[0], d: region[3] - region[1] };
  const bx = d.boxes.filter((b) => (b.g === 'f' || b.g === 'hi') && b.x + b.w > r.x + 0.01 && b.x < r.x + r.w - 0.01 && b.z + b.d > r.z + 0.01 && b.z < r.z + r.d - 0.01 && b.m !== 'rug' && !(o.skip && o.skip.includes(b.m)) && !((b.w < 0.02 || b.d < 0.02) && b.h < 0.1) && !(b.m === 'white' && (b.x < 0.12 || b.x + b.w > W - 0.12) && b.h <= 0.5));
  if (!bx.length) return { svg: '', w: 10, h: 10 };
  const bb = { x0: Math.min(...bx.map((b) => b.x)), x1: Math.max(...bx.map((b) => b.x + b.w)), z0: Math.min(...bx.map((b) => b.z)), z1: Math.max(...bx.map((b) => b.z + b.d)), y1: Math.max(...bx.map((b) => b.y + b.h)) };
  const along = (front === 'n' || front === 's'), len = along ? bb.x1 - bb.x0 : bb.z1 - bb.z0, dep = along ? bb.z1 - bb.z0 : bb.x1 - bb.x0, pad = 12;
  const U = (b, end) => front === 'n' ? (end ? b.x + b.w : b.x) - bb.x0 : front === 's' ? bb.x1 - (end ? b.x : b.x + b.w) : front === 'w' ? bb.z1 - (end ? b.z : b.z + b.d) : (end ? b.z + b.d : b.z) - bb.z0;
  const depth = (b) => front === 'n' ? b.z - bb.z0 : front === 's' ? bb.z1 - b.z - b.d : front === 'w' ? b.x - bb.x0 : bb.x1 - b.x - b.w;
  const Vd = (b, end) => front === 'n' ? (end ? b.z + b.d : b.z) - bb.z0 : front === 's' ? bb.z1 - (end ? b.z : b.z + b.d) : front === 'w' ? (end ? b.x + b.w : b.x) - bb.x0 : bb.x1 - (end ? b.x : b.x + b.w);
  let s = '', X0 = pad, Y0 = pad + 6, Hmm = bb.y1 * FS;
  const dimH = (x1, x2, y, v, fs) => '<g stroke="#1a4f8a" stroke-width="0.18" fill="#1a4f8a" font-size="' + (fs || 2.2) + '">' + L(x1, y, x2, y) + L(x1, y - 1.2, x1, y + 1.2) + L(x2, y - 1.2, x2, y + 1.2) + T((x1 + x2) / 2, y - 0.8, v) + '</g>';
  const dimV = (x, y1, y2, v) => '<g stroke="#1a4f8a" stroke-width="0.18" fill="#1a4f8a" font-size="2.2">' + L(x, y1, x, y2) + L(x - 1.2, y1, x + 1.2, y1) + L(x - 1.2, y2, x + 1.2, y2) + T(x - 0.8, (y1 + y2) / 2, v, { r: -90 }) + '</g>';
  // front view
  s += T(X0 + len * FS / 2, Y0 - 2, 'вид спереди', { s: 2.6, w: 600 });
  bx.slice().sort((p, q) => depth(q) - depth(p)).forEach((b) => { const a = U(b, false), e = U(b, true); s += R(X0 + Math.min(a, e) * FS, Y0 + Hmm - (b.y + b.h) * FS, Math.abs(e - a) * FS, b.h * FS, 'fill="' + (b.m === 'glass' ? '#dbe8ef' : C[b.m] || '#ccc') + '" stroke="#222" stroke-width="0.2"' + (b.m === 'glass' ? ' opacity="0.7"' : '')); });
  s += dimH(X0, X0 + len * FS, Y0 + Hmm + 5, mm(len)) + dimV(X0 - 5, Y0, Y0 + Hmm, mm(bb.y1));
  // side view
  const SX = X0 + len * FS + 22;
  s += T(SX + dep * FS / 2, Y0 - 2, 'вид сбоку', { s: 2.6, w: 600 });
  bx.slice().sort((p, q) => U(p, false) - U(q, false)).forEach((b) => { const a = Vd(b, false), e = Vd(b, true); s += R(SX + Math.min(a, e) * FS, Y0 + Hmm - (b.y + b.h) * FS, Math.abs(e - a) * FS, b.h * FS, 'fill="' + (b.m === 'glass' ? '#dbe8ef' : C[b.m] || '#ccc') + '" stroke="#222" stroke-width="0.2"'); });
  s += dimH(SX, SX + dep * FS, Y0 + Hmm + 5, mm(dep));
  // top view
  const TY = Y0 + Hmm + 16;
  s += T(X0 + len * FS / 2, TY - 2, 'вид сверху', { s: 2.6, w: 600 });
  bx.slice().sort((p, q) => (p.y + p.h) - (q.y + q.h)).forEach((b) => { const a = U(b, false), e = U(b, true), v1 = Vd(b, false), v2 = Vd(b, true); s += R(X0 + Math.min(a, e) * FS, TY + Math.min(v1, v2) * FS, Math.abs(e - a) * FS, Math.abs(v2 - v1) * FS, 'fill="' + (C[b.m] || '#ccc') + '" stroke="#222" stroke-width="0.2"'); });
  s += dimV(X0 - 5, TY, TY + dep * FS, mm(dep));
  // detail widths on the front: distinct box edges of the taller pieces
  const edges = [...new Set(bx.filter((b) => b.h > 0.25).flatMap((b) => [U(b, false), U(b, true)]).map((v) => Math.round(v * 100) / 100))].sort((a, b) => a - b).filter((v) => v > -0.001 && v < len + 0.001);
  if (edges.length > 2 && edges.length < 14) { let g = '<g stroke="#1a4f8a" stroke-width="0.18" fill="#1a4f8a" font-size="1.9">'; for (let i = 1; i < edges.length; i++) { const v = mm(edges[i] - edges[i - 1]); if (v < 40) continue; g += L(X0 + edges[i - 1] * FS, Y0 + Hmm + 2.2, X0 + edges[i] * FS, Y0 + Hmm + 2.2) + L(X0 + edges[i] * FS, Y0 + Hmm + 1.2, X0 + edges[i] * FS, Y0 + Hmm + 3.2) + L(X0 + edges[i - 1] * FS, Y0 + Hmm + 1.2, X0 + edges[i - 1] * FS, Y0 + Hmm + 3.2) + T(X0 + (edges[i] + edges[i - 1]) / 2 * FS, Y0 + Hmm + 1.6, v, { s: 1.7 }); } s += g + '</g>'; }
  s = '<g font-family="Segoe UI, Arial, sans-serif">' + T(X0, 4, name, { a: 'start', s: 3.4, w: 600 }) + s + '</g>';
  return { svg: s, w: SX + dep * FS + pad, h: TY + dep * FS + pad + 4, bb };
}

/* ---------- sheet frame and title block ---------- */
let sheetNo = 0; const pages = [], contents = [];
function sheet(title, body, o) {
  o = o || {}; sheetNo++; const n = sheetNo; contents.push([n, title.replace(/<br>/g, ' ')]);
  pages.push({ n, title, body, o });
}
function renderSheet(p, total) {
  const tb = '<div class="tb"><table>' +
    '<tr><td class="c1"></td><td class="c2"></td><td class="c3"></td><td class="c4"></td><td class="c5"></td><td class="c6"></td><td class="proj" rowspan="2">' + PROJECT + '<br><span>' + CITY + ' · планировочное решение №148, вариант 1</span></td><td class="h">№ ДП</td><td class="h">Лист</td><td class="h">Листов</td></tr>' +
    '<tr><td class="l">Изм.</td><td class="l">Уч-к</td><td class="l">К-во</td><td class="l">№ Док.</td><td class="l">Подпись</td><td class="l">Дата</td><td class="v">' + CODE + '</td><td class="v">' + String(p.n).padStart(2, '0') + '</td><td class="v">' + total + '</td></tr>' +
    '<tr><td class="l" colspan="2">Дизайнер</td><td class="n" colspan="4"></td><td class="ttl" rowspan="3">' + p.title + '</td><td class="logo" colspan="3" rowspan="3"><b>КВ 20</b><span>3D-модель · альбом</span></td></tr>' +
    '<tr><td class="l" colspan="2">Рук. проекта</td><td class="n" colspan="4"></td></tr><tr><td class="l" colspan="2">Заказчик</td><td class="n" colspan="4"></td></tr></table></div>';
  return '<section class="pg' + (p.o.cls ? ' ' + p.o.cls : '') + '"><div class="frame"></div>' + p.body + (p.o.noTb ? '' : tb) + '</section>';
}
const H2 = (t, sub) => '<h2>' + t + (sub ? '<small>' + sub + '</small>' : '') + '</h2>';
const legend = (rows, x, y, w) => '<div class="legend" style="left:' + x + 'mm;top:' + y + 'mm;width:' + (w || 90) + 'mm"><b>Условные обозначения</b><table>' + rows.map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</table></div>';
const notes = (lines, x, y, w) => '<div class="notes" style="left:' + x + 'mm;top:' + y + 'mm;width:' + (w || 110) + 'mm"><b>Примечания</b>' + lines.map((l, i) => '<p>' + (i + 1) + '. ' + l + '</p>').join('') + '</div>';
const table = (head, rows, cls) => '<table class="tbl ' + (cls || '') + '"><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>';
const sw = (fill, extra) => '<svg width="10mm" height="5mm" viewBox="0 0 10 5">' + DEFS + '<rect width="10" height="5" fill="' + fill + '" stroke="#333" stroke-width="0.2"/>' + (extra || '') + '</svg>';
const sym = (inner) => '<svg width="8mm" height="6mm" viewBox="-4 -3 8 6" font-family="Segoe UI, Arial" stroke="#222" stroke-width="0.3" fill="none">' + inner + '</svg>';
const planBox = (svg, x, y) => '<div class="planbox" style="left:' + x + 'mm;top:' + y + 'mm">' + svg + '</div>';
const expl = () => table(['№', 'Помещение', 'Пол', 'Площадь, м²'], ROOMS.map((r) => [RN[r.id], NAMES[r.id], FLOOR(r.id), fmt1(r.a)]).concat([['', '<b>Итого по внутреннему контуру</b>', '', '<b>' + fmt1(ROOMS.reduce((a, r) => a + r.a, 0)) + '</b>'], ['', 'Общая площадь по плану этажа (штамп кв. 20)', '', '72,8']]), 'expl');

/* ---------- 1. cover, contents, note ---------- */
sheet('Обложка', '<div class="cover"><img src="' + IMG + 'iso.png"><div class="ct"><h1>Дизайн-проект<br>квартиры 20</h1><p>6 этаж · ' + CITY + '<br>планировочное решение №148, вариант 1<br>72,8 м² · 13,0 × 6,0 м внутри</p><p class="small">Рабочий альбом: визуализации, планы, развёртки, ведомости.<br>Выполнено по 3D-модели квартиры; размеры проектные, до контрольного обмера.<br>' + new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) + '</p></div></div>', { noTb: true });
sheet('Содержание', '<!--CONTENTS-->');
sheet('Пояснительная записка', H2('Пояснительная записка к дизайн-проекту') + '<div class="text2">' + [
  'Альбом выполнен на основании планировочного решения №148 (вариант 1) и плана 6 этажа. Геометрия снята с векторного чертежа: внутренний контур 13,0 × 6,0 м, стена к лестничной клетке 250 мм, наружные стены 500 мм, перегородки 110–140 мм.',
  'За отметку 0,000 принята отметка чистого пола квартиры. Высота помещений принята 2,75 м и подлежит уточнению по факту.',
  'Все размеры указаны в миллиметрах от чистовых поверхностей и проверяются по месту до заказа материалов и мебели.',
  'Планировка — по планировочному решению застройщика №148 с одним изменением: кабинет и гардеробная сдвинуты на 300 мм к гостиной, за счёт чего спальня родителей расширена с 3,21 до 3,51 м (кровать 1800). Перегородки возводятся заново по плану монтажа; несущие конструкции не затрагиваются.',
  'В процессе ремонта возможна корректировка отдельных размеров (площадь помещений, привязки) по результатам контрольного обмера.',
  'Перед устройством потолков уточнить фактическую высоту и трассы инженерных сетей; отступ подвесных участков — по плану потолков.',
  'Привязки выводов воды и канализации, сечения труб и высоту установки сантехнических приборов уточнить по техническим картам выбранных приборов.',
  'Розетки и выключатели устанавливать после штукатурных работ; высоты — по плану розеток. Группы освещения — по плану выключателей.',
  'Заказ дверей производить после завершения штукатурных работ и снятия финальных замеров проёмов.',
  'Встроенную мебель (кухня, шкафы, гардеробная) заказывать по чертежам раздела «Чертежи мебели» после контрольного замера изготовителем.',
  'Образцы отделочных материалов согласовать с заказчиком до закупки; оттенки краски — по выкрасам на месте.',
  'Визуализации выполнены по 3D-модели квартиры и передают планировку, габариты и цветовое решение. Они не являются фотореалистичными изображениями и не заменяют чертежи.',
  'Отделка предложена в трёх вариантах: «Светлая» (основной, по дизайн-проекту), «Графит» и «Тёплая». Ведомости материалов даны для основного варианта.',
  'Размещение внутренних и наружных блоков кондиционирования согласовать с управляющей компанией и монтажной организацией.',
  'Кондиционирование, тёплые полы, подсветка — опции; их объём уточняется при составлении сметы.',
  'Работы вести в соответствии с действующими нормами и правилами РФ; перепланировка, затрагивающая мокрые зоны, подлежит согласованию в установленном порядке.'
].map((t, i) => '<p>' + (i + 1) + '. ' + t + '</p>').join('') + '</div>');

/* ---------- 2. visualisations ---------- */
const VIZ = [
  ['hall1', 'Визуализация прихожей<br>Ракурс 1', [5.45, 1.5, 2.95], [5.73, 1.0, 0.0]], ['hall2', 'Визуализация прихожей<br>Ракурс 2', [5.75, 1.5, 0.25], [6.6, 1.0, 2.95]],
  ['liv1', 'Визуализация кухни-гостиной<br>Ракурс 3', [4.55, 1.5, 2.9], [1.2, 1.0, 1.6]], ['liv2', 'Визуализация кухни-гостиной<br>Ракурс 4', [4.6, 1.5, 5.5], [1.0, 1.0, 0.5]],
  ['liv3', 'Визуализация кухни-гостиной<br>Ракурс 5', [2.6, 1.5, 0.85], [2.6, 0.9, 5.9]], ['liv4', 'Визуализация кухни-гостиной<br>Ракурс 6', [0.5, 1.5, 2.5], [4.8, 1.0, 3.6]],
  ['liv5', 'Визуализация кухни-гостиной<br>Ракурс 7, вечернее освещение', [4.55, 1.5, 2.9], [1.2, 1.0, 1.6]],
  ['corr', 'Визуализация холла<br>Ракурс 8', [6.25, 1.5, 2.55], [8.9, 1.1, 2.5]], ['wc', 'Визуализация гостевого санузла<br>Ракурс 9, вид сверху (стены срезаны)', [6.0, 1.5, 3.9], [6.62, 0.9, 0.9]],
  ['bath1', 'Визуализация ванной<br>Ракурс 10', [7.7, 1.5, 1.72], [8.5, 0.8, 0.2]], ['bath2', 'Визуализация ванной<br>Ракурс 11', [7.12, 1.5, 1.9], [8.7, 0.9, 0.5]],
  ['kids1', 'Визуализация детской<br>Ракурс 12', [9.3, 1.5, 2.75], [12.4, 1.0, 0.8]], ['kids2', 'Визуализация детской<br>Ракурс 13', [12.75, 1.5, 2.85], [9.3, 1.0, 0.4]],
  ['off1', 'Визуализация кабинета<br>Ракурс 14, вид сверху (стены срезаны)', [6.25, 1.5, 1.4], [6.2, 0.9, 4.9]], ['off2', 'Визуализация кабинета<br>Ракурс 15', [5.2, 1.5, 5.85], [7.3, 1.0, 3.3]],
  ['ward', 'Визуализация гардеробной<br>Ракурс 16, вид сверху (стены срезаны)', [8.47, 1.5, 2.0], [8.47, 1.0, 5.0]],
  ['mas1', 'Визуализация спальни<br>Ракурс 17', [9.65, 1.5, 3.25], [12.3, 0.9, 5.6]], ['mas2', 'Визуализация спальни<br>Ракурс 18', [12.85, 1.5, 5.85], [9.7, 1.0, 3.3]], ['mas3', 'Визуализация спальни<br>Ракурс 19, вечернее освещение', [9.65, 1.5, 3.25], [12.3, 0.9, 5.6]]
];
sheet('Общий вид квартиры<br>Отделка «Светлая» (основная)', '<div class="viz big"><img src="' + IMG + 'iso.png"></div><div class="cap">Общий вид квартиры со срезанными стенами. Основной вариант отделки: стены greige, светлый дуб, светлый камень, графитовые акценты.</div>');
VIZ.forEach((v) => sheet(v[1], '<div class="viz"><img src="' + IMG + v[0] + '.png"></div>' + planBox(keyPlan(v[2], v[3]), 24, 192)));
sheet('Варианты отделки<br>«Светлая» · «Графит» · «Тёплая»', '<div class="grid3">' + [['liv1', 'Кухня-гостиная · «Светлая»'], ['liv6', 'Кухня-гостиная · «Графит»'], ['liv7', 'Кухня-гостиная · «Тёплая»'], ['mas1', 'Спальня · «Светлая»'], ['mas4', 'Спальня · «Графит»'], ['mas5', 'Спальня · «Тёплая»']].map((p) => '<figure><img src="' + IMG + p[0] + '.png"><figcaption>' + p[1] + '</figcaption></figure>').join('') + '</div>' +
  '<div class="cap">Палитры: «Светлая» — стены #ebe6df, дуб #d9b98f, фасады greige #cfc7bb, акцент шалфей #5f7c75 · «Графит» — стены #bdb6ad, тёмный дуб #8a6a4c, фасады #4a4e53, акцент терракота #b4683f · «Тёплая» — стены #efe3d2, дуб медовый #c99a6a, фасады песочные #d9c3a6, акцент #8a3f2b.</div>');
sheet('Общий вид квартиры<br>Отделка «Графит» и «Тёплая»', '<div class="grid2"><figure><img src="' + IMG + 'iso_dark.png"><figcaption>«Графит»</figcaption></figure><figure><img src="' + IMG + 'iso_warm.png"><figcaption>«Тёплая»</figcaption></figure></div>');

/* ---------- 3. plans ---------- */
const PLAN_AT = [26, 12];
// measurement plan
sheet('План обмера помещения', planBox(planSVG(BASE() + dimsSVG(true) + roomLabels({ all: true })), PLAN_AT[0], PLAN_AT[1]) + '<div class="side" style="left:300mm;top:14mm;width:108mm">' + expl() + '</div>' +
  notes(['Размеры сняты с векторного чертежа планировки №148 (масштаб проверен по цепочке 4570) и подлежат контрольному обмеру по месту.', 'Высота помещений принята 2750 мм (проектная).', 'Площади помещений посчитаны по внутреннему контуру перегородок планировки №148; общая площадь 72,8 м² — по штампу квартиры 20 на плане 6 этажа.', 'Оконные проёмы: 1830 мм — левый торец (2 шт.), 1540 мм — правый торец (2 шт.); низ 800, верх 2250 от чистого пола.'], 26, 168, 265));
// demolition: the developer's schematic partitions
const DEV = [[1.3, 3.1, 1.3, 6.0], [0, 3.1, 6.3, 3.1], [4.4, 0, 4.4, 3.1], [6.3, 3.1, 6.3, 6.0], [6.9, 0, 6.9, 1.4], [6.9, 1.4, 9.8, 1.4], [9.8, 0, 9.8, 3.1], [6.3, 3.1, 13, 3.1], [12.3, 3.1, 12.3, 6.0]];
let dem = wallsSVG({ onlyOuter: true }); DEV.forEach((w) => { const alongX = w[1] === w[3], t = 0.12; dem += alongX ? R(PX(Math.min(w[0], w[2])), PZ(w[1] - t / 2), Math.abs(w[2] - w[0]) * S, t * S, 'fill="url(#hRed)" stroke="#d33" stroke-width="0.25"') : R(PX(w[0] - t / 2), PZ(Math.min(w[1], w[3])), t * S, Math.abs(w[3] - w[1]) * S, 'fill="url(#hRed)" stroke="#d33" stroke-width="0.25"'); });
dem += R(PX(-OUT), PZ(-TOPW), (W + 2 * OUT) * S, (D + OUT + TOPW) * S, 'fill="none" stroke="#222" stroke-width="0.3"');
[[2.2, 1.5, 'кухня 13,67'], [2.9, 4.6, 'жилая 16,41'], [0.65, 4.6, 'кладовая'], [5.6, 1.5, 'прихожая 7,71'], [8.3, 0.7, 'с/у 3,98'], [8.3, 2.3, 'коридор'], [9.3, 4.6, 'жилая 15,71'], [11.4, 1.5, 'жилая 12,09']].forEach((l) => { dem += T(PX(l[0]), PZ(l[1]), l[2], { s: 2.2, c: '#555' }); });
dem += chain([-OUT, W + OUT], -TOPW - 0.5, true) + chain([-TOPW, D + OUT], -OUT - 0.5, false);
sheet('План демонтажа', planBox(planSVG(dem), PLAN_AT[0], PLAN_AT[1]) + legend([[sw('url(#hRed)'), 'демонтируемые перегородки застройщика (схематично, по плану 6 этажа)'], [sw('#454545'), 'наружные стены и стена к лестничной клетке — сохраняются']], 300, 14, 108) +
  notes(['Положение перегородок застройщика показано схематично по плану 6 этажа (экспликация: кухня 13,67; жилые 16,41 / 15,71 / 12,09; прихожая 7,71; с/у 3,98; кладовая 3,23 м²) и уточняется по факту.', 'Несущие стены, вентканалы и стояки не затрагиваются. До начала работ выполнить обследование и фотофиксацию.', 'Демонтаж сантехнических перегородок — после отключения стояков и согласования с УК.', 'Мусор вывозить по графику УК; полы защитить на время работ.'], 26, 168, 265));
// montage plan: new partitions red with thicknesses
let mon = wallsSVG({ onlyOuter: true }) + wallsSVG({ partFill: 'url(#hRed)', onlyOuter: false }).replace(/<rect[^>]*fill="#454545"[^>]*\/>/g, '') + doorsSVG() + dimsSVG(true);
[[4.63, 1.0, '110'], [6.245, 0.6, '110'], [6.99, 0.6, '140'], [8.925, 1.0, '110'], [7.5, 2.015, '110'], [10.5, 3.065, '110'], [5.295 - OFS, 4.5, '110'], [7.80 - OFS, 4.5, '120'], [9.735 - OFS, 5.0, '110']].forEach((l) => { mon += T(PX(l[0]) + 1.5, PZ(l[1]), l[2], { s: 1.8, c: '#b22', a: 'start' }); });
sheet('План монтажа перегородок', planBox(planSVG(mon), PLAN_AT[0], PLAN_AT[1]) + legend([[sw('url(#hRed)'), 'новые перегородки: ПГП 80 / ГКЛ на профиле 100 — по планировке №148 (толщина в чистоте 110–140 мм)'], [sw('#454545'), 'существующие стены'], ['Ø', 'дверные проёмы: ширина — по плану дверей, высота 2100']], 300, 14, 108) +
  notes(['Перегородки санузлов — из влагостойких материалов (ПГП гидрофобизированный / ГКЛВ); в мокрых зонах — гидроизоляция пола с заходом на стены 200 мм.', 'Привязки перегородок — от чистовых поверхностей наружных стен; углы помещений 90°.', 'Размеры проёмов даны в штукатурке; заказ дверей — после снятия замеров с готовых проёмов.', 'Электрощит — в прихожей у входной двери; трассы инженерных сетей — по соответствующим планам.'], 26, 168, 265));
// construction plan with the schedule
sheet('Строительный план<br>с экспликацией помещений', planBox(planSVG(BASE() + dimsSVG(false) + roomLabels({ all: true })), PLAN_AT[0], PLAN_AT[1]) + '<div class="side" style="left:300mm;top:14mm;width:108mm">' + expl() + '</div>' +
  notes(['Нумерация помещений — единая для всех листов альбома.', 'Площади — по внутреннему контуру, без учёта отделки.'], 26, 168, 265));
// furniture plan
const FL = [[2.4, 0.3, 'кухня 4600, холодильник, колонна'], [0.95, 1.95, 'стол ⌀1000'], [3.2, 3.9, 'диван 2222 × 950'], [3.2, 5.0, 'столик ⌀700'], [3.5, 5.78, 'ТВ-тумба 2200'], [1.46, 5.45, 'витрина'], [0.5, 5.72, 'шкаф 970'], [0.7, 2.6, 'кресло'],
  [4.95, 1.5, 'шкаф'], [4.95, 0.42, 'обувница'], [6.61, 0.4, 'СМ'], [6.6, 1.1, 'унитаз'], [8.47, 1.1, 'ванна 1700 × 750'], [7.38, 0.2, 'пенал'], [9.6, 1.1, 'кровать 1200 × 2000'], [12.0, 0.32, 'шкаф 2000'], [12.0, 2.7, 'стол 1200'], [5.85 - OFS, 3.63, 'шкаф 980'], [7.2 - OFS, 5.36, 'кровать 880 × 1280'], [8.77 - OFS, 5.0, 'гардеробная'], [MC, 5.0, 'кровать 1800 × 2000'], [MC, 3.3, 'ТВ-консоль']];
let fp = BASE() + furnSVG() + roomLabels({ area: false }); FL.forEach((l) => { fp += T(PX(l[0]), PZ(l[1]) + 0.6, l[2], { s: 1.6, c: '#333' }); });
sheet('План расположения мебели<br>и оборудования', planBox(planSVG(fp), PLAN_AT[0], PLAN_AT[1]) + '<div class="side" style="left:300mm;top:14mm;width:108mm"><img src="' + IMG + 'top.png" style="width:108mm;border:0.2mm solid #999"><div class="cap2">Та же расстановка на 3D-модели (вид сверху, стены срезаны на 1,1 м)</div></div>' +
  notes(['Габариты мебели — по планировке №148 и 3D-модели; перед заказом уточнить по каталогам выбранных моделей.', 'Встроенная мебель (кухня, шкафы, гардеробная) — по чертежам раздела «Чертежи мебели».', 'Проходы не менее 700 мм; у кровати в спальне — по 800 мм с обеих сторон.', 'Размеры на плане даны условно; окончательные — по контрольному обмеру.'], 26, 168, 265));
// floor plan
let flp = ''; ROOMS.forEach((r) => { const t = FLOOR(r.id); flp += R(PX(r.x), PZ(r.z), r.w * S, r.d * S, 'fill="' + (t === 'П-3' ? 'url(#hOak)' : t === 'П-1' ? 'url(#hStone)' : 'url(#hTile)') + '" stroke="none"'); });
flp += R(PX(0), PZ(0), 4.575 * S, 1.25 * S, 'fill="url(#hStone)" stroke="none"') + BASE() + roomLabels({ area: false });
ROOMS.forEach((r) => { flp += T(PX(r.lab ? r.lab[0] : r.x + r.w / 2), PZ(r.lab ? r.lab[1] : r.z + r.d / 2) + 4.2, FLOOR(r.id), { s: 2.2, c: '#1a4f8a', w: 700 }); });
flp += T(PX(2.3), PZ(0.62), 'П-1 · рабочая зона кухни 4575 × 1250', { s: 1.8, c: '#1a4f8a' });
[[5.73, 0], [6.245, 1.625], [7.845, 2.015], [8.925, 2.55], [6.74, 3.065], [8.35, 3.065]].forEach((p) => { flp += L(PX(p[0]) - 9, PZ(p[1]), PX(p[0]) + 9, PZ(p[1]), 'stroke="#d33" stroke-width="0.5" stroke-dasharray="1 0.6"'); });
const areaBy = (t) => ROOMS.filter((r) => FLOOR(r.id) === t).reduce((a, r) => a + r.a, 0);
sheet('План пола<br>спецификация напольных покрытий', planBox(planSVG(flp), PLAN_AT[0], PLAN_AT[1]) + '<div class="side" style="left:300mm;top:14mm;width:108mm">' + table(['Марка', 'Покрытие', 'Помещения', 'м²'], Object.keys(FLOORS).map((k) => [k, FLOORS[k][0], FLOORS[k][1], fmt1(areaBy(k) + (k === 'П-1' ? 4.575 * 1.25 : k === 'П-3' ? -4.575 * 1.25 : 0))]).concat([['—', 'Порог / стык покрытий: Т-образный профиль, латунь матовая', 'в дверных проёмах', '6 шт.']])) + '</div>' +
  notes(['Расход — площадь + 7 % (ёлочка — + 12 %). Направление укладки доски — вдоль длинной стены комнаты.', 'Под доску — фанера 12 мм на стяжке / клеевая укладка; под керамогранит — выравнивающая стяжка, в мокрых зонах — гидроизоляция.', 'Плинтус — по плану плинтусов. Стыки покрытий — по оси дверного полотна.'], 26, 168, 265));
// skirting plan
let sk = BASE() + furnSVG({ stroke: '#bbb' }); let skLen = 0;
ROOMS.forEach((r) => { if (WET.includes(r.id)) return; const segs = [[r.x, r.z, r.x + r.w, r.z], [r.x, r.z + r.d, r.x + r.w, r.z + r.d], [r.x, r.z, r.x, r.z + r.d], [r.x + r.w, r.z, r.x + r.w, r.z + r.d]]; segs.forEach((g) => { sk += L(PX(g[0]), PZ(g[1]), PX(g[2]), PZ(g[3]), 'stroke="#1a7f3a" stroke-width="0.7"'); skLen += Math.hypot(g[2] - g[0], g[3] - g[1]); }); });
sheet('План плинтусов', planBox(planSVG(sk + roomLabels({ area: false })), PLAN_AT[0], PLAN_AT[1]) + legend([['<span style="display:inline-block;width:10mm;height:0.7mm;background:#1a7f3a"></span>', 'Пл-1: плинтус МДФ 80 × 16 мм, крашенный в цвет стен (RAL 9001), скрытое крепление — ' + Math.round(skLen * 0.92) + ' м.п. (за вычетом проёмов и встроенной мебели)'], ['—', 'в санузлах плинтус не ставится: плитка стен до пола, затирка в цвет']], 300, 14, 108) +
  notes(['Плинтус заводить под дверные наличники; стыки — под 45°, внутренние углы — запил.', 'За встроенной мебелью (кухня, шкафы до потолка, гардеробная) плинтус не устанавливается.', 'Кабель-каналы в плинтусе не предусмотрены: разводка — в стенах.'], 26, 168, 265));
// ceiling plan with lights
const LIGHTS = [];   // [x, z, type]: d = downlight, p = pendant, s = sconce, l = led strip (with length along x)
const grid = (r, nx, nz, pad) => { for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) LIGHTS.push([r.x + pad + (r.w - 2 * pad) * (nx === 1 ? 0.5 : i / (nx - 1)), r.z + pad + (r.d - 2 * pad) * (nz === 1 ? 0.5 : j / (nz - 1)), 'd']); };
grid(roomOf('living'), 3, 4, 0.5); LIGHTS.push([0.95, 1.95, 'p'], [3.2, 4.4, 'p']);
grid(roomOf('hall'), 1, 3, 0.45); grid(roomOf('corr'), 2, 1, 0.5); LIGHTS.push([6.61, 1.0, 'd'], [7.4, 0.9, 'd'], [8.4, 1.0, 'd']);
grid(roomOf('kids'), 2, 2, 0.6); LIGHTS.push([11.0, 1.5, 'p']); grid(roomOf('office'), 2, 2, 0.5); LIGHTS.push([8.77 - OFS, 4.3, 'd'], [8.77 - OFS, 5.6, 'd'], [8.77 - OFS, 3.5, 'd']);
grid(roomOf('master'), 2, 2, 0.55); LIGHTS.push([MC, 4.5, 'p'], [MC - 1.2, 5.9, 's'], [MC + 1.2, 5.9, 's'], [6.9, 1.2, 's'], [7.08, 1.2, 's'], [9.8, 1.8, 's']);
const lightSym = (l) => l[2] === 'd' ? '<circle cx="' + PX(l[0]).toFixed(1) + '" cy="' + PZ(l[1]).toFixed(1) + '" r="1.4" fill="#fff" stroke="#222" stroke-width="0.25"/><circle cx="' + PX(l[0]).toFixed(1) + '" cy="' + PZ(l[1]).toFixed(1) + '" r="0.5" fill="#222"/>'
  : l[2] === 'p' ? '<circle cx="' + PX(l[0]).toFixed(1) + '" cy="' + PZ(l[1]).toFixed(1) + '" r="2.2" fill="#fff" stroke="#222" stroke-width="0.3"/><circle cx="' + PX(l[0]).toFixed(1) + '" cy="' + PZ(l[1]).toFixed(1) + '" r="1.1" fill="none" stroke="#222" stroke-width="0.3"/>'
  : '<g transform="translate(' + PX(l[0]).toFixed(1) + ' ' + PZ(l[1]).toFixed(1) + ')"><path d="M-1.6 0 A1.6 1.6 0 0 1 1.6 0 Z" fill="#222"/></g>';
let cl = ''; ROOMS.forEach((r) => { cl += R(PX(r.x), PZ(r.z), r.w * S, r.d * S, 'fill="' + (WET.includes(r.id) ? 'url(#hCeil)' : '#fbfbf8') + '"'); });
[[0, 0, 0.3, 6.0], [W - 0.3, 0, 0.3, 3.01], [W - 0.3, 3.12, 0.3, 2.88]].forEach((n) => { cl += R(PX(n[0]), PZ(n[1]), n[2] * S, n[3] * S, 'fill="url(#hBlue)" stroke="#3b7dd8" stroke-width="0.2"'); });
cl += BASE() + roomLabels({ area: false }); ROOMS.forEach((r) => { if (r.id === 'vest') return; cl += T(PX(r.lab ? r.lab[0] : r.x + r.w / 2), PZ(r.lab ? r.lab[1] : r.z + r.d / 2) + 4.2, WET.includes(r.id) ? 'h = 2550' : 'h = 2750', { s: 2, c: '#1a4f8a', w: 700 }); });
LIGHTS.forEach((l) => { cl += lightSym(l); }); cl += R(PX(1.2), PZ(0.6), 3.37 * S, 0.04 * S, 'fill="#f0b429" stroke="none"') + R(PX(7.86 - OFS), PZ(4.0), 1.82 * S, 0.05 * S, 'fill="#f0b429"');
const cnt = (t) => LIGHTS.filter((l) => l[2] === t).length;
sheet('План потолка<br>и освещения', planBox(planSVG(cl), PLAN_AT[0], PLAN_AT[1]) + legend([[sw('#fbfbf8'), 'основной потолок: штукатурка, краска матовая, h = 2750'], [sw('url(#hCeil)'), 'ГКЛВ на каркасе, h = 2550 (санузлы — доступ к коммуникациям)'], [sw('url(#hBlue)'), 'ниша для штор 300 мм вдоль окон (ГКЛ-короб, карниз скрытый)'], [sym('<circle r="1.6" fill="#fff"/><circle r="0.6" fill="#222"/>'), 'встроенный светильник GU10 / LED 7 Вт, 3000 K — ' + cnt('d') + ' шт.'], [sym('<circle r="2.4" fill="#fff"/><circle r="1.2"/>'), 'подвесной светильник — ' + cnt('p') + ' шт.'], [sym('<path d="M-1.8 0 A1.8 1.8 0 0 1 1.8 0 Z" fill="#222"/>'), 'бра / настенный светильник — ' + cnt('s') + ' шт.'], ['<span style="display:inline-block;width:10mm;height:1mm;background:#f0b429"></span>', 'LED-лента 3000 K в профиле: подсветка кухни под навесными шкафами, гардеробная']], 300, 14, 108) +
  notes(['Все светильники — тёплый свет 3000 K, CRI ≥ 90; диммирование — общий свет гостиной и спальни.', 'Привязки светильников — от осей помещений, по плану; окончательные — по месту с учётом мебели.', 'Над столом — подвес на высоте 750 мм от столешницы; над диваном — подвес 1 шт. (центр зоны).'], 26, 168, 265));
// switches plan
const SW = [[6.0, 0.15, 'прихожая, холл', '1'], [4.75, 2.2, 'кухня-гостиная: общий / подвесы / LED', '2 · 3 · 4'], [6.35, 1.75, 'санузел', '5'], [7.6, 2.12, 'ванная: общий / зеркало', '6 · 7'], [9.0, 2.75, 'детская: общий / подвес', '8 · 9'], [6.25 - OFS, 3.2, 'кабинет', '10'], [8.0 - OFS, 3.2, 'спальня (вход): общий', '11'], [8.9 - OFS, 4.1, 'гардеробная + LED', '12'], [MC - 1.35, 5.6, 'спальня: проходной у кровати, бра', '11 · 13'], [MC + 1.35, 5.6, 'бра', '13']];
let swp = BASE() + furnSVG({ stroke: '#ccc' }); LIGHTS.forEach((l) => { swp += lightSym(l); });
SW.forEach((s2) => { swp += '<g transform="translate(' + PX(s2[0]).toFixed(1) + ' ' + PZ(s2[1]).toFixed(1) + ')"><circle r="1.3" fill="#fff" stroke="#222" stroke-width="0.3"/><path d="M0 -1.3 L1.6 -3.2 M0.9 -1 L2.5 -2.9" stroke="#222" stroke-width="0.35" fill="none"/></g>' + T(PX(s2[0]) + 3.2, PZ(s2[1]) + 1, s2[3], { s: 1.8, a: 'start', c: '#b22', w: 700 }); });
sheet('План привязки выключателей<br>к группам освещения', planBox(planSVG(swp), PLAN_AT[0], PLAN_AT[1]) + '<div class="side" style="left:300mm;top:14mm;width:108mm">' + table(['Группа', 'Выключатель', 'Управляет'], SW.map((s2) => [s2[3], s2[2].split(':')[0], s2[2].includes(':') ? s2[2].split(':')[1].trim() : 'общий свет'])) + '</div>' +
  notes(['Выключатели — на высоте 900 мм от чистого пола, в 100–150 мм от наличника со стороны ручки.', 'Спальня: проходные выключатели у входа и у кровати (группа 11); бра — с отдельных клавиш у кровати.', 'Гостиная: три клавиши — общий свет, подвесы над столом и диваном, LED-подсветка кухни.', 'Санузлы: выключатели снаружи у двери. Все группы — через щит с автоматами 10 А.'], 26, 168, 265));
// sockets plan
const SOCK = [[0.9, 0.0, 'кухня: ряд над столешницей 1100', 4], [3.3, 0.0, 'кухня: фартук 1100', 3], [0.3, 0.0, 'холодильник / колонна (за мебелью)', 3], [4.3, 0.0, 'ПММ, мойка (за мебелью, 300)', 2], [1.2, 2.3, 'обеденная зона 300', 2], [0.0, 3.5, 'кресло / торшер', 1], [3.3, 6.0, 'ТВ-зона: 5 + ТВ-розетка + LAN, 300 / 1200', 6], [0.05, 5.3, 'витрина, подсветка', 2], [5.24, 4.5, 'у дивана', 2],
  [5.6, 0.0, 'прихожая: щит, роутер, пылесос', 3], [6.19, 2.6, 'холл', 1], [6.9, 0.3, 'стиральная машина 1000, IP44', 1], [6.6, 1.96, 'санузел у зеркала 1200, IP44', 1], [7.08, 1.96, 'ванная у зеркала 1200, IP44', 2], [8.9, 1.0, 'полотенцесушитель 600', 1],
  [9.0, 1.1, 'детская у кровати 300 / 700', 2], [12.4, 3.0, 'рабочий стол 300 + 1100, LAN', 4], [13.0, 1.5, 'общие', 2], [5.35 - OFS, 5.5, 'кабинет: рабочее место 300 / 1100, LAN', 4], [7.7 - OFS, 3.6, 'кабинет', 2], [8.77 - OFS, 6.0, 'гардеробная: утюг', 1],
  [MC - 1.2, 6.0, 'спальня у кровати 700', 2], [MC + 1.2, 6.0, 'спальня у кровати 700', 2], [MC - 0.3, 3.12, 'ТВ-зона спальни 300 / 1200 + ТВ', 4], [13.0, 4.5, 'общая', 1]];
let sp = BASE() + furnSVG({ stroke: '#ccc' });
SOCK.forEach((sk2) => { sp += '<g transform="translate(' + PX(sk2[0]).toFixed(1) + ' ' + PZ(sk2[1]).toFixed(1) + ')"><circle r="1.4" fill="#fff" stroke="#222" stroke-width="0.3"/><line x1="0" y1="-1.4" x2="0" y2="-3.2" stroke="#222" stroke-width="0.4"/><text y="0.9" font-size="2" text-anchor="middle" fill="#222" font-weight="600">' + sk2[3] + '</text></g>'; });
sheet('План размещения розеток<br>и электровыводов', planBox(planSVG(sp + roomLabels({ area: false })), PLAN_AT[0], PLAN_AT[1]) + '<div class="side" style="left:300mm;top:14mm;width:108mm">' + table(['Зона', 'Розеток', 'Высота от ч. п., мм'], SOCK.map((sk2) => [sk2[2].split(',')[0].split(':')[0] + (sk2[2].includes(':') ? ': ' + sk2[2].split(':')[1].split(',')[0].trim() : ''), sk2[3], (sk2[2].match(/\d{3,4}(\s*\/\s*\d{3,4})?/) || ['300'])[0]]), 'small') + '<div class="cap2">Всего розеток: ' + SOCK.reduce((a, s2) => a + s2[3], 0) + ' шт. · цифра у символа — количество в блоке</div></div>' +
  notes(['Высота по умолчанию 300 мм до оси; у рабочих поверхностей 1100; у зеркал 1200; за ТВ 1200 (скрытый кабель-канал к тумбе 300).', 'В санузлах — розетки IP44 на линиях с УЗО 10 мА; стиральная машина — отдельная линия.', 'Кухня: духовой шкаф, варочная панель, ПММ, холодильник — отдельные линии; варочная — 32 А.', 'Слаботочные: LAN в ТВ-зоне, кабинете и детской; роутер — в прихожей у щита; ТВ-кабель — к двум ТВ-зонам.', 'Выводы для кондиционеров — по плану кондиционирования; тёплые полы — по плану тёплых полов.'], 26, 168, 265));
// warm floor
let wf = BASE(); const WFZ = [['hall', 'прихожая'], ['corr', 'холл'], ['wc', 'санузел'], ['bath', 'ванная']]; let wfA = 0;
WFZ.forEach((z) => { const r = roomOf(z[0]); wf += R(PX(r.x) + 2, PZ(r.z) + 2, r.w * S - 4, r.d * S - 4, 'fill="url(#hWarm)" stroke="#e0774a" stroke-width="0.3"'); wfA += (r.w - 0.2) * (r.d - 0.2) * 0.8; });
wf += R(PX(0.6) + 2, PZ(0.6) + 2, 3.975 * S - 4, 0.65 * S - 4, 'fill="url(#hWarm)" stroke="#e0774a" stroke-width="0.3"'); wfA += 3.9 * 0.6;
[[6.1, 1.9], [6.1, 2.7], [8.1, 2.2], [4.75, 1.9]].forEach((t) => { wf += '<g transform="translate(' + PX(t[0]).toFixed(1) + ' ' + PZ(t[1]).toFixed(1) + ')"><rect x="-1.8" y="-1.8" width="3.6" height="3.6" fill="#fff" stroke="#e0774a" stroke-width="0.35"/><text y="1" font-size="2" text-anchor="middle" fill="#e0774a" font-weight="700">t</text></g>'; });
sheet('План тёплого пола', planBox(planSVG(wf + roomLabels({ area: false })), PLAN_AT[0], PLAN_AT[1]) + legend([[sw('url(#hWarm)'), 'электрический тёплый пол (мат 150 Вт/м²) под керамогранитом, отступ от стен и сантехники 100 мм — ≈ ' + fmt1(wfA) + ' м²'], [sym('<rect x="-2" y="-2" width="4" height="4" fill="#fff" stroke="#e0774a"/><text y="1" font-size="2.6" text-anchor="middle" fill="#e0774a" stroke="none" font-weight="700">t</text></svg>'), 'терморегулятор с датчиком пола, 900 мм от ч. п. — 4 шт.']], 300, 14, 108) +
  notes(['Зоны: прихожая, холл, оба санузла и полоса вдоль кухонного гарнитура (без зоны под мебелью и приборами).', 'Под инженерной доской тёплый пол не предусмотрен; при желании — только инфракрасная плёнка по рекомендации производителя доски.', 'Каждая зона — отдельный терморегулятор и линия от щита через УЗО 30 мА.', 'Перед заливкой стяжки — фотофиксация раскладки мата с привязками.'], 26, 168, 265));
// air conditioning and ventilation
let ac = BASE() + furnSVG({ stroke: '#ccc' });
const ACU = [[4.9 - OFS, 3.3, 'living', 'внутр. блок 1 (над шкафом гостиной, стена кабинета)'], [12.6, 3.2, 'master', 'внутр. блок 2 (над входом в спальню)'], [12.6, 2.7, 'kids', 'внутр. блок 3 (стена над столом)']];
ACU.forEach((u) => { ac += R(PX(u[0]) - 8, PZ(u[1]) - 2.5, 16, 5, 'fill="#dbe9fb" stroke="#1a4f8a" stroke-width="0.35"') + T(PX(u[0]), PZ(u[1]) + 1, 'ВБ', { s: 2.2, c: '#1a4f8a', w: 700 }); });
ac += R(PX(W + OUT) + 1, PZ(2.3) - 5, 6, 10, 'fill="#dbe9fb" stroke="#1a4f8a" stroke-width="0.35"') + T(PX(W + OUT) + 4, PZ(2.3) + 1, 'НБ', { s: 2.2, c: '#1a4f8a', w: 700 });
ac += '<path d="M' + PX(W + OUT + 0.3) + ' ' + PZ(2.3) + ' L' + PX(12.6) + ' ' + PZ(2.7) + ' L' + PX(12.6) + ' ' + PZ(3.2) + ' M' + PX(12.6) + ' ' + PZ(3.0) + ' L' + PX(5.4 - OFS) + ' ' + PZ(3.0) + ' L' + PX(4.9 - OFS) + ' ' + PZ(3.3) + '" fill="none" stroke="#1a4f8a" stroke-width="0.4" stroke-dasharray="2 1"/>';
[[6.61, 0.1], [7.9, 0.1], [0.6, 0.0]].forEach((v) => { ac += '<g transform="translate(' + PX(v[0]).toFixed(1) + ' ' + PZ(v[1]).toFixed(1) + ')"><rect x="-2.5" y="-2.5" width="5" height="5" fill="#fff" stroke="#222" stroke-width="0.3"/><path d="M-2.5 -2.5 L2.5 2.5 M2.5 -2.5 L-2.5 2.5" stroke="#222" stroke-width="0.3"/></g>'; });
sheet('План кондиционирования<br>и вентиляции', planBox(planSVG(ac + roomLabels({ area: false })), PLAN_AT[0], PLAN_AT[1]) + legend([[sw('#dbe9fb'), 'ВБ — внутренний настенный блок мульти-сплит-системы (3 шт.); НБ — наружный блок на фасаде (1 шт.), место — по согласованию с УК'], ['<span style="display:inline-block;width:10mm;border-top:0.5mm dashed #1a4f8a"></span>', 'трасса фреонопровода и дренажа в штробе / за потолком, дренаж — в канализацию с сифоном'], [sym('<rect x="-2.5" y="-2.5" width="5" height="5" fill="#fff"/><path d="M-2.5 -2.5 L2.5 2.5 M2.5 -2.5 L-2.5 2.5"/>'), 'вентканал / вытяжка: санузлы (вентиляторы с таймером), кухня — вытяжка над плитой в вентканал']], 300, 14, 108) +
  notes(['Мульти-сплит 3 × 2,5 кВт с одним наружным блоком; трассы закладываются до штукатурки.', 'Внутренние блоки не направлять на кровати и рабочие места; высота установки — 200 мм от потолка.', 'Приточные клапаны — в оконных блоках жилых комнат.', 'Наличие и положение вентканалов проверить по факту; на 3D-модели они не показаны.'], 26, 168, 265));
// doors plan
const DT = [['Д1', 'Входная', '900 × 2100', 'металлическая, графит, с терморазрывом; открывание наружу', 1], ['Д2', 'Гостевой санузел', '650 × 2100', 'распашная, скрытый короб, полотно в цвет стен, с вентрешёткой / зазором 20 мм', 1], ['Д3', 'Ванная', '600 × 2100', 'распашная, скрытый короб, полотно в цвет стен', 1], ['Д4', 'Детская', '800 × 2100', 'распашная, скрытый короб, эмаль RAL 9001', 1], ['Д5', 'Кабинет', '800 × 2100', 'распашная, скрытый короб, эмаль RAL 9001', 1], ['Д6', 'Спальня', '800 × 2100', 'распашная, скрытый короб, эмаль RAL 9001', 1], ['Д7', 'Гардеробная', '2 × 920 × 2700', 'раздвижные полотна в потолочном треке, шпон дуба', 1]];
let dp = BASE() + furnSVG({ stroke: '#ccc' }); [[5.73, -0.35, 'Д1'], [6.6, 1.62, 'Д2'], [7.84, 2.4, 'Д3'], [9.3, 2.55, 'Д4'], [6.74 - OFS, 3.5, 'Д5'], [8.35 - OFS, 3.5, 'Д6'], [8.77 - OFS, 3.75, 'Д7']].forEach((m) => { dp += '<g transform="translate(' + PX(m[0]).toFixed(1) + ' ' + PZ(m[1]).toFixed(1) + ')"><circle r="2.4" fill="#fff" stroke="#b22" stroke-width="0.3"/><text y="0.9" font-size="2.2" text-anchor="middle" fill="#b22" font-weight="700">' + m[2] + '</text></g>'; });
sheet('План дверей<br>спецификация дверных блоков', planBox(planSVG(dp + roomLabels({ area: false })), PLAN_AT[0], PLAN_AT[1]) + '<div class="side" style="left:300mm;top:14mm;width:108mm">' + table(['Марка', 'Помещение', 'Проём, мм', 'Полотно', 'шт.'], DT, 'small') + '</div>' +
  notes(['Размеры проёмов — в штукатурке; размер полотна уточняется у производителя по снятым замерам.', 'Фурнитура — ручки на розетке, латунь матовая; магнитные замки; в санузлах — с фиксатором.', 'Межкомнатные двери — без порогов; зазор под полотном 10 мм (в санузлах — 20 мм для вентиляции).', 'Сторона открывания — по плану (петли показаны дугой).'], 26, 168, 265));
// plumbing
const PL = [['1', 'Мойка кухонная врезная 500 × 400, смеситель с выдвижным изливом', 1], ['2', 'Посудомоечная машина 450 (встр.)', 1], ['3', 'Стиральная машина 600 × 600 (гостевой санузел)', 1], ['4', 'Унитаз подвесной с инсталляцией, клавиша в цвет стен', 2], ['5', 'Раковина подвесная / на тумбе 500 × 400, смеситель', 2], ['6', 'Ванна акриловая 1700 × 750, смеситель с душевой стойкой, стеклянная шторка', 1], ['7', 'Полотенцесушитель электрический 500 × 900', 2], ['8', 'Водонагреватель накопительный 50 л (резерв, гостевой санузел)', 1], ['9', 'Коллекторный узел, фильтры, редукторы, защита от протечек', 1]];
let plp = BASE() + furnSVG({ stroke: '#bbb' }); [[1.6, 0.3, '1'], [4.3, 0.3, '2'], [6.61, 0.4, '3'], [6.61, 1.1, '4'], [6.59, 1.7, '5'], [7.49, 1.1, '4'], [7.3, 1.7, '5'], [8.47, 1.1, '6'], [7.85, 0.25, '7'], [6.4, 1.96, '7'], [6.6, 0.9, '8']].forEach((m) => { plp += '<g transform="translate(' + PX(m[0]).toFixed(1) + ' ' + PZ(m[1]).toFixed(1) + ')"><circle r="2" fill="#fff" stroke="#1a4f8a" stroke-width="0.3"/><text y="0.8" font-size="2.1" text-anchor="middle" fill="#1a4f8a" font-weight="700">' + m[2] + '</text></g>'; });
[[6.3, 0.0], [7.06, 0.0], [4.575, 0.0]].forEach((v) => { plp += '<g transform="translate(' + PX(v[0]).toFixed(1) + ' ' + PZ(v[1]).toFixed(1) + ')"><circle r="1.5" fill="#1a4f8a"/><circle cx="3" r="1.5" fill="#d33"/><circle cx="6" r="1.8" fill="none" stroke="#555" stroke-width="0.4"/></g>'; });
sheet('План сантехнического оборудования<br>и спецификация', planBox(planSVG(plp + roomLabels({ area: false })), PLAN_AT[0], PLAN_AT[1]) + '<div class="side" style="left:300mm;top:14mm;width:108mm">' + table(['№', 'Прибор', 'шт.'], PL, 'small') + '</div>' +
  notes(['Положение стояков на 3D-модели не показано — уточнить по факту; выводы ХВС/ГВС/канализации (синий/красный/серый) показаны условно у стен санузлов и кухни.', 'Высоты выводов: унитаз — по инсталляции; раковина 550 (смеситель на тумбе) или 1000 (настенный); ванна — смеситель 850; СМ — 600; мойка — 450.', 'Канализация — уклон 2–3 см/м; стиральная машина — через сифон с обратным клапаном.', 'Полотенцесушители электрические — вывод 220 В на 600 мм, IP44.'], 26, 168, 265));

/* ---------- 4. elevations ---------- */
const ELEV = [['living', 'Развёртки стен<br>кухни-гостиной'], ['hall', 'Развёртки стен<br>прихожей'], ['corr', 'Развёртки стен<br>холла'], ['wc', 'Развёртки стен<br>гостевого санузла'], ['bath', 'Развёртки стен<br>ванной'], ['kids', 'Развёртки стен<br>детской'], ['office', 'Развёртки стен<br>кабинета'], ['ward', 'Развёртки стен<br>гардеробной'], ['master', 'Развёртки стен<br>спальни']];
const FIN = (id) => WET.includes(id) ? [['К-1', 'керамогранит 600 × 1200 под светлый камень (стены по периметру до потолка)'], ['К-2', 'акцент: керамогранит под дерево, зона ванны / зеркала'], ['Пл', 'плинтус не предусмотрен — плитка до пола']] : id === 'living' ? [['С-1', 'краска матовая моющаяся, оттенок greige (RAL 9001 / 1013)'], ['С-2', 'фартук кухни: керамогранит под светлый камень в цвет столешницы'], ['С-3', 'ТВ-стена: панели МДФ, шпон дуба / рейки'], ['Пл-1', 'плинтус МДФ 80 мм в цвет стен']] : id === 'master' || id === 'kids' ? [['С-1', 'краска матовая моющаяся, оттенок greige'], ['С-4', 'изголовье: мягкие панели / текстиль, акцентная стена'], ['Пл-1', 'плинтус МДФ 80 мм в цвет стен']] : [['С-1', 'краска матовая моющаяся, оттенок greige'], ['Пл-1', 'плинтус МДФ 80 мм в цвет стен']];
ELEV.forEach((e) => { const r = roomOf(e[0]); const views = ['n', 'e', 's', 'w'].map((sd) => elevation(r, sd));
  const maxW = Math.max(...views.map((v) => v.w)), rowH = Math.max(...views.map((v) => v.h)); const wide = maxW > 170;
  let body = '<div class="elev">'; views.forEach((v, i) => { const col = wide ? 0 : i % 2, row = wide ? i : Math.floor(i / 2);
    const scale = wide ? Math.min(1, 44 / rowH, 260 / maxW) : Math.min(1, 84 / rowH, 127 / maxW);
    body += '<div style="position:absolute;left:' + (26 + col * (maxW * scale + 10)) + 'mm;top:' + (10 + row * (wide ? 44 : 84)) + 'mm"><svg xmlns="http://www.w3.org/2000/svg" width="' + (v.w * scale) + 'mm" height="' + (v.h * scale) + 'mm" viewBox="0 0 ' + v.w + ' ' + v.h + '">' + v.svg + '</svg></div>'; });
  body += '</div>' + planBox(roomKey(r), 300, 60) + '<div class="legend" style="left:300mm;top:14mm;width:108mm"><b>Отделка · ' + NAMES[r.id] + '</b><table>' + FIN(r.id).map((f) => '<tr><td><b>' + f[0] + '</b></td><td>' + f[1] + '</td></tr>').join('') + '</table><p class="small">Развёртки построены по 3D-модели: мебель показана в проекции на стену; виды А–Г — по ключ-плану. Размеры — в штукатурке, до контрольного обмера.</p></div>';
  sheet(e[1], body); });

/* ---------- 5. finishing schedule ---------- */
const openArea = (r) => { let a = 0; DOORS.forEach((o) => { const on = o.ax ? ((Math.abs(o.z - r.z) < 0.12 || Math.abs(o.z - (r.z + r.d)) < 0.12) && o.x >= r.x - 0.05 && o.x + o.w <= r.x + r.w + 0.05) : ((Math.abs(o.x - r.x) < 0.12 || Math.abs(o.x - (r.x + r.w)) < 0.12) && o.z >= r.z - 0.05 && o.z + o.w <= r.z + r.d + 0.05); if (on) a += o.w * 2.1; });
  WIN.forEach((w) => { const on = (r.x < 0.05 && w.side === 'w') || (r.x + r.w > W - 0.05 && w.side === 'e'); if (on && w.b > r.z && w.a < r.z + r.d) a += (Math.min(w.b, r.z + r.d) - Math.max(w.a, r.z)) * 1.45; }); return a; };
const FROWS = ROOMS.map((r) => { const per = 2 * (r.w + r.d), walls = per * (WET.includes(r.id) ? 2.55 : H) - openArea(r); return [RN[r.id], NAMES[r.id], fmt1(r.a), FLOOR(r.id), fmt1(r.a), WET.includes(r.id) ? 'К-1 / К-2' : r.id === 'living' ? 'С-1, С-2, С-3' : (r.id === 'master' || r.id === 'kids') ? 'С-1, С-4' : 'С-1', fmt1(walls), WET.includes(r.id) ? 'ГКЛВ, краска' : 'штукатурка, краска', fmt1(r.a), WET.includes(r.id) ? '—' : fmt1(per * 0.92)]; });
sheet('Ведомость отделки<br>помещений', H2('Ведомость отделки помещений', 'основной вариант «Светлая»; площади — по 3D-модели, без учёта запаса') + '<div class="text2 one">' + table(['№', 'Помещение', 'S пола, м²', 'Пол', 'м²', 'Стены', 'м² (за вычетом проёмов)', 'Потолок', 'м²', 'Плинтус, м.п.'], FROWS.concat([['', '<b>Итого</b>', '<b>' + fmt1(ROOMS.reduce((a, r) => a + r.a, 0)) + '</b>', '', '', '', '<b>' + fmt1(FROWS.reduce((a, r) => a + parseFloat(r[6].replace(',', '.')), 0)) + '</b>', '', '', '<b>' + fmt1(FROWS.reduce((a, r) => a + (parseFloat(r[9].replace(',', '.')) || 0), 0)) + '</b>']])) +
  '<h3>Материалы</h3>' + table(['Марка', 'Материал', 'Примечание'], [['П-1', FLOORS['П-1'][0], 'затирка в цвет, укладка со смещением ½'], ['П-2', FLOORS['П-2'][0], 'гидроизоляция, тёплый пол'], ['П-3', FLOORS['П-3'][0], 'укладка ёлочкой под 45°, масло-воск'], ['С-1', 'краска интерьерная матовая, моющаяся (класс 1), оттенок greige', 'по шпаклёвке и грунту; выкрас согласовать'], ['С-2', 'керамогранит под светлый камень 600 × 1200 (фартук кухни)', 'в цвет столешницы'], ['С-3', 'панели МДФ шпон дуба / рейки 40 × 20 с шагом 40', 'ТВ-стена гостиной'], ['С-4', 'мягкие панели, текстиль (изголовья)', 'спальня, детская'], ['К-1', 'керамогранит 600 × 1200 под светлый камень, матовый', 'санузлы, стены до потолка'], ['К-2', 'керамогранит под дерево 200 × 1200', 'акцентные зоны санузлов'], ['Пл-1', 'плинтус МДФ 80 × 16, крашенный в цвет стен', 'скрытое крепление'], ['Пт-1', 'потолок: штукатурка, шпаклёвка, краска матовая белая', 'жилые помещения, h 2750'], ['Пт-2', 'ГКЛВ на каркасе, краска влагостойкая', 'санузлы, h 2550']]) + '</div>');

/* ---------- 6. furniture drawings ---------- */
const FD = [
  ['Чертежи мебели<br>кухонный гарнитур', [['Кухонный гарнитур 4600 мм (колонна, холодильник, нижний ряд, навесные шкафы)', [0, 0, 4.6, 0.65], 'n', { skip: ['metal', 'black'] }]]],
  ['Чертежи мебели<br>прихожая и гостиная', [['Шкаф прихожей 1200 × 500 с зеркальной стенкой и обувница 800 × 500', [4.69, 0.0, 5.22, 2.15], 'w', {}], ['ТВ-тумба 2200 × 400 с ТВ и витрина 420 × 1100', [1.2, 4.85, 4.7, 6.0], 's', {}]]],
  ['Чертежи мебели<br>детская и кабинет', [['Детская: шкаф 2000 × 600 и кровать 1200 × 2000 с изголовьем', [8.98, 0.0, 13.0, 2.2], 'n', { skip: ['metal'] }], ['Детская: стол 1200 × 600 с тумбой у окна', [10.6, 2.3, 13.0, 3.01], 's', { skip: ['black'] }]]],
  ['Чертежи мебели<br>гардеробная и спальня', [['Гардеробная 1820 × 2000: стеллажи 580 мм с двух сторон, штанга', [7.86 - OFS, 4.0, 9.68 - OFS, 6.0], 's', {}], ['Спальня: кровать 1800 × 2000, тумбы 400, ТВ-консоль 1200 × 300', [9.79 - OFS, 3.12, 13.0, 6.0], 's', { skip: ['metal', 'linen', 'plant', 'pot', 'rug'] }]]],
  ['Чертежи мебели<br>санузлы', [['Гостевой санузел: тумба с раковиной 550 × 420, зеркало', [6.3, 1.4, 6.92, 1.96], 'n', {}], ['Ванная: тумба с раковиной 500 × 420, зеркало, пенал 600 × 350', [7.06, 0.0, 7.7, 1.96], 'w', {}]]]
];
FD.forEach((f) => { let body = '', y = 8; f[1].forEach((it) => { const dr = furnDrawing(it[0], it[1], it[2], it[3]); const sc = Math.min(1, 265 / dr.w, (232 / f[1].length - 6) / dr.h);
  body += '<div style="position:absolute;left:26mm;top:' + y + 'mm"><svg xmlns="http://www.w3.org/2000/svg" width="' + (dr.w * sc) + 'mm" height="' + (dr.h * sc) + 'mm" viewBox="0 0 ' + dr.w + ' ' + dr.h + '">' + dr.svg + '</svg></div>'; y += dr.h * sc + 6; });
  body += '<div class="legend" style="left:300mm;top:14mm;width:108mm"><b>Материалы и примечания</b><table><tr><td>Корпус</td><td>ЛДСП 16 мм, кромка ПВХ 1 мм в цвет</td></tr><tr><td>Фасады</td><td>МДФ, эмаль матовая greige (RAL 1013 / NCS S 2005-Y30R), интегрированные ручки</td></tr><tr><td>Акценты</td><td>шпон дуба натуральный, лак матовый</td></tr><tr><td>Столешницы</td><td>кварцевый агломерат 20 мм, светлый камень</td></tr><tr><td>Фурнитура</td><td>Blum / Hettich: доводчики, выдвижные ящики полного выдвижения</td></tr></table><p class="small">Чертежи — по 3D-модели, масштаб 1:25. Габариты — ориентир для изготовителя; окончательные размеры — по контрольному замеру после отделки.</p></div>';
  sheet(f[0], body); });

/* ---------- assemble ---------- */
const total = pages.length;
const contentsHtml = H2('Содержание альбома') + '<div class="cols">' + [contents.slice(0, Math.ceil(contents.length / 2)), contents.slice(Math.ceil(contents.length / 2))].map((half) => table(['Лист', 'Наименование'], half.map((c) => [String(c[0]).padStart(2, '0'), c[1]]))).join('') + '</div>';
pages[1].body = contentsHtml;
const css = `
@page{size:420mm 297mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:"Segoe UI",Arial,sans-serif;color:#111}
.pg{width:420mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;background:#fff}
.pg:last-child{page-break-after:auto}
.frame{position:absolute;left:20mm;top:5mm;right:5mm;bottom:5mm;border:0.6mm solid #111}
.tb{position:absolute;right:5mm;bottom:5mm;width:185mm;background:#fff}
.tb table{border-collapse:collapse;width:100%;font-size:2.6mm}
.tb td{border:0.35mm solid #111;padding:0.6mm 1.2mm;height:5.5mm;vertical-align:middle}
.tb .c1,.tb .c2,.tb .c3,.tb .c4,.tb .c5,.tb .c6{width:10mm}.tb .c5{width:14mm}.tb .c6{width:10mm}
.tb .l{font-size:2.3mm;color:#333}.tb .proj{width:72mm;text-align:center;font-size:3mm;line-height:1.25}.tb .proj span{font-size:2.3mm;color:#444}
.tb .h{text-align:center;font-size:2.4mm;color:#333;width:15mm}.tb .v{text-align:center;font-weight:600}
.tb .ttl{text-align:center;font-size:3.4mm;line-height:1.3;height:17mm}.tb .logo{text-align:center;font-size:2.4mm;color:#555}.tb .logo b{display:block;font-size:5mm;letter-spacing:0.5mm;color:#111}
.viz{position:absolute;left:124mm;top:10mm;width:288mm;height:180mm;overflow:hidden;background:#eee}.viz img{width:100%;height:100%;object-fit:cover;display:block}
.viz.big{left:26mm;top:10mm;width:386mm;height:230mm}
.cap{position:absolute;left:26mm;top:244mm;width:200mm;font-size:3mm;color:#333;line-height:1.4}.cap2{font-size:2.5mm;color:#555;margin-top:1.5mm}
.planbox{position:absolute}.planbox svg{display:block}
.cover{position:absolute;inset:0}.cover img{position:absolute;left:135mm;top:0;width:285mm;height:297mm;object-fit:contain;background:#e9eded}
.cover .ct{position:absolute;left:28mm;top:60mm;width:115mm}.cover h1{font-size:12mm;line-height:1.1;margin:0 0 8mm;font-weight:700;letter-spacing:-0.2mm}.cover p{font-size:4mm;line-height:1.5;margin:0 0 6mm;color:#222}.cover p.small{font-size:2.8mm;color:#555}
h2{position:absolute;left:26mm;top:10mm;margin:0;font-size:6mm;font-weight:700}h2 small{display:block;font-size:3mm;font-weight:400;color:#555;margin-top:1mm}
h3{font-size:4mm;margin:6mm 0 2mm}
.text2{position:absolute;left:26mm;top:26mm;width:386mm;font-size:3mm;line-height:1.45;column-count:2;column-gap:10mm}.text2 p{margin:0 0 2mm;break-inside:avoid}.text2.one{column-count:1}
.cols{position:absolute;left:26mm;top:26mm;width:386mm;display:flex;gap:10mm}.cols table{flex:1}
.tbl{border-collapse:collapse;width:100%;font-size:2.7mm}.tbl th,.tbl td{border:0.25mm solid #333;padding:0.9mm 1.6mm;vertical-align:top;text-align:left}.tbl th{background:#eee;font-weight:600}.tbl.small{font-size:2.3mm}.tbl.small td,.tbl.small th{padding:0.5mm 1.2mm}
.expl td:nth-child(1),.expl td:nth-child(4){text-align:right;white-space:nowrap}
.side{position:absolute}
.legend,.notes{position:absolute;font-size:2.5mm;line-height:1.35}.legend b,.notes b{display:block;margin-bottom:1.5mm;font-size:2.8mm}.legend table{border-collapse:collapse}.legend td{padding:0.6mm 1.5mm 0.6mm 0;vertical-align:middle}.legend td:first-child{width:12mm;white-space:nowrap}.notes p{margin:0 0 1mm}.small{font-size:2.2mm;color:#555;line-height:1.35}
.grid3{position:absolute;left:26mm;top:10mm;width:386mm;display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.grid3 figure,.grid2 figure{margin:0}.grid3 img,.grid2 img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block;background:#eee}figcaption{font-size:2.8mm;color:#333;margin-top:1mm}
.grid2{position:absolute;left:26mm;top:10mm;width:386mm;display:grid;grid-template-columns:repeat(2,1fr);gap:6mm}
`;
const html = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Дизайн-проект квартиры 20</title><style>' + css + '</style></head><body>' + pages.map((p) => renderSheet(p, total)).join('') + '</body></html>';
fs.writeFileSync(DIR + 'album.html', html);
console.log('sheets', total);
