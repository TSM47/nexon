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
  type InputMessage,
} from "@aetherfall/shared";
import { connect } from "../net/network";
import {
  generateAllArt,
  PIXEL_SCALE,
  TILE_SIZE,
  FLOOR_TILE_COUNT,
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

  constructor() {
    super("game");
  }

  preload() {
    generateAllArt(this);
  }

  async create() {
    this.cameras.main.setBackgroundColor("#0c0f17");
    this.buildGround();

    this.arcane = this.add.graphics().setDepth(1);

    this.playerLight = this.add
      .image(0, 0, "glow")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.0)
      .setAlpha(0.28)
      .setDepth(50);

    this.makeWeather();
    this.makeVignette();
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
    if (!this.room) return;
    this.sendInput(time);
    this.syncState(time, delta);
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
    }) as Record<string, Phaser.Input.Keyboard.Key>;

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
      this.animateBob(view, t, casting, casting ? 0.9 : 0.35);
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
    view.sprite.scaleY = 1 + s * amp;
    view.sprite.scaleX = 1 - s * amp * 0.5;
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
    const shadow = this.add.ellipse(0, 16, 34, 14, 0x000000, 0.4);
    const sprite = this.add.image(0, baseY, `player_${p.charClass}`).setOrigin(0.5, 0.7);
    if (!this.textures.exists(`player_${p.charClass}`)) sprite.setTexture(`player_${DEFAULT_CLASS}`);
    const weapon = this.add.triangle(0, -28, 0, 0, -5, 12, 5, 12, 0xf2f2f2).setAlpha(0.9);
    const name = this.add
      .text(0, -42, p.name ?? "Gracz", { fontFamily: "monospace", fontSize: "11px", color: "#cdd6e6" })
      .setOrigin(0.5);
    const hpBg = this.add.rectangle(0, -34, 38, 5, 0x000000, 0.7);
    const hpFill = this.add.rectangle(-19, -34, 38, 5, 0x4ad66d).setOrigin(0, 0.5);
    const container = this.add
      .container(p.x, p.y, [shadow, weapon, sprite, hpBg, hpFill, name])
      .setDepth(20);
    container.setData("weapon", weapon);
    return this.mkView(container, sprite, hpFill, 38, p.x, p.y, p.hp, baseY);
  }

  private createEnemyView(e: any): EntityView {
    const baseY = -10;
    const shadow = this.add.ellipse(0, 30, 76, 28, 0x000000, 0.45);
    const sprite = this.add.image(0, baseY, "boss").setOrigin(0.5, 0.65);
    const hpBg = this.add.rectangle(0, -56, 96, 8, 0x000000, 0.7);
    const hpFill = this.add.rectangle(-48, -56, 96, 8, 0xd23a4a).setOrigin(0, 0.5);
    const label = this.add
      .text(0, -70, "Strażnik Aetheru", { fontFamily: "monospace", fontSize: "12px", color: "#ffb3bb" })
      .setOrigin(0.5);
    const container = this.add
      .container(e.x, e.y, [shadow, sprite, hpBg, hpFill, label])
      .setDepth(15);
    return this.mkView(container, sprite, hpFill, 96, e.x, e.y, e.hp, baseY);
  }

  private mkView(
    container: Phaser.GameObjects.Container,
    sprite: Phaser.GameObjects.Image,
    hpFill: Phaser.GameObjects.Rectangle,
    hpFullW: number,
    x: number,
    y: number,
    hp: number,
    baseY: number
  ): EntityView {
    return {
      container, sprite, hpFill, hpFullW,
      tx: x, ty: y, px: x, py: y,
      phase: Math.random() * Math.PI * 2,
      baseY,
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
    const rt = this.add.renderTexture(0, 0, MAP.width, MAP.height).setOrigin(0).setDepth(-10);
    let seed = 1;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let y = 0; y < MAP.height; y += TILE_SIZE) {
      for (let x = 0; x < MAP.width; x += TILE_SIZE) {
        rt.draw(`tile_${Math.floor(rand() * FLOOR_TILE_COUNT)}`, x, y);
        if (rand() > 0.93) {
          rt.draw("rock", x + rand() * (TILE_SIZE - 24), y + rand() * (TILE_SIZE - 24));
        }
      }
    }
    // Obwódka areny.
    const border = this.add.graphics().setDepth(-9);
    border.lineStyle(PIXEL_SCALE * 2, 0x3a4a66, 0.9);
    border.strokeRect(0, 0, MAP.width, MAP.height);
  }

  private animateArcane(time: number) {
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
    // Ciemna ramka dookoła ekranu (efekt klimatycznego oświetlenia).
    const dark = this.add.graphics().setScrollFactor(0).setDepth(69);
    const drawDark = () => {
      dark.clear();
      const w = this.scale.width;
      const h = this.scale.height;
      dark.fillStyle(0x05070d, 0.55);
      const m = 90;
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
    const emitter = this.add.particles(0, 0, "glow", {
      x: { min: 0, max: MAP.width },
      y: -20,
      lifespan: 3500,
      speedY: { min: 220, max: 320 },
      speedX: { min: -40, max: -15 },
      scale: { start: 0.05, end: 0.015 },
      alpha: { start: 0.22, end: 0 },
      frequency: 35,
      tint: 0x9fc3ff,
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
