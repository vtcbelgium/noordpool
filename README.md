# noordpool

Een interactieve winterwereld voor een schoolopdracht met **Three.js**. Een besneeuwde werkplaats op 90° noorderbreedte, met warm raamlicht, kerstbomen, een bewegend noorderlicht en een cadeau dat je kunt openen.

## Starten

Installeer [Node.js](https://nodejs.org/) 22.12 of hoger (Node 24 LTS aanbevolen). Open een terminal in deze map:

```sh
npm install
node scripts/serve.mjs
```

Open **http://localhost:5173** in je browser. De ontwikkelserver moet blijven draaien terwijl je de scène gebruikt. De browser moet WebGL 2 ondersteunen en hardwareversnelling ingeschakeld hebben.

## Bediening

| Actie | Bediening |
| --- | --- |
| Rondkijken | Linkermuisknop ingedrukt houden en slepen |
| Zoomen | Scrollwiel, of knijpen met twee vingers op een touchscreen |
| Verschuiven | Rechtermuisknop en slepen, of twee vingers op een touchscreen |
| Cadeau openen/sluiten | Klik op het rode 3D-cadeau, of gebruik de cadeauknop |
| Sneeuw / noorderlicht | Knoppen onderaan |
| Startuitzicht herstellen | Knop met ronde pijl |
| Uitleg / beeldkwaliteit | ‘Hoe werkt het?’ rechtsboven |

## Onderdelen van de opdracht

| Eis | Uitwerking |
| --- | --- |
| Three.js-scène in de browser | PerspectiveCamera en WebGLRenderer, gestart met een kleine lokale Node-server |
| Besneeuwde achtergrond en nachtelijke hemel | Sneeuwlandschap, heuvels, sterren en maan |
| Noordpoolmarker op 90° N | Rood-witte paal met geografische markering |
| Santa’s werkplaats uit primitieve vormen | Houten wanden, dak, ramen, deur, schoorsteen en details opgebouwd uit geometrie |
| Minstens vijf kerstbomen | Meerdere besneeuwde bomen met knipperende gekleurde lampjes |
| Vallende sneeuw als particlesysteem | BufferGeometry met Points; één particlesysteem voor veel sneeuwvlokken |
| Automatische beweging | Bewegend noorderlicht en andere atmosferische animaties |
| OrbitControls | Draaien, zoomen en verschuiven met muis of touch |
| Raycasting en klikbare actie | Raycaster selecteert het cadeau; het deksel opent en licht ontsnapt |
| Prestaties | Gedeelde geometrieën/materialen, instancing, begrensde pixelratio en instelbare beeldkwaliteit |
| Leesbare code | Modules voor de scène, modellen, effecten en interface; toelichtende opmerkingen |

## Structuur

```text
index.html                  Nederlandse interface en toegankelijke knoppen
src/main.js                 Bediening, voorkeuren, uitleg en meldingen
src/style.css               Responsieve vormgeving
src/tokens.css              Kleuren en lettertypen
src/experience/             Three.js-scène, modellen en effecten
public/favicon.svg          Noordster-icoon
scripts/check.mjs           Controle op geldige JavaScript-syntaxis
scripts/serve.mjs           Lokale webserver zonder extra pakketten
scripts/build.mjs           Kopieert de app en de benodigde Three.js-modules naar dist/
```

Alle 3D-modellen worden in code opgebouwd. Er zijn geen gedownloade modellen, afbeeldingsbestanden of externe diensten nodig. Na het installeren van de pakketten werkt de scène lokaal zonder internet.

## Controleren en bouwen

```sh
node scripts/check.mjs
node scripts/build.mjs
node scripts/serve.mjs --preview
```

De productieversie staat in `dist/`; de preview opent op **http://localhost:4173**. Gebruik een webserver om de bestanden te openen: JavaScript-modules werken niet betrouwbaar door op `index.html` te dubbelklikken. De relatieve buildpaden maken ook plaatsing in een submap mogelijk. De build bevat leesbare broncode en alleen de Three.js-modules die nodig zijn. Er is geen bundler of compiler nodig. Na een wijziging aan de code vernieuw je de browserpagina.

De scène mikt op 60 fps op een gewone laptop. Het werkelijke aantal beelden per seconde hangt af van de laptop, browser, schermresolutie en hardwareversnelling. Via ‘Hoe werkt het?’ kun je een lagere beeldkwaliteit kiezen; rechtsonder staat de gemeten fps. ‘Automatisch’ past de kwaliteit aan tijdens het renderen. Animatie wordt beperkt wanneer de pagina op de achtergrond staat; de voorkeur voor minder beweging wordt gerespecteerd.

De weergegeven temperatuur is een sfeerdetail en geen live weerbericht. De bomen en werkplaats zijn een fantasieomgeving voor de opdracht.

## Werkwijze

Sol 6.1 voor de eerste 3D-opbouw; Luna 6 voor de latere afwerking en codecontrole. De repository is een zelfstandig lokaal Git-project met de naam `noordpool`.

## Bronnen

- [Three.js-documentatie](https://threejs.org/docs/)
- [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html)
- [Raycaster](https://threejs.org/docs/pages/Raycaster.html)
- [Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
