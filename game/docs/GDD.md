# Aetherfall — Game Design Document (zarys)

> MMORPG 2D z widokiem z góry (top-down), inspirowane *Margonem*, ale w nowoczesnym
> wydaniu: piękniejsza grafika i dynamiczna walka akcji zamiast walki turowej.
> Ten dokument prowadzi implementację; pierwszy etap to **grywalny pionowy wycinek**.

## 1. Filar projektu (pillars)
1. **Walka jako rzemiosło** — w czasie rzeczywistym, oparta na celności i pozycjonowaniu (skill-shoty, uniki, telegrafowane AoE), a nie na statystykach klikanych w turach.
2. **Żywy, klimatyczny świat** — regiony o własnej tożsamości, dynamiczne światło i pogoda, otoczenie reagujące na gracza.
3. **Postęp, który widać** — zmiana wyglądu postaci wraz z ekwipunkiem, rzadkości przedmiotów, drzewka umiejętności.
4. **Ekonomia napędzana przez graczy** — handel, dom aukcyjny, rzemiosło.

## 2. Grafika i kamera
- Widok top-down, kamera podążająca za postacią z lekkim wygładzeniem.
- Styl docelowy: szczegółowy, nowoczesny pixel-art lub grafika rysowana ręcznie (referencje: *Eastward*, *Ravendawn*).
- Dynamiczne oświetlenie (źródła światła, dzień/noc), efekty pogodowe (deszcz, mgła), płynne animacje (bazowy szkielet + warstwy ekwipunku).
- W wycinku reprezentowane prymitywami + glow/światło wokół gracza + cząsteczki pogody (placeholder pod docelowe assety).

## 3. System walki (główny upgrade vs Margonem)
- **Czas rzeczywisty, serwer autorytatywny.** Klient wysyła intencje (ruch, celowanie, akcje); serwer symuluje i rozsyła stan.
- **Skill-shoty** — umiejętności celowane kierunkowo (pociski), mogą chybić.
- **Unik (dash)** — krótki zryw z klatkami nietykalności (i-frames) na wyjście ze strefy zagrożenia.
- **Telegrafowane AoE** — bossowie zaznaczają strefy na ziemi z paskiem narastania; gracz ma okno na ucieczkę/unik.
- Dalej: combosy, zasoby (mana/wytrzymałość), kontrola tłumu, aggro/threat, mechaniki bossów (fazy).

## 4. Świat gry
- Otwarty świat z regionów połączonych przejściami; miasta (huby) i lochy (dungeony) instancjonowane.
- Interaktywne otoczenie: zbieranie surowców (ruda, zioła, drewno), rzemiosło, węzły odradzające się w czasie.
- Wycinek: pojedyncza arena z jednym bossem-lite („Strażnik Aetheru").

## 5. Systemy RPG
- **Klasy**: Wojownik, Mag, Łowca (start) — różnią się HP, prędkością, zestawem umiejętności.
- **Drzewka umiejętności**: aktywne + pasywne, punkty zdobywane z poziomami.
- **Rzadkość przedmiotów**: Common → Epic → Legendary (sufiksy/afiksy, skalowanie statystyk).
- **Widoczny ekwipunek**: założona broń/zbroja zmienia warstwy sprite'a postaci.
- **Ekonomia**: handel gracz↔gracz, dom aukcyjny, waluta, sink'i ekonomiczne (naprawy, opłaty AH).

## 6. Architektura techniczna
- **Klient**: Phaser 3 + TypeScript (Vite). Renderowanie, wejście, interpolacja stanu.
- **Serwer**: Colyseus (Node + TypeScript) — autorytatywne pokoje, schema synchronizowana automatycznie.
- **Wspólne**: pakiet `@aetherfall/shared` ze stałymi balansu i typami komunikatów (jedno źródło prawdy).
- **Symulacja**: stały tick (30 Hz), patch stanu co 50 ms, klient interpoluje pozycje.
- Docelowo: warstwa trwałości (PostgreSQL), uwierzytelnianie, matchmaking/przejścia między mapami, anty-cheat po stronie serwera.

## 7. Plan działania (kamienie milowe)
- **M1 — Pionowy wycinek walki (ten etap):** ruch top-down, skill-shot, unik z i-frames, boss z telegrafowanym AoE, HP/śmierć/respawn, podstawowe oświetlenie/pogoda. ✅ zakres tego repo.
- **M2 — Multiplayer w praktyce:** wielu graczy na wspólnej mapie, interpolacja/rekonsyliacja, lista graczy.
- **M3 — Postać i ekwipunek:** klasy z unikalnymi umiejętnościami, ekwipunek, rzadkości, widoczne zmiany wyglądu.
- **M4 — Świat:** wiele regionów, przejścia, miasta, zbieranie surowców + rzemiosło.
- **M5 — Ekonomia i trwałość:** konta, zapis postępu, handel, dom aukcyjny.
- **M6 — Treść i polish:** lochy, mechaniki bossów, questy, docelowe assety graficzne, audio.

## 8. Ryzyka
- Skalowanie symulacji autorytatywnej (liczba bytów na pokój) — wymaga interest management / sharding map.
- Opóźnienia sieciowe vs „uczciwość" trafień skill-shotów — potrzebna rekonsyliacja i ewentualnie lag compensation.
- Koszt produkcji assetów (ręcznie rysowana grafika + animacje warstwowe) — największy pożeracz czasu w MMO.
