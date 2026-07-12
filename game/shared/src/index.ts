/**
 * Aetherfall – wspólne stałe i definicje balansu.
 *
 * Jednostki: pozycje/odległości w pikselach świata, prędkości w px/s,
 * czasy w sekundach (o ile nie zaznaczono inaczej). Serwer jest
 * autorytatywny – te wartości muszą być identyczne po obu stronach.
 */

/** Wymiary świata (duża łąka z lasami, ścieżkami i jeziorem). */
export const MAP = {
  width: 2400,
  height: 1800,
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
  maxMp: number;
  moveSpeed: number;
}

export const CLASSES: Record<string, ClassDef> = {
  warrior: { id: "warrior", name: "Wojownik", color: 0xc0552d, maxHp: 140, maxMp: 60, moveSpeed: 205 },
  mage: { id: "mage", name: "Mag", color: 0x3f6fd1, maxHp: 90, maxMp: 140, moveSpeed: 215 },
  ranger: { id: "ranger", name: "Łowca", color: 0x3aa05a, maxHp: 110, maxMp: 90, moveSpeed: 230 },
};

/** Mana: koszt skill-shota i pasywna regeneracja. */
export const MANA = {
  skillshotCost: 12,
  regenPerSec: 6,
} as const;

/** Doświadczenie: baza progu, wzrost progu i XP za strzał (trening). */
export const XP = {
  base: 100,
  growth: 1.25,
  perShot: 2,
} as const;

/** Waluta premium — Smocze Monety. */
export const START_GEMS = 5;

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

/**
 * Tymczasowo: przeciwnicy nie zadają obrażeń (tryb treningowy).
 * Telegrafy AoE dalej się rysują, żeby ćwiczyć uniki.
 */
export const ENEMY_DAMAGE_ENABLED = false;

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

/** NPC — Eldric Ashford, właściciel karczmy przy skraju łąki. */
export const NPC = {
  name: "Eldric Ashford",
  title: "Właściciel karczmy",
  x: 420,
  y: 1000,
  /** Dystans, w którym pojawia się podpowiedź interakcji. */
  interactRadius: 95,
} as const;

export type ItemRarity = "common" | "epic" | "legendary";

/** Typ przedmiotu — do którego rodzaju slotu pasuje. */
export type ItemSlot =
  | "helm"
  | "chest"
  | "pants"
  | "boots"
  | "gloves"
  | "neck"
  | "mainhand"
  | "offhand"
  | "rune"
  | "potion";

/** Konkretne sloty założonego ekwipunku na postaci. */
export const EQUIP_SLOTS = [
  "helm",
  "chest",
  "pants",
  "boots",
  "gloves",
  "neck1",
  "neck2",
  "mainhand",
  "offhand",
  "rune1",
  "rune2",
  "rune3",
  "rune4",
] as const;
export type EquipSlotId = (typeof EQUIP_SLOTS)[number];

export interface ItemDef {
  id: string;
  name: string;
  rarity: ItemRarity;
  price: number;
  slot: ItemSlot;
  /** Bonus obrażeń skill-shota. */
  dmg?: number;
  /** Bonus maks. HP. */
  hp?: number;
  /** Ilość leczenia (mikstura, jednorazowa). */
  heal?: number;
}

/** Katalog przedmiotów (jedno źródło prawdy dla serwera i klienta). */
export const ITEMS: Record<string, ItemDef> = {
  potion: { id: "potion", name: "Mikstura Życia", rarity: "common", price: 35, slot: "potion", heal: 60 },
  sword: { id: "sword", name: "Miecz Strażnika", rarity: "common", price: 120, slot: "mainhand", dmg: 8 },
  bow: { id: "bow", name: "Łuk Pierwszego Świtu", rarity: "legendary", price: 4200, slot: "mainhand", dmg: 25 },
  cloak: { id: "cloak", name: "Płaszcz Cienia", rarity: "epic", price: 950, slot: "chest", hp: 40 },
  helm: { id: "helm", name: "Hełm Strażnika", rarity: "common", price: 90, slot: "helm", hp: 15 },
  pants: { id: "pants", name: "Nogawice Podróżnika", rarity: "common", price: 85, slot: "pants", hp: 12 },
  boots: { id: "boots", name: "Buty Zwiadowcy", rarity: "common", price: 70, slot: "boots", hp: 10 },
  gloves: { id: "gloves", name: "Rękawice Łucznika", rarity: "common", price: 80, slot: "gloves", dmg: 3 },
  shield: { id: "shield", name: "Tarcza Dębowa", rarity: "common", price: 200, slot: "offhand", hp: 25 },
  arrows: { id: "arrows", name: "Kołczan Celności", rarity: "epic", price: 450, slot: "offhand", dmg: 6 },
  amulet: { id: "amulet", name: "Amulet Życia", rarity: "epic", price: 300, slot: "neck", hp: 20 },
  rune: { id: "rune", name: "Runa Mocy", rarity: "epic", price: 250, slot: "rune", dmg: 4 },
};

/** Towar w sklepie Eldrica (id z katalogu ITEMS). */
export const SHOP_STOCK: string[] = [
  "potion",
  "sword",
  "helm",
  "pants",
  "boots",
  "gloves",
  "shield",
  "amulet",
  "rune",
  "arrows",
  "cloak",
  "bow",
];

export const START_GOLD = 600;
export const INVENTORY_CAP = 24;
/** Sprzedaż przedmiotu handlarzowi: ułamek ceny zakupu. */
export const SELL_RATIO = 0.5;

/** Komunikaty klient → serwer. */
export const MSG = {
  input: "input",
  dash: "dash",
  skillshot: "skillshot",
  setClass: "setClass",
  /** Kup przedmiot (payload: id z ITEMS). */
  buy: "buy",
  /** Sprzedaj przedmiot handlarzowi (payload: id z ITEMS). */
  sell: "sell",
  /** Załóż/zdejmij przedmiot lub użyj mikstury (payload: id z ITEMS). */
  equipToggle: "equipToggle",
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
