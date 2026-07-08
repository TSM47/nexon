import Phaser from "phaser";
import type { Room } from "colyseus.js";
import {
  MAP,
  NET,
  CLASSES,
  DEFAULT_CLASS,
  SKILLSHOT,
  DASH,
  MSG,
  NPC,
  NPC_DIALOG,
  type InputMessage,
} from "@aetherfall/shared";
import { connect } from "../net/network";
import {
  generateAllArt,
  PIXEL_SCALE,
  TILE_SIZE,
  FLOOR_TILE_COUNT,
  DIRT_TILE_COUNT,
} from "../art/pixel";
import { UIScene } from "./UIScene";

interface EntityView {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hpFill: Phaser.GameObjects.Rectangle;
  hpFullW: number;
  tx: number;
  ty: number;
  px: number; // poprzednia pozycja (do wykrycia ruchu)
  py: number;
  phase: number;
  baseY: number; // bazowe Y sprite'a (do animacji)
  baseScale: number; // bazowa skala sprite'a (malowane assety są duże i wymagają zmniejszenia)
  lastHp: number; // do liczb obrażeń
  hpPrev: number; // do błysku ekranu lokalnego gracza
}

export class GameScene extends Phaser.Scene {
  private room?: Room;
  private localId = "";

  private players = new Map<string, EntityView>();
  private enemies = new Map<string, EntityView>();
  private projectiles = new Map<string, Phaser.GameObjects.Container>();
  private telegraphs = new Map<string, Phaser.GameObjects.Graphics>();

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private lastInputSent = 0;
  private playerLight!: Phaser.GameObjects.Image;
  private arcane!: Phaser.GameObjects.Graphics;

  // NPC / dialog
  private npcSprite!: Phaser.GameObjects.Image;
  private npcBaseScale = 1;
  private npcPhase = Math.random() * Math.PI * 2;
  private npcPrompt!: Phaser.GameObjects.Container;
  private dialogBubble!: Phaser.GameObjects.Container;
  private dialogBg!: Phaser.GameObjects.Graphics;
  private dialogTextObj!: Phaser.GameObjects.Text;
  private dialogHint!: Phaser.GameObjects.Text;
  private npcNear = false;
  private dialogLine = -1; // -1 = dialog zamknięty
  private dialogShown = 0; // ile znaków bieżącej kwestii już "napisano"

  constructor() {
    super("game");
  }

  preload() {
    generateAllArt(this);
    // Opcjonalne malowane assety (Higgsfield) z public/assets/.
    // Jeśli plików nie ma, loader zgłasza błąd i używamy pixel-artu.
    this.load.image("art_player", "assets/player.png");
    this.load.image("art_boss", "assets/boss.png");
    this.load.image("art_npc", "assets/npc.png");
    this.load.image("art_floor", "assets/floor.png");
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.info(`[assets] brak "${file.key}" — fallback do pixel-artu`);
    });
  }

  async create() {
    this.cameras.main.setBackgroundColor("#26471f");
    this.buildGround();

    this.arcane = this.add.graphics().setDepth(1);

    // Dzień na łące — tylko delikatne słoneczne podświetlenie wokół gracza.
    this.playerLight = this.add
      .image(0, 0, "glow")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.0)
      .setAlpha(0.1)
      .setTint(0xfff4d6)
      .setDepth(50);

    this.makeWeather();
    this.makeVignette();
    this.createNpc();
    this.setupInput();
    this.input.setDefaultCursor("none");

    this.cameras.main.setBounds(0, 0, MAP.width, MAP.height);
    this.cameras.main.setZoom(1);

    // Scena UI (HUD) działa równolegle.
    this.scene.launch("ui");

    try {
      this.room = await connect("Gracz", DEFAULT_CLASS);
      this.localId = this.room.sessionId;
      this.registry.set("room", this.room);
      this.registry.set("localId", this.localId);
    } catch (err) {
      this.registry.set("netError", true);
      console.error(err);
    }
  }

  update(time: number, delta: number) {
    this.animateArcane(time);
    this.animateNpc(time);
    if (!this.room) return;
    this.sendInput(time);
    this.syncState(time, delta);
    this.updateNpcInteraction(delta);
    this.updateCameraAndLight();
  }

  // ---------- Wejście ----------

  private setupInput() {
    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      dash: Phaser.Input.Keyboard.KeyCodes.SPACE,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
      trade: Phaser.Input.Keyboard.KeyCodes.T,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.keys.interact.on("down", () => this.onInteract());
    this.keys.trade.on("down", () => this.onTrade());

    this.keys.dash.on("down", () => {
      if (!this.room) return;
      this.room.send(MSG.dash);
      this.registry.set("cd_dash", { until: this.time.now + DASH.cooldown * 1000, dur: DASH.cooldown * 1000 });
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.room || !pointer.leftButtonDown()) return;
      const aim = this.aimVector();
      if (!aim) return;
      this.room.send(MSG.skillshot, { ax: aim.x, ay: aim.y });
      this.registry.set("cd_skill", { until: this.time.now + SKILLSHOT.cooldown * 1000, dur: SKILLSHOT.cooldown * 1000 });
    });
  }

  private aimVector(): { x: number; y: number } | null {
    const me = this.room?.state.players.get(this.localId);
    if (!me) return null;
    const world = this.cameras.main.getWorldPoint(
      this.input.activePointer.x,
      this.input.activePointer.y
    );
    const dx = world.x - me.x;
    const dy = world.y - me.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  }

  private sendInput(time: number) {
    if (time - this.lastInputSent < NET.inputSendMs) return;
    this.lastInputSent = time;
    const mx = (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0);
    const my = (this.keys.down.isDown ? 1 : 0) - (this.keys.up.isDown ? 1 : 0);
    const aim = this.aimVector() ?? { x: 1, y: 0 };
    const msg: InputMessage = { mx, my, ax: aim.x, ay: aim.y };
    this.room?.send(MSG.input, msg);
  }

  // ---------- Synchronizacja stanu ----------

  private syncState(time: number, delta: number) {
    const state = this.room!.state;
    const lerp = Math.min(1, (delta / 1000) * 14);
    const t = time / 1000;

    // Gracze
    const seenP = new Set<string>();
    state.players.forEach((p: any, id: string) => {
      seenP.add(id);
      let view = this.players.get(id);
      if (!view) {
        view = this.createPlayerView(p);
        this.players.set(id, view);
      }
      this.followServer(view, p, lerp);
      view.container.setVisible(p.alive);
      view.sprite.setAlpha(p.invulnerable ? 0.4 : 1);
      view.sprite.setFlipX(p.aimX < 0);
      const weapon = view.container.getData("weapon") as Phaser.GameObjects.Triangle;
      weapon.setRotation(Math.atan2(p.aimY, p.aimX) + Math.PI / 2);
      this.animateBob(view, t, p.dashing);
      if (id === this.localId && p.hp < view.hpPrev && p.alive) {
        this.cameras.main.flash(120, 120, 0, 0);
      }
      view.hpPrev = p.hp;
      this.setHp(view, p.hp, p.maxHp);
      this.checkDamage(view, p.hp, view.container.x, view.container.y, 0xff5a5a);
    });
    this.prune(this.players, seenP);

    // Przeciwnicy
    const seenE = new Set<string>();
    state.enemies.forEach((e: any, id: string) => {
      seenE.add(id);
      let view = this.enemies.get(id);
      if (!view) {
        view = this.createEnemyView(e);
        this.enemies.set(id, view);
      }
      this.followServer(view, e, lerp);
      view.container.setVisible(e.state !== "dead");
      const casting = e.state === "telegraph";
      view.sprite.setTint(casting ? 0xff8a8a : 0xffffff);
      this.animateBob(view, t, casting, casting ? 0.1 : 0.03);
      this.setHp(view, e.hp, e.maxHp);
      this.checkDamage(view, e.hp, view.container.x, view.container.y - 30, 0xffe46b);
    });
    this.prune(this.enemies, seenE);

    // Pociski
    const seenProj = new Set<string>();
    state.projectiles.forEach((proj: any, id: string) => {
      seenProj.add(id);
      let view = this.projectiles.get(id);
      if (!view) {
        view = this.createProjectileView();
        this.projectiles.set(id, view);
      }
      view.setPosition(proj.x, proj.y);
      (view.getData("core") as Phaser.GameObjects.Image).rotation = t * 12;
    });
    for (const [id, view] of this.projectiles) {
      if (!seenProj.has(id)) {
        this.spawnHitSpark(view.x, view.y);
        view.destroy();
        this.projectiles.delete(id);
      }
    }

    // Strefy AoE
    const seenTg = new Set<string>();
    state.telegraphs.forEach((tg: any, id: string) => {
      seenTg.add(id);
      let g = this.telegraphs.get(id);
      if (!g) {
        g = this.add.graphics().setDepth(4);
        this.telegraphs.set(id, g);
      }
      g.clear();
      const danger = 0.1 + tg.progress * 0.45;
      g.fillStyle(0xff3030, danger);
      g.fillCircle(tg.x, tg.y, tg.radius);
      g.lineStyle(4, 0xff5050, 0.95);
      g.strokeCircle(tg.x, tg.y, tg.radius);
      g.lineStyle(5, 0xffffff, 0.9);
      g.strokeCircle(tg.x, tg.y, tg.radius * tg.progress);
      // Pulsujący rdzeń ostrzeżenia.
      const pulse = 6 + Math.sin(t * 12) * 3;
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(tg.x, tg.y, pulse);
    });
    for (const [id, g] of this.telegraphs) {
      if (!seenTg.has(id)) {
        g.destroy();
        this.telegraphs.delete(id);
      }
    }
  }

  private followServer(view: EntityView, ent: any, lerp: number) {
    view.tx = ent.x;
    view.ty = ent.y;
    const c = view.container;
    view.px = c.x;
    view.py = c.y;
    c.x = Phaser.Math.Linear(c.x, view.tx, lerp);
    c.y = Phaser.Math.Linear(c.y, view.ty, lerp);
  }

  /** Oddech/chód przez squash-stretch zależny od ruchu. */
  private animateBob(view: EntityView, t: number, fast: boolean, idleAmp = 0.04) {
    const moving = Math.hypot(view.tx - view.px, view.ty - view.py) > 0.4;
    const freq = moving || fast ? 14 : 4;
    const amp = moving ? 0.1 : idleAmp;
    const s = Math.sin(t * freq + view.phase);
    view.sprite.scaleY = view.baseScale * (1 + s * amp);
    view.sprite.scaleX = view.baseScale * (1 - s * amp * 0.5);
    view.sprite.y = view.baseY - Math.abs(s) * (moving ? 4 : 1);
  }

  private prune(map: Map<string, EntityView>, seen: Set<string>) {
    for (const [id, view] of map) {
      if (!seen.has(id)) {
        view.container.destroy();
        map.delete(id);
      }
    }
  }

  private checkDamage(view: EntityView, hp: number, x: number, y: number, color: number) {
    if (hp < view.lastHp) {
      this.spawnDamage(x, y, Math.round(view.lastHp - hp), color);
    }
    view.lastHp = hp;
  }

  // ---------- Tworzenie widoków ----------

  private createPlayerView(p: any): EntityView {
    const baseY = -6;
    const useArt = this.textures.exists("art_player");
    const texKey = useArt ? "art_player" : `player_${p.charClass}`;
    const shadow = this.add.ellipse(0, 16, 40, 16, 0x000000, 0.4);
    const sprite = this.add.image(0, baseY, texKey).setOrigin(0.5, 0.7);
    // Postać ma mieć ~100 px wysokości w świecie (pasuje do skali mapy).
    const effH = useArt ? 100 : 54;
    const baseScale = useArt ? this.fitScaleH(texKey, effH) : 1;
    sprite.setScale(baseScale);
    const top = baseY - effH * 0.7;
    // Wskaźnik kierunku tylko dla pixel-artu (malowany sprite ma własną broń).
    const weapon = this.add.triangle(0, -28, 0, 0, -5, 12, 5, 12, 0xf2f2f2).setAlpha(useArt ? 0 : 0.9);
    const name = this.add
      .text(0, top - 12, p.name ?? "Gracz", { fontFamily: "monospace", fontSize: "11px", color: "#f5f8ff" })
      .setOrigin(0.5)
      .setStroke("#1a2a14", 3);
    const hpBg = this.add.rectangle(0, top - 3, 38, 5, 0x000000, 0.7);
    const hpFill = this.add.rectangle(-19, top - 3, 38, 5, 0x4ad66d).setOrigin(0, 0.5);
    const container = this.add
      .container(p.x, p.y, [shadow, weapon, sprite, hpBg, hpFill, name])
      .setDepth(20);
    container.setData("weapon", weapon);
    return this.mkView(container, sprite, hpFill, 38, p.x, p.y, p.hp, baseY, baseScale);
  }

  private createEnemyView(e: any): EntityView {
    const baseY = -10;
    const useArt = this.textures.exists("art_boss");
    const texKey = useArt ? "art_boss" : "boss";
    const shadow = this.add.ellipse(0, 30, 84, 30, 0x000000, 0.45);
    const sprite = this.add.image(0, baseY, texKey).setOrigin(0.5, 0.65);
    // Boss wyraźnie góruje nad graczami (~160 px wysokości).
    const effH = useArt ? 160 : 64;
    const baseScale = useArt ? this.fitScaleH(texKey, effH) : 1;
    sprite.setScale(baseScale);
    const top = baseY - effH * 0.65;
    const hpBg = this.add.rectangle(0, top - 6, 96, 8, 0x000000, 0.7);
    const hpFill = this.add.rectangle(-48, top - 6, 96, 8, 0xd23a4a).setOrigin(0, 0.5);
    const label = this.add
      .text(0, top - 20, "Strażnik Aetheru", { fontFamily: "monospace", fontSize: "12px", color: "#ffb3bb" })
      .setOrigin(0.5)
      .setStroke("#1a2a14", 3);
    const container = this.add
      .container(e.x, e.y, [shadow, sprite, hpBg, hpFill, label])
      .setDepth(15);
    return this.mkView(container, sprite, hpFill, 96, e.x, e.y, e.hp, baseY, baseScale);
  }

  private artScaleCache = new Map<string, number>();

  /**
   * Skala sprowadzająca WIDOCZNĄ (nieprzezroczystą) wysokość tekstury do
   * `targetH` px świata. Wycięte tło zostawia w kadrze puste marginesy,
   * więc mierzymy realny obrys po kanale alfa (na próbce 128px).
   */
  private fitScaleH(key: string, targetH: number): number {
    const cacheKey = `${key}@${targetH}`;
    const cached = this.artScaleCache.get(cacheKey);
    if (cached) return cached;

    const src = this.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    if (!src.height) return 1;
    let frac = 1;
    try {
      const sample = 128;
      const c = document.createElement("canvas");
      c.width = sample;
      c.height = sample;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(src, 0, 0, sample, sample);
      const data = ctx.getImageData(0, 0, sample, sample).data;
      let top = sample;
      let bottom = -1;
      for (let y = 0; y < sample; y++) {
        for (let x = 0; x < sample; x++) {
          if (data[(y * sample + x) * 4 + 3] > 16) {
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            break;
          }
        }
      }
      if (bottom >= top) frac = Math.max(0.05, (bottom - top + 1) / sample);
    } catch {
      // np. canvas niedostępny — użyj pełnej wysokości kadru
    }
    const scale = targetH / (src.height * frac);
    this.artScaleCache.set(cacheKey, scale);
    return scale;
  }

  private mkView(
    container: Phaser.GameObjects.Container,
    sprite: Phaser.GameObjects.Image,
    hpFill: Phaser.GameObjects.Rectangle,
    hpFullW: number,
    x: number,
    y: number,
    hp: number,
    baseY: number,
    baseScale: number
  ): EntityView {
    return {
      container, sprite, hpFill, hpFullW,
      tx: x, ty: y, px: x, py: y,
      phase: Math.random() * Math.PI * 2,
      baseY,
      baseScale,
      lastHp: hp,
      hpPrev: hp,
    };
  }

  private createProjectileView(): Phaser.GameObjects.Container {
    const glow = this.add
      .image(0, 0, "glow")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.4)
      .setTint(0xffd27a);
    const core = this.add.image(0, 0, "proj");
    const c = this.add.container(0, 0, [glow, core]).setDepth(30);
    c.setData("core", core);
    return c;
  }

  private setHp(view: EntityView, hp: number, maxHp: number) {
    view.hpFill.width = Math.max(0, view.hpFullW * Phaser.Math.Clamp(hp / maxHp, 0, 1));
  }

  // ---------- NPC / dialog ----------

  private createNpc() {
    // Ciepłe światło latarni kupca.
    this.add
      .image(NPC.x, NPC.y, "glow")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.1)
      .setAlpha(0.22)
      .setTint(0xffc46b)
      .setDepth(3);

    const useArt = this.textures.exists("art_npc");
    const shadow = this.add.ellipse(0, 16, 40, 16, 0x000000, 0.4);
    this.npcSprite = this.add.image(0, -6, useArt ? "art_npc" : "npc").setOrigin(0.5, 0.7);
    // Kupiec w skali gracza (~95 px wysokości).
    const effH = useArt ? 95 : 54;
    this.npcBaseScale = useArt ? this.fitScaleH("art_npc", effH) : 1;
    this.npcSprite.setScale(this.npcBaseScale);
    const top = -6 - effH * 0.7;
    const name = this.add
      .text(0, top - 12, NPC.name, { fontFamily: "monospace", fontSize: "11px", color: "#ffe2a8" })
      .setOrigin(0.5)
      .setStroke("#1a2a14", 3);
    this.add.container(NPC.x, NPC.y, [shadow, this.npcSprite, name]).setDepth(14);

    // Podpowiedź interakcji: [E] Rozmawiaj · [T] Handluj
    const promptBg = this.add
      .rectangle(0, 0, 224, 30, 0x0e1420, 0.88)
      .setStrokeStyle(2, 0x3a4a66);
    const capE = this.keycap(-96, "E");
    const labelE = this.add
      .text(-82, 0, "Rozmawiaj", { fontFamily: "monospace", fontSize: "12px", color: "#e8ecf4" })
      .setOrigin(0, 0.5);
    const capT = this.keycap(14, "T");
    const labelT = this.add
      .text(28, 0, "Handluj", { fontFamily: "monospace", fontSize: "12px", color: "#e8ecf4" })
      .setOrigin(0, 0.5);
    this.npcPrompt = this.add
      .container(NPC.x, NPC.y + top - 34, [promptBg, capE, labelE, capT, labelT])
      .setDepth(40)
      .setVisible(false);

    // Dymek dialogowy (tekst pojawia się znak po znaku).
    this.dialogBg = this.add.graphics();
    this.dialogTextObj = this.add
      .text(0, -24, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#f2ead6",
        wordWrap: { width: 250 },
        lineSpacing: 4,
      })
      .setOrigin(0.5, 1);
    this.dialogHint = this.add
      .text(0, -16, "", { fontFamily: "monospace", fontSize: "10px", color: "#c9a86a" })
      .setOrigin(1, 0);
    this.dialogBubble = this.add
      .container(NPC.x, NPC.y + top + 6, [this.dialogBg, this.dialogTextObj, this.dialogHint])
      .setDepth(45)
      .setVisible(false);
  }

  /** Rysowany klawisz klawiatury (keycap) z literą. */
  private keycap(x: number, letter: string): Phaser.GameObjects.Container {
    const under = this.add.rectangle(0, 2, 20, 20, 0x8892a6);
    const top = this.add.rectangle(0, 0, 20, 20, 0xe8ecf4).setStrokeStyle(1, 0x8892a6);
    const txt = this.add
      .text(0, 0, letter, { fontFamily: "monospace", fontSize: "12px", color: "#1a2130", fontStyle: "bold" })
      .setOrigin(0.5);
    return this.add.container(x, 0, [under, top, txt]);
  }

  private animateNpc(time: number) {
    if (!this.npcSprite) return;
    // Spokojny "oddech" kupca.
    const s = Math.sin(time / 1000 * 3 + this.npcPhase);
    this.npcSprite.scaleY = this.npcBaseScale * (1 + s * 0.03);
    this.npcSprite.scaleX = this.npcBaseScale * (1 - s * 0.015);
  }

  private updateNpcInteraction(delta: number) {
    const meView = this.players.get(this.localId);
    if (!meView) return;

    const d = Math.hypot(meView.container.x - NPC.x, meView.container.y - NPC.y);
    const near = d <= NPC.interactRadius;
    if (near !== this.npcNear) {
      this.npcNear = near;
      if (!near) {
        // Odejście przerywa rozmowę i zamyka handel.
        this.closeDialog();
        this.registry.set("tradeOpen", false);
      }
    }

    this.npcPrompt.setVisible(near && this.dialogLine < 0 && !this.registry.get("tradeOpen"));

    // Efekt pisania (typewriter) bieżącej kwestii.
    if (this.dialogLine >= 0) {
      const full = NPC_DIALOG[this.dialogLine];
      if (this.dialogShown < full.length) {
        this.dialogShown = Math.min(full.length, this.dialogShown + (delta / 1000) * 32);
      }
      this.dialogTextObj.setText(full.slice(0, Math.floor(this.dialogShown)));
      const done = this.dialogShown >= full.length;
      this.dialogHint.setText(
        done ? (this.dialogLine + 1 < NPC_DIALOG.length ? "E ▸ dalej" : "E ▸ zakończ") : ""
      );
    }
  }

  private onInteract() {
    if (!this.npcNear || this.registry.get("tradeOpen")) return;
    if (this.dialogLine < 0) {
      this.startDialogLine(0);
      return;
    }
    const full = NPC_DIALOG[this.dialogLine];
    if (this.dialogShown < full.length) {
      // Drugi E w trakcie pisania — dokończ kwestię od razu.
      this.dialogShown = full.length;
    } else if (this.dialogLine + 1 < NPC_DIALOG.length) {
      this.startDialogLine(this.dialogLine + 1);
    } else {
      this.closeDialog();
    }
  }

  private onTrade() {
    if (!this.npcNear) return;
    const open = !this.registry.get("tradeOpen");
    if (open) this.closeDialog();
    this.registry.set("tradeOpen", open);
  }

  private startDialogLine(index: number) {
    this.dialogLine = index;
    this.dialogShown = 0;
    const full = NPC_DIALOG[index];
    // Zmierz pełną kwestię, by dymek nie skakał podczas pisania.
    this.dialogTextObj.setText(full);
    const w = this.dialogTextObj.width;
    const h = this.dialogTextObj.height;
    this.dialogTextObj.setText("");
    this.dialogBg.clear();
    this.dialogBg.fillStyle(0x0e1420, 0.94);
    this.dialogBg.lineStyle(2, 0x8a6a3c, 1);
    this.dialogBg.fillRoundedRect(-w / 2 - 14, -h - 36, w + 28, h + 24, 8);
    this.dialogBg.strokeRoundedRect(-w / 2 - 14, -h - 36, w + 28, h + 24, 8);
    // Dzióbek wskazujący kupca.
    this.dialogBg.fillTriangle(-7, -13, 7, -13, 0, -2);
    this.dialogHint.setPosition(w / 2 + 8, -32);
    this.dialogBubble.setVisible(true);
  }

  private closeDialog() {
    this.dialogLine = -1;
    this.dialogShown = 0;
    this.dialogBubble.setVisible(false);
  }

  // ---------- Efekty ----------

  private spawnDamage(x: number, y: number, amount: number, color: number) {
    if (amount <= 0) return;
    const txt = this.add
      .text(x + Phaser.Math.Between(-8, 8), y - 20, `-${amount}`, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(80);
    this.tweens.add({
      targets: txt,
      y: y - 56,
      alpha: 0,
      duration: 700,
      ease: "Cubic.out",
      onComplete: () => txt.destroy(),
    });
  }

  private spawnHitSpark(x: number, y: number) {
    const spark = this.add.image(x, y, "glow").setTint(0xffd27a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setDepth(35);
    this.tweens.add({ targets: spark, scale: 1.2, alpha: 0, duration: 220, onComplete: () => spark.destroy() });
  }

  // ---------- Świat / oświetlenie ----------

  private buildGround() {
    if (this.textures.exists("art_floor")) {
      // Malowane tło areny rozciągnięte na cały świat.
      const img = this.add.image(0, 0, "art_floor").setOrigin(0).setDepth(-10);
      img.setDisplaySize(MAP.width, MAP.height);
      const border = this.add.graphics().setDepth(-9);
      border.lineStyle(PIXEL_SCALE * 2, 0x3a4a66, 0.9);
      border.strokeRect(0, 0, MAP.width, MAP.height);
      return;
    }
    const rt = this.add.renderTexture(0, 0, MAP.width, MAP.height).setOrigin(0).setDepth(-10);
    let seed = 1;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const cx = MAP.width / 2;
    const cy = MAP.height / 2;
    // Ścieżka: z dołu mapy do kręgu + odnoga do kupca.
    const onPath = (x: number, y: number) => {
      const tx = x + TILE_SIZE / 2;
      const ty = y + TILE_SIZE / 2;
      const vertical = Math.abs(tx - cx) < TILE_SIZE * 1.2 && ty > cy;
      const toNpc =
        Math.abs(ty - NPC.y) < TILE_SIZE * 1.1 && tx > NPC.x - TILE_SIZE && tx < cx;
      return vertical || toNpc;
    };
    // Skraj mapy — pas lasu.
    const onEdge = (x: number, y: number) =>
      x < TILE_SIZE * 2 || x > MAP.width - TILE_SIZE * 3 ||
      y < TILE_SIZE * 2 || y > MAP.height - TILE_SIZE * 3;

    for (let y = 0; y < MAP.height; y += TILE_SIZE) {
      for (let x = 0; x < MAP.width; x += TILE_SIZE) {
        const path = onPath(x, y);
        const key = path
          ? `dirt_${Math.floor(rand() * DIRT_TILE_COUNT)}`
          : `tile_${Math.floor(rand() * FLOOR_TILE_COUNT)}`;
        rt.draw(key, x, y);

        const nearCenter = Math.hypot(x - cx, y - cy) < 300;
        const nearNpc = Math.hypot(x - NPC.x, y - NPC.y) < 110;
        if (path || nearNpc) continue;

        if (onEdge(x, y)) {
          // Las okalający łąkę.
          if (rand() > 0.45) {
            rt.draw("tree", x + (rand() - 0.5) * 14, y + (rand() - 0.5) * 14);
          }
        } else if (!nearCenter) {
          const roll = rand();
          if (roll > 0.975) rt.draw("bush", x + rand() * (TILE_SIZE - 30), y + rand() * (TILE_SIZE - 24));
          else if (roll > 0.958) rt.draw("rock", x + rand() * (TILE_SIZE - 24), y + rand() * (TILE_SIZE - 24));
        }
      }
    }
    // Obwódka mapy (skraj lasu).
    const border = this.add.graphics().setDepth(-9);
    border.lineStyle(PIXEL_SCALE * 2, 0x1e3a1a, 0.9);
    border.strokeRect(0, 0, MAP.width, MAP.height);
  }

  private animateArcane(time: number) {
    // Malowane tło ma już własny krąg runiczny — nie dublujemy go.
    if (this.textures.exists("art_floor")) return;
    const t = time / 1000;
    const cx = MAP.width / 2;
    const cy = MAP.height / 2;
    this.arcane.clear();
    this.arcane.lineStyle(3, 0x6a4fd0, 0.35 + Math.sin(t * 1.5) * 0.1);
    this.arcane.strokeCircle(cx, cy, 220);
    this.arcane.lineStyle(2, 0x9a7bff, 0.3);
    this.arcane.strokeCircle(cx, cy, 180);
    // Obracające się znaczniki run.
    for (let i = 0; i < 8; i++) {
      const a = t * 0.4 + (i / 8) * Math.PI * 2;
      const rx = cx + Math.cos(a) * 200;
      const ry = cy + Math.sin(a) * 200;
      this.arcane.fillStyle(0xb89cff, 0.5);
      this.arcane.fillRect(rx - 3, ry - 3, 6, 6);
    }
  }

  private makeVignette() {
    const v = this.add
      .image(this.scale.width / 2, this.scale.height / 2, "glow")
      .setScrollFactor(0)
      .setDepth(70)
      .setTint(0x000000)
      .setAlpha(0.0);
    // Delikatna ramka (letni, jasny klimat — tylko lekkie przyciemnienie rogów).
    const dark = this.add.graphics().setScrollFactor(0).setDepth(69);
    const drawDark = () => {
      dark.clear();
      const w = this.scale.width;
      const h = this.scale.height;
      dark.fillStyle(0x0a1408, 0.16);
      const m = 70;
      dark.fillRect(0, 0, w, m);
      dark.fillRect(0, h - m, w, m);
      dark.fillRect(0, 0, m, h);
      dark.fillRect(w - m, 0, m, h);
    };
    drawDark();
    this.scale.on("resize", drawDark);
    v.destroy();
  }

  private makeWeather() {
    // Letni dzień: leniwie dryfujące pyłki/nasiona traw.
    const emitter = this.add.particles(0, 0, "glow", {
      x: { min: 0, max: MAP.width },
      y: { min: 0, max: MAP.height },
      lifespan: 6000,
      speedY: { min: 8, max: 30 },
      speedX: { min: -25, max: 25 },
      scale: { start: 0.035, end: 0.01 },
      alpha: { start: 0.35, end: 0 },
      frequency: 90,
      tint: 0xfff0a8,
    });
    emitter.setDepth(60);
  }

  private updateCameraAndLight() {
    const view = this.players.get(this.localId);
    if (view) {
      this.cameras.main.startFollow(view.container, true, 0.12, 0.12);
      this.playerLight.setPosition(view.container.x, view.container.y);
    }
  }
}
