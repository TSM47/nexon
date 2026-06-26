# Aetherfall ⚔️

Nowoczesne MMORPG 2D z widokiem z góry (top-down), inspirowane *Margonem*, ale z
**dynamiczną walką akcji** w czasie rzeczywistym zamiast walki turowej.

Ten katalog zawiera **grywalny pionowy wycinek (M1)**: jedna postać porusza się po
arenie, walczy skill-shotami, robi unik z klatkami nietykalności i unika
telegrafowanego AoE bossa. Architektura (Phaser 3 + Colyseus, serwer autorytatywny)
jest od początku przygotowana pod multiplayer.

> Projekt jest całkowicie niezależny od aplikacji Nexon znajdującej się w tym repo.

## Stos technologiczny
- **Klient:** Phaser 3 + TypeScript (Vite)
- **Serwer:** Colyseus (Node 22 + TypeScript), symulacja autorytatywna
- **Wspólne:** pakiet `@aetherfall/shared` (stałe balansu, typy komunikatów)

## Struktura
```
game/
├── shared/   # stałe i typy współdzielone (jedno źródło prawdy)
├── server/   # autorytatywny serwer Colyseus (pokój walki)
├── client/   # klient Phaser 3
└── docs/GDD.md
```

## Uruchomienie
```bash
cd game
npm install
npm run dev      # uruchamia serwer (ws://localhost:2567) i klienta (http://localhost:5173)
```
Następnie otwórz http://localhost:5173.

Można też osobno:
```bash
npm run dev:server
npm run dev:client
```

## Sterowanie
| Akcja        | Klawisz / mysz   |
|--------------|------------------|
| Ruch         | W / S / A / D    |
| Celowanie    | Ruch myszy       |
| Skill-shot   | Lewy przycisk    |
| Unik (dash)  | Spacja           |

Adres serwera można nadpisać zmienną `VITE_SERVER_URL`.

## Co dalej
Kolejne kamienie milowe (multiplayer, ekwipunek/rzadkości, świat, ekonomia)
opisane są w [`docs/GDD.md`](docs/GDD.md).
