import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { NPC, NPC_STOCK, type ItemRarity } from "@aetherfall/shared";

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: "#c3cbd8",
  epic: "#b07aff",
  legendary: "#ffa03c",
};

/**
 * Warstwa HUD rysowana w przestrzeni ekranu (osobna scena, własna kamera).
 * Czyta stan gry z rejestru (`room`, `localId`) ustawianego przez GameScene.
 */
export class UIScene extends Phaser.Scene {
  private hud!: Phaser.GameObjects.Graphics;
  private crosshair!: Phaser.GameObjects.Image;

  private bossName!: Phaser.GameObjects.Text;
  private playerHpText!: Phaser.GameObjects.Text;
  private deathText!: Phaser.GameObjects.Text;
  private netError!: Phaser.GameObjects.Text;

  /** 5 slotów spelli: ikona (lub null), etykieta klawisza, klucz cooldownu w rejestrze. */
  private spellSlots: {
    icon: Phaser.GameObjects.Image | null;
    placeholder: Phaser.GameObjects.Text | null;
    key: Phaser.GameObjects.Text;
    cd: string | null;
    locked: boolean;
  }[] = [];

  // Panel handlu
  private tradeTitle!: Phaser.GameObjects.Text;
  private tradeFooter!: Phaser.GameObjects.Text;
  private tradeNames: Phaser.GameObjects.Text[] = [];
  private tradePrices: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("ui");
  }

  create() {
    this.hud = this.add.graphics().setDepth(10);

    this.bossName = this.text(0, 0, "", "14px", "#ffd0d6").setOrigin(0.5).setDepth(11);

    this.playerHpText = this.text(0, 0, "", "13px", "#eafaf0").setOrigin(0.5).setDepth(12);

    // 5 slotów spelli: 1=skill-shot (LPM), 2=unik (SPACJA), 3-5 zablokowane.
    const slotDefs: { fallback: string | null; key: string; cd: string | null; locked: boolean }[] = [
      { fallback: "icon_skill", key: "LPM", cd: "cd_skill", locked: false },
      { fallback: "icon_dash", key: "SPC", cd: "cd_dash", locked: false },
      { fallback: null, key: "1", cd: null, locked: true },
      { fallback: null, key: "2", cd: null, locked: true },
      { fallback: null, key: "3", cd: null, locked: true },
    ];
    this.spellSlots = slotDefs.map((def, i) => {
      const artKey = `art_spell${i + 1}`;
      let icon: Phaser.GameObjects.Image | null = null;
      let placeholder: Phaser.GameObjects.Text | null = null;
      if (this.textures.exists(artKey)) {
        icon = this.add.image(0, 0, artKey).setDepth(11);
      } else if (def.fallback) {
        icon = this.add.image(0, 0, def.fallback).setDepth(11);
      } else {
        placeholder = this.text(0, 0, "?", "20px", "#5a6478").setOrigin(0.5).setDepth(11);
      }
      const key = this.text(0, 0, def.key, "11px", def.locked ? "#6a7488" : "#cdd6e6")
        .setOrigin(0.5)
        .setDepth(12);
      return { icon, placeholder, key, cd: def.cd, locked: def.locked };
    });

    this.deathText = this.text(0, 0, "POWALONO CIĘ\nodradzanie…", "30px", "#ff6b78")
      .setOrigin(0.5)
      .setAlign("center")
      .setDepth(20)
      .setVisible(false);

    this.netError = this.text(24, 24, "", "15px", "#ffd0d6").setDepth(20);

    this.text(16, 70, "WSAD — ruch · mysz — celowanie", "11px", "#7e879b").setDepth(11).setAlpha(0.8);

    this.crosshair = this.add.image(0, 0, "crosshair").setDepth(30).setScrollFactor(0);

    // Panel handlu (widoczny gdy registry.tradeOpen).
    this.tradeTitle = this.text(0, 0, `Handel — ${NPC.name}`, "14px", "#ffe2a8").setDepth(21).setVisible(false);
    for (const item of NPC_STOCK) {
      this.tradeNames.push(
        this.text(0, 0, item.name, "13px", RARITY_COLORS[item.rarity]).setDepth(21).setVisible(false)
      );
      this.tradePrices.push(
        this.text(0, 0, `${item.price} monet`, "13px", "#ffd76b").setOrigin(1, 0).setDepth(21).setVisible(false)
      );
    }
    this.tradeFooter = this.text(0, 0, "Zakupy wkrótce (M5)  ·  T — zamknij", "11px", "#7e879b")
      .setDepth(21)
      .setVisible(false);
  }

  update() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.hud.clear();

    // Celownik.
    const ptr = this.input.activePointer;
    this.crosshair.setPosition(ptr.x, ptr.y);

    if (this.registry.get("netError")) {
      this.netError.setText("Brak połączenia z serwerem (ws://…:2567).\nUruchom serwer: npm run dev w katalogu game/");
    }

    const room = this.registry.get("room") as Room | undefined;
    const localId = this.registry.get("localId") as string | undefined;
    if (!room || !localId) return;

    // ----- Pasek HP bossa (góra, styl MMO) -----
    let boss: any = null;
    room.state.enemies.forEach((e: any) => {
      if (!boss && e.state !== "dead") boss = e;
    });
    if (boss) {
      const bw = Math.min(680, w - 120);
      const bx = (w - bw) / 2;
      const by = 26;
      this.panel(bx - 6, by - 6, bw + 12, 30, 0x1a0d12, 0x7a2a35);
      const ratio = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
      this.hud.fillStyle(0x2a1015, 1).fillRect(bx, by, bw, 18);
      this.hud.fillStyle(0xd23a4a, 1).fillRect(bx, by, bw * ratio, 18);
      this.hud.fillStyle(0xff7b86, 0.6).fillRect(bx, by, bw * ratio, 5);
      // Segmenty.
      this.hud.lineStyle(1, 0x000000, 0.4);
      for (let i = 1; i < 10; i++) this.hud.lineBetween(bx + (bw / 10) * i, by, bx + (bw / 10) * i, by + 18);
      this.bossName.setText("- STRAŻNIK AETHERU -").setPosition(w / 2, by - 16).setVisible(true);
    } else {
      this.bossName.setVisible(false);
    }

    // ----- Dolny HUD: HP wyśrodkowane, pod nim 5 spelli -----
    const slot = 56;
    const gap = 10;
    const totalW = slot * 5 + gap * 4;
    const sx = w / 2 - totalW / 2;
    const sy = h - slot - 22;

    const me = room.state.players.get(localId);
    if (me) {
      const pw = totalW;
      const px = w / 2 - pw / 2;
      const py = sy - 36;
      this.panel(px - 4, py - 4, pw + 8, 28, 0x0e1420, 0x2f3a52);
      this.hud.fillStyle(0x232a38, 1).fillRect(px, py, pw, 20);
      const ratio = Phaser.Math.Clamp(me.hp / me.maxHp, 0, 1);
      this.hud.fillStyle(ratio > 0.3 ? 0x4ad66d : 0xd23a4a, 1).fillRect(px, py, pw * ratio, 20);
      this.hud.fillStyle(0xffffff, 0.25).fillRect(px, py, pw * ratio, 6);
      this.playerHpText
        .setText(`${Math.ceil(me.hp)} / ${me.maxHp}`)
        .setPosition(w / 2, py + 10);
      this.deathText.setPosition(w / 2, h / 2).setVisible(!me.alive);
    }

    this.spellSlots.forEach((s, i) => {
      this.drawSpellSlot(sx + i * (slot + gap), sy, slot, s);
    });

    this.drawTradePanel(w, h);
  }

  private drawTradePanel(w: number, h: number) {
    const open = !!this.registry.get("tradeOpen");
    this.tradeTitle.setVisible(open);
    this.tradeFooter.setVisible(open);
    this.tradeNames.forEach((t) => t.setVisible(open));
    this.tradePrices.forEach((t) => t.setVisible(open));
    if (!open) return;

    const pw = 360;
    const ph = 78 + NPC_STOCK.length * 28 + 26;
    const px = w - pw - 28;
    const py = h / 2 - ph / 2;
    this.panel(px, py, pw, ph, 0x0e1420, 0x8a6a3c);
    this.hud.lineStyle(1, 0x3a4a66, 1).lineBetween(px + 14, py + 40, px + pw - 14, py + 40);
    this.tradeTitle.setPosition(px + 14, py + 12);
    NPC_STOCK.forEach((_, i) => {
      const y = py + 54 + i * 28;
      this.tradeNames[i].setPosition(px + 14, y);
      this.tradePrices[i].setPosition(px + pw - 14, y);
    });
    this.tradeFooter.setPosition(px + 14, py + ph - 24);
  }

  private drawSpellSlot(
    x: number,
    y: number,
    size: number,
    s: (typeof this.spellSlots)[number]
  ) {
    this.panel(x, y, size, size, 0x0e1420, s.locked ? 0x2a3244 : 0x3a4a66);

    if (s.icon) {
      s.icon.setPosition(x + size / 2, y + size / 2 - 4);
      // Ikony z Higgsfield są duże — wpasuj w slot.
      s.icon.setDisplaySize(size - 12, size - 12);
      s.icon.setAlpha(s.locked ? 0.35 : 1);
    }
    if (s.placeholder) s.placeholder.setPosition(x + size / 2, y + size / 2 - 4);
    s.key.setPosition(x + size / 2, y + size - 9);

    if (s.locked || !s.cd) return;
    const cd = this.registry.get(s.cd) as { until: number; dur: number } | undefined;
    if (!cd) return;
    const remaining = cd.until - this.time.now;
    if (remaining > 0) {
      const ratio = Phaser.Math.Clamp(remaining / cd.dur, 0, 1);
      // Ciemna nakładka kurcząca się od góry = pozostały cooldown.
      this.hud.fillStyle(0x000000, 0.6).fillRect(x + 2, y + 2, size - 4, (size - 4) * ratio);
      s.icon?.setAlpha(0.4);
    }
  }

  /** Ramka panelu w stylu pixel-UI. */
  private panel(x: number, y: number, w: number, h: number, fill: number, border: number) {
    this.hud.fillStyle(fill, 0.85).fillRect(x, y, w, h);
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
