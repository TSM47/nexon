import Phaser from "phaser";
import type { Room } from "colyseus.js";

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

  private skillIcon!: Phaser.GameObjects.Image;
  private dashIcon!: Phaser.GameObjects.Image;
  private skillKey!: Phaser.GameObjects.Text;
  private dashKey!: Phaser.GameObjects.Text;

  constructor() {
    super("ui");
  }

  create() {
    this.hud = this.add.graphics().setDepth(10);

    this.bossName = this.text(0, 0, "", "14px", "#ffd0d6").setOrigin(0.5).setDepth(11);

    this.playerHpText = this.text(0, 0, "", "13px", "#dff5e3").setDepth(11);

    this.skillIcon = this.add.image(0, 0, "icon_skill").setDepth(11);
    this.dashIcon = this.add.image(0, 0, "icon_dash").setDepth(11);
    this.skillKey = this.text(0, 0, "LPM", "12px", "#cdd6e6").setOrigin(0.5).setDepth(12);
    this.dashKey = this.text(0, 0, "SPACJA", "12px", "#cdd6e6").setOrigin(0.5).setDepth(12);

    this.deathText = this.text(0, 0, "POWALONO CIĘ\nodradzanie…", "30px", "#ff6b78")
      .setOrigin(0.5)
      .setAlign("center")
      .setDepth(20)
      .setVisible(false);

    this.netError = this.text(24, 24, "", "15px", "#ffd0d6").setDepth(20);

    this.text(16, 70, "WSAD — ruch · mysz — celowanie", "11px", "#7e879b").setDepth(11).setAlpha(0.8);

    this.crosshair = this.add.image(0, 0, "crosshair").setDepth(30).setScrollFactor(0);
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

    // ----- Panel HP gracza (lewy dół) -----
    const me = room.state.players.get(localId);
    if (me) {
      const px = 24;
      const py = h - 70;
      const pw = 300;
      this.panel(px - 8, py - 8, pw + 16, 42, 0x0e1420, 0x2f3a52);
      this.hud.fillStyle(0x232a38, 1).fillRect(px, py, pw, 24);
      const ratio = Phaser.Math.Clamp(me.hp / me.maxHp, 0, 1);
      this.hud.fillStyle(ratio > 0.3 ? 0x4ad66d : 0xd23a4a, 1).fillRect(px, py, pw * ratio, 24);
      this.hud.fillStyle(0xffffff, 0.25).fillRect(px, py, pw * ratio, 7);
      this.playerHpText
        .setText(`${Math.ceil(me.hp)} / ${me.maxHp}  ·  ${me.charClass}`)
        .setPosition(px + 10, py + 4);
      this.deathText.setPosition(w / 2, h / 2).setVisible(!me.alive);
    }

    // ----- Pasek umiejętności (dół, środek) -----
    const slot = 52;
    const gap = 14;
    const totalW = slot * 2 + gap;
    const sx = w / 2 - totalW / 2;
    const sy = h - 76;
    this.drawSlot(sx, sy, slot, this.skillIcon, this.skillKey, "cd_skill");
    this.drawSlot(sx + slot + gap, sy, slot, this.dashIcon, this.dashKey, "cd_dash");
  }

  private drawSlot(
    x: number,
    y: number,
    size: number,
    icon: Phaser.GameObjects.Image,
    key: Phaser.GameObjects.Text,
    cdRegistry: string
  ) {
    this.panel(x, y, size, size, 0x0e1420, 0x3a4a66);
    icon.setPosition(x + size / 2, y + size / 2 - 4);
    key.setPosition(x + size / 2, y + size - 9);

    const cd = this.registry.get(cdRegistry) as { until: number; dur: number } | undefined;
    if (cd) {
      const remaining = cd.until - this.time.now;
      if (remaining > 0) {
        const ratio = Phaser.Math.Clamp(remaining / cd.dur, 0, 1);
        // Ciemna nakładka kurcząca się od góry = pozostały cooldown.
        this.hud.fillStyle(0x000000, 0.6).fillRect(x + 2, y + 2, size - 4, (size - 4) * ratio);
        icon.setAlpha(0.4);
      } else {
        icon.setAlpha(1);
      }
    } else {
      icon.setAlpha(1);
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
