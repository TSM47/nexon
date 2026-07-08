import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { MSG, NPC, ITEMS, SHOP_STOCK, INVENTORY_CAP, type ItemRarity } from "@aetherfall/shared";

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: "#c3cbd8",
  epic: "#b07aff",
  legendary: "#ffa03c",
};

const SLOT_LABELS: Record<string, string> = {
  weapon: "broń",
  armor: "pancerz",
  potion: "mikstura",
};

interface ShopRow {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image | null;
  name: Phaser.GameObjects.Text;
  info: Phaser.GameObjects.Text;
  price: Phaser.GameObjects.Text;
}

interface InvRow {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image | null;
  name: Phaser.GameObjects.Text;
  state: Phaser.GameObjects.Text;
  itemId: string;
}

/**
 * Warstwa HUD (osobna scena): dolny pasek HP + spelle, złoto, okno
 * dialogowe z portretem, sklep z kupowaniem i ekwipunek z zakładaniem.
 */
export class UIScene extends Phaser.Scene {
  private hud!: Phaser.GameObjects.Graphics;
  private crosshair!: Phaser.GameObjects.Image;

  private bossName!: Phaser.GameObjects.Text;
  private playerHpText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private deathText!: Phaser.GameObjects.Text;
  private netError!: Phaser.GameObjects.Text;

  private spellSlots: {
    icon: Phaser.GameObjects.Image | null;
    placeholder: Phaser.GameObjects.Text | null;
    key: Phaser.GameObjects.Text;
    cd: string | null;
    locked: boolean;
  }[] = [];

  // Dialog
  private dlgName!: Phaser.GameObjects.Text;
  private dlgText!: Phaser.GameObjects.Text;
  private dlgHint!: Phaser.GameObjects.Text;
  private dlgPortrait!: Phaser.GameObjects.Image;

  // Sklep
  private shopTitle!: Phaser.GameObjects.Text;
  private shopGold!: Phaser.GameObjects.Text;
  private shopFooter!: Phaser.GameObjects.Text;
  private shopRows: ShopRow[] = [];
  private shopFlash = 0; // czas błysku "za mało złota"

  // Ekwipunek
  private invTitle!: Phaser.GameObjects.Text;
  private invFooter!: Phaser.GameObjects.Text;
  private invEmpty!: Phaser.GameObjects.Text;
  private invRows: InvRow[] = [];

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
    this.playerHpText = this.text(0, 0, "", "13px", "#eafaf0").setOrigin(0.5).setDepth(12);
    this.goldText = this.text(0, 0, "", "13px", "#ffd76b").setOrigin(0, 0.5).setDepth(12);

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

    this.crosshair = this.add.image(0, 0, "crosshair").setDepth(30).setScrollFactor(0);

    this.createDialog();
    this.createShop();
    this.createInventory();
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
  }

  private createDialog() {
    this.dlgPortrait = this.add
      .image(0, 0, this.textures.exists("art_npc_portrait") ? "art_npc_portrait" : "npc")
      .setDepth(26)
      .setVisible(false);
    this.dlgName = this.text(0, 0, "", "14px", "#ffe2a8").setDepth(26).setVisible(false);
    this.dlgText = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f2ead6",
        wordWrap: { width: 430 },
        lineSpacing: 5,
      })
      .setStroke("#000000", 2)
      .setDepth(26)
      .setVisible(false);
    this.dlgHint = this.text(0, 0, "", "11px", "#c9a86a").setOrigin(1, 1).setDepth(26).setVisible(false);
  }

  private createShop() {
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
        .setInteractive({ useHandCursor: false })
        .on("pointerover", () => bg.setFillStyle(0x27324a, 0.9))
        .on("pointerout", () => bg.setFillStyle(0x1a2233, 0.001))
        .on("pointerdown", () => this.buy(id));
      const artKey = `art_item_${id}`;
      const icon = this.textures.exists(artKey) ? this.add.image(0, 0, artKey).setDepth(26) : null;
      const name = this.text(0, 0, def.name, "13px", RARITY_COLORS[def.rarity]).setDepth(26);
      const info = this.text(0, 0, this.itemInfo(def.id), "10px", "#8b95aa").setDepth(26);
      const price = this.text(0, 0, `${def.price} zł`, "13px", "#ffd76b").setOrigin(1, 0.5).setDepth(26);
      [name, info, price].forEach((t) => t.setVisible(false));
      icon?.setVisible(false);
      bg.setVisible(false);
      return { bg, icon, name, info, price };
    });
  }

  private createInventory() {
    this.invTitle = this.text(0, 0, "EKWIPUNEK", "15px", "#cfe0ff").setDepth(26).setVisible(false);
    this.invFooter = this.text(0, 0, "kliknij: załóż/zdejmij lub wypij  ·  I — zamknij", "11px", "#7e879b")
      .setDepth(26)
      .setVisible(false);
    this.invEmpty = this.text(0, 0, "(pusto — odwiedź sklep Eldrica)", "12px", "#6a7488")
      .setDepth(26)
      .setVisible(false);
    for (let i = 0; i < INVENTORY_CAP; i++) {
      const bg = this.add
        .rectangle(0, 0, 10, 10, 0x1a2233, 0.001)
        .setOrigin(0)
        .setDepth(25)
        .setInteractive()
        .on("pointerover", () => bg.setFillStyle(0x27324a, 0.9))
        .on("pointerout", () => bg.setFillStyle(0x1a2233, 0.001));
      const row: InvRow = {
        bg,
        icon: null,
        name: this.text(0, 0, "", "13px", "#ffffff").setDepth(26),
        state: this.text(0, 0, "", "11px", "#6fe3a0").setOrigin(1, 0.5).setDepth(26),
        itemId: "",
      };
      bg.on("pointerdown", () => {
        if (row.itemId) this.room()?.send(MSG.equipToggle, row.itemId);
      });
      row.name.setVisible(false);
      row.state.setVisible(false);
      bg.setVisible(false);
      this.invRows.push(row);
    }
  }

  private itemInfo(id: string): string {
    const def = ITEMS[id];
    const parts: string[] = [SLOT_LABELS[def.slot] ?? def.slot];
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
    this.drawDialog(w, h);
    this.drawShop(me, w, h);
    this.drawInventory(me, w, h);
  }

  // ---------- Sekcje HUD ----------

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
    const sy = h - slot - 22;

    if (me) {
      const pw = totalW;
      const px = w / 2 - pw / 2;
      const py = sy - 36;
      this.panel(px - 4, py - 4, pw + 8, 28, 0x0e1420, 0x2f3a52);
      this.hud.fillStyle(0x232a38, 1).fillRect(px, py, pw, 20);
      const ratio = Phaser.Math.Clamp(me.hp / me.maxHp, 0, 1);
      this.hud.fillStyle(ratio > 0.3 ? 0x4ad66d : 0xd23a4a, 1).fillRect(px, py, pw * ratio, 20);
      this.hud.fillStyle(0xffffff, 0.25).fillRect(px, py, pw * ratio, 6);
      this.playerHpText.setText(`${Math.ceil(me.hp)} / ${me.maxHp}`).setPosition(w / 2, py + 10);
      // Złoto po prawej stronie paska HP.
      this.goldText.setText(`● ${me.gold} zł`).setPosition(px + pw + 14, py + 10);
      this.deathText.setPosition(w / 2, h / 2).setVisible(!me.alive);
    }

    this.spellSlots.forEach((s, i) => this.drawSpellSlot(sx + i * (slot + gap), sy, slot, s));
  }

  private drawDialog(w: number, h: number) {
    const dlg = this.registry.get("dialog") as { name: string; text: string; hint: string } | null;
    const open = !!dlg;
    this.dlgName.setVisible(open);
    this.dlgText.setVisible(open);
    this.dlgHint.setVisible(open);
    this.dlgPortrait.setVisible(open);
    if (!dlg) return;

    const pw = Math.min(600, w - 80);
    const ph = 128;
    const px = w / 2 - pw / 2;
    const py = h - 240;
    // Panel z podwójną ramką (klimat starych RPG).
    this.panel(px - 3, py - 3, pw + 6, ph + 6, 0x0b0f18, 0x8a6a3c);
    this.hud.lineStyle(1, 0x54452a, 1).strokeRect(px + 4, py + 4, pw - 8, ph - 8);

    // Portret w ramce po lewej.
    const ps = 92;
    this.panel(px + 14, py + 18, ps, ps, 0x141a26, 0x8a6a3c);
    this.dlgPortrait.setPosition(px + 14 + ps / 2, py + 18 + ps / 2);
    const tex = this.textures.get(this.dlgPortrait.texture.key).getSourceImage();
    const fit = Math.min((ps - 8) / tex.width, (ps - 8) / tex.height);
    this.dlgPortrait.setScale(fit);

    this.dlgName.setText(dlg.name).setPosition(px + ps + 30, py + 14);
    this.hud.lineStyle(1, 0x54452a, 1).lineBetween(px + ps + 30, py + 34, px + pw - 16, py + 34);
    this.dlgText.setText(dlg.text).setPosition(px + ps + 30, py + 44);
    this.dlgText.setWordWrapWidth(pw - ps - 48);
    this.dlgHint.setText(dlg.hint).setPosition(px + pw - 14, py + ph - 8);
  }

  private drawShop(me: any, w: number, h: number) {
    const open = !!this.registry.get("tradeOpen");
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

    const rowH = 54;
    const pw = 420;
    const ph = 92 + SHOP_STOCK.length * rowH;
    const px = w / 2 - pw / 2;
    const py = h / 2 - ph / 2 - 40;

    this.panel(px - 3, py - 3, pw + 6, ph + 6, 0x0b0f18, 0x8a6a3c);
    this.hud.lineStyle(1, 0x54452a, 1).strokeRect(px + 4, py + 4, pw - 8, ph - 8);
    this.shopTitle.setPosition(px + 18, py + 14);
    const flash = this.time.now < this.shopFlash;
    this.shopGold
      .setText(me ? `twoje złoto: ${me.gold} zł` : "")
      .setColor(flash ? "#ff6b78" : "#ffd76b")
      .setPosition(px + pw - 18, py + 16);
    this.hud.lineStyle(1, 0x54452a, 1).lineBetween(px + 14, py + 42, px + pw - 14, py + 42);

    SHOP_STOCK.forEach((id, i) => {
      const r = this.shopRows[i];
      const ry = py + 54 + i * rowH;
      r.bg.setPosition(px + 10, ry - 4).setSize(pw - 20, rowH - 4);
      // Ramka slotu ikony.
      this.panel(px + 16, ry, 40, 40, 0x141a26, 0x3a4a66);
      if (r.icon) {
        r.icon.setPosition(px + 36, ry + 20);
        r.icon.setDisplaySize(36, 36);
      }
      r.name.setPosition(px + 68, ry + 2);
      r.info.setPosition(px + 68, ry + 22);
      r.price.setPosition(px + pw - 18, ry + 20);
    });
    this.shopFooter.setPosition(px + 18, py + ph - 24);
  }

  private drawInventory(me: any, w: number, h: number) {
    const open = !!this.registry.get("invOpen");
    this.invTitle.setVisible(open);
    this.invFooter.setVisible(open);
    const items: string[] = me ? Array.from(me.inventory as string[]) : [];
    this.invEmpty.setVisible(open && items.length === 0);
    this.invRows.forEach((r, i) => {
      const used = open && i < items.length;
      r.bg.setVisible(used);
      r.name.setVisible(used);
      r.state.setVisible(used);
    });
    if (!open) return;

    const rowH = 34;
    const pw = 360;
    const ph = 96 + Math.max(1, items.length) * rowH;
    const px = w - pw - 26;
    const py = h / 2 - ph / 2 - 40;

    this.panel(px - 3, py - 3, pw + 6, ph + 6, 0x0b0f18, 0x3a5a8a);
    this.hud.lineStyle(1, 0x2a4468, 1).strokeRect(px + 4, py + 4, pw - 8, ph - 8);
    this.invTitle.setPosition(px + 18, py + 14);
    this.hud.lineStyle(1, 0x2a4468, 1).lineBetween(px + 14, py + 42, px + pw - 14, py + 42);
    this.invEmpty.setPosition(px + 18, py + 56);

    items.forEach((id, i) => {
      const def = ITEMS[id];
      const r = this.invRows[i];
      const ry = py + 52 + i * rowH;
      r.itemId = id;
      r.bg.setPosition(px + 10, ry - 3).setSize(pw - 20, rowH - 2);
      r.name
        .setText(def?.name ?? id)
        .setColor(RARITY_COLORS[def?.rarity ?? "common"])
        .setPosition(px + 20, ry + 3);
      const equipped = me.eqWeapon === id || me.eqArmor === id;
      r.state
        .setText(def?.slot === "potion" ? "użyj" : equipped ? "ZAŁOŻONE" : "załóż")
        .setColor(equipped ? "#6fe3a0" : "#8b95aa")
        .setPosition(px + pw - 20, ry + 12);
    });
    this.invFooter.setPosition(px + 18, py + ph - 24);
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
      this.hud.fillStyle(0x000000, 0.6).fillRect(x + 2, y + 2, size - 4, (size - 4) * ratio);
      s.icon?.setAlpha(0.4);
    }
  }

  /** Ramka panelu w stylu pixel-UI. */
  private panel(x: number, y: number, w: number, h: number, fill: number, border: number) {
    this.hud.fillStyle(fill, 0.92).fillRect(x, y, w, h);
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
