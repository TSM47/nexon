/**
 * Aetherfall – wspólne stałe i definicje balansu.
 *
 * Jednostki: pozycje/odległości w pikselach świata, prędkości w px/s,
 * czasy w sekundach (o ile nie zaznaczono inaczej). Serwer jest
 * autorytatywny – te wartości muszą być identyczne po obu stronach.
 */

/** Wymiary mapy (pionowy wycinek – jedna arena). */
export const MAP = {
  width: 1600,
  height: 1200,
} as const;

/** Częstotliwość symulacji serwera (Hz) oraz patch rate stanu (ms). */
export const NET = {
  simulationHz: 30,
  patchRateMs: 50,
  /** Jak często klient wysyła stan wejścia (ms). */
  inputSendMs: 50,
} as const;

/** Definicja klasy postaci – na razie kolor/staty wpływające na walkę. */
export interface ClassDef {
  id: string;
  name: string;
  /** Kolor bazowy sylwetki (do prostego pixel-artu / tintu). */
  color: number;
  maxHp: number;
  moveSpeed: number;
}

export const CLASSES: Record<string, ClassDef> = {
  warrior: { id: "warrior", name: "Wojownik", color: 0xc0552d, maxHp: 140, moveSpeed: 205 },
  mage: { id: "mage", name: "Mag", color: 0x3f6fd1, maxHp: 90, moveSpeed: 215 },
  ranger: { id: "ranger", name: "Łowca", color: 0x3aa05a, maxHp: 110, moveSpeed: 230 },
};

export const DEFAULT_CLASS = "ranger";

/** Skill-shot: pocisk lecący w kierunku celowania. */
export const SKILLSHOT = {
  speed: 620,
  damage: 22,
  radius: 9,
  /** Czas życia pocisku (s) zanim zniknie. */
  lifetime: 1.4,
  cooldown: 0.45,
} as const;

/** Unik (dash) – zręcznościowe wyjście ze stref i ataków. */
export const DASH = {
  speed: 720,
  duration: 0.18,
  /** Klatki nietykalności (i-frames) liczone w sekundach. */
  iframes: 0.22,
  cooldown: 1.1,
} as const;

/** Konfiguracja przeciwnika (boss-lite na potrzeby wycinka). */
export const ENEMY = {
  maxHp: 600,
  moveSpeed: 95,
  /** Dystans, na którym przestaje gonić i zaczyna rzucać AoE. */
  preferredRange: 260,
  /** Telegraf AoE – strefa na ziemi. */
  aoe: {
    radius: 150,
    /** Czas narastania ostrzeżenia zanim uderzy (s). */
    windup: 1.3,
    damage: 45,
  },
  /** Odstęp między atakami AoE (s). */
  attackCooldown: 2.4,
  respawnDelay: 3.0,
} as const;

export const PLAYER = {
  respawnDelay: 3.0,
  /** Promień kolizji/trafienia gracza. */
  radius: 16,
} as const;

/** NPC — wędrowny kupiec stojący przy południowym skraju areny. */
export const NPC = {
  name: "Eldric — Wędrowny Kupiec",
  x: 420,
  y: 1000,
  /** Dystans, w którym pojawia się podpowiedź interakcji. */
  interactRadius: 95,
} as const;

/** Kwestie dialogowe kupca (wyświetlane z efektem pisania). */
export const NPC_DIALOG: string[] = [
  "Witaj, wędrowcze! Rzadko ktoś zagląda w te ruiny…",
  "Widzisz ten krąg run? Strażnik Aetheru pilnuje go od wieków. Wielu śmiałków tu poległo.",
  "Dobra rada: gdy ziemia rozbłyśnie czerwienią — uciekaj albo rób unik. Spacja to twój przyjaciel.",
  "Zbieraj łupy, a gdy wrócisz z monetami, pohandlujemy. Wciśnij T, by zerknąć na mój towar.",
];

export type ItemRarity = "common" | "epic" | "legendary";

export interface ShopItem {
  name: string;
  rarity: ItemRarity;
  price: number;
}

/** Towar kupca (podgląd systemu rzadkości; zakupy wchodzą w M5). */
export const NPC_STOCK: ShopItem[] = [
  { name: "Mikstura Życia", rarity: "common", price: 35 },
  { name: "Miecz Strażnika", rarity: "common", price: 120 },
  { name: "Płaszcz Cienia", rarity: "epic", price: 950 },
  { name: "Łuk Pierwszego Świtu", rarity: "legendary", price: 4200 },
];

/** Komunikaty klient → serwer. */
export const MSG = {
  input: "input",
  dash: "dash",
  skillshot: "skillshot",
  setClass: "setClass",
} as const;

/** Ładunek wejścia ruchu/celowania wysyłany przez klienta. */
export interface InputMessage {
  /** Wektor ruchu, każda składowa w [-1,1]. */
  mx: number;
  my: number;
  /** Wektor celowania (znormalizowany kierunek). */
  ax: number;
  ay: number;
}

export interface SkillshotMessage {
  ax: number;
  ay: number;
}
