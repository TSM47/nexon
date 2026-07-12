import Phaser from "phaser";
import { CLASSES } from "@aetherfall/shared";

/** Ile pikseli ekranu przypada na 1 piksel artu (chunky pixel-art). */
export const PIXEL_SCALE = 3;

type Palette = Record<string, string>;

function hex(n: number): string {
  return "#" + (n & 0xffffff).toString(16).padStart(6, "0");
}

function darken(n: number, f: number): number {
  const r = Math.round(((n >> 16) & 0xff) * f);
  const g = Math.round(((n >> 8) & 0xff) * f);
  const b = Math.round((n & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}

/** Rysuje siatkę pikseli (tablica łańcuchów) do tekstury Phasera. */
function makeTex(
  scene: Phaser.Scene,
  key: string,
  rows: string[],
  palette: Palette,
  scale = PIXEL_SCALE
) {
  if (scene.textures.exists(key)) return;
  const w = rows[0].length;
  const h = rows.length;
  for (const r of rows) {
    if (r.length !== w) {
      throw new Error(`Sprite ${key}: niespójna szerokość wiersza (${r.length} != ${w}): "${r}"`);
    }
  }
  const tex = scene.textures.createCanvas(key, w * scale, h * scale);
  if (!tex) return;
  const ctx = tex.getContext();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  tex.refresh();
}

// ----------------------- POSTAĆ (człowiek) -----------------------

// Ludzka sylwetka widziana z góry 3/4 (jak w klasycznych MMORPG typu Margonem):
// włosy, twarz z oczami, tunika w kolorze klasy, ręce, pas, spodnie, buty.
const HUMAN_ROWS = [
  "....hhhhhh....",
  "...hhhhhhhh...",
  "..hhhhhhhhhh..",
  "..hhsssssshh..",
  "..hssessessh..",
  "..hssssssssh..",
  "...ssssssss...",
  "....ssssss....",
  "..TTTTTTTTTT..",
  ".TTTTTTTTTTTT.",
  ".sTTTTTTTTTTs.",
  ".sTTTbbbbTTTs.",
  ".sTTTTTTTTTTs.",
  "..tttttttttt..",
  "...LLL..LLL...",
  "...LLL..LLL...",
  "...bbb..bbb...",
  "..bbbb..bbbb..",
];

function humanPalette(tunic: number, hair: number, pants = 0x3a4a5c): Palette {
  return {
    h: hex(hair),
    s: hex(0xecc39a),
    e: hex(0x2a1c12),
    T: hex(tunic),
    t: hex(darken(tunic, 0.7)),
    b: hex(0x4a3526),
    L: hex(pants),
  };
}

export function generatePlayers(scene: Phaser.Scene) {
  for (const id of Object.keys(CLASSES)) {
    makeTex(scene, `player_${id}`, HUMAN_ROWS, humanPalette(CLASSES[id].color, 0x5a3a22));
  }
}

/** NPC kupiec — siwy człowiek w złotej tunice i brązowych spodniach. */
export function generateNpc(scene: Phaser.Scene) {
  makeTex(scene, "npc", HUMAN_ROWS, humanPalette(0xd8a03c, 0xd8d8d8, 0x5c4a32));
}

// ----------------------- BOSS -----------------------

// Strażnik Aetheru – arkaniczny hełm z rogami i świecącymi oczami.
const BOSS_ROWS = [
  "...o........o...",
  "...oo......oo...",
  "....odddddo.....",
  "...oddDDDDddo...",
  "..oddDDDDDDddo..",
  "..odmDDDDDDmdo..",
  "..oddDDDDDDddo..",
  ".oddrRDDDDRrddo.",
  ".oddRRDDDDRRddo.",
  ".oddDDmmmmDDddo.",
  ".oddDDDDDDDDddo.",
  "..oddDmmmmDddo..",
  "..oddDDDDDDddo..",
  "...oddDDDDddo...",
  "....oddddddo....",
  ".....oooooo.....",
];

const BOSS_PALETTE: Palette = {
  o: hex(0x0a0608),
  d: hex(0x4a1822),
  D: hex(0x2c0e14),
  m: hex(0x8a4a55),
  r: hex(0xe2384a),
  R: hex(0xff6b78),
};

export function generateBoss(scene: Phaser.Scene) {
  makeTex(scene, "boss", BOSS_ROWS, BOSS_PALETTE, PIXEL_SCALE + 1);
}

// ----------------------- POCISK -----------------------

const PROJ_ROWS = [
  ".cww.",
  "cWWWc",
  "wWWWw",
  "cWWWc",
  ".cww.",
];

const PROJ_PALETTE: Palette = {
  c: hex(0xffcf6b),
  w: hex(0xffe9a8),
  W: hex(0xfffdf0),
};

export function generateProjectile(scene: Phaser.Scene) {
  makeTex(scene, "proj", PROJ_ROWS, PROJ_PALETTE);
}

// ----------------------- IKONY UI -----------------------

const ICON_SKILL = [
  "........",
  "...ww...",
  "..wWWw..",
  ".wWccWw.",
  "wWcooyWw",
  ".wWccWw.",
  "..wWWw..",
  "...ww...",
];
const ICON_SKILL_PAL: Palette = {
  w: hex(0xffcf6b),
  W: hex(0xffe9a8),
  c: hex(0xff9a3c),
  o: hex(0xfffdf0),
  y: hex(0xff7a2c),
};

const ICON_DASH = [
  "........",
  ".g......",
  ".gg...g.",
  ".ggg.gg.",
  ".gggggg.",
  ".ggg.gg.",
  ".gg...g.",
  ".g......",
];
const ICON_DASH_PAL: Palette = {
  g: hex(0x6fe3a0),
};

const CROSSHAIR = [
  "...ww...",
  "...ww...",
  "........",
  "ww....ww",
  "ww....ww",
  "........",
  "...ww...",
  "...ww...",
];
const CROSSHAIR_PAL: Palette = { w: hex(0xffffff) };

export function generateUiIcons(scene: Phaser.Scene) {
  makeTex(scene, "icon_skill", ICON_SKILL, ICON_SKILL_PAL, PIXEL_SCALE + 1);
  makeTex(scene, "icon_dash", ICON_DASH, ICON_DASH_PAL, PIXEL_SCALE + 1);
  makeTex(scene, "crosshair", CROSSHAIR, CROSSHAIR_PAL, PIXEL_SCALE);
}

// ----------------------- PODŁOŻE / DEKORACJE -----------------------

/** Prosty deterministyczny generator pseudolosowy (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TILE_PX = 16;
export const TILE_SIZE = TILE_PX * PIXEL_SCALE;
export const FLOOR_TILE_COUNT = 6;
export const DIRT_TILE_COUNT = 3;

/** Trawiaste kafle łąki z szumem i drobnymi kwiatkami. */
export function generateFloorTiles(scene: Phaser.Scene) {
  const base = [0x4c8a3f, 0x4a873c, 0x4f8d42, 0x498540];
  const flowers = [0xf2f2f2, 0xf2d24a, 0xd977b8];
  for (let i = 0; i < FLOOR_TILE_COUNT; i++) {
    const key = `tile_${i}`;
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
    if (!tex) continue;
    const ctx = tex.getContext();
    const rand = rng(1000 + i * 97);
    const b = base[i % base.length];
    ctx.fillStyle = hex(b);
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Źdźbła jaśniejsze/ciemniejsze.
    for (let p = 0; p < 30; p++) {
      const x = Math.floor(rand() * TILE_PX) * PIXEL_SCALE;
      const y = Math.floor(rand() * TILE_PX) * PIXEL_SCALE;
      const f = rand() > 0.5 ? 1.14 : 0.86;
      ctx.fillStyle = hex(darken(b, f));
      ctx.fillRect(x, y, PIXEL_SCALE, PIXEL_SCALE);
    }
    // Czasem drobny kwiatek.
    if (rand() > 0.6) {
      const fx = Math.floor(rand() * (TILE_PX - 2) + 1) * PIXEL_SCALE;
      const fy = Math.floor(rand() * (TILE_PX - 2) + 1) * PIXEL_SCALE;
      ctx.fillStyle = hex(flowers[Math.floor(rand() * flowers.length)]);
      ctx.fillRect(fx, fy, PIXEL_SCALE, PIXEL_SCALE);
    }
    tex.refresh();
  }
}

/** Kafle ubitej ziemi (ścieżka przez łąkę). */
export function generateDirtTiles(scene: Phaser.Scene) {
  const base = [0x8a6a42, 0x87673f, 0x8d6d45];
  for (let i = 0; i < DIRT_TILE_COUNT; i++) {
    const key = `dirt_${i}`;
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
    if (!tex) continue;
    const ctx = tex.getContext();
    const rand = rng(4000 + i * 131);
    const b = base[i % base.length];
    ctx.fillStyle = hex(b);
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    for (let p = 0; p < 24; p++) {
      const x = Math.floor(rand() * TILE_PX) * PIXEL_SCALE;
      const y = Math.floor(rand() * TILE_PX) * PIXEL_SCALE;
      const f = rand() > 0.5 ? 1.12 : 0.86;
      ctx.fillStyle = hex(darken(b, f));
      ctx.fillRect(x, y, PIXEL_SCALE, PIXEL_SCALE);
    }
    tex.refresh();
  }
}

const ROCK_ROWS = [
  "..ooo...",
  ".oggGo..",
  "oggGGgo.",
  "oggggGo.",
  ".oogggo.",
  "..oooo..",
  "........",
  "........",
];
const ROCK_PAL: Palette = {
  o: hex(0x2c4a24),
  g: hex(0x7a8188),
  G: hex(0x9aa2ab),
};

// Drzewo liściaste (korona + pień) — do lasu okalającego łąkę.
const TREE_ROWS = [
  ".....gggggg.....",
  "...gggggggggg...",
  "..gggggggggggg..",
  ".gggGGggggggggg.",
  ".gggggggggGGggg.",
  "gggGGggggggggggg",
  "ggggggggGGgggggg",
  ".ggggGGgggggggg.",
  ".gggggggggggggg.",
  "..gggggggggggg..",
  "...gggggggggg...",
  ".....gggggg.....",
  ".......ww.......",
  ".......ww.......",
  "......wwww......",
  "......wwww......",
];
const TREE_PAL: Palette = {
  g: hex(0x2f6b2a),
  G: hex(0x4c8a3f),
  w: hex(0x6b4a2c),
};

// Krzak.
const BUSH_ROWS = [
  "..gggggg..",
  ".gggGGggg.",
  "gGGggggGGg",
  "gggggGGggg",
  ".gggggggg.",
  "..gggggg..",
  "...gggg...",
];
const BUSH_PAL: Palette = {
  g: hex(0x3a7a32),
  G: hex(0x55984a),
};

export function generateDecor(scene: Phaser.Scene) {
  makeTex(scene, "rock", ROCK_ROWS, ROCK_PAL);
  makeTex(scene, "tree", TREE_ROWS, TREE_PAL);
  makeTex(scene, "bush", BUSH_ROWS, BUSH_PAL);
}

// ----------------------- GLOW / RADIAL -----------------------

export function generateGlow(scene: Phaser.Scene) {
  if (scene.textures.exists("glow")) return;
  const size = 256;
  const tex = scene.textures.createCanvas("glow", size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.4, "rgba(255,255,255,0.45)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

/** Generuje całą grafikę. */
export function generateAllArt(scene: Phaser.Scene) {
  generateGlow(scene);
  generatePlayers(scene);
  generateNpc(scene);
  generateBoss(scene);
  generateProjectile(scene);
  generateUiIcons(scene);
  generateFloorTiles(scene);
  generateDirtTiles(scene);
  generateDecor(scene);
}
