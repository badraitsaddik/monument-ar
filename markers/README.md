# Dossier markers/

Ce dossier contient les descripteurs NFT générés pour chaque monument.
Chaque monument nécessite 3 fichiers avec le même préfixe :

  pantheon.fset
  pantheon.fset3
  pantheon.iset

## Comment générer vos marqueurs NFT

### Option A — Outil en ligne (recommandé)
1. Ouvrez https://carnaux.github.io/NFT-Marker-Creator/
2. Uploadez une photo du monument (JPG/PNG, min 800x600px, 300 DPI ideal)
3. Téléchargez les 3 fichiers générés
4. Placez-les dans ce dossier

### Option B — CLI Node.js
npm install -g @ar-js-org/nft-marker-creator
nft-marker-creator -i ../images/pantheon.jpg -o ./pantheon

## Critères pour une bonne image

OK - Texture riche : pierres, sculptures, fenêtres
OK - Bonne lumière, nette, vue frontale
OK - Résolution >= 800x600, idéalement 300 DPI
KO - Reflets, flou, surfaces lisses et uniformes

## Monuments à générer

ID            | Fichiers
pantheon      | pantheon.fset / .fset3 / .iset
notre-dame    | notre-dame.fset / .fset3 / .iset
tour-eiffel   | tour-eiffel.fset / .fset3 / .iset
louvre        | louvre.fset / .fset3 / .iset
sacre-coeur   | sacre-coeur.fset / .fset3 / .iset

Le préfixe correspond au champ "marker" dans monuments.json sans le chemin.
Ex : "marker": "markers/pantheon" -> fichiers pantheon.*
