#!/usr/bin/env bash
# Pobiera pixel-artowe assety w klimacie średniowiecznym (wygenerowane w Higgsfield).
# Uruchom na SWOIM komputerze z katalogu game/:  bash scripts/fetch-assets.sh
# Po pobraniu gra automatycznie użyje tej grafiki zamiast proceduralnego pixel-artu.
set -euo pipefail

DEST="$(cd "$(dirname "$0")/.." && pwd)/client/public/assets"
mkdir -p "$DEST"

CDN="https://d8j0ntlcm91z4.cloudfront.net/user_3FePjzyeygLCeb8PzJWUZtYZaoj"

declare -A ASSETS=(
  # Bohater: człowiek-łowca w zieleni (styl dopasowany do mapy, wycięte tło)
  [player.png]="$CDN/hf_20260708_225028_26a383f7-5325-41ec-8e47-7cfd53b091d4.png"
  # NPC: stary kupiec w słomkowym kapeluszu (styl dopasowany do mapy, wycięte tło)
  [npc.png]="$CDN/hf_20260708_225030_638a68cb-5140-4853-b8b7-214bd43f23ae.png"
  # Boss: rycerz-strażnik w karmazynowej zbroi (styl dopasowany do mapy, wycięte tło)
  [boss.png]="$CDN/hf_20260708_225426_977ce859-ceb9-4c1c-a0da-1750a1a2910a.png"
  # Animacje (sheety: 4 klatki w poziomym rzędzie, wycięte tło)
  [player_idle.png]="$CDN/hf_20260708_231938_5c19eb9d-9fec-477a-991e-b3e0cb989cfa.png"
  [player_walk.png]="$CDN/hf_20260708_234251_b64ebfd9-10aa-466d-8ddd-75cb5b7bb420.png"
  [npc_idle.png]="$CDN/hf_20260708_231944_143bb775-1508-4ea4-9dae-af33ee3e62fa.png"
  # Ikony przedmiotów sklepu/ekwipunku (kwadratowe, z własną ramką)
  [item_potion.png]="$CDN/hf_20260708_235635_58d04b95-a13e-4d88-836e-278de157a368.png"
  [item_sword.png]="$CDN/hf_20260708_235637_661e89d6-8d9b-4793-8907-315b3c095017.png"
  [item_cloak.png]="$CDN/hf_20260708_235654_67134719-a71d-481a-8020-7264035cf54d.png"
  [item_bow.png]="$CDN/hf_20260708_235657_b302898c-bf56-4b35-91dd-98ab6fbedc09.png"
  [item_helm.png]="$CDN/hf_20260709_001124_faf5e246-72ff-423c-bce3-30879f029d60.png"
  [item_pants.png]="$CDN/hf_20260709_001126_d87bf627-2c5f-4f54-ae58-b5001c900265.png"
  [item_boots.png]="$CDN/hf_20260709_001135_66cde00b-c8a9-43ae-9577-eb9f65b99131.png"
  [item_gloves.png]="$CDN/hf_20260709_001138_33023807-4880-41bf-9a64-9516f52e3321.png"
  [item_shield.png]="$CDN/hf_20260709_001147_4143616f-2f78-47da-bce5-1e09bb59330c.png"
  [item_arrows.png]="$CDN/hf_20260709_001151_87a19d08-9dd9-43d8-9f5a-33b417a2577d.png"
  [item_amulet.png]="$CDN/hf_20260709_001200_4394e066-543d-43c0-a4ac-2712d43e08d8.png"
  [item_rune.png]="$CDN/hf_20260709_001202_2029d95a-ebcd-4f62-9ad7-8c53e7251b0b.png"
  # Portret Eldrica do okna dialogowego
  [npc_portrait.png]="$CDN/hf_20260708_235708_152ad3b9-c31e-463f-b246-10c0a3e5ebce.png"
  # Tekstury UI (rustykalne średniowieczne: dąb, kute żelazo, skóra)
  [ui_slot.png]="$CDN/hf_20260709_002840_4e31d458-b90e-4b26-a4e5-8fb887571990.png"
  [ui_panel.png]="$CDN/hf_20260709_002838_1376ba99-91c6-4198-ae11-7e3386326316.png"
  [ui_hpframe.png]="$CDN/hf_20260709_002853_018a031f-c354-492b-8a07-94867fc66c42.png"
  # Waluty i plakietka poziomu (wycięte tło)
  [ui_coin.png]="$CDN/hf_20260709_002958_477d2d39-c5b8-403d-a465-1d7921c2f73f.png"
  [ui_gem.png]="$CDN/hf_20260709_003001_012f6a65-b38c-49f5-a6a3-b4cc3dc5fd72.png"
  [ui_levelbadge.png]="$CDN/hf_20260709_003003_43b5a27d-58ce-42d9-9415-bee9b817efca.png"
  # Ikony 5 spelli (kwadratowe, z własną ramką)
  [spell1.png]="$CDN/hf_20260708_231351_9d89313a-cd38-46bc-b655-e631c393c100.png"
  [spell2.png]="$CDN/hf_20260708_231400_cd2e8734-b7d5-4a5e-becd-766a781c2e87.png"
  [spell3.png]="$CDN/hf_20260708_231404_62c19de0-1d56-44ff-9a6e-2d0e7fb5d6ce.png"
  [spell4.png]="$CDN/hf_20260708_231414_f41541d2-cc33-4787-9890-3aa532958549.png"
  [spell5.png]="$CDN/hf_20260708_231416_33a7e6f8-55c1-48ff-a529-6de2e82c8fd8.png"
)

for name in "${!ASSETS[@]}"; do
  echo "Pobieram $name ..."
  curl -fSL --retry 3 -o "$DEST/$name" "${ASSETS[$name]}"
done

echo "Gotowe. Assety w: $DEST"
echo "Uruchom 'npm run dev' i odśwież http://localhost:5173 (Cmd+Shift+R)."
