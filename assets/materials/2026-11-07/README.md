# Materialmasters • fem kildebaserte sett

07.11.2026, Europe/Oslo. Fem materialer eksportert. Gummi er nå sporet til sin ekte oppstrøms renderer og eksportert uten erstatningsmateriale. Se særskilt kantavvik nedenfor. Ingen repo-, kort- eller Figmaendringer. Ingen OLED-/runtime-PASS.

## Filer
Rot: `/workspace/design/handoff/materialer-2026-11-07/`

For hver av `gummi/`, `skifer/`, `kull/`, `emalje/`, `floyel/`:
- `base.png`: ren rektangulær albedo, uten maske, lys, bakgrunn, skygge, UI eller tall.
- `shade-multiply.png`: separat RGB-lyskart, blend **multiply**.
- `light-screen.png`: separat RGB-lyskart, blend **screen**.

Alle PNG: 1200×1200, RGB 8 bit, innebygd sRGB ICC. Bevisst beholdt native oppløsning, ikke resamplet til power-of-two. Lyskartene er opake rektangulære operatører, ikke alfa-PNG eller selvstendige bilder. De inneholder formavhengig lysinformasjon, men ingen klippemaske/drop shadow; må klippes eksternt. Ingen silhuett er bakt inn i basene.

Andre filer: `kontaktark-materialer.jpg`, `parameters-and-drift.json` (alle faktiske parametre og målinger), `source-sha256.json`, `export.py` og `export-gummi.py` (lokal eksport; kjør i denne rekkefølgen).

## Eksakt kildebruk
`/workspace/design/onboarding/klumpen-a-bli-kjent-2026-11-07/_src/build.py` linje 85–125 og `/workspace/design/icon/v3-2026-11-03/material.py`.

Albedo og lysfelt er hentet direkte fra den uendrede rendererens mellomresultater; ikke beskåret fra komposittbildene. `local_mask(240, materiale, 'rest')`, 1200 px artboard, `raised`, `ENV_LIGHT`, seed **47**. Ingen nye materialparametre.

- **Skifer / Stein**: `MATERIALS['skifer']` uendret. Albedo #1C1D1D, speck .10, anisotropi (.12,.018,18), layers .10.
- **Kull**: `MATERIALS['kull']` uendret. #141312, speck .20, det .006, det2 .002, glint .0008.
- **Emalje / Plast**: `MATERIALS['emalje']` med nøyaktig build.py-overstyring `box=.40, box_w=.17, det=.00002`. #111110, speck 0. Basen er derfor bevisst ensfarget. Materialuttrykket ligger i lyslaget.
- **Fløyel**: `MATERIALS['floyel']` uendret. #141313, speck .05, sheen 1, sheen_exp 1.2, kd .5.
- **Gummi**: ekte kilde er `hires.HR['gummi']`, ikke `material.MATERIALS['gummi']`. Hele kildesporet og målingene står nedenfor.

Build.py sitt korn uniform(-.7,.7), seed **100**, ligger i separat lysrekonstruksjon, ikke albedo. Lys separeres matematisk som per-kanal multiply og screen uten å justere rendererens uttrykk. Kvantisering til PNG gir høyst ett 8-bits nivå avvik i målt interiør.

## Skia-bruk
Alle kart er **ikke sømløse / ikke tilebare**. Bruk ImageShader `TileMode.Clamp` på begge akser, ikke repeat eller mirror. Sømløs etterbehandling ville endre kilden og er ikke gjort.

1. Klipp til faktisk Klumpen/Småstein-path. Ingen forhåndsrendret silhuett i basefilen.
2. Tegn base med normal srcOver, opacity 1.
3. Innen samme isolerte, opake kroppslag: tegn shade-multiply med multiply, deretter light-screen med screen, begge opacity 1. Ikke blend lyskart direkte mot skjermbakgrunnen. Klipp først hele gruppens sluttresultat, så kanten ikke dobbel-antialiases.
4. Alle tre ImageShaders bruker identisk lokal matrise. Kartets (600,600) er objektets sentrum. For nominell bredde `w` pt: bildeskala = `w/720` pt per kildepiksel; translasjon = `(cx-600*w/720, cy-600*w/720)`. Hele artboardet blir `400*w/240` pt bredt. Ikke strekk kartets hele bredde til selve kroppens bredde.
5. Tall/min tegnes separat, gravert hvit **Figtree 400**, tabulære tall. Ingen tall eller skrift er eksportert her.

Basen alene er ikke et utseendemessig fullstendig materiale. Lyskartene matcher bare rest-formen ved ensartet skalering. Ved ny deformasjon må lys beregnes fra aktuell form/normaler; å strekke rest-kartet kan gi fastlåst kantlys. Det er ikke attestert som fysisk riktig dynamisk shader.

## Sammenligning / drift
Kontaktark: venstre godkjent cache, midten ren base klippet til samme kildeform, høyre base + lyskart klippet. Venstre har kildens drop shadow; eksporten har bevisst ingen. Ingen nye skygger lagt til. Gummi-raden viser nå ekte kildebaserte lag. Ingen maskering av avvik.

Målt mot `_src/cache/v2-{materiale}-240-rest-light.png`, bare maskens interiør > .999: MAE (0–255) Skifer **.215**, Kull **.195**, Emalje **.119**, Fløyel **.253**; maks **1** i alle fire. Kant/bakgrunn/skygge er ikke omfattet av denne målingen. Ingen synlig interiørdrift på kontaktarket; basene alene er naturlig flatere. Emaljens eksisterende høylysform er beholdt, ikke glattet eller redesignet.

## Konkrete hull
- Gummi: ingen kilde eller parameter mangler nå. Kantavviket nedenfor er en konkret begrensning i overgangen fra godkjent premultiplisert raster til ren overflate, ikke en ny materialbeslutning.
- Deformert runtime-lys: trenger formavhengig høyde-/normalmodell som samsvarer med rendererens distance-transform/bevel/crown/detaljer og kobling til runtime-path. Lokal kildeform finnes (`local_mask`/`radii`), men runtime-path/koordinatkontrakt er ikke levert her.
- Mørk variant: denne eksporten gjelder godkjent lys-cache, ikke mørk `sunken`-modell. Svak mørk rim ca. **3,0:1 mot #111110** er en separat avtalt føring, ikke et verifisert eller eksportert lag i denne pakken. Ikke bruk lys-kartene som mørk-PASS.


## Gummi: oppstrøms kilde funnet og verifisert
Kilderekke:
1. `/workspace/design/varighet/v2-2026-11-04/C-motion/_src/stone_layer.py`
2. `/workspace/design/icon/v5-2026-11-03/skjermer.py` importerer `Stone`, `render`, `HR` fra `/workspace/design/icon/v3-2026-11-03/hires.py`.
3. `stone-home@6x.npz` → timer-specens `_src/export_assets.py` → godkjent `klumpen-gummi-240pt@3x.png` → onboarding `build.py` sin eksisterende radialwarp.

Eksisterende parametre, også dokumentert i C-motion/spec.md linje 118–124: SS=6, GA=4, AV=.035, N=2520, objektbredde=1440, sentrum=(1260,1260), raised, floor=#F0EDE7, default render-seed=7, tile=1024, proxy=1400. `HR['gummi']` med nøyaktig stone_layer.py sine grain/alb_var-overstyringer. Full liste i JSON. Ingen nye parametre.

Kontroll: hele nygenererte svartbakgrunns-P er **bitidentisk** med eksisterende `stone-home@6x.npz['P']`: MAE=0, maks=0. Dette verifiserer faktisk eksisterende rendersteg og parametre, ikke bare et visuelt nært alternativ.

`alb` og `col` hentes fra uendret hires.render rett før komposisjon (linje 190), altså før maske/premultiplisering og uten drop shadow. Samme crop-geometri og Lanczos-nedskalering som export_assets.py, deretter samme radialwarp som build.py. Premultiplisering med gammel silhuett utelates med hensikt for å holde masteren ren. Eksisterende build.py-korn seed=100 ligger i lysseparasjonen. Native resampling og PNG-kvantisering beholdes; ingen visuell oppussing.

**Drift mot den gamle godkjente Gummi-cachen:** ved mask>.999, MAE=.633, maks=208 av 255. I dypere interiør (>12 kildepiksler fra ny maskegrense), MAE=.578, maks=2. Den store lokale kantverdien må ikke skjules med et samlet «maks 2»: gammel raster har premultiplisert silhuettkant/transparent RGB som ny ren overflate ikke baker inn. Kontaktarket viser begge. Dette er kildeekte eksport, men ikke attestert som pikselidentisk langs kanten eller som runtime-godkjent erstatning. Ingen manglende kilde, ingen mørk rim eller deformert belysning oppfunnet. Rest-formens lyskart har samme begrensning ved deformasjon som de andre settene.
