import Phaser from "phaser";
import type { Room } from "colyseus.js";
import {
  MSG,
  NPC,
  ITEMS,
  SHOP_STOCK,
  INVENTORY_CAP,
  SELL_RATIO,
  EQUIP_SLOTS,
  CLASSES,
  type EquipSlotId,
  type ItemRarity,
} from "@aetherfall/shared";
import { ELDRIC_DIALOG, DIALOG_START, type DialogNode } from "../data/dialog";

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: "#c3cbd8",
  epic: "#b07aff",
  legendary: "#ffa03c",
};

const SLOT_INFO: Record<string, string> = {
  helm: "hełm", chest: "napierśnik", pants: "spodnie", boots: "buty",
  gloves: "rękawice", neck: "naszyjnik", mainhand: "broń",
  offhand: "tarcza/strzały", rune: "runa", potion: "mikstura",
};

const EQUIP_LABELS: Record<EquipSlotId, string> = {
  helm: "Hełm", chest: "Napierśnik", pants: "Spodnie", boots: "Buty",
  gloves: "Rękawice", neck1: "Naszyjnik", neck2: "Naszyjnik",
  mainhand: "Broń", offhand: "Tarcza", rune1: "Runa", rune2: "Runa",
  rune3: "Runa", rune4: "Runa",
};

/** Rozmieszczenie gniazd paper-dolla wokół sylwetki (kolumna, rząd). */
const DOLL_LAYOUT: [EquipSlotId, "L" | "R", number][] = [
  ["helm", "L", 0], ["chest", "L", 1], ["pants", "L", 2], ["boots", "L", 3],
  ["gloves", "R", 0], ["neck1", "R", 1], ["neck2", "R", 2], ["mainhand", "R", 3],
];

type WindowId = "char" | "inv" | "trade" | "quests" | "skills";

const QUESTS = [
  { title: "Rozmowa z karczmarzem", desc: "Porozmawiaj z Eldrikiem Ashfordem.", done: true },
  { title: "Pierwsza krew", desc: "Pokonaj Strażnika Aetheru.", done: false, prog: "0/1" },
  { title: "Zaopatrzenie", desc: "Kup dowolny przedmiot u Eldrica.", done: false, prog: "0/1" },
  { title: "Uzbrojony", desc: "Załóż broń i pancerz.", done: false, prog: "0/2" },
];

const SKILLS = [
  { name: "Strzał Aetheru", key: "LPM", desc: "Pocisk zadający obrażenia. Koszt many.", unlock: 1 },
  { name: "Unik", key: "SPACJA", desc: "Zryw z klatkami nietykalności.", unlock: 1 },
  { name: "Grad Strzał", key: "1", desc: "Seria pocisków w wachlarzu.", unlock: 4 },
  { name: "Sidła", key: "2", desc: "Unieruchamia wroga w miejscu.", unlock: 6 },
  { name: "Deszcz Aetheru", key: "3", desc: "Potężne AoE z nieba.", unlock: 10 },
];

interface Zone { x: number; y: number; w: number; h: number; cb: () => void; }

export class UIScene extends Phaser.Scene {
  // Warstwy graficzne (kolejność = głębokość).
  private gDim!: Phaser.GameObjects.Graphics;   // przyciemnienie tła pod oknem
  private g!: Phaser.GameObjects.Graphics;       // wszystkie kształty
  private crosshair!: Phaser.GameObjects.Image;

  // Pule obiektów odtwarzane co klatkę.
  private textPool: Phaser.GameObjects.Text[] = [];
  private tpi = 0;
  private imgPool: Phaser.GameObjects.Image[] = [];
  private ipi = 0;
  private zones: Zone[] = [];

  // Stan dialogu.
  private dialogNode = DIALOG_START;
  private dialogChars = 0;
  private prevDialogOpen = false;

  private hasTex = (k: string) => this.textures.exists(k);

  constructor() {
    super("ui");
  }

  private room(): Room | undefined {
    return this.registry.get("room") as Room | undefined;
  }
  private me(): any {
    const r = this.room();
    const id = this.registry.get("localId") as string | undefined;
    return r && id ? r.state.players.get(id) : undefined;
  }

  create() {
    this.gDim = this.add.graphics().setDepth(18);
    this.g = this.add.graphics().setDepth(21);
    this.crosshair = this.add.image(0, 0, "crosshair").setDepth(60);

    this.text(16, 66, "WSAD ruch · mysz cel · I plecak · C postać · T handel · Q zadania · K umiejętności",
      "11px", "#7e879b").setAlpha(0.75).setDepth(11);
    this.tpi = 1; // pierwszy tekst (pomoc) jest stały — nie recyklujemy go

    // Klawisze dialogu (1-5 wybory, Spacja pomija animację, Esc zamyka).
    this.input.keyboard!.on("keydown", (e: KeyboardEvent) => {
      if (!this.registry.get("dialogOpen")) return;
      if (e.key === " ") { this.dialogChars = 9999; return; }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) this.pickChoice(n - 1);
    });

    // Kliknięcia trafiają w strefy zbudowane w tej klatce (od wierzchu).
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!p.leftButtonDown()) return;
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) {
          z.cb();
          return;
        }
      }
    });
  }

  // ---------- Pętla ----------

  update(_t: number, delta: number) {
    this.g.clear();
    this.gDim.clear();
    this.tpi = 1;
    this.ipi = 0;
    this.zones = [];

    const w = this.scale.width;
    const h = this.scale.height;

    this.crosshair.setPosition(this.input.activePointer.x, this.input.activePointer.y);

    if (this.registry.get("netError")) {
      this.text(24, 24, "Brak połączenia z serwerem (ws://…:2567).", "14px", "#ffd0d6");
    }

    const room = this.room();
    const me = this.me();
    if (room) {
      this.drawBottomHud(me, w, h);
      const win = this.registry.get("uiWindow") as WindowId | null;
      const dialogOpen = !!this.registry.get("dialogOpen");
      if (win || dialogOpen) {
        this.gDim.fillStyle(0x05060a, 0.55).fillRect(0, 0, w, h);
      }
      if (dialogOpen) this.drawDialog(delta, w, h);
      else if (win === "inv") this.drawInventory(me, w, h);
      else if (win === "trade") this.drawTrade(me, w, h);
      else if (win === "char") this.drawCharacter(me, w, h);
      else if (win === "quests") this.drawQuests(w, h);
      else if (win === "skills") this.drawSkills(me, w, h);
      if (me && !me.alive) {
        this.text(w / 2, h / 2, "POWALONO CIĘ — odradzanie…", "28px", "#ff6b78").setOrigin(0.5);
      }
    }

    this.prevDialogOpen = !!this.registry.get("dialogOpen");
    // Ukryj nieużyte obiekty z pul.
    for (let i = this.tpi; i < this.textPool.length; i++) this.textPool[i].setVisible(false);
    for (let i = this.ipi; i < this.imgPool.length; i++) this.imgPool[i].setVisible(false);
  }

  // ---------- HUD ----------

  private drawBottomHud(me: any, w: number, h: number) {
    const slot = 56, gap = 10;
    const totalW = slot * 5 + gap * 4;
    const sx = w / 2 - totalW / 2;
    const xpH = 10;
    const sy = h - slot - xpH - 14;
    if (!me) return;

    const px = sx, pw = totalW;
    const hpY = sy - 44, hpH = 18, mpY = sy - 22, mpH = 11;

    this.gothicBar(px, hpY, pw, hpH, me.hp / me.maxHp, 0xb3202e, 0xff8a90);
    this.text(w / 2, hpY + hpH / 2, `${Math.ceil(me.hp)} / ${me.maxHp}`, "12px", "#eafaf0").setOrigin(0.5);

    const manaFlash = this.time.now < ((this.registry.get("manaFlash") as number) ?? 0);
    this.gothicBar(px, mpY, pw, mpH, me.mp / me.maxMp, manaFlash ? 0xd23a4a : 0x5a4fd0, 0xbfb0ff);
    this.text(w / 2, mpY + mpH / 2 + 1, `${Math.floor(me.mp)} / ${me.maxMp}`, "9px", "#cfe4ff").setOrigin(0.5);

    // Medalion poziomu.
    const bx = px - 44, by = sy - 26;
    this.g.fillStyle(0x000000, 0.4).fillCircle(bx + 2, by + 3, 24);
    this.g.fillStyle(0x0e0b14, 0.97).fillCircle(bx, by, 24);
    this.g.lineStyle(3, 0x3a3444, 1).strokeCircle(bx, by, 24);
    this.g.lineStyle(1, 0x6a5aa0, 1).strokeCircle(bx, by, 20);
    this.g.fillStyle(0x6a5aa0, 1);
    for (const [dx, dy] of [[0, -24], [24, 0], [0, 24], [-24, 0]] as const) this.g.fillRect(bx + dx - 2, by + dy - 2, 4, 4);
    this.text(bx, by, String(me.level), "16px", "#ffe9b0").setOrigin(0.5);

    // Panel walut.
    const cx = px + pw + 14;
    const cw = 118;
    this.wpanel(cx, sy - 46, cw, 44, 0x0b0a12, 0x4a4458);
    this.g.fillStyle(0x8a6a2c, 1).fillCircle(cx + 14, sy - 35, 8);
    this.g.fillStyle(0xd8a43c, 1).fillCircle(cx + 14, sy - 35, 6);
    this.text(cx + 28, sy - 35, String(me.gold), "12px", "#ffd76b").setOrigin(0, 0.5);
    this.g.fillStyle(0x4a3a6a, 1).fillCircle(cx + 14, sy - 13, 8);
    this.g.fillStyle(0x8a5aff, 1).fillTriangle(cx + 14, sy - 19, cx + 8, sy - 13, cx + 20, sy - 13);
    this.g.fillStyle(0xb99aff, 1).fillTriangle(cx + 14, sy - 7, cx + 8, sy - 13, cx + 20, sy - 13);
    this.text(cx + 28, sy - 13, String(me.gems), "12px", "#7fd4ff").setOrigin(0, 0.5);

    // Pasek XP.
    const xpR = Phaser.Math.Clamp(me.xp / me.xpMax, 0, 1);
    this.g.fillStyle(0x080609, 1).fillRect(0, h - xpH, w, xpH);
    this.g.fillStyle(0xc9701e, 1).fillRect(0, h - xpH, w * xpR, xpH);
    this.g.fillStyle(0xffc46b, 0.4).fillRect(0, h - xpH, w * xpR, 3);
    this.g.lineStyle(1, 0x3a3448, 1).lineBetween(0, h - xpH, w, h - xpH);
    this.text(w - 10, h - xpH - 2, `poziom ${me.level} · ${Math.floor(me.xp)}/${me.xpMax} XP`, "10px", "#d9b96a").setOrigin(1, 1);

    // Sloty spelli.
    const spellDefs = [
      { key: "LPM", art: "art_spell1", fb: "icon_skill", cd: "cd_skill", locked: false },
      { key: "SPC", art: "art_spell2", fb: "icon_dash", cd: "cd_dash", locked: false },
      { key: "1", art: "art_spell3", fb: "", cd: "", locked: true },
      { key: "2", art: "art_spell4", fb: "", cd: "", locked: true },
      { key: "3", art: "art_spell5", fb: "", cd: "", locked: true },
    ];
    spellDefs.forEach((d, i) => {
      const x = sx + i * (slot + gap);
      const framed = this.hasTex(d.art);
      if (framed) {
        this.img(d.art, x, sy, slot, slot).setAlpha(d.locked ? 0.3 : 1);
      } else {
        this.wpanel(x, sy, slot, slot, 0x0b0a12, d.locked ? 0x2a2636 : 0x4a4458);
        const ic = d.fb && this.hasTex(d.fb) ? d.fb : null;
        if (ic) this.img(ic, x + slot / 2, sy + slot / 2 - 3, slot - 16, slot - 16).setAlpha(d.locked ? 0.3 : 1);
        else this.text(x + slot / 2, sy + slot / 2 - 3, "?", "20px", "#5a6478").setOrigin(0.5);
      }
      this.g.fillStyle(0x0b0a12, 0.9).fillRect(x + slot / 2 - 16, sy + slot - 14, 32, 12);
      this.g.lineStyle(1, 0x4a4458, 1).strokeRect(x + slot / 2 - 16, sy + slot - 14, 32, 12);
      this.text(x + slot / 2, sy + slot - 8, d.key, "11px", d.locked ? "#6a7488" : "#e8d9ac").setOrigin(0.5);
      // Cooldown.
      if (!d.locked && d.cd) {
        const cd = this.registry.get(d.cd) as { until: number; dur: number } | undefined;
        if (cd) {
          const rem = cd.until - this.time.now;
          if (rem > 0) {
            const r = Phaser.Math.Clamp(rem / cd.dur, 0, 1);
            this.g.fillStyle(0x000000, 0.6).fillRect(x + 3, sy + 3, slot - 6, (slot - 6) * r);
          }
        }
      }
    });
  }

  // ---------- Dialog z wyborami ----------

  private drawDialog(delta: number, w: number, h: number) {
    // Reset przy otwarciu.
    if (!this.prevDialogOpen) {
      this.dialogNode = DIALOG_START;
      this.dialogChars = 0;
    }
    const node: DialogNode = ELDRIC_DIALOG[this.dialogNode] ?? ELDRIC_DIALOG[DIALOG_START];

    const pw = Math.min(720, w - 80);
    const px = w / 2 - pw / 2;
    const ps = 108;                 // rozmiar portretu
    const tx = px + ps + 32;        // lewa krawędź tekstu
    const textW = px + pw - 18 - tx;

    // Zmierz pełny tekst, by policzyć wysokość okna (pomiar niewidoczny).
    const measure = this.text(tx, 0, node.text, "14px", "#f2ead6");
    measure.setWordWrapWidth(textW).setLineSpacing(4);
    const bodyH = measure.height;
    measure.setVisible(false);
    const rowH = 26;
    const typedFull = node.text; // pełna kwestia
    const choicesH = node.choices.length * (rowH + 5) + 4;
    const ph = Math.max(ps + 28, 72 + bodyH + choicesH + 12);
    const py = h - ph - 104; // nad dolnym HUD

    // Ramka okna dialogu.
    this.g.fillStyle(0x000000, 0.5).fillRect(px + 4, py + 5, pw, ph);
    this.g.fillStyle(0x0b0a12, 0.98).fillRect(px, py, pw, ph);
    this.g.lineStyle(3, 0x5a4a78, 1).strokeRect(px, py, pw, ph);
    this.g.lineStyle(1, 0x8a6a3c, 0.8).strokeRect(px + 4, py + 4, pw - 8, ph - 8);

    // Portret w ramce.
    this.wpanel(px + 14, py + 14, ps, ps, 0x120e18, 0x8a6a3c);
    const portraitKey = this.hasTex("art_npc_portrait") ? "art_npc_portrait"
      : this.hasTex("art_npc") ? "art_npc" : "npc";
    this.imgFit(portraitKey, px + 14 + ps / 2, py + 14 + ps / 2, ps - 10, ps - 10);

    // Nagłówek: imię + podtytuł.
    this.text(tx, py + 16, NPC.name, "18px", "#ffe9b0");
    this.text(tx, py + 40, NPC.title, "12px", "#c9a86a");
    this.g.lineStyle(1, 0x54452a, 1).lineBetween(tx, py + 60, px + pw - 18, py + 60);

    // Tekst z efektem pisania.
    this.dialogChars += (delta / 1000) * 45;
    const shown = typedFull.slice(0, Math.floor(this.dialogChars));
    const typed = this.dialogChars >= typedFull.length;
    const body = this.text(tx, py + 70, shown, "14px", "#f2ead6");
    body.setWordWrapWidth(textW).setLineSpacing(4);

    if (typed) {
      let cy = py + 70 + bodyH + 10;
      node.choices.forEach((c, i) => {
        const rx = px + 14, rw = pw - 28;
        const hover = this.zone(rx, cy, rw, rowH, () => this.pickChoice(i));
        this.g.fillStyle(hover ? 0x2a2440 : 0x140f1e, 0.9).fillRect(rx, cy, rw, rowH);
        this.g.lineStyle(1, hover ? 0x8a6aff : 0x3a3448, 1).strokeRect(rx, cy, rw, rowH);
        this.text(rx + 10, cy + rowH / 2, `${i + 1}.  ${c.label}`, "13px", hover ? "#ffffff" : "#cdd6e6").setOrigin(0, 0.5);
        cy += rowH + 5;
      });
    } else {
      // Klik w okno pomija animację pisania.
      this.zone(px, py, pw, ph, () => { this.dialogChars = 9999; });
      this.text(px + pw - 14, py + ph - 8, "klik / Spacja — dalej", "10px", "#7e879b").setOrigin(1, 1);
    }
  }

  private pickChoice(i: number) {
    const node = ELDRIC_DIALOG[this.dialogNode];
    if (!node) return;
    const typed = this.dialogChars >= node.text.length;
    if (!typed) { this.dialogChars = 9999; return; } // najpierw dopisz tekst
    const c = node.choices[i];
    if (!c) return;
    if (c.action === "close") this.registry.set("dialogOpen", false);
    else if (c.action === "shop") { this.registry.set("dialogOpen", false); this.registry.set("uiWindow", "trade"); }
    else if (c.action === "quests") { this.registry.set("dialogOpen", false); this.registry.set("uiWindow", "quests"); }
    else if (c.next) { this.dialogNode = c.next; this.dialogChars = 0; }
  }

  // ---------- Okno: EKWIPUNEK (paper-doll) ----------

  private drawInventory(me: any, w: number, h: number) {
    const pw = 560, ph = Math.min(640, h - 40);
    const px = w / 2 - pw / 2, py = h / 2 - ph / 2 - 20;
    this.windowFrame(px, py, pw, ph, "EKWIPUNEK", "I / Esc — zamknij");
    if (!me) return;
    this.text(px + pw - 18, py + 16, `● ${me.gold}`, "13px", "#ffd76b").setOrigin(1, 0);

    const equipped = new Map<string, string>();
    const equippedIds = new Set<string>();
    me.equipment?.forEach((v: string, k: string) => { equipped.set(k, v); equippedIds.add(v); });

    const cx = px + pw / 2;
    const dollTop = py + 56;
    // Sylwetka.
    this.imgFitH(this.charTex(), cx, dollTop + 108, 150);
    let dmg = 0, hpB = 0;
    equippedIds.forEach((id) => { dmg += ITEMS[id]?.dmg ?? 0; hpB += ITEMS[id]?.hp ?? 0; });
    this.text(cx, dollTop + 210, `+${dmg} obrażeń    +${hpB} HP`, "12px", "#9fe8b8").setOrigin(0.5);

    const S = 46, colGap = 56;
    const leftX = px + 62, rightX = px + pw - 62;
    for (const [slotId, col, row] of DOLL_LAYOUT) {
      const x = col === "L" ? leftX : rightX;
      const y = dollTop + 24 + row * colGap;
      this.equipSlot(x, y, S, slotId, equipped.get(slotId));
    }
    // Rząd pod sylwetką: tarcza + 4 runy.
    const bottom: EquipSlotId[] = ["offhand", "rune1", "rune2", "rune3", "rune4"];
    bottom.forEach((slotId, i) => {
      const x = cx + (i - 2) * (S + 10);
      this.equipSlot(x, dollTop + 258, S, slotId, equipped.get(slotId));
    });

    // Plecak 6×4.
    const cols = 6, bs = 44, bgap = 8;
    const bagW = cols * bs + (cols - 1) * bgap;
    const bagX = cx - bagW / 2, bagY = dollTop + 300;
    this.g.lineStyle(1, 0x3a3448, 1).lineBetween(px + 14, bagY - 10, px + pw - 14, bagY - 10);
    const items: string[] = Array.from(me.inventory ?? []);
    for (let i = 0; i < INVENTORY_CAP; i++) {
      const x = bagX + (i % cols) * (bs + bgap);
      const y = bagY + Math.floor(i / cols) * (bs + bgap);
      const id = items[i];
      const hover = this.zone(x, y, bs, bs, () => { if (id) this.room()?.send(MSG.equipToggle, id); });
      this.itemSlot(x, y, bs, id ?? null, hover, id ? equippedIds.has(id) : false);
    }
  }

  private equipSlot(cx: number, cy: number, s: number, slotId: EquipSlotId, itemId?: string) {
    const x = cx - s / 2, y = cy - s / 2;
    const hover = this.zone(x, y, s, s, () => { if (itemId) this.room()?.send(MSG.equipToggle, itemId); });
    this.wpanel(x, y, s, s, hover ? 0x1e1828 : 0x120e18, 0x5a4a78);
    if (itemId && this.hasTex(`art_item_${itemId}`)) {
      this.img(`art_item_${itemId}`, cx, cy, s - 8, s - 8);
    } else if (itemId) {
      const d = ITEMS[itemId];
      this.text(cx, cy, (d?.name ?? "?").slice(0, 1), "18px", RARITY_COLORS[d?.rarity ?? "common"]).setOrigin(0.5);
    } else {
      this.text(cx, cy, EQUIP_LABELS[slotId], "8px", "#5a6478").setOrigin(0.5);
    }
  }

  private itemSlot(x: number, y: number, s: number, itemId: string | null, hover: boolean, equipped: boolean) {
    this.wpanel(x, y, s, s, hover ? 0x1e1828 : 0x120e18, 0x4a4458);
    if (itemId) {
      if (this.hasTex(`art_item_${itemId}`)) this.img(`art_item_${itemId}`, x + s / 2, y + s / 2, s - 8, s - 8);
      else {
        const d = ITEMS[itemId];
        this.text(x + s / 2, y + s / 2, (d?.name ?? "?").slice(0, 1), "18px", RARITY_COLORS[d?.rarity ?? "common"]).setOrigin(0.5);
      }
      if (equipped) this.g.fillStyle(0x6fe3a0, 1).fillCircle(x + s - 7, y + 7, 4);
    }
  }

  // ---------- Okno: HANDEL (split) ----------

  private drawTrade(me: any, w: number, h: number) {
    const pw = 720, ph = Math.min(560, h - 40);
    const px = w / 2 - pw / 2, py = h / 2 - ph / 2 - 20;
    this.windowFrame(px, py, pw, ph, `HANDEL — ${NPC.name}`, "T / Esc — zamknij");
    if (!me) return;
    this.text(px + pw - 18, py + 16, `● ${me.gold}`, "13px", "#ffd76b").setOrigin(1, 0);

    const colW = (pw - 48) / 2;
    const leftX = px + 16, rightX = px + 32 + colW;
    const listTop = py + 74;
    const rowH = 40;

    this.text(leftX + colW / 2, py + 52, "TOWAR ELDRICA — kup", "12px", "#ffe2a8").setOrigin(0.5);
    this.text(rightX + colW / 2, py + 52, "TWÓJ PLECAK — sprzedaj", "12px", "#9fd8ff").setOrigin(0.5);
    this.g.lineStyle(1, 0x3a3448, 1).lineBetween(px + pw / 2, py + 46, px + pw / 2, py + ph - 16);

    // Lewa: towar handlarza.
    SHOP_STOCK.forEach((id, i) => {
      const def = ITEMS[id];
      const y = listTop + i * rowH;
      const afford = me.gold >= def.price && me.inventory.length < INVENTORY_CAP;
      const hover = this.zone(leftX, y, colW, rowH - 4, () => { if (afford) this.room()?.send(MSG.buy, id); });
      this.tradeRow(leftX, y, colW, def.id, `${def.price}`, hover, afford ? "#ffd76b" : "#7a5a3a");
    });

    // Prawa: twój plecak (sprzedaż za połowę ceny).
    const items: string[] = Array.from(me.inventory ?? []);
    if (items.length === 0) this.text(rightX + colW / 2, listTop + 12, "(plecak pusty)", "12px", "#6a7488").setOrigin(0.5, 0);
    items.forEach((id, i) => {
      const def = ITEMS[id];
      const y = listTop + i * rowH;
      const sellVal = Math.floor((def?.price ?? 0) * SELL_RATIO);
      const hover = this.zone(rightX, y, colW, rowH - 4, () => this.room()?.send(MSG.sell, id));
      this.tradeRow(rightX, y, colW, id, `+${sellVal}`, hover, "#8ad6a0");
    });
  }

  private tradeRow(x: number, y: number, w: number, itemId: string, priceTxt: string, hover: boolean, priceColor: string) {
    const def = ITEMS[itemId];
    const rh = 36;
    if (hover) this.g.fillStyle(0x27244a, 0.9).fillRect(x, y, w, rh);
    this.g.lineStyle(1, hover ? 0x8a6aff : 0x2a2636, 1).strokeRect(x, y, w, rh);
    this.wpanel(x + 4, y + 3, 30, 30, 0x120e18, 0x4a4458);
    if (this.hasTex(`art_item_${itemId}`)) this.img(`art_item_${itemId}`, x + 19, y + 18, 26, 26);
    else this.text(x + 19, y + 18, (def?.name ?? "?").slice(0, 1), "14px", RARITY_COLORS[def?.rarity ?? "common"]).setOrigin(0.5);
    this.text(x + 42, y + 6, def?.name ?? itemId, "12px", RARITY_COLORS[def?.rarity ?? "common"]);
    this.text(x + 42, y + 21, this.itemInfo(itemId), "9px", "#8b95aa");
    this.text(x + w - 8, y + rh / 2, priceTxt, "13px", priceColor).setOrigin(1, 0.5);
  }

  // ---------- Okno: POSTAĆ ----------

  private drawCharacter(me: any, w: number, h: number) {
    const pw = 420, ph = 420;
    const px = w / 2 - pw / 2, py = h / 2 - ph / 2 - 20;
    this.windowFrame(px, py, pw, ph, "POSTAĆ", "C / Esc — zamknij");
    if (!me) return;
    const cls = CLASSES[me.charClass];
    this.imgFitH(this.charTex(), px + 90, py + 150, 150);
    this.wpanel(px + 30, py + 60, 120, 180, 0x120e18, 0x3a3448);

    let dmg = 0, hpB = 0;
    me.equipment?.forEach((id: string) => { dmg += ITEMS[id]?.dmg ?? 0; hpB += ITEMS[id]?.hp ?? 0; });

    const rows: [string, string][] = [
      ["Klasa", cls?.name ?? me.charClass],
      ["Poziom", String(me.level)],
      ["Doświadczenie", `${Math.floor(me.xp)} / ${me.xpMax}`],
      ["Życie", `${Math.ceil(me.hp)} / ${me.maxHp}`],
      ["Mana", `${Math.floor(me.mp)} / ${me.maxMp}`],
      ["Obrażenia", `${22 + dmg}  (baza 22 +${dmg})`],
      ["Bonus życia", `+${hpB}`],
      ["Złoto", String(me.gold)],
      ["Smocze Monety", String(me.gems)],
    ];
    const lx = px + 170, rx = px + pw - 24;
    let y = py + 66;
    for (const [k, v] of rows) {
      this.text(lx, y, k, "13px", "#9aa0b0");
      this.text(rx, y, v, "13px", "#ffffff").setOrigin(1, 0);
      this.g.lineStyle(1, 0x1f1c2c, 1).lineBetween(lx, y + 20, rx, y + 20);
      y += 30;
    }
  }

  // ---------- Okno: DZIENNIK ZADAŃ ----------

  private drawQuests(w: number, h: number) {
    const pw = 440, ph = 380;
    const px = w / 2 - pw / 2, py = h / 2 - ph / 2 - 20;
    this.windowFrame(px, py, pw, ph, "DZIENNIK ZADAŃ", "Q / Esc — zamknij");
    let y = py + 58;
    for (const q of QUESTS) {
      const rowH = 56;
      this.wpanel(px + 16, y, pw - 32, rowH - 8, 0x120e18, q.done ? 0x2f5a3a : 0x3a3448);
      // Znacznik ukończenia.
      this.g.fillStyle(q.done ? 0x4ad66d : 0x2a2636, 1).fillCircle(px + 34, y + 20, 7);
      if (q.done) this.text(px + 34, y + 20, "✓", "12px", "#0b0a12").setOrigin(0.5);
      this.text(px + 52, y + 8, q.title, "13px", q.done ? "#8ad6a0" : "#ffe9b0");
      this.text(px + 52, y + 26, q.desc, "10px", "#9aa0b0");
      if (!q.done && q.prog) this.text(px + pw - 26, y + 20, q.prog, "12px", "#d9b96a").setOrigin(1, 0.5);
      y += rowH;
    }
  }

  // ---------- Okno: UMIEJĘTNOŚCI ----------

  private drawSkills(me: any, w: number, h: number) {
    const pw = 440, ph = 400;
    const px = w / 2 - pw / 2, py = h / 2 - ph / 2 - 20;
    this.windowFrame(px, py, pw, ph, "UMIEJĘTNOŚCI", "K / Esc — zamknij");
    const lvl = me?.level ?? 1;
    let y = py + 58;
    for (const sk of SKILLS) {
      const rowH = 60;
      const unlocked = lvl >= sk.unlock;
      this.wpanel(px + 16, y, pw - 32, rowH - 8, 0x120e18, unlocked ? 0x5a4a78 : 0x2a2636);
      // Ikona.
      this.wpanel(px + 24, y + 8, 36, 36, 0x0b0a12, 0x4a4458);
      this.text(px + 42, y + 26, sk.key === "LPM" || sk.key === "SPACJA" ? "✦" : sk.key, "16px",
        unlocked ? "#c9a3ff" : "#5a6478").setOrigin(0.5);
      this.text(px + 70, y + 8, sk.name, "13px", unlocked ? "#ffe9b0" : "#6a7488");
      this.text(px + 70, y + 26, sk.desc, "10px", "#9aa0b0");
      this.text(px + pw - 26, y + 26,
        unlocked ? `[${sk.key}]` : `poziom ${sk.unlock}`,
        "11px", unlocked ? "#8ad6a0" : "#a0566a").setOrigin(1, 0.5);
      y += rowH;
    }
  }

  // ---------- Wspólne rysowanie ----------

  private windowFrame(x: number, y: number, w: number, h: number, title: string, hint: string) {
    if (this.hasTex("ui_panel")) this.img("ui_panel", x + w / 2, y + h / 2, w, h);
    else this.g.fillStyle(0x0b0a12, 0.97).fillRect(x, y, w, h);
    this.g.lineStyle(3, 0x5a4a78, 1).strokeRect(x, y, w, h);
    this.g.lineStyle(1, 0x8a6a3c, 0.7).strokeRect(x + 4, y + 4, w - 8, h - 8);
    this.g.fillStyle(0x160f22, 0.95).fillRect(x + 4, y + 4, w - 8, 34);
    this.g.lineStyle(1, 0x54452a, 1).lineBetween(x + 8, y + 40, x + w - 8, y + 40);
    this.text(x + 16, y + 12, title, "15px", "#ffe9b0");
    this.text(x + w - 16, y + 14, hint, "10px", "#7e879b").setOrigin(1, 0);
  }

  private gothicBar(x: number, y: number, w: number, h: number, ratio: number, fill: number, gloss: number) {
    ratio = Phaser.Math.Clamp(ratio, 0, 1);
    this.g.fillStyle(0x000000, 0.4).fillRect(x - 2, y + 2, w + 4, h + 2);
    this.g.fillStyle(0x0e0b14, 0.97).fillRect(x - 3, y - 3, w + 6, h + 6);
    this.g.lineStyle(2, 0x3a3444, 1).strokeRect(x - 3, y - 3, w + 6, h + 6);
    this.g.lineStyle(1, 0x6a5aa0, 0.8).strokeRect(x - 1, y - 1, w + 2, h + 2);
    this.g.fillStyle(0x120e18, 1).fillRect(x, y, w, h);
    this.g.fillStyle(fill, 1).fillRect(x, y, w * ratio, h);
    this.g.fillStyle(gloss, 0.28).fillRect(x, y, w * ratio, Math.max(2, Math.floor(h / 4)));
    this.g.lineStyle(1, 0x000000, 0.35);
    for (let i = 1; i < 4; i++) this.g.lineBetween(x + (w / 4) * i, y, x + (w / 4) * i, y + h);
    this.g.fillStyle(0x6a5aa0, 1);
    this.g.fillRect(x - 5, y + h / 2 - 2, 4, 4);
    this.g.fillRect(x + w + 1, y + h / 2 - 2, 4, 4);
  }

  private wpanel(x: number, y: number, w: number, h: number, fill: number, border: number) {
    this.g.fillStyle(fill, 0.94).fillRect(x, y, w, h);
    this.g.lineStyle(2, border, 1).strokeRect(x, y, w, h);
  }

  // ---------- Pule ----------

  private text(x: number, y: number, str: string, size: string, color: string) {
    let t = this.textPool[this.tpi];
    if (!t) {
      t = this.add.text(0, 0, "", { fontFamily: "monospace" }).setDepth(23);
      this.textPool[this.tpi] = t;
    }
    this.tpi++;
    t.setVisible(true)
      .setPosition(x, y)
      .setOrigin(0, 0)
      .setText(str)
      .setColor(color)
      .setFontSize(size)
      .setStroke("#000000", 3)
      .setWordWrapWidth(0)
      .setLineSpacing(0);
    return t;
  }

  private img(key: string, cx: number, cy: number, w: number, h: number) {
    let im = this.imgPool[this.ipi];
    if (!im) {
      im = this.add.image(0, 0, key).setDepth(22);
      this.imgPool[this.ipi] = im;
    }
    this.ipi++;
    im.setVisible(true).setTexture(key).setPosition(cx, cy).setDisplaySize(w, h).setAngle(0).setAlpha(1);
    return im;
  }

  /** Jak img, ale zachowuje proporcje mieszcząc się w w×h. */
  private imgFit(key: string, cx: number, cy: number, w: number, h: number) {
    const src = this.textures.get(key).getSourceImage();
    const s = Math.min(w / src.width, h / src.height);
    return this.img(key, cx, cy, src.width * s, src.height * s);
  }
  /** Jak img, ale skaluje do zadanej wysokości. */
  private imgFitH(key: string, cx: number, cy: number, targetH: number) {
    const src = this.textures.get(key).getSourceImage();
    const s = targetH / src.height;
    return this.img(key, cx, cy, src.width * s, src.height * s);
  }

  private charTex(): string {
    return this.hasTex("art_player_idle") ? "art_player_idle"
      : this.hasTex("art_player") ? "art_player" : "player_ranger";
  }

  private itemInfo(id: string): string {
    const def = ITEMS[id];
    if (!def) return "";
    const parts: string[] = [SLOT_INFO[def.slot] ?? def.slot];
    if (def.dmg) parts.push(`+${def.dmg} obr.`);
    if (def.hp) parts.push(`+${def.hp} HP`);
    if (def.heal) parts.push(`leczy ${def.heal}`);
    return parts.join(" · ");
  }

  /** Rejestruje klikalną strefę; zwraca true, jeśli kursor jest nad nią. */
  private zone(x: number, y: number, w: number, h: number, cb: () => void): boolean {
    this.zones.push({ x, y, w, h, cb });
    const p = this.input.activePointer;
    return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
  }
}
