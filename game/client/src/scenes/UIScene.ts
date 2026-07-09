import Phaser from "phaser";
import type { Room } from "colyseus.js";
import {
  MSG,
  ITEMS,
  SHOP_STOCK,
  INVENTORY_CAP,
  EQUIP_SLOTS,
  type EquipSlotId,
  type ItemRarity,
} from "@aetherfall/shared";

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: "#c3cbd8",
  epic: "#b07aff",
  legendary: "#ffa03c",
};

const SLOT_INFO: Record<string, string> = {
  helm: "hełm",
  chest: "klata",
  pants: "spodnie",
  boots: "buty",
  gloves: "rękawice",
  neck: "naszyjnik",
  mainhand: "broń",
  offhand: "tarcza/strzały",
  rune: "runa",
  potion: "mikstura",
};

/** Etykiety konkretnych gniazd paper-dolla. */
const EQUIP_LABELS: Record<EquipSlotId, string> = {
  helm: "Hełm",
  chest: "Klata",
  pants: "Spodnie",
  boots: "Buty",
  gloves: "Rękawice",
  neck1: "Naszyjnik",
  neck2: "Naszyjnik",
  mainhand: "Broń",
  offhand: "Tarcza",
  rune1: "Runa",
  rune2: "Runa",
  rune3: "Runa",
  rune4: "Runa",
};

interface UISlot {
  zone: Phaser.GameObjects.Rectangle;
  frame: Phaser.GameObjects.Image | null;
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  hover: boolean;
}

interface ShopRow {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image | null;
  name: Phaser.GameObjects.Text;
  info: Phaser.GameObjects.Text;
  price: Phaser.GameObjects.Text;
}

export class UIScene extends Phaser.Scene {
  private hud!: Phaser.GameObjects.Graphics;
  private crosshair!: Phaser.GameObjects.Image;

  private bossName!: Phaser.GameObjects.Text;
  private playerHpText!: Phaser.GameObjects.Text;
  private playerMpText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private gemsText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private deathText!: Phaser.GameObjects.Text;
  private netError!: Phaser.GameObjects.Text;

  private hpFrame: Phaser.GameObjects.Image | null = null;
  private levelBadge: Phaser.GameObjects.Image | null = null;
  private coinIcon: Phaser.GameObjects.Image | null = null;
  private gemIcon: Phaser.GameObjects.Image | null = null;

  private spellSlots: {
    frame: Phaser.GameObjects.Image | null;
    icon: Phaser.GameObjects.Image | null;
    placeholder: Phaser.GameObjects.Text | null;
    key: Phaser.GameObjects.Text;
    cd: string | null;
    locked: boolean;
  }[] = [];

  // Sklep
  private shopPanelImg: Phaser.GameObjects.Image | null = null;
  private shopPortrait: Phaser.GameObjects.Image | null = null;
  private shopTitle!: Phaser.GameObjects.Text;
  private shopGold!: Phaser.GameObjects.Text;
  private shopFooter!: Phaser.GameObjects.Text;
  private shopRows: ShopRow[] = [];
  private shopFlash = 0;

  // Ekwipunek (paper-doll + plecak)
  private invPanelImg: Phaser.GameObjects.Image | null = null;
  private invTitle!: Phaser.GameObjects.Text;
  private invFooter!: Phaser.GameObjects.Text;
  private invGold!: Phaser.GameObjects.Text;
  private invStats!: Phaser.GameObjects.Text;
  private charPreview!: Phaser.GameObjects.Image;
  private equipSlots = new Map<EquipSlotId, UISlot>();
  private bagSlots: (UISlot & { itemId: string })[] = [];

  constructor() {
    super("ui");
  }

  private room(): Room | undefined {
    return this.registry.get("room") as Room | undefined;
  }

  private me(): any {
    const room = this.room();
    const id = this.registry.get("localId") as string | undefined;
    return room && id ? room.state.players.get(id) : undefined;
  }

  create() {
    this.hud = this.add.graphics().setDepth(10);

    this.bossName = this.text(0, 0, "", "14px", "#ffd0d6").setOrigin(0.5).setDepth(11);
    this.playerHpText = this.text(0, 0, "", "12px", "#eafaf0").setOrigin(0.5).setDepth(13);
    this.playerMpText = this.text(0, 0, "", "9px", "#cfe4ff").setOrigin(0.5).setDepth(13);
    this.goldText = this.text(0, 0, "", "12px", "#ffd76b").setOrigin(0, 0.5).setDepth(13);
    this.gemsText = this.text(0, 0, "", "12px", "#7fd4ff").setOrigin(0, 0.5).setDepth(13);
    this.levelText = this.text(0, 0, "1", "16px", "#ffe9b0").setOrigin(0.5).setDepth(13);
    this.xpText = this.text(0, 0, "", "10px", "#d9b96a").setOrigin(1, 1).setDepth(13);

    if (this.textures.exists("ui_hpframe")) {
      this.hpFrame = this.add.image(0, 0, "ui_hpframe").setDepth(12).setVisible(false);
    }
    if (this.textures.exists("ui_levelbadge")) {
      this.levelBadge = this.add.image(0, 0, "ui_levelbadge").setDepth(12).setVisible(false);
    }
    if (this.textures.exists("ui_coin")) {
      this.coinIcon = this.add.image(0, 0, "ui_coin").setDepth(13).setVisible(false);
    }
    if (this.textures.exists("ui_gem")) {
      this.gemIcon = this.add.image(0, 0, "ui_gem").setDepth(13).setVisible(false);
    }

    this.createSpellSlots();

    this.deathText = this.text(0, 0, "POWALONO CIĘ\nodradzanie…", "30px", "#ff6b78")
      .setOrigin(0.5)
      .setAlign("center")
      .setDepth(20)
      .setVisible(false);

    this.netError = this.text(24, 24, "", "15px", "#ffd0d6").setDepth(20);
    this.text(16, 70, "WSAD — ruch · mysz — celowanie · I — ekwipunek", "11px", "#7e879b")
      .setDepth(11)
      .setAlpha(0.8);

    this.crosshair = this.add.image(0, 0, "crosshair").setDepth(40).setScrollFactor(0);

    this.createShop();
    this.createInventory();
  }

  // ---------- Budowa elementów ----------

  private mkSlot(interactive: boolean): UISlot {
    const frame = this.textures.exists("ui_slot")
      ? this.add.image(0, 0, "ui_slot").setDepth(25).setVisible(false)
      : null;
    const icon = this.add.image(0, 0, "glow").setDepth(26).setVisible(false);
    const label = this.text(0, 0, "", "9px", "#8b95aa").setOrigin(0.5).setDepth(26).setVisible(false);
    const zone = this.add
      .rectangle(0, 0, 10, 10, 0xffffff, 0.001)
      .setOrigin(0.5)
      .setDepth(27)
      .setVisible(false);
    const slot: UISlot = { zone, frame, icon, label, hover: false };
    if (interactive) {
      zone.setInteractive()
        .on("pointerover", () => (slot.hover = true))
        .on("pointerout", () => (slot.hover = false));
    }
    return slot;
  }

  private createSpellSlots() {
    const slotDefs: { fallback: string | null; key: string; cd: string | null; locked: boolean }[] = [
      { fallback: "icon_skill", key: "LPM", cd: "cd_skill", locked: false },
      { fallback: "icon_dash", key: "SPC", cd: "cd_dash", locked: false },
      { fallback: null, key: "1", cd: null, locked: true },
      { fallback: null, key: "2", cd: null, locked: true },
      { fallback: null, key: "3", cd: null, locked: true },
    ];
    this.spellSlots = slotDefs.map((def, i) => {
      const artKey = `art_spell${i + 1}`;
      const frame = this.textures.exists("ui_slot") ? this.add.image(0, 0, "ui_slot").setDepth(11) : null;
      let icon: Phaser.GameObjects.Image | null = null;
      let placeholder: Phaser.GameObjects.Text | null = null;
      if (this.textures.exists(artKey)) {
        icon = this.add.image(0, 0, artKey).setDepth(12);
      } else if (def.fallback) {
        icon = this.add.image(0, 0, def.fallback).setDepth(12);
      } else {
        placeholder = this.text(0, 0, "?", "20px", "#5a6478").setOrigin(0.5).setDepth(12);
      }
      const key = this.text(0, 0, def.key, "11px", def.locked ? "#6a7488" : "#e8d9ac")
        .setOrigin(0.5)
        .setDepth(13);
      return { frame, icon, placeholder, key, cd: def.cd, locked: def.locked };
    });
  }

  private createShop() {
    this.shopPanelImg = this.textures.exists("ui_panel")
      ? this.add.image(0, 0, "ui_panel").setDepth(24).setVisible(false)
      : null;
    this.shopPortrait = this.textures.exists("art_npc_portrait")
      ? this.add.image(0, 0, "art_npc_portrait").setDepth(26).setVisible(false)
      : null;
    this.shopTitle = this.text(0, 0, "SKLEP — ELDRIC", "15px", "#ffe2a8").setDepth(26).setVisible(false);
    this.shopGold = this.text(0, 0, "", "13px", "#ffd76b").setOrigin(1, 0).setDepth(26).setVisible(false);
    this.shopFooter = this.text(0, 0, "kliknij przedmiot, by kupić  ·  T — zamknij", "11px", "#7e879b")
      .setDepth(26)
      .setVisible(false);
    this.shopRows = SHOP_STOCK.map((id) => {
      const def = ITEMS[id];
      const bg = this.add
        .rectangle(0, 0, 10, 10, 0x1a2233, 0.001)
        .setOrigin(0)
        .setDepth(25)
        .setInteractive()
        .on("pointerover", () => bg.setFillStyle(0x27324a, 0.9))
        .on("pointerout", () => bg.setFillStyle(0x1a2233, 0.001))
        .on("pointerdown", () => this.buy(id));
      const artKey = `art_item_${id}`;
      const icon = this.textures.exists(artKey) ? this.add.image(0, 0, artKey).setDepth(26) : null;
      const name = this.text(0, 0, def.name, "12px", RARITY_COLORS[def.rarity]).setDepth(26);
      const info = this.text(0, 0, this.itemInfo(def.id), "9px", "#8b95aa").setDepth(26);
      const price = this.text(0, 0, `${def.price} zł`, "12px", "#ffd76b").setOrigin(1, 0.5).setDepth(26);
      [name, info, price].forEach((t) => t.setVisible(false));
      icon?.setVisible(false);
      bg.setVisible(false);
      return { bg, icon, name, info, price };
    });
  }

  private createInventory() {
    this.invPanelImg = this.textures.exists("ui_panel")
      ? this.add.image(0, 0, "ui_panel").setDepth(24).setVisible(false)
      : null;
    this.invTitle = this.text(0, 0, "EKWIPUNEK", "15px", "#cfe0ff").setDepth(26).setVisible(false);
    this.invGold = this.text(0, 0, "", "13px", "#ffd76b").setOrigin(1, 0).setDepth(26).setVisible(false);
    this.invStats = this.text(0, 0, "", "11px", "#9fe8b8").setOrigin(0.5).setDepth(26).setVisible(false);
    this.invFooter = this.text(0, 0, "klik: załóż/zdejmij/wypij  ·  I — zamknij", "11px", "#7e879b")
      .setDepth(26)
      .setVisible(false);

    // Podgląd postaci.
    const texKey = this.textures.exists("art_player_idle")
      ? "art_player_idle"
      : this.textures.exists("art_player")
        ? "art_player"
        : "player_ranger";
    this.charPreview = this.add.image(0, 0, texKey).setDepth(26).setVisible(false);

    // Gniazda paper-dolla.
    for (const slotId of EQUIP_SLOTS) {
      const slot = this.mkSlot(true);
      slot.zone.on("pointerdown", () => {
        const me = this.me();
        const id = me?.equipment?.get(slotId);
        if (id) this.room()?.send(MSG.equipToggle, id);
      });
      this.equipSlots.set(slotId, slot);
    }

    // Plecak.
    for (let i = 0; i < INVENTORY_CAP; i++) {
      const slot = this.mkSlot(true) as UISlot & { itemId: string };
      slot.itemId = "";
      slot.zone.on("pointerdown", () => {
        if (slot.itemId) this.room()?.send(MSG.equipToggle, slot.itemId);
      });
      this.bagSlots.push(slot);
    }
  }

  private itemInfo(id: string): string {
    const def = ITEMS[id];
    const parts: string[] = [SLOT_INFO[def.slot] ?? def.slot];
    if (def.dmg) parts.push(`+${def.dmg} obrażeń`);
    if (def.hp) parts.push(`+${def.hp} HP`);
    if (def.heal) parts.push(`leczy ${def.heal} HP`);
    return parts.join(" · ");
  }

  private buy(itemId: string) {
    const me = this.me();
    const def = ITEMS[itemId];
    if (!me || !def) return;
    if (me.gold < def.price || me.inventory.length >= INVENTORY_CAP) {
      this.shopFlash = this.time.now + 350;
      return;
    }
    this.room()?.send(MSG.buy, itemId);
  }

  // ---------- Pętla ----------

  update() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.hud.clear();

    const ptr = this.input.activePointer;
    this.crosshair.setPosition(ptr.x, ptr.y);

    if (this.registry.get("netError")) {
      this.netError.setText("Brak połączenia z serwerem (ws://…:2567).\nUruchom serwer: npm run dev w katalogu game/");
    }

    const room = this.room();
    const me = this.me();
    if (!room) return;

    this.drawBossBar(room, w);
    this.drawBottomHud(me, w, h);
    this.drawShop(me, w, h);
    this.drawInventory(me, w, h);
  }

  private drawBossBar(room: Room, w: number) {
    let boss: any = null;
    (room.state as any).enemies.forEach((e: any) => {
      if (!boss && e.state !== "dead") boss = e;
    });
    if (!boss) {
      this.bossName.setVisible(false);
      return;
    }
    const bw = Math.min(680, w - 120);
    const bx = (w - bw) / 2;
    const by = 26;
    this.panel(bx - 6, by - 6, bw + 12, 30, 0x1a0d12, 0x7a2a35);
    const ratio = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
    this.hud.fillStyle(0x2a1015, 1).fillRect(bx, by, bw, 18);
    this.hud.fillStyle(0xd23a4a, 1).fillRect(bx, by, bw * ratio, 18);
    this.bossName.setText("- STRAŻNIK AETHERU -").setPosition(w / 2, by - 16).setVisible(true);
  }

  private drawBottomHud(me: any, w: number, h: number) {
    const slot = 56;
    const gap = 10;
    const totalW = slot * 5 + gap * 4;
    const sx = w / 2 - totalW / 2;
    // Nad slotami: pasek MP, nad nim HP; na samym dole ekranu pasek XP.
    const xpH = 10;
    const sy = h - slot - xpH - 14;

    if (me) {
      const px = sx;
      const pw = totalW;
      const hpY = sy - 44;
      const hpH = 18;
      const mpY = sy - 22;
      const mpH = 11;

      // --- HP (z ozdobną ramką, jeśli jest) ---
      const hpRatio = Phaser.Math.Clamp(me.hp / me.maxHp, 0, 1);
      if (this.hpFrame) {
        this.hpFrame.setVisible(true).setPosition(w / 2, hpY + hpH / 2).setDisplaySize(pw + 24, hpH + 16);
        this.hud.fillStyle(0x1a1410, 0.92).fillRect(px + 4, hpY + 2, pw - 8, hpH - 4);
        this.hud
          .fillStyle(hpRatio > 0.3 ? 0x46c96a : 0xd23a4a, 1)
          .fillRect(px + 4, hpY + 2, (pw - 8) * hpRatio, hpH - 4);
        this.hud.fillStyle(0xffffff, 0.2).fillRect(px + 4, hpY + 2, (pw - 8) * hpRatio, 4);
      } else {
        this.panel(px - 3, hpY - 3, pw + 6, hpH + 6, 0x14100c, 0x6a5334);
        this.hud.fillStyle(0x241c14, 1).fillRect(px, hpY, pw, hpH);
        this.hud.fillStyle(hpRatio > 0.3 ? 0x46c96a : 0xd23a4a, 1).fillRect(px, hpY, pw * hpRatio, hpH);
        this.hud.fillStyle(0xffffff, 0.2).fillRect(px, hpY, pw * hpRatio, 5);
      }
      this.playerHpText.setText(`${Math.ceil(me.hp)} / ${me.maxHp}`).setPosition(w / 2, hpY + hpH / 2);

      // --- Mana (niebieski, cieńszy; miga na czerwono przy braku) ---
      const mpRatio = Phaser.Math.Clamp(me.mp / me.maxMp, 0, 1);
      const manaFlash = this.time.now < ((this.registry.get("manaFlash") as number) ?? 0);
      this.panel(px - 3, mpY - 3, pw + 6, mpH + 6, 0x0c1014, manaFlash ? 0xd23a4a : 0x33506a);
      this.hud.fillStyle(0x141c26, 1).fillRect(px, mpY, pw, mpH);
      this.hud.fillStyle(0x3f8fe0, 1).fillRect(px, mpY, pw * mpRatio, mpH);
      this.hud.fillStyle(0xffffff, 0.22).fillRect(px, mpY, pw * mpRatio, 3);
      this.playerMpText
        .setText(`${Math.floor(me.mp)} / ${me.maxMp}`)
        .setPosition(w / 2, mpY + mpH / 2 + 1);

      // --- Plakietka poziomu po lewej ---
      const bx = px - 44;
      const by = sy - 26;
      if (this.levelBadge) {
        this.levelBadge.setVisible(true).setPosition(bx, by).setDisplaySize(56, 56);
      } else {
        this.hud.fillStyle(0x14100c, 0.95).fillCircle(bx, by, 24);
        this.hud.lineStyle(3, 0x8a6a3c, 1).strokeCircle(bx, by, 24);
        this.hud.lineStyle(1, 0x54452a, 1).strokeCircle(bx, by, 19);
      }
      this.levelText.setText(String(me.level)).setPosition(bx, by);

      // --- Panel walut po prawej: złoto + Smocze Monety ---
      const cx = px + pw + 14;
      const cw = 118;
      this.panel(cx, sy - 46, cw, 44, 0x14100c, 0x6a5334);
      if (this.coinIcon) {
        this.coinIcon.setVisible(true).setPosition(cx + 14, sy - 35).setDisplaySize(18, 18);
      } else {
        this.hud.fillStyle(0xffd76b, 1).fillCircle(cx + 14, sy - 35, 7);
        this.hud.lineStyle(1, 0x8a6a3c, 1).strokeCircle(cx + 14, sy - 35, 7);
      }
      this.goldText.setText(String(me.gold)).setPosition(cx + 28, sy - 35);
      if (this.gemIcon) {
        this.gemIcon.setVisible(true).setPosition(cx + 14, sy - 13).setDisplaySize(18, 18);
      } else {
        this.hud.fillStyle(0x7fd4ff, 1).fillTriangle(cx + 14, sy - 20, cx + 7, sy - 11, cx + 21, sy - 11);
        this.hud.fillStyle(0x4fa8e0, 1).fillTriangle(cx + 14, sy - 4, cx + 7, sy - 11, cx + 21, sy - 11);
      }
      this.gemsText.setText(String(me.gems)).setPosition(cx + 28, sy - 13);

      // --- Pasek XP na samym dole ekranu ---
      const xpRatio = Phaser.Math.Clamp(me.xp / me.xpMax, 0, 1);
      this.hud.fillStyle(0x0e0b08, 1).fillRect(0, h - xpH, w, xpH);
      this.hud.fillStyle(0xd9a441, 1).fillRect(0, h - xpH, w * xpRatio, xpH);
      this.hud.fillStyle(0xffe9b0, 0.35).fillRect(0, h - xpH, w * xpRatio, 3);
      this.hud.lineStyle(1, 0x54452a, 1).lineBetween(0, h - xpH, w, h - xpH);
      // Znaczniki co 10%.
      this.hud.lineStyle(1, 0x000000, 0.4);
      for (let i = 1; i < 10; i++) {
        this.hud.lineBetween((w / 10) * i, h - xpH, (w / 10) * i, h);
      }
      this.xpText
        .setText(`poziom ${me.level}  ·  ${Math.floor(me.xp)}/${me.xpMax} XP`)
        .setPosition(w - 10, h - xpH - 2);

      this.deathText.setPosition(w / 2, h / 2).setVisible(!me.alive);
    }

    this.spellSlots.forEach((s, i) => this.drawSpellSlot(sx + i * (slot + gap), sy, slot, s));
  }

  private drawSpellSlot(x: number, y: number, size: number, s: (typeof this.spellSlots)[number]) {
    if (s.frame) {
      s.frame.setPosition(x + size / 2, y + size / 2).setDisplaySize(size, size);
      s.frame.setAlpha(s.locked ? 0.55 : 1);
    } else {
      this.panel(x, y, size, size, 0x0e1420, s.locked ? 0x2a3244 : 0x3a4a66);
    }
    if (s.icon) {
      s.icon.setPosition(x + size / 2, y + size / 2 - 3);
      s.icon.setDisplaySize(size - 16, size - 16);
      s.icon.setAlpha(s.locked ? 0.3 : 1);
    }
    if (s.placeholder) s.placeholder.setPosition(x + size / 2, y + size / 2 - 3);
    // Plakietka klawisza.
    this.hud.fillStyle(0x10141d, 0.85).fillRect(x + size / 2 - 16, y + size - 14, 32, 12);
    this.hud.lineStyle(1, 0x54452a, 1).strokeRect(x + size / 2 - 16, y + size - 14, 32, 12);
    s.key.setPosition(x + size / 2, y + size - 8);

    if (s.locked || !s.cd) return;
    const cd = this.registry.get(s.cd) as { until: number; dur: number } | undefined;
    if (!cd) return;
    const remaining = cd.until - this.time.now;
    if (remaining > 0) {
      const ratio = Phaser.Math.Clamp(remaining / cd.dur, 0, 1);
      this.hud.fillStyle(0x000000, 0.6).fillRect(x + 3, y + 3, size - 6, (size - 6) * ratio);
      s.icon?.setAlpha(0.35);
    }
  }

  private drawShop(me: any, w: number, h: number) {
    const open = !!this.registry.get("tradeOpen");
    this.shopPanelImg?.setVisible(open);
    this.shopPortrait?.setVisible(open);
    this.shopTitle.setVisible(open);
    this.shopGold.setVisible(open);
    this.shopFooter.setVisible(open);
    for (const r of this.shopRows) {
      r.bg.setVisible(open);
      r.icon?.setVisible(open);
      r.name.setVisible(open);
      r.info.setVisible(open);
      r.price.setVisible(open);
    }
    if (!open) return;

    const rowH = 44;
    const pw = 440;
    const ph = 104 + SHOP_STOCK.length * rowH;
    const px = w / 2 - pw / 2 - 180;
    const py = Math.max(16, h / 2 - ph / 2 - 30);

    this.drawWindow(this.shopPanelImg, px, py, pw, ph, 0x8a6a3c);
    if (this.shopPortrait) {
      this.panel(px + 14, py + 10, 36, 36, 0x141a26, 0x8a6a3c);
      const tex = this.textures.get("art_npc_portrait").getSourceImage();
      const fit = Math.min(32 / tex.width, 32 / tex.height);
      this.shopPortrait.setPosition(px + 32, py + 28).setScale(fit);
      this.shopTitle.setPosition(px + 60, py + 18);
    } else {
      this.shopTitle.setPosition(px + 18, py + 18);
    }
    const flash = this.time.now < this.shopFlash;
    this.shopGold
      .setText(me ? `twoje złoto: ${me.gold} zł` : "")
      .setColor(flash ? "#ff6b78" : "#ffd76b")
      .setPosition(px + pw - 18, py + 20);
    this.hud.lineStyle(1, 0x54452a, 1).lineBetween(px + 14, py + 52, px + pw - 14, py + 52);

    SHOP_STOCK.forEach((id, i) => {
      const r = this.shopRows[i];
      const ry = py + 62 + i * rowH;
      r.bg.setPosition(px + 10, ry - 3).setSize(pw - 20, rowH - 2);
      this.panel(px + 16, ry, 34, 34, 0x141a26, 0x3a4a66);
      if (r.icon) {
        r.icon.setPosition(px + 33, ry + 17);
        r.icon.setDisplaySize(30, 30);
      }
      r.name.setPosition(px + 60, ry + 1);
      r.info.setPosition(px + 60, ry + 19);
      r.price.setPosition(px + pw - 18, ry + 17);
    });
    this.shopFooter.setPosition(px + 18, py + ph - 24);
  }

  private drawInventory(me: any, w: number, h: number) {
    const open = !!this.registry.get("invOpen");
    this.invPanelImg?.setVisible(open);
    this.invTitle.setVisible(open);
    this.invGold.setVisible(open);
    this.invStats.setVisible(open);
    this.invFooter.setVisible(open);
    this.charPreview.setVisible(open);
    const items: string[] = me ? Array.from(me.inventory as string[]) : [];

    // Zbierz mapę: co jest założone w którym gnieździe.
    const equipped = new Map<string, string>(); // slotId -> itemId
    const equippedIds = new Set<string>();
    if (me?.equipment) {
      me.equipment.forEach((v: string, k: string) => {
        equipped.set(k, v);
        equippedIds.add(v);
      });
    }

    if (!open) {
      this.equipSlots.forEach((s) => this.hideSlot(s));
      this.bagSlots.forEach((s) => this.hideSlot(s));
      return;
    }

    const pw = 560;
    const ph = Math.min(640, h - 24);
    const px = w - pw - 24;
    const py = h / 2 - ph / 2;

    this.drawWindow(this.invPanelImg, px, py, pw, ph, 0x3a5a8a);
    this.invTitle.setPosition(px + 18, py + 14);
    this.invGold.setText(`● ${me?.gold ?? 0} zł`).setPosition(px + pw - 18, py + 16);
    this.hud.lineStyle(1, 0x2a4468, 1).lineBetween(px + 14, py + 42, px + pw - 14, py + 42);

    // --- Paper-doll ---
    const cx = px + pw / 2;
    const dollTop = py + 52;
    // Postać na środku.
    const prevH = 150;
    const tex = this.textures.get(this.charPreview.texture.key);
    const frameH = tex.getSourceImage().height || prevH;
    this.charPreview.setPosition(cx, dollTop + 108).setScale(prevH / frameH);
    // Suma bonusów.
    let dmg = 0;
    let hpB = 0;
    equippedIds.forEach((id) => {
      dmg += ITEMS[id]?.dmg ?? 0;
      hpB += ITEMS[id]?.hp ?? 0;
    });
    this.invStats.setText(`+${dmg} obrażeń   ·   +${hpB} HP`).setPosition(cx, dollTop + 210);

    const S = 46;
    const leftX = px + 62;
    const rightX = px + pw - 62;
    const colGap = 56;
    const place: [EquipSlotId, number, number][] = [
      ["helm", leftX, dollTop + 24],
      ["chest", leftX, dollTop + 24 + colGap],
      ["pants", leftX, dollTop + 24 + colGap * 2],
      ["boots", leftX, dollTop + 24 + colGap * 3],
      ["gloves", rightX, dollTop + 24],
      ["neck1", rightX, dollTop + 24 + colGap],
      ["neck2", rightX, dollTop + 24 + colGap * 2],
      ["mainhand", rightX, dollTop + 24 + colGap * 3],
      // Rząd pod postacią: tarcza + 4 runy.
      ["offhand", cx - 2 * (S + 10), dollTop + 258],
      ["rune1", cx - (S + 10), dollTop + 258],
      ["rune2", cx, dollTop + 258],
      ["rune3", cx + (S + 10), dollTop + 258],
      ["rune4", cx + 2 * (S + 10), dollTop + 258],
    ];
    for (const [slotId, x, y] of place) {
      const s = this.equipSlots.get(slotId)!;
      const itemId = equipped.get(slotId);
      this.drawUISlot(s, x, y, S, itemId ?? null, EQUIP_LABELS[slotId], true);
    }

    // --- Plecak: 24 sloty (6 × 4) ---
    const cols = 6;
    const bs = 44;
    const bgap = 8;
    const bagW = cols * bs + (cols - 1) * bgap;
    const bagX = cx - bagW / 2;
    const bagY = dollTop + 296;
    this.hud.lineStyle(1, 0x2a4468, 1).lineBetween(px + 14, bagY - 10, px + pw - 14, bagY - 10);
    this.bagSlots.forEach((s, i) => {
      const x = bagX + (i % cols) * (bs + bgap) + bs / 2;
      const y = bagY + Math.floor(i / cols) * (bs + bgap) + bs / 2;
      const itemId = items[i] ?? null;
      s.itemId = itemId ?? "";
      this.drawUISlot(s, x, y, bs, itemId, "", false, itemId ? equippedIds.has(itemId) : false);
    });

    this.invFooter.setPosition(px + 18, py + ph - 24);
  }

  /** Rysuje pojedyncze gniazdo (ramka + ikona/etykieta + hover). */
  private drawUISlot(
    s: UISlot,
    x: number,
    y: number,
    size: number,
    itemId: string | null,
    emptyLabel: string,
    isEquipSlot: boolean,
    equippedMark = false
  ) {
    s.zone.setVisible(true).setPosition(x, y).setSize(size, size);
    if (s.frame) {
      s.frame.setVisible(true).setPosition(x, y).setDisplaySize(size, size);
      s.frame.setAlpha(s.hover ? 1 : 0.9);
    } else {
      this.panel(x - size / 2, y - size / 2, size, size, s.hover ? 0x1c2536 : 0x141a26, isEquipSlot ? 0x3a5a8a : 0x3a4a66);
    }
    if (itemId) {
      const artKey = `art_item_${itemId}`;
      if (this.textures.exists(artKey)) {
        s.icon.setTexture(artKey).setVisible(true).setPosition(x, y).setDisplaySize(size - 10, size - 10);
        s.label.setVisible(false);
      } else {
        // Fallback: pierwsza litera w kolorze rzadkości.
        s.icon.setVisible(false);
        const def = ITEMS[itemId];
        s.label
          .setVisible(true)
          .setPosition(x, y)
          .setText((def?.name ?? "?").slice(0, 1))
          .setColor(RARITY_COLORS[def?.rarity ?? "common"])
          .setFontSize(18);
      }
      if (equippedMark) {
        this.hud.fillStyle(0x6fe3a0, 1).fillCircle(x + size / 2 - 7, y - size / 2 + 7, 4);
      }
    } else {
      s.icon.setVisible(false);
      s.label
        .setVisible(!!emptyLabel)
        .setPosition(x, y)
        .setText(emptyLabel)
        .setColor("#5a6478")
        .setFontSize(9);
    }
  }

  private hideSlot(s: UISlot) {
    s.zone.setVisible(false);
    s.frame?.setVisible(false);
    s.icon.setVisible(false);
    s.label.setVisible(false);
  }

  /** Okno: tekstura panelu (Higgsfield) albo rysowana ramka. */
  private drawWindow(
    img: Phaser.GameObjects.Image | null,
    x: number,
    y: number,
    w: number,
    h: number,
    border: number
  ) {
    if (img) {
      img.setPosition(x + w / 2, y + h / 2).setDisplaySize(w, h);
      this.hud.lineStyle(2, border, 1).strokeRect(x, y, w, h);
    } else {
      this.panel(x - 3, y - 3, w + 6, h + 6, 0x0b0f18, border);
      this.hud.lineStyle(1, 0x2a3244, 1).strokeRect(x + 4, y + 4, w - 8, h - 8);
    }
  }

  private panel(x: number, y: number, w: number, h: number, fill: number, border: number) {
    this.hud.fillStyle(fill, 0.94).fillRect(x, y, w, h);
    this.hud.lineStyle(2, border, 1).strokeRect(x, y, w, h);
  }

  private text(x: number, y: number, t: string, size: string, color: string) {
    return this.add.text(x, y, t, {
      fontFamily: "monospace",
      fontSize: size,
      color,
      stroke: "#000000",
      strokeThickness: 3,
    });
  }
}
