import { Room, Client } from "@colyseus/core";
import {
  MAP,
  NET,
  CLASSES,
  DEFAULT_CLASS,
  SKILLSHOT,
  DASH,
  ENEMY,
  ENEMY_DAMAGE_ENABLED,
  PLAYER,
  MSG,
  type InputMessage,
  type SkillshotMessage,
} from "@aetherfall/shared";
import { GameState, Player, Enemy, Projectile, Telegraph } from "../schema/GameState.js";

/** Stan ruchu/celowania i cooldowny per klient – nie jest synchronizowany. */
interface ClientRuntime {
  mx: number;
  my: number;
  ax: number;
  ay: number;
  skillCd: number;
  dashCd: number;
  dashTime: number; // pozostały czas trwania dasha
  iframeTime: number; // pozostałe i-frames
  dashDirX: number;
  dashDirY: number;
  respawnTimer: number;
}

interface ProjectileRuntime {
  vx: number;
  vy: number;
  life: number;
}

interface EnemyRuntime {
  attackCd: number;
  respawnTimer: number;
  telegraphId: string | null;
}

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${(idCounter++).toString(36)}`;

function len(x: number, y: number) {
  return Math.sqrt(x * x + y * y);
}

export class CombatRoom extends Room<GameState> {
  maxClients = 16;

  private runtime = new Map<string, ClientRuntime>();
  private projRuntime = new Map<string, ProjectileRuntime>();
  private enemyRuntime = new Map<string, EnemyRuntime>();

  onCreate() {
    this.setState(new GameState());
    this.setPatchRate(NET.patchRateMs);
    // Większy zapas na dołączenie (wolne sieci / urządzenia) niż domyślne 8 s.
    this.setSeatReservationTime(40);

    this.spawnEnemy();

    this.onMessage(MSG.input, (client, data: InputMessage) => {
      const rt = this.runtime.get(client.sessionId);
      const p = this.state.players.get(client.sessionId);
      if (!rt || !p || !p.alive) return;
      rt.mx = clamp(data.mx, -1, 1);
      rt.my = clamp(data.my, -1, 1);
      const al = len(data.ax, data.ay);
      if (al > 0.001) {
        rt.ax = data.ax / al;
        rt.ay = data.ay / al;
        p.aimX = rt.ax;
        p.aimY = rt.ay;
      }
    });

    this.onMessage(MSG.skillshot, (client, data: SkillshotMessage) => {
      const rt = this.runtime.get(client.sessionId);
      const p = this.state.players.get(client.sessionId);
      if (!rt || !p || !p.alive || rt.skillCd > 0) return;
      const l = len(data.ax, data.ay);
      if (l < 0.001) return;
      rt.skillCd = SKILLSHOT.cooldown;
      const dx = data.ax / l;
      const dy = data.ay / l;
      const proj = new Projectile();
      proj.id = nextId("proj");
      proj.owner = client.sessionId;
      proj.x = p.x + dx * (PLAYER.radius + 6);
      proj.y = p.y + dy * (PLAYER.radius + 6);
      this.state.projectiles.set(proj.id, proj);
      this.projRuntime.set(proj.id, {
        vx: dx * SKILLSHOT.speed,
        vy: dy * SKILLSHOT.speed,
        life: SKILLSHOT.lifetime,
      });
    });

    this.onMessage(MSG.dash, (client) => {
      const rt = this.runtime.get(client.sessionId);
      const p = this.state.players.get(client.sessionId);
      if (!rt || !p || !p.alive || rt.dashCd > 0) return;
      // Kierunek dasha: ruch jeśli jest, inaczej celowanie.
      let dx = rt.mx;
      let dy = rt.my;
      if (len(dx, dy) < 0.001) {
        dx = rt.ax;
        dy = rt.ay;
      }
      const l = len(dx, dy) || 1;
      rt.dashDirX = dx / l;
      rt.dashDirY = dy / l;
      rt.dashCd = DASH.cooldown;
      rt.dashTime = DASH.duration;
      rt.iframeTime = DASH.iframes;
    });

    this.onMessage(MSG.setClass, (client, classId: string) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !CLASSES[classId]) return;
      const def = CLASSES[classId];
      p.charClass = def.id;
      p.maxHp = def.maxHp;
      p.hp = def.maxHp;
    });

    this.setSimulationInterval((dt) => this.update(dt / 1000), 1000 / NET.simulationHz);
  }

  onJoin(client: Client, options: { name?: string; charClass?: string } = {}) {
    const def = CLASSES[options.charClass ?? ""] ?? CLASSES[DEFAULT_CLASS];
    const p = new Player();
    p.id = client.sessionId;
    p.name = (options.name ?? "Gracz").slice(0, 16);
    p.charClass = def.id;
    p.maxHp = def.maxHp;
    p.hp = def.maxHp;
    const spawn = this.spawnPoint();
    p.x = spawn.x;
    p.y = spawn.y;
    this.state.players.set(client.sessionId, p);
    this.runtime.set(client.sessionId, {
      mx: 0, my: 0, ax: 1, ay: 0,
      skillCd: 0, dashCd: 0, dashTime: 0, iframeTime: 0,
      dashDirX: 0, dashDirY: 0, respawnTimer: 0,
    });
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.runtime.delete(client.sessionId);
  }

  // ---- Symulacja ----

  private update(dt: number) {
    this.updatePlayers(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
  }

  private updatePlayers(dt: number) {
    this.state.players.forEach((p, sid) => {
      const rt = this.runtime.get(sid);
      if (!rt) return;

      rt.skillCd = Math.max(0, rt.skillCd - dt);
      rt.dashCd = Math.max(0, rt.dashCd - dt);

      if (!p.alive) {
        rt.respawnTimer -= dt;
        if (rt.respawnTimer <= 0) {
          const sp = this.spawnPoint();
          p.x = sp.x;
          p.y = sp.y;
          p.hp = p.maxHp;
          p.alive = true;
        }
        return;
      }

      // i-frames / dash
      if (rt.iframeTime > 0) rt.iframeTime -= dt;
      p.invulnerable = rt.iframeTime > 0;

      let speed = CLASSES[p.charClass]?.moveSpeed ?? 200;
      let dx: number;
      let dy: number;
      if (rt.dashTime > 0) {
        rt.dashTime -= dt;
        p.dashing = true;
        speed = DASH.speed;
        dx = rt.dashDirX;
        dy = rt.dashDirY;
      } else {
        p.dashing = false;
        const ml = len(rt.mx, rt.my);
        dx = ml > 0.001 ? rt.mx / ml : 0;
        dy = ml > 0.001 ? rt.my / ml : 0;
      }

      p.x = clamp(p.x + dx * speed * dt, PLAYER.radius, MAP.width - PLAYER.radius);
      p.y = clamp(p.y + dy * speed * dt, PLAYER.radius, MAP.height - PLAYER.radius);
    });
  }

  private updateProjectiles(dt: number) {
    this.state.projectiles.forEach((proj, id) => {
      const prt = this.projRuntime.get(id);
      if (!prt) {
        this.removeProjectile(id);
        return;
      }
      proj.x += prt.vx * dt;
      proj.y += prt.vy * dt;
      prt.life -= dt;

      const out =
        proj.x < 0 || proj.x > MAP.width || proj.y < 0 || proj.y > MAP.height;
      if (prt.life <= 0 || out) {
        this.removeProjectile(id);
        return;
      }

      // Kolizja z przeciwnikami.
      let hit = false;
      this.state.enemies.forEach((enemy) => {
        if (hit || enemy.state === "dead") return;
        const d = len(proj.x - enemy.x, proj.y - enemy.y);
        if (d <= SKILLSHOT.radius + 28) {
          enemy.hp = Math.max(0, enemy.hp - SKILLSHOT.damage);
          hit = true;
        }
      });
      if (hit) this.removeProjectile(id);
    });
  }

  private updateEnemies(dt: number) {
    this.state.enemies.forEach((enemy, id) => {
      const ert = this.enemyRuntime.get(id);
      if (!ert) return;

      if (enemy.hp <= 0 && enemy.state !== "dead") {
        enemy.state = "dead";
        ert.respawnTimer = ENEMY.respawnDelay;
        if (ert.telegraphId) {
          this.state.telegraphs.delete(ert.telegraphId);
          ert.telegraphId = null;
        }
      }

      if (enemy.state === "dead") {
        ert.respawnTimer -= dt;
        if (ert.respawnTimer <= 0) {
          enemy.hp = enemy.maxHp;
          enemy.x = MAP.width / 2;
          enemy.y = MAP.height / 2;
          enemy.state = "idle";
          ert.attackCd = ENEMY.attackCooldown;
        }
        return;
      }

      const target = this.nearestAlivePlayer(enemy.x, enemy.y);
      ert.attackCd -= dt;

      // Obsługa aktywnego telegrafu AoE.
      if (ert.telegraphId) {
        const tg = this.state.telegraphs.get(ert.telegraphId);
        if (tg) {
          tg.progress = Math.min(1, tg.progress + dt / ENEMY.aoe.windup);
          enemy.state = "telegraph";
          if (tg.progress >= 1) {
            this.resolveAoe(tg);
            this.state.telegraphs.delete(ert.telegraphId);
            ert.telegraphId = null;
            ert.attackCd = ENEMY.attackCooldown;
            enemy.state = "idle";
          }
          return; // podczas rzucania boss stoi w miejscu
        }
        ert.telegraphId = null;
      }

      if (!target) {
        enemy.state = "idle";
        return;
      }

      const dist = len(target.x - enemy.x, target.y - enemy.y);

      // Ruch: zbliż się do preferowanego dystansu.
      if (dist > ENEMY.preferredRange) {
        const ux = (target.x - enemy.x) / dist;
        const uy = (target.y - enemy.y) / dist;
        enemy.x += ux * ENEMY.moveSpeed * dt;
        enemy.y += uy * ENEMY.moveSpeed * dt;
        enemy.state = "chase";
      } else {
        enemy.state = "idle";
      }

      // Rozpocznij telegraf AoE pod celem.
      if (ert.attackCd <= 0) {
        const tg = new Telegraph();
        tg.id = nextId("tg");
        tg.x = target.x;
        tg.y = target.y;
        tg.radius = ENEMY.aoe.radius;
        tg.progress = 0;
        this.state.telegraphs.set(tg.id, tg);
        ert.telegraphId = tg.id;
      }
    });
  }

  private resolveAoe(tg: Telegraph) {
    if (!ENEMY_DAMAGE_ENABLED) return; // tryb treningowy — bez obrażeń
    this.state.players.forEach((p, sid) => {
      if (!p.alive) return;
      const rt = this.runtime.get(sid);
      if (rt && rt.iframeTime > 0) return; // unik z i-frames neguje trafienie
      const d = len(p.x - tg.x, p.y - tg.y);
      if (d <= tg.radius) {
        p.hp = Math.max(0, p.hp - ENEMY.aoe.damage);
        if (p.hp <= 0) {
          p.alive = false;
          p.dashing = false;
          p.invulnerable = false;
          if (rt) rt.respawnTimer = PLAYER.respawnDelay;
        }
      }
    });
  }

  // ---- Pomocnicze ----

  private removeProjectile(id: string) {
    this.state.projectiles.delete(id);
    this.projRuntime.delete(id);
  }

  private spawnEnemy() {
    const enemy = new Enemy();
    enemy.id = nextId("enemy");
    enemy.x = MAP.width / 2;
    enemy.y = MAP.height / 2;
    enemy.maxHp = ENEMY.maxHp;
    enemy.hp = ENEMY.maxHp;
    enemy.state = "idle";
    this.state.enemies.set(enemy.id, enemy);
    this.enemyRuntime.set(enemy.id, {
      attackCd: ENEMY.attackCooldown,
      respawnTimer: 0,
      telegraphId: null,
    });
  }

  private nearestAlivePlayer(x: number, y: number): Player | null {
    let best: Player | null = null;
    let bestD = Infinity;
    this.state.players.forEach((p) => {
      if (!p.alive) return;
      const d = len(p.x - x, p.y - y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    });
    return best;
  }

  private spawnPoint() {
    // Krawędziowe punkty startu, by gracz nie pojawiał się na bossie.
    const margin = 120;
    return {
      x: margin + Math.random() * (MAP.width - margin * 2),
      y: MAP.height - margin - Math.random() * 120,
    };
  }
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}
