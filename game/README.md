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

## Malowana grafika AI (opcjonalnie)
Domyślnie gra używa spójnego pixel-artu generowanego w kodzie. Możesz włączyć
**malowane assety** (wygenerowane w Higgsfield, styl Eastward/Ravendawn):
```bash
cd game
bash scripts/fetch-assets.sh   # pobiera postać, bossa i tło areny do client/public/assets/
npm run dev                    # odśwież przeglądarkę (Ctrl+Shift+R)
```
Jeśli pliki w `client/public/assets/` istnieją, klient automatycznie użyje grafiki
malowanej; w innym wypadku spada do pixel-artu — gra działa w obu przypadkach.

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
