import Phaser from "phaser";
import type { Room } from "colyseus.js";
import {
  MAP,
  NET,
  CLASSES,
  DEFAULT_CLASS,
  MSG,
  type InputMessage,
} from "@aetherfall/shared";
import { connect } from "../net/network";

/** Widok jednostki utrzymywany po stronie klienta. */
interface EntityView {
  container: Phaser.GameObjects.Container;
  hpFill: Phaser.GameObjects.Rectangle;
  tx: number; // docelowa pozycja z serwera
  ty: number;
}

const COLORS = {
  floor: 0x141a26,
  grid: 0x1f2838,
  enemy: 0x8b1d2c,
  enemyCore: 0xd23a4a,
  projectile: 0xffe18a,
  telegraph: 0xff3b3b,
};

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

  // HUD
  private hpBar!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super("game");
  }

  preload() {
    this.makeGlowTexture();
  }

  async create() {
    this.cameras.main.setBackgroundColor(COLORS.floor);
    this.drawArena();

    // Delikatne oświetlenie podążające za graczem (efekt dynamicznego światła).
    this.playerLight = this.add
      .image(0, 0, "glow")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.6)
      .setAlpha(0.35)
      .setDepth(50);

    this.makeWeather();
    this.makeHud();
    this.setupInput();

    this.cameras.main.setBounds(0, 0, MAP.width, MAP.height);

    try {
      this.room = await connect("Gracz", DEFAULT_CLASS);
      this.localId = this.room.sessionId;
      this.statusText.setText("");
    } catch (err) {
      this.statusText.setText(
        "Brak połączenia z serwerem (ws://…:2567).\nUruchom: npm run dev w katalogu game/"
      );
      console.error(err);
    }
  }

  update(time: number, delta: number) {
    if (!this.room) return;
    this.sendInput(time);
    this.syncState(delta);
    this.updateCameraAndHud();
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

    this.keys.dash.on("down", () => this.room?.send(MSG.dash));

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        const aim = this.aimVector();
        if (aim) this.room?.send(MSG.skillshot, { ax: aim.x, ay: aim.y });
      }
    });
  }

  /** Kierunek od gracza do kursora w przestrzeni świata. */
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

  private syncState(delta: number) {
    const state = this.room!.state;
    const lerp = Math.min(1, (delta / 1000) * 14); // wygładzanie pozycji

    // Gracze
    const seenP = new Set<string>();
    state.players.forEach((p: any, id: string) => {
      seenP.add(id);
      let view = this.players.get(id);
      if (!view) {
        view = this.createPlayerView(p);
        this.players.set(id, view);
      }
      view.tx = p.x;
      view.ty = p.y;
      const c = view.container;
      c.x = Phaser.Math.Linear(c.x, view.tx, lerp);
      c.y = Phaser.Math.Linear(c.y, view.ty, lerp);
      c.setVisible(p.alive);
      c.setAlpha(p.invulnerable ? 0.45 : 1);
      // Orientacja "broni" wg celowania.
      const weapon = c.getData("weapon") as Phaser.GameObjects.Triangle;
      weapon.setRotation(Math.atan2(p.aimY, p.aimX) + Math.PI / 2);
      this.setHp(view, p.hp / p.maxHp);
    });
    this.prune(this.players, seenP);

    // Przeciwnicy
    const seenE = new Set<string>();
    state.enemies.forEach((e: any, id: string) => {
      seenE.add(id);
      let view = this.enemies.get(id);
      if (!view) {
        view = this.createEnemyView();
        this.enemies.set(id, view);
      }
      view.tx = e.x;
      view.ty = e.y;
      const c = view.container;
      c.x = Phaser.Math.Linear(c.x, view.tx, lerp);
      c.y = Phaser.Math.Linear(c.y, view.ty, lerp);
      c.setVisible(e.state !== "dead");
      this.setHp(view, e.hp / e.maxHp);
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
    });
    for (const [id, view] of this.projectiles) {
      if (!seenProj.has(id)) {
        view.destroy();
        this.projectiles.delete(id);
      }
    }

    // Strefy AoE (telegrafy)
    const seenTg = new Set<string>();
    state.telegraphs.forEach((tg: any, id: string) => {
      seenTg.add(id);
      let g = this.telegraphs.get(id);
      if (!g) {
        g = this.add.graphics().setDepth(5);
        this.telegraphs.set(id, g);
      }
      g.clear();
      const danger = 0.12 + tg.progress * 0.4;
      g.fillStyle(COLORS.telegraph, danger);
      g.fillCircle(tg.x, tg.y, tg.radius);
      g.lineStyle(3, COLORS.telegraph, 0.9);
      g.strokeCircle(tg.x, tg.y, tg.radius);
      // Wewnętrzny pierścień narastający do pełnego promienia.
      g.lineStyle(4, 0xffffff, 0.85);
      g.strokeCircle(tg.x, tg.y, tg.radius * tg.progress);
    });
    for (const [id, g] of this.telegraphs) {
      if (!seenTg.has(id)) {
        g.destroy();
        this.telegraphs.delete(id);
      }
    }
  }

  private prune(map: Map<string, EntityView>, seen: Set<string>) {
    for (const [id, view] of map) {
      if (!seen.has(id)) {
        view.container.destroy();
        map.delete(id);
      }
    }
  }

  // ---------- Tworzenie widoków ----------

  private createPlayerView(p: any): EntityView {
    const color = CLASSES[p.charClass]?.color ?? 0x4f86ff;
    const shadow = this.add.ellipse(0, 14, 40, 18, 0x000000, 0.35);
    const body = this.add.circle(0, 0, 16, color).setStrokeStyle(2, 0xffffff, 0.5);
    // "Broń"/wskaźnik kierunku – namiastka widocznego ekwipunku.
    const weapon = this.add.triangle(0, -22, 0, 0, -6, 14, 6, 14, 0xf2f2f2);
    const name = this.add
      .text(0, -36, p.name ?? "Gracz", { fontSize: "12px", color: "#cdd6e6" })
      .setOrigin(0.5);
    const hpBg = this.add.rectangle(0, -28, 40, 5, 0x000000, 0.6);
    const hpFill = this.add.rectangle(-20, -28, 40, 5, 0x4ad66d).setOrigin(0, 0.5);

    const container = this.add
      .container(p.x, p.y, [shadow, weapon, body, hpBg, hpFill, name])
      .setDepth(20);
    container.setData("weapon", weapon);
    return { container, hpFill, tx: p.x, ty: p.y };
  }

  private createEnemyView(): EntityView {
    const shadow = this.add.ellipse(0, 26, 80, 32, 0x000000, 0.4);
    const ring = this.add.circle(0, 0, 34, COLORS.enemy).setStrokeStyle(3, 0x000000, 0.4);
    const core = this.add.circle(0, 0, 20, COLORS.enemyCore);
    const hpBg = this.add.rectangle(0, -48, 90, 8, 0x000000, 0.6);
    const hpFill = this.add.rectangle(-45, -48, 90, 8, 0xd23a4a).setOrigin(0, 0.5);
    const label = this.add
      .text(0, -62, "Strażnik Aetheru", { fontSize: "13px", color: "#ffb3bb" })
      .setOrigin(0.5);
    const container = this.add
      .container(MAP.width / 2, MAP.height / 2, [shadow, ring, core, hpBg, hpFill, label])
      .setDepth(15);
    return { container, hpFill, tx: MAP.width / 2, ty: MAP.height / 2 };
  }

  private createProjectileView(): Phaser.GameObjects.Container {
    const glow = this.add
      .image(0, 0, "glow")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.45)
      .setTint(COLORS.projectile);
    const core = this.add.circle(0, 0, 6, 0xffffff);
    return this.add.container(0, 0, [glow, core]).setDepth(30);
  }

  private setHp(view: EntityView, ratio: number) {
    const full = (view.hpFill.getData("full") as number) ?? view.hpFill.width;
    view.hpFill.setData("full", full);
    view.hpFill.width = Math.max(0, full * Phaser.Math.Clamp(ratio, 0, 1));
  }

  // ---------- Świat / HUD / efekty ----------

  private drawArena() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(COLORS.floor, 1);
    g.fillRect(0, 0, MAP.width, MAP.height);
    g.lineStyle(1, COLORS.grid, 1);
    for (let x = 0; x <= MAP.width; x += 64) {
      g.lineBetween(x, 0, x, MAP.height);
    }
    for (let y = 0; y <= MAP.height; y += 64) {
      g.lineBetween(0, y, MAP.width, y);
    }
    // Obwódka areny.
    g.lineStyle(4, 0x3a4a66, 0.8);
    g.strokeRect(0, 0, MAP.width, MAP.height);
  }

  private makeWeather() {
    // Lekki efekt pogodowy – dryfujące cząsteczki (deszcz/pył).
    const emitter = this.add.particles(0, 0, "glow", {
      x: { min: 0, max: MAP.width },
      y: -20,
      lifespan: 4000,
      speedY: { min: 180, max: 260 },
      speedX: { min: -30, max: -10 },
      scale: { start: 0.05, end: 0.02 },
      alpha: { start: 0.25, end: 0 },
      frequency: 40,
      tint: 0x9fc3ff,
    });
    emitter.setDepth(60);
  }

  private makeHud() {
    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.statusText = this.add
      .text(24, 24, "Łączenie z serwerem…", {
        fontSize: "16px",
        color: "#e8ecf4",
        backgroundColor: "#00000088",
        padding: { x: 8, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  private updateCameraAndHud() {
    const me = this.room?.state.players.get(this.localId);
    const view = this.players.get(this.localId);
    if (view) {
      this.cameras.main.startFollow(view.container, true, 0.12, 0.12);
      this.playerLight.setPosition(view.container.x, view.container.y);
    }

    this.hpBar.clear();
    if (me) {
      const w = 280;
      const h = 22;
      const x = 24;
      const y = this.scale.height - 48;
      this.hpBar.fillStyle(0x000000, 0.6).fillRect(x - 2, y - 2, w + 4, h + 4);
      this.hpBar.fillStyle(0x2a2f3a, 1).fillRect(x, y, w, h);
      const ratio = Phaser.Math.Clamp(me.hp / me.maxHp, 0, 1);
      this.hpBar
        .fillStyle(ratio > 0.3 ? 0x4ad66d : 0xd23a4a, 1)
        .fillRect(x, y, w * ratio, h);
      if (!me.alive) {
        this.statusText.setText("Powaliło Cię — odradzanie…");
      } else {
        this.statusText.setText("");
      }
    }
  }

  private makeGlowTexture() {
    const size = 256;
    const tex = this.textures.createCanvas("glow", size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const grd = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.4, "rgba(255,255,255,0.5)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }
}
