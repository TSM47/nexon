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
  ITEMS,
  MANA,
  type InputMessage,
} from "@aetherfall/shared";
import { connect } from "../net/network";
import { generateAllArt, TILE_SIZE } from "../art/pixel";
import { UIScene } from "./UIScene";

interface EntityView {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  /** Prefiks animacji ("player") gdy sprite ma klatkowe animacje idle/walk. */
  animPrefix?: string;
  /** Docelowa widoczna wysokość sprite'a — wyrównywana przy zmianie sheetu. */
  animTargetH?: number;
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

  // NPC / dialog
  private npcSprite!: Phaser.GameObjects.Sprite;
  private npcHasAnim = false;
  private npcBaseScale = 1;
  private npcPhase = Math.random() * Math.PI * 2;
  private npcPrompt!: Phaser.GameObjects.Container;
  private npcNear = false;
  private dialogLine = -1; // -1 = dialog zamknięty
  private dialogShown = 0; // ile znaków bieżącej kwestii już "napisano"
  private dialogBubble!: Phaser.GameObjects.Container;
  private dialogBg!: Phaser.GameObjects.Graphics;
  private dialogName!: Phaser.GameObjects.Text;
  private dialogTextObj!: Phaser.GameObjects.Text;
  private dialogHint!: Phaser.GameObjects.Text;

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
    // Sprite-sheety animacji (4 klatki w poziomym rzędzie).
    this.load.image("art_player_idle", "assets/player_idle.png");
    this.load.image("art_player_walk", "assets/player_walk.png");
    this.load.image("art_npc_idle", "assets/npc_idle.png");
    // Ikony 5 spelli.
    for (let i = 1; i <= 5; i++) this.load.image(`art_spell${i}`, `assets/spell${i}.png`);
    // Ikony przedmiotów sklepu/ekwipunku + portret kupca do okna dialogu.
    for (const id of Object.keys(ITEMS)) this.load.image(`art_item_${id}`, `assets/item_${id}.png`);
    this.load.image("art_npc_portrait", "assets/npc_portrait.png");
    // Tekstury UI (panel, slot, ramka paska HP, monety, plakietka poziomu).
    this.load.image("ui_panel", "assets/ui_panel.png");
    this.load.image("ui_slot", "assets/ui_slot.png");
    this.load.image("ui_hpframe", "assets/ui_hpframe.png");
    this.load.image("ui_coin", "assets/ui_coin.png");
    this.load.image("ui_gem", "assets/ui_gem.png");
    this.load.image("ui_levelbadge", "assets/ui_levelbadge.png");
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.info(`[assets] brak "${file.key}" — fallback do pixel-artu`);
    });
  }

  async create() {
    this.cameras.main.setBackgroundColor("#26282e");
    this.buildGround();

    // Zarejestruj animacje klatkowe, jeśli sprite-sheety zostały pobrane
    // (liczba klatek wykrywana automatycznie po kanale alfa).
    this.setupSheetAnim("art_player_idle", "player_idle", 5);
    this.setupSheetAnim("art_player_walk", "player_walk", 12);
    this.setupSheetAnim("art_npc_idle", "npc_idle", 4);

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
      inventory: Phaser.Input.Keyboard.KeyCodes.I,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.keys.interact.on("down", () => this.onInteract());
    this.keys.trade.on("down", () => this.onTrade());
    this.keys.inventory.on("down", () => {
      this.registry.set("invOpen", !this.registry.get("invOpen"));
    });

    this.keys.dash.on("down", () => {
      if (!this.room) return;
      this.room.send(MSG.dash);
      this.registry.set("cd_dash", { until: this.time.now + DASH.cooldown * 1000, dur: DASH.cooldown * 1000 });
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.room || !pointer.leftButtonDown()) return;
      // Klik obsługuje UI, gdy otwarty jest sklep lub ekwipunek.
      if (this.registry.get("tradeOpen") || this.registry.get("invOpen")) return;
      // Bez many nie strzelamy — mignij paskiem many.
      const me = this.room.state.players.get(this.localId);
      if (me && me.mp < MANA.skillshotCost) {
        this.registry.set("manaFlash", this.time.now + 300);
        return;
      }
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
      if (view.animPrefix) {
        // Animacje klatkowe: lokalny gracz reaguje NATYCHMIAST na klawisze
        // (zero opóźnienia), zdalni — na ruch interpolowanej pozycji
        // (próg > ogon interpolacji, który nie domyka się do zera).
        const moving =
          id === this.localId
            ? this.keys.left.isDown || this.keys.right.isDown ||
              this.keys.up.isDown || this.keys.down.isDown
            : Math.hypot(view.tx - view.px, view.ty - view.py) > 1.5;
        const key =
          moving && this.anims.exists(`${view.animPrefix}_walk`)
            ? `${view.animPrefix}_walk`
            : `${view.animPrefix}_idle`;
        if (view.sprite.anims.currentAnim?.key !== key) {
          view.sprite.play(key);
          // Sheety idle/walk mają różne kadrowanie — po przełączeniu
          // wyrównaj widoczną wysokość postaci do wspólnego celu.
          const refH = this.sheetRefH.get(`art_${key}`);
          if (view.animTargetH && refH) {
            view.sprite.setScale(view.animTargetH / refH);
          }
        }
      } else {
        this.animateBob(view, t, p.dashing);
      }
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
    const FEET_Y = 14; // stopy na cieniu (elipsa na y=16)
    let baseY = -6;
    const hasAnims = this.anims.exists("player_idle");
    const staticArt = !hasAnims && this.textures.exists("art_player") && this.groundStatic("art_player");
    const useArt = hasAnims || staticArt;
    const texKey = hasAnims ? "art_player_idle" : staticArt ? "art_player" : `player_${p.charClass}`;
    const shadow = this.add.ellipse(0, 16, 40, 16, 0x000000, 0.4);
    // Postać ma mieć ~100 px wysokości w świecie (pasuje do skali mapy).
    const effH = useArt ? 100 : 54;
    let sprite: Phaser.GameObjects.Sprite;
    let baseScale = 1;
    let top: number;
    if (useArt) {
      // Grafika przycięta do obrysu, zakotwiczona stopami na cieniu.
      sprite = this.add
        .sprite(0, FEET_Y, texKey, hasAnims ? "f0" : "trim")
        .setOrigin(0.5, 1);
      if (hasAnims) sprite.play("player_idle");
      baseScale = effH / (this.sheetRefH.get(texKey) ?? effH);
      sprite.setScale(baseScale);
      baseY = FEET_Y;
      top = FEET_Y - effH;
    } else {
      sprite = this.add.sprite(0, baseY, texKey).setOrigin(0.5, 0.7);
      top = baseY - effH * 0.7;
    }
    // Wskaźnik kierunku tylko dla pixel-artu (malowany sprite ma własną broń).
    const weapon = this.add.triangle(0, -28, 0, 0, -5, 12, 5, 12, 0xf2f2f2).setAlpha(useArt ? 0 : 0.9);
    // Plakietka nad głową: imię wyżej, pod nim smukły pasek HP z obwódką.
    const name = this.add
      .text(0, top - 26, p.name ?? "Gracz", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffe9b0",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setStroke("#141019", 4)
      .setShadow(0, 2, "#000000", 2, true, true);
    const hpBg = this.add
      .rectangle(0, top - 12, 46, 7, 0x10141d, 0.9)
      .setStrokeStyle(1, 0x39435a, 1);
    const hpFill = this.add.rectangle(-22, top - 12, 44, 5, 0x4ad66d).setOrigin(0, 0.5);
    const container = this.add
      .container(p.x, p.y, [shadow, weapon, sprite, hpBg, hpFill, name])
      .setDepth(20);
    container.setData("weapon", weapon);
    const view = this.mkView(container, sprite, hpFill, 44, p.x, p.y, p.hp, baseY, baseScale);
    if (hasAnims) {
      view.animPrefix = "player";
      view.animTargetH = effH;
    }
    return view;
  }

  private createEnemyView(e: any): EntityView {
    const baseY = -10;
    const useArt = this.textures.exists("art_boss");
    const texKey = useArt ? "art_boss" : "boss";
    const shadow = this.add.ellipse(0, 30, 84, 30, 0x000000, 0.45);
    const sprite = this.add.sprite(0, baseY, texKey).setOrigin(0.5, 0.65);
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

  /** Wysokość odniesienia (mediana obrysu klatki) per tekstura sheetu. */
  private sheetRefH = new Map<string, number>();

  /**
   * Wykrywa klatki w poziomym sheecie po kanale alfa: klastry
   * nieprzezroczystych kolumn rozdzielone przezroczystymi przerwami.
   * Zwraca prostokąty klatek w pikselach źródła (przycięte do obrysu),
   * dzięki czemu klatki są wyrównane niezależnie od kadrowania AI.
   */
  private detectFrameBoxes(
    src: HTMLImageElement | HTMLCanvasElement
  ): { x: number; y: number; w: number; h: number }[] {
    const SW = 512;
    const SH = Math.max(1, Math.round((src.height / src.width) * SW));
    const c = document.createElement("canvas");
    c.width = SW;
    c.height = SH;
    const ctx = c.getContext("2d");
    if (!ctx) return [];
    ctx.drawImage(src, 0, 0, SW, SH);
    const data = ctx.getImageData(0, 0, SW, SH).data;

    const colTop = new Array<number>(SW).fill(SH);
    const colBot = new Array<number>(SW).fill(-1);
    for (let x = 0; x < SW; x++) {
      for (let y = 0; y < SH; y++) {
        if (data[(y * SW + x) * 4 + 3] > 16) {
          if (y < colTop[x]) colTop[x] = y;
          if (y > colBot[x]) colBot[x] = y;
        }
      }
    }

    // Zbierz klastry kolumn; przerwa >= 4 px próbki kończy klaster.
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    let start = -1;
    let gap = 0;
    const close = (end: number) => {
      let top = SH;
      let bot = -1;
      for (let i = start; i <= end; i++) {
        if (colTop[i] < top) top = colTop[i];
        if (colBot[i] > bot) bot = colBot[i];
      }
      if (bot > top) boxes.push({ x: start, y: top, w: end - start + 1, h: bot - top + 1 });
      start = -1;
      gap = 0;
    };
    for (let x = 0; x < SW; x++) {
      if (colBot[x] >= 0) {
        if (start < 0) start = x;
        gap = 0;
      } else if (start >= 0 && ++gap >= 4) {
        close(x - gap);
      }
    }
    if (start >= 0) close(SW - 1 - gap);

    const fx = src.width / SW;
    const fy = src.height / SH;
    return boxes
      .filter((b) => b.w > 4 && b.h > 4)
      .map((b) => ({
        x: Math.floor(b.x * fx),
        y: Math.floor(b.y * fy),
        w: Math.ceil(b.w * fx),
        h: Math.ceil(b.h * fy),
      }));
  }

  /**
   * Tnie sheet na klatki wykryte po alfa i rejestruje zapętloną animację.
   * Zapamiętuje medianę wysokości klatek do spójnego skalowania.
   */
  private setupSheetAnim(texKey: string, animKey: string, fps: number): boolean {
    if (!this.textures.exists(texKey) || this.anims.exists(animKey)) {
      return this.anims.exists(animKey);
    }
    const tex = this.textures.get(texKey);
    const boxes = this.detectFrameBoxes(tex.getSourceImage() as HTMLImageElement);
    if (boxes.length < 2 || boxes.length > 12) return false;
    const frameNames: string[] = [];
    boxes.forEach((b, i) => {
      const name = `f${i}`;
      tex.add(name, 0, b.x, b.y, b.w, b.h);
      frameNames.push(name);
    });
    const heights = boxes.map((b) => b.h).sort((a, b) => a - b);
    this.sheetRefH.set(texKey, heights[Math.floor(heights.length / 2)]);
    this.anims.create({
      key: animKey,
      frames: frameNames.map((f) => ({ key: texKey, frame: f })),
      frameRate: fps,
      repeat: -1,
    });
    return true;
  }

  /** Dodaje przyciętą do obrysu klatkę "trim" dla statycznej grafiki. */
  private groundStatic(texKey: string): boolean {
    if (!this.textures.exists(texKey)) return false;
    if (this.sheetRefH.has(texKey)) return true;
    const tex = this.textures.get(texKey);
    const boxes = this.detectFrameBoxes(tex.getSourceImage() as HTMLImageElement);
    if (!boxes.length) return false;
    // Obrys łączny (statyczny obraz to jeden klaster, ale scal na wszelki wypadek).
    const x0 = Math.min(...boxes.map((b) => b.x));
    const y0 = Math.min(...boxes.map((b) => b.y));
    const x1 = Math.max(...boxes.map((b) => b.x + b.w));
    const y1 = Math.max(...boxes.map((b) => b.y + b.h));
    tex.add("trim", 0, x0, y0, x1 - x0, y1 - y0);
    this.sheetRefH.set(texKey, y1 - y0);
    return true;
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
    sprite: Phaser.GameObjects.Sprite,
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

    const FEET_Y = 14;
    this.npcHasAnim = this.anims.exists("npc_idle");
    const staticArt =
      !this.npcHasAnim && this.textures.exists("art_npc") && this.groundStatic("art_npc");
    const useArt = this.npcHasAnim || staticArt;
    const npcTex = this.npcHasAnim ? "art_npc_idle" : staticArt ? "art_npc" : "npc";
    const shadow = this.add.ellipse(0, 16, 40, 16, 0x000000, 0.4);
    // Kupiec w skali gracza (~95 px wysokości), stopy na cieniu.
    const effH = useArt ? 95 : 54;
    let top: number;
    if (useArt) {
      this.npcSprite = this.add
        .sprite(0, FEET_Y, npcTex, this.npcHasAnim ? "f0" : "trim")
        .setOrigin(0.5, 1);
      if (this.npcHasAnim) this.npcSprite.play("npc_idle");
      this.npcBaseScale = effH / (this.sheetRefH.get(npcTex) ?? effH);
      top = FEET_Y - effH;
    } else {
      this.npcSprite = this.add.sprite(0, -6, npcTex).setOrigin(0.5, 0.7);
      this.npcBaseScale = 1;
      top = -6 - effH * 0.7;
    }
    this.npcSprite.setScale(this.npcBaseScale);
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

    // Ozdobny dymek dialogowy nad kupcem (złota ramka + nagłówek z imieniem).
    this.dialogBg = this.add.graphics();
    this.dialogName = this.add
      .text(0, 0, NPC.name, { fontFamily: "monospace", fontSize: "12px", color: "#ffe2a8", fontStyle: "bold" })
      .setOrigin(0, 0.5);
    this.dialogTextObj = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#f2ead6",
        wordWrap: { width: 270 },
        lineSpacing: 5,
      })
      .setOrigin(0, 0);
    this.dialogHint = this.add
      .text(0, 0, "", { fontFamily: "monospace", fontSize: "10px", color: "#c9a86a" })
      .setOrigin(1, 0.5);
    this.dialogBubble = this.add
      .container(NPC.x, NPC.y + top - 6, [this.dialogBg, this.dialogName, this.dialogTextObj, this.dialogHint])
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
    if (!this.npcSprite || this.npcHasAnim) return; // sheet animuje się sam
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

    // Efekt pisania (typewriter) w dymku nad kupcem.
    if (this.dialogLine >= 0) {
      const full = NPC_DIALOG[this.dialogLine];
      if (this.dialogShown < full.length) {
        this.dialogShown = Math.min(full.length, this.dialogShown + (delta / 1000) * 38);
      }
      const done = this.dialogShown >= full.length;
      this.dialogTextObj.setText(full.slice(0, Math.floor(this.dialogShown)));
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

    // Zmierz pełną kwestię, by dymek nie zmieniał rozmiaru podczas pisania.
    const full = NPC_DIALOG[index];
    this.dialogTextObj.setText(full);
    const tw = Math.max(this.dialogTextObj.width, this.dialogName.width + 60);
    const th = this.dialogTextObj.height;
    this.dialogTextObj.setText("");

    const padX = 16;
    const headH = 26;
    const w = tw + padX * 2;
    const h = headH + th + 24;

    const g = this.dialogBg;
    g.clear();
    // Cień pod dymkiem.
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-w / 2 + 3, -h - 14 + 4, w, h, 10);
    // Korpus + złota ramka podwójna.
    g.fillStyle(0x0b0f18, 0.96);
    g.fillRoundedRect(-w / 2, -h - 14, w, h, 10);
    g.lineStyle(2, 0x8a6a3c, 1);
    g.strokeRoundedRect(-w / 2, -h - 14, w, h, 10);
    g.lineStyle(1, 0x54452a, 1);
    g.strokeRoundedRect(-w / 2 + 4, -h - 10, w - 8, h - 8, 7);
    // Pasek nagłówka.
    g.fillStyle(0x1a1626, 0.9);
    g.fillRoundedRect(-w / 2 + 4, -h - 10, w - 8, headH - 6, { tl: 7, tr: 7, bl: 0, br: 0 });
    g.lineStyle(1, 0x54452a, 1);
    g.lineBetween(-w / 2 + 6, -h - 14 + headH, w / 2 - 6, -h - 14 + headH);
    // Dzióbek wskazujący kupca.
    g.fillStyle(0x0b0f18, 0.96);
    g.fillTriangle(-9, -15, 9, -15, 0, -2);
    g.lineStyle(2, 0x8a6a3c, 1);
    g.lineBetween(-9, -14, 0, -2);
    g.lineBetween(9, -14, 0, -2);

    this.dialogName.setPosition(-w / 2 + padX, -h - 14 + headH / 2 - 2);
    this.dialogTextObj.setPosition(-w / 2 + padX, -h - 14 + headH + 6);
    this.dialogHint.setPosition(w / 2 - 10, -22);
    this.dialogBubble.setVisible(true);
  }

  private closeDialog() {
    this.dialogLine = -1;
    this.dialogShown = 0;
    if (this.dialogBubble) this.dialogBubble.setVisible(false);
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

  // ---------- Świat ----------

  private buildGround() {
    // Czyste, kratkowane szare tło (prototypowa siatka).
    const g = this.add.graphics().setDepth(-10);
    const t = TILE_SIZE;
    for (let y = 0; y < MAP.height; y += t) {
      for (let x = 0; x < MAP.width; x += t) {
        const dark = ((x / t) + (y / t)) % 2 === 0;
        g.fillStyle(dark ? 0x2e3138 : 0x34383f, 1);
        g.fillRect(x, y, t, t);
      }
    }
    g.lineStyle(2, 0x454a54, 1);
    g.strokeRect(0, 0, MAP.width, MAP.height);
  }

  private updateCameraAndLight() {
    const view = this.players.get(this.localId);
    if (view) {
      this.cameras.main.startFollow(view.container, true, 0.12, 0.12);
    }
  }
}
