import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("string") charClass = "ranger";
  @type("number") x = 0;
  @type("number") y = 0;
  /** Kierunek celowania – do orientacji sylwetki po stronie klienta. */
  @type("number") aimX = 1;
  @type("number") aimY = 0;
  @type("number") hp = 100;
  @type("number") maxHp = 100;
  @type("boolean") dashing = false;
  @type("boolean") invulnerable = false;
  @type("boolean") alive = true;
}

export class Enemy extends Schema {
  @type("string") id = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") hp = 1;
  @type("number") maxHp = 1;
  /** idle | chase | telegraph | dead */
  @type("string") state = "idle";
}

export class Projectile extends Schema {
  @type("string") id = "";
  @type("string") owner = "";
  @type("number") x = 0;
  @type("number") y = 0;
}

/** Strefa ostrzegawcza AoE rysowana na ziemi (telegraf bossa). */
export class Telegraph extends Schema {
  @type("string") id = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") radius = 0;
  /** 0..1 – stopień wypełnienia ostrzeżenia (1 = uderzenie). */
  @type("number") progress = 0;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Enemy }) enemies = new MapSchema<Enemy>();
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
  @type({ map: Telegraph }) telegraphs = new MapSchema<Telegraph>();
}
