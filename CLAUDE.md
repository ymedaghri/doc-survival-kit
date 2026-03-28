# doc-survival-kit — Description du projet

## Vue d'ensemble

Application web sans framework ni dépendance externe, conçue pour fonctionner en mode **`file://`** (ouverture directe dans le navigateur, sans serveur HTTP). Testé sur Chrome et Edge (Chromium).

Fichiers du projet :
| Fichier | Rôle |
|---|---|
| `index.html` | Structure HTML uniquement (markup + modales + balises `<script src>`) — contient le bouton `.btn-admin` (⚙) liant vers `admin.html` et le bouton `.btn-diagram` liant vers `diagram.html` |
| `admin.html` | Page d'administration : sélecteur de langue, réinitialisation localStorage et IndexedDB — styles inline, JS inline, lien retour vers `index.html` |
| `diagram.html` | Éditeur de diagrammes SVG — barre d'outils, canvas SVG, panel liste des diagrammes, palette couleurs, modale première sauvegarde |
| `style.css` | Tout le CSS (layout, typo, tâches, liens, notes, thèmes, modales, `.btn-admin`, `.btn-diagram`, page diagrammes) |
| `mesLiens.js` | Données par défaut (`var mesLiensDefaut`) — chargé avant `liens.js` |
| `mesNotes.js` | Données par défaut (`var mesNotesDefaut`) — chargé avant `notes.js` |
| `diagrammes.js` | Données par défaut (`var diagrammesDefaut`) — chargé avant les modules `diagram/` |
| `liens.js` | Logique JS du panel mesLiens (CRUD catégories, liens, modales, mode édition, sauvegarde fichier) |
| `taches.js` | Logique JS du panel mesTaches (CRUD tâches, filtres, rendu) |
| `notes.js` | Logique JS du panel mesNotes (CRUD notes, blocs, modales, mode édition, sauvegarde fichier) |
| `diagram/globals.js` | Variables d'état global, constantes (`COLORS`, `DEFAULT_SIZES`), utilitaires (`escDiag`, `createSVGEl`, `measureText`, `wrapPostitLines`, `getColWidths`, `getColOffsets`) |
| `diagram/persistence.js` | Chargement/sauvegarde, undo/history, zoom et verrou par diagramme, File System Access API, image paste |
| `diagram/render.js` | Rendu SVG (`renderShape`, `renderArrow`, `renderAll`), pan/zoom (`svgPoint`, `applyZoom`…), `getEdgePoint` |
| `diagram/diagrams.js` | Arbre de diagrammes (find, flatten, ancestors), sidebar, CRUD diagrammes, navigation |
| `diagram/shape-ops.js` | Outils de manipulation (`setTool`, `addShape`, couleur, police, alignement, rotation, z-order, pick mode, paste) |
| `diagram/text-edit.js` | Édition texte inline, édition cellules tableau, overlay +/− lignes/colonnes, `startArrowTextEdit` |
| `diagram/links.js` | Picker de liens (`syncColorPanel`, `toggleShapeLink`, `lierForme`, `lierFormeExterne`…) |
| `diagram/events.js` | Événements souris (`onMouseDown/Move/Up`, `onWheel`), raccourcis clavier, initialisation `DOMContentLoaded` |
| `i18n/fr.js` | Traductions françaises — déclare `var i18n_fr = {...}` |
| `i18n/en.js` | Traductions anglaises — déclare `var i18n_en = {...}` |
| `i18n/i18n.js` | Moteur i18n — lit `localStorage["lang"]`, expose `window.t` et `applyI18n()` |

Ordre de chargement des scripts dans le HTML (important — dépendances) :

```html
<script src="i18n/fr.js"></script>
<!-- déclare i18n_fr -->
<script src="i18n/en.js"></script>
<!-- déclare i18n_en -->
<script src="i18n/i18n.js"></script>
<!-- expose window.t et applyI18n() — DOIT être chargé avant tout le reste -->
<script src="mesLiens.js"></script>
<!-- déclare mesLiensDefaut -->
<script src="mesNotes.js"></script>
<!-- déclare mesNotesDefaut -->
<script src="liens.js"></script>
<!-- utilise mesLiensDefaut, window.t -->
<script src="taches.js"></script>
<!-- utilise window.t -->
<script src="notes.js"></script>
<!-- utilise mesNotesDefaut, esc() de taches.js, window.t -->
```

Layout trois colonnes côte à côte (flex), responsive (colonne unique sous 860px) :

- **Gauche** — `mesTaches` : gestionnaire de tâches avec priorités et filtres
- **Milieu** — `mesNotes` : gestionnaire de notes composées de blocs
- **Droite** — `mesLiens` : gestionnaire de liens organisés par catégories

Les colonnes gauche et milieu ont la classe `panel panel-left` (border-right). Sur mobile, `panel-left` passe en `border-bottom`.

---

## Panel gauche — mesTaches

### Persistance

Stocké dans `localStorage` sous la clé `"mes_taches"`.

### Structure d'une tâche

```json
{ "id": 1700000000000, "text": "...", "priority": "normal", "done": false }
```

`priority` accepte : `"urgent"`, `"normal"`, `"later"`

### Fonctions JS clés (`taches.js`)

| Fonction            | Rôle                                                                                |
| ------------------- | ----------------------------------------------------------------------------------- |
| `load()`            | Lit le tableau de tâches depuis localStorage                                        |
| `save(tasks)`       | Persiste le tableau                                                                 |
| `addTask()`         | Ajoute une tâche depuis l'input + select                                            |
| `toggle(id)`        | Bascule l'état done/undone                                                          |
| `remove(id)`        | Supprime une tâche                                                                  |
| `setFilter(f, btn)` | Change le filtre actif                                                              |
| `render()`          | Restitue la liste filtrée dans `#taskList`                                          |
| `esc(s)`            | Échappe le HTML pour éviter les injections — **globale, réutilisée par `notes.js`** |

### Couleurs par priorité (classes CSS)

- `.task-urgent` — rouge rosé
- `.task-normal` — bleu
- `.task-later` — gris

### Responsive add-bar

`.add-bar` utilise `flex-wrap` avec `min-width: 0` sur l'input pour que la select et le bouton `+` restent sur une seule ligne même dans une colonne étroite.

---

## Panel milieu — mesNotes

### Persistance

Stocké dans `localStorage` sous la clé `"mes_notes"`.
Au premier chargement, si la clé est absente, on initialise avec `mesNotesDefaut`.
Sauvegarde également dans le fichier `mesNotes.js` via la File System Access API (même mécanisme que mesLiens).

### Données par défaut

`mesNotesDefaut` est déclaré dans **`mesNotes.js`** (variable globale `var`) et chargé avant `notes.js`.

### Structure des données

```json
[
  {
    "id": 1700000000000,
    "theme": "t-green",
    "titre": "Titre de la note",
    "blocs": [
      { "type": "b", "content": "Titre gras" },
      { "type": "p", "content": "Texte libre" },
      { "type": "pre", "content": "code..." },
      { "type": "ul", "items": ["item 1", "item 2"] },
      { "type": "table", "headers": ["Col A", "Col B"], "rows": [["val 1", "val 2"]] }
    ]
  }
]
```

### Types de blocs

| Type      | Balise rendue         | Saisie dans la modale                                                              |
| --------- | --------------------- | ---------------------------------------------------------------------------------- |
| `b`       | `<b>` (display:block) | `<input>` monoligne (`#blocContentInput`)                                          |
| `p`       | `<p>`                 | `<textarea>` (`#blocContent`), texte libre multiligne                              |
| `pre`     | `<pre>`               | `<textarea>` (`#blocContent`), prend toute la largeur                              |
| `ul`      | `<ul><li>…`           | `<textarea>` (`#blocContent`), un élément par ligne                                |
| `table`   | `<table>`             | `<textarea>` (`#blocContent`), colonnes séparées par `\|`, 1re ligne = en-têtes   |

La modale `#modalBloc` contient les deux éléments (`#blocContentInput` et `#blocContent`). `updateBlocPlaceholder()` affiche `#blocContentInput` (input) uniquement pour le type `b`, et `#blocContent` (textarea) pour tous les autres types (`p`, `pre`, `ul`, `table`).

Les blocs `pre` sont enveloppés dans un `.pre-wrapper` (position: relative) qui contient le `<pre>` et un bouton `.btn-copy-pre` positionné en absolu en haut à droite. Ce bouton est visible au survol du `.pre-wrapper`, appelle `copierBloc(btn)`, copie le contenu dans le clipboard et affiche temporairement "copié ✓" (classe `.copied`, fond vert) pendant 1,5 s. Il est indépendant des `.bloc-actions` et visible hors mode édition.

En mode édition, un `padding-right: 72px` est ajouté au `.bloc-wrapper` pour éviter que le contenu passe sous les boutons `.bloc-actions`.

### Fonctions JS clés (`notes.js`)

| Fonction                                   | Rôle                                                                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `loadNotes()`                              | Lit le tableau depuis localStorage (fallback sur `mesNotesDefaut`)                                                                 |
| `saveNotes(data)`                          | Persiste dans localStorage + appelle `checkDiffNotes()`                                                                            |
| `renderNotes()`                            | Génère le HTML de toutes les notes, préserve `.edit-mode`                                                                          |
| `checkDiffNotes()`                         | Compare localStorage avec `mesNotesDefaut` — affiche/masque `#btnSaveNotes`                                                        |
| `enregistrerModificationsNotes()`          | Récupère le handle IndexedDB ; si absent, ouvre la modale d'instruction                                                            |
| `ouvrirSelecteurFichierNotes()`            | Ouvre `showDirectoryPicker`, récupère `mesNotes.js` par nom, stocke le handle, écrit                                               |
| `ecrireFichierNotes(handle)`               | Écrit dans `mesNotes.js`, met à jour `mesNotesDefaut` en mémoire, appelle `checkDiffNotes()`                                       |
| `toggleEditModeNotes()`                    | Active / désactive le mode édition sur `#notesContainer`                                                                           |
| `openModalNote()`                          | Ouvre la modale de création de note                                                                                                |
| `confirmerNote()`                          | Valide et persiste la nouvelle note                                                                                                |
| `ouvrirModalEditNote(idx)`                 | Ouvre la modale d'édition de note pré-remplie                                                                                      |
| `confirmerEditNote()`                      | Sauvegarde titre/thème modifiés                                                                                                    |
| `ouvrirConfirmSupprNote(idx)`              | Ouvre la confirmation de suppression de note                                                                                       |
| `supprimerNote()`                          | Supprime la note à `noteIdxASupprimer`                                                                                             |
| `ouvrirModalBloc(noteIdx)`                 | Ouvre la modale d'ajout de bloc                                                                                                    |
| `ouvrirModalEditBloc(noteIdx, blocIdx)`    | Ouvre la modale d'édition de bloc pré-remplie                                                                                      |
| `confirmerBloc()`                          | Ajoute ou modifie un bloc                                                                                                          |
| `ouvrirConfirmSupprBloc(noteIdx, blocIdx)` | Ouvre la confirmation de suppression de bloc                                                                                       |
| `supprimerBloc()`                          | Supprime le bloc à `supprBlocNoteIdx / supprBlocBlocIdx`                                                                           |
| `updateBlocPlaceholder()`                  | Affiche `#blocContentInput` (input) pour le type `b` uniquement, `#blocContent` (textarea) pour tous les autres ; met à jour le placeholder |
| `copierBloc(btn)`                          | Copie dans le clipboard le `textContent` du `<pre>` frère dans `.pre-wrapper` ; affiche "copié ✓" + classe `.copied` pendant 1,5 s |
| `toggleNote(noteId)`                       | Bascule l'état collapsed/expanded d'une note (via `expandedNoteIds`) + `renderNotes()`                                            |
| `toggleAllNotes()`                         | Si toutes les notes sont expanded → collapse tout ; sinon → expand tout                                                           |
| `updateToggleAllBtn()`                     | Met à jour le libellé du bouton `#btnToggleAllNotes` selon l'état global                                                          |

---

## Panel droit — mesLiens

### Persistance

Stocké dans `localStorage` sous la clé `"mes_liens"`.
Au premier chargement, si la clé est absente, on initialise avec `mesLiensDefaut`.

### Données par défaut

`mesLiensDefaut` est déclaré dans **`mesLiens.js`** (variable globale `var`) et chargé via `<script src="mesLiens.js">` avant `liens.js`. Cette approche est compatible avec le mode `file://` (contrairement à `fetch()` qui nécessite un serveur HTTP).

### Structure des données

```json
[
  {
    "theme": "t-green",
    "titre": "Dev & Code",
    "liens": [
      {
        "nom": "GitHub",
        "desc": "Repos, issues, PRs",
        "url": "https://github.com"
      }
    ]
  }
]
```

### Fonctions JS clés (`liens.js`)

| Fonction                                      | Rôle                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `loadLiens()`                                 | Lit le tableau depuis localStorage (fallback sur `mesLiensDefaut`)                                 |
| `saveLiens(data)`                             | Persiste le tableau dans localStorage                                                              |
| `renderLiens()`                               | Génère tout le HTML des sections + appelle `checkDiff()` + `updateToggleAllLiensBtn()`             |
| `checkDiff()`                                 | Compare localStorage avec `mesLiensDefaut` en mémoire — affiche/masque `#btnSave`                  |
| `enregistrerModifications()`                  | Récupère le handle IndexedDB ; si absent, ouvre la modale d'instruction                            |
| `ouvrirSelecteurFichier()`                    | Ouvre `showDirectoryPicker`, récupère `mesLiens.js` par nom, stocke le handle, écrit               |
| `ecrireFichier(handle)`                       | Écrit le contenu dans `mesLiens.js`, met à jour `mesLiensDefaut` en mémoire, appelle `checkDiff()` |
| `openModalCategorie()`                        | Ouvre la modale d'ajout de catégorie                                                               |
| `confirmerCategorie()`                        | Valide et persiste la nouvelle catégorie                                                           |
| `ouvrirConfirmSupprCat(idx)`                  | Ouvre la modale de confirmation de suppression de catégorie                                        |
| `supprimerCategorie()`                        | Supprime la catégorie à l'index `idxCatASupprimer`                                                 |
| `ouvrirModalLien(idx)`                        | Ouvre la modale d'ajout de lien pour la catégorie `idx`                                            |
| `confirmerLien()`                             | Valide et persiste le nouveau lien                                                                 |
| `supprimerLien(event, catIdx, lienIdx)`       | Ouvre la confirmation de suppression d'un lien                                                     |
| `confirmerSupprLien()`                        | Supprime le lien à `supprLienCatIdx / supprLienIdx`                                                |
| `ouvrirModalEditLien(event, catIdx, lienIdx)` | Ouvre la modale d'édition pré-remplie                                                              |
| `confirmerEditLien()`                         | Sauvegarde les modifications du lien édité                                                         |
| `toggleEditMode()`                            | Active / désactive le mode édition                                                                 |
| `toggleCat(titre)`                            | Bascule l'état collapsed/expanded d'une section (via `expandedCatTitres`, clé = `cat.titre`)       |
| `toggleAllLiens()`                            | Si toutes les sections sont expanded → collapse tout ; sinon → expand tout                         |
| `updateToggleAllLiensBtn()`                   | Met à jour le libellé du bouton `#btnToggleAllLiens` selon l'état global                           |

### Thèmes de catégories / notes (classes CSS)

| Classe     | Couleur        |
| ---------- | -------------- |
| `t-green`  | Vert           |
| `t-violet` | Violet         |
| `t-amber`  | Ambre / orange |
| `t-sky`    | Bleu ciel      |
| `t-rose`   | Rose           |
| `t-teal`   | Teal           |
| `t-white`  | Blanc (fond blanc, contour gris clair, texte gris foncé) |

Les mêmes thèmes s'appliquent aux notes (`.note.t-green`, etc.) et aux sections de liens (`.t-green`). La règle `.t-green h2` colore les titres des deux panels.

---

## Boutons "enregistrer les modifications"

### mesLiens — `#btnSave` / mesNotes — `#btnSaveNotes`

Apparaissent dans leur toolbar respective quand le localStorage diffère des données par défaut en mémoire.

### Comportement (commun aux deux)

- **Visible** (vert foncé plein) dès qu'une différence est détectée par `checkDiff()` / `checkDiffNotes()`
- **Masqué** après une sauvegarde réussie (mise à jour de la variable défaut en mémoire + `checkDiff*()`)

### Mécanisme de sauvegarde du fichier (`File System Access API`)

- Utilise `showDirectoryPicker` (Chrome/Edge Chromium uniquement)
- Le `FileSystemFileHandle` est persisté en **IndexedDB** (base `doc-survival-kit-db` / store `fileHandles`)
  - clé `"mesLiens"` pour `mesLiens.js`
  - clé `"mesNotes"` pour `mesNotes.js`
  - clé `"diagrammes"` pour `diagrammes.js`
- **1ère utilisation** : modale d'instruction → `showDirectoryPicker()` (l'utilisateur sélectionne le **dossier** du projet) → `dirHandle.getFileHandle("mesLiens.js")` récupère le fichier par nom → handle sauvegardé en IndexedDB
- **Sécurité** : on ne manipule jamais directement un fichier via le sélecteur — le fichier cible est obtenu programmatiquement par son nom depuis le dossier. Si le fichier est absent du dossier sélectionné (`NotFoundError`), la modale se ré-ouvre avec un message d'erreur rouge. Aucun fichier n'est écrasé accidentellement.
- **Utilisations suivantes** : sauvegarde directe sans dialogue (handle récupéré depuis IndexedDB, permission vérifiée/redemandée si nécessaire)

---

## Page d'administration (`admin.html`)

Page séparée, accessible via le bouton `.btn-admin` (⚙, fixé en haut à droite de `index.html`). Contient ses propres styles et scripts inline — n'utilise que `style.css` pour la typo et les variables communes.

### Navigation

- `index.html` → `admin.html` via `.btn-admin` (⚙, `position: fixed; top: 16px; right: 20px`)
- `admin.html` → `index.html` via `.admin-back` (←, même position)
- Les deux boutons sont des `<a>` avec un style bouton carré 40×40px, fond gris clair + bordure, fond noir au survol

### Actions disponibles

| Checkbox             | Action                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `#checkLocalStorage` | `localStorage.clear()` — efface toutes les données des trois panels                      |
| `#checkIndexedDB`    | `indexedDB.deleteDatabase("doc-survival-kit-db")` — efface le handle de fichier mémorisé |

- Le bouton `#btnExecute` est désactivé (`disabled`) tant qu'aucune case n'est cochée
- Après exécution : les cases se décochent, le bouton se désactive, un message de confirmation vert s'affiche (`#adminFeedback`)

---

## Mode édition

Piloté par la classe CSS `.edit-mode` posée sur le conteneur du panel (`#linksContainer` ou `#notesContainer`).

- **Hors mode édition** : les boutons d'action sont masqués (`opacity: 0` + `pointer-events: none` — invisibles et non cliquables). Les boutons "nouvelle catégorie" / "nouvelle note" sont masqués (`display: none`).
- **En mode édition** : les actions passent en `opacity: 1`. Les boutons d'ajout réapparaissent via `.inner:has(#linksContainer.edit-mode) .btn-add-cat` et `.inner:has(#notesContainer.edit-mode) .btn-add-note`.
- Le bouton toggle change uniquement son texte, sans changement d'apparence visuelle.

---

## Modales

Toutes les modales partagent la même structure `.modal-backdrop > .modal` et la classe `.open` pour l'affichage. Toutes se ferment en cliquant sur le fond (`.modal-backdrop`).

### mesLiens

| ID                         | Rôle                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `#modalCategorie`          | Ajout d'une catégorie (nom + sélecteur de couleur)                                     |
| `#modalConfirmSupprCat`    | Confirmation de suppression de catégorie                                               |
| `#modalLien`               | Ajout d'un lien (nom, description, url)                                                |
| `#modalConfirmSupprLien`   | Confirmation de suppression d'un lien                                                  |
| `#modalEditLien`           | Édition d'un lien existant (pré-rempli)                                                |
| `#modalPremiereSauvegarde` | Instructions pour la première sauvegarde de `mesLiens.js` (avec `#erreurFichierLiens`) |

### mesNotes

| ID                              | Rôle                                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `#modalNote`                    | Création d'une note (titre + couleur)                                                                                                                                                            |
| `#modalEditNote`                | Édition titre/couleur d'une note existante                                                                                                                                                       |
| `#modalConfirmSupprNote`        | Confirmation de suppression de note                                                                                                                                                              |
| `#modalBloc`                    | Ajout ou édition d'un bloc — titre dynamique via `#modalBlocTitre` ; contient `#blocContentInput` (input, pour `b`/`p`) et `#blocContent` (textarea, pour `pre`/`ul`), un seul affiché à la fois |
| `#modalConfirmSupprBloc`        | Confirmation de suppression de bloc                                                                                                                                                              |
| `#modalPremiereSauvegardeNotes` | Instructions pour la première sauvegarde de `mesNotes.js` (avec `#erreurFichierNotes`)                                                                                                           |

---

## Internationalisation (i18n)

### Principe

Pas de `fetch()` (incompatible `file://`) — les fichiers de traduction sont chargés via `<script src>` comme variables globales `var`.

La langue active est lue depuis `localStorage["lang"]` (valeur par défaut : `"fr"`). Elle se choisit depuis la page `admin.html` (boutons FR / EN) et est persistée dans le localStorage. Changer la langue recharge la page via `window.location.reload()`.

### Architecture

| Fichier        | Rôle                                                             |
| -------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `i18n/fr.js`   | Déclare `var i18n_fr = { clé: "valeur", ... }`                   |
| `i18n/en.js`   | Déclare `var i18n_en = { clé: "valeur", ... }`                   |
| `i18n/i18n.js` | IIFE qui lit `localStorage["lang"]`, affecte `window.t = i18n_fr | i18n_en`, expose `window.applyI18n()`, et enregistre un listener `DOMContentLoaded` |

### Application des traductions

`applyI18n()` parcourt le DOM et applique les traductions via des attributs :

| Attribut                      | Effet                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `data-i18n="clé"`             | `el.textContent = window.t[clé]`                                                |
| `data-i18n-html="clé"`        | `el.innerHTML = window.t[clé]` (pour les éléments avec balises HTML embarquées) |
| `data-i18n-placeholder="clé"` | `el.placeholder = window.t[clé]`                                                |
| `data-i18n-title="clé"`       | `el.title = window.t[clé]`                                                      |

Pour les éléments dont le contenu est généré dynamiquement par JS (`render()`, `renderLiens()`, `renderNotes()`…), les textes utilisent `window.t.clé` directement.

### Règle de nommage des clés

Préfixe par domaine : `taches_*`, `notes_*`, `liens_*`, `modal_cat_*`, `modal_lien_*`, `modal_note_*`, `modal_bloc_*`, `modal_first_save_*`, `modal_suppr_*`, `admin_*`, `panel_*`, `diag_*`.

### Conflit de nommage important

Dans `taches.js`, la variable locale `t` est utilisée comme paramètre dans les arrow functions (`filtered.map((t) => ...)`). Toujours utiliser `window.t.clé` (préfixe explicite) dans ce fichier pour éviter la collision avec le nom `t`.

### Ajouter une langue

1. Créer `i18n/xx.js` avec `var i18n_xx = { ...mêmes clés... }`
2. Charger le fichier via `<script src="i18n/xx.js">` dans `index.html` et `admin.html` (avant `i18n/i18n.js`)
3. Mettre à jour `i18n/i18n.js` pour reconnaître la nouvelle valeur de `lang`
4. Ajouter le bouton dans `admin.html`
5. Ajouter le fichier dans `bin/cli.js` (`I18N_FILES`) et `package.json` (`files`)

---

## Éditeur de diagrammes (`diagram.html` / `diagram.js`)

Page séparée accessible via le bouton `.btn-diagram` (icône SVG, `position: fixed; top: 16px; right: 64px` sur `index.html`, à gauche du bouton ⚙).

### Fichiers

| Fichier | Rôle |
|---|---|
| `diagram.html` | Structure HTML : barre d'outils, canvas SVG, panneau liste, palette couleurs, modale première sauvegarde |
| `diagrammes.js` | Données par défaut — déclare `var diagrammesDefaut` (tableau de diagrammes) |
| `diagram/globals.js` | Variables d'état global, constantes, utilitaires partagés |
| `diagram/persistence.js` | Chargement/sauvegarde localStorage, undo, zoom/lock par diagramme, File System API, image paste |
| `diagram/render.js` | Rendu SVG complet, pan/zoom, `getEdgePoint` |
| `diagram/diagrams.js` | Arbre de diagrammes, sidebar, CRUD, navigation |
| `diagram/shape-ops.js` | Outils palette : couleur, police, alignement, rotation, z-order, pick mode, paste |
| `diagram/text-edit.js` | Édition texte/table inline, overlay boutons tableau |
| `diagram/links.js` | Picker de liens diagramme et URL externe |
| `diagram/events.js` | Événements souris/clavier, initialisation |

> **Note :** l'app tourne en mode `file://` — pas d'ES6 `import/export`. Tous les fichiers partagent le scope global et sont chargés via `<script src>` dans l'ordre suivant :

```html
<script src="i18n/fr.js"></script>
<script src="i18n/en.js"></script>
<script src="i18n/i18n.js"></script>
<script src="diagrammes.js"></script>
<script src="diagram/globals.js"></script>
<script src="diagram/persistence.js"></script>
<script src="diagram/render.js"></script>
<script src="diagram/diagrams.js"></script>
<script src="diagram/shape-ops.js"></script>
<script src="diagram/text-edit.js"></script>
<script src="diagram/links.js"></script>
<script src="diagram/events.js"></script>
```

### Persistance

Stocké dans `localStorage` sous la clé `"mes_diagrammes"`.
Sauvegarde dans `diagrammes.js` via la File System Access API (même mécanisme que `mesLiens.js` / `mesNotes.js`).
Clé IndexedDB : `"diagrammes"` (base `doc-survival-kit-db` / store `fileHandles`).

L'ID du diagramme courant est persisté dans `localStorage["current_diagram_id"]` (string). Migration automatique depuis l'ancienne clé `"current_diagram_idx"` au premier chargement.

### Structure des données

La structure est un **arbre** : chaque diagramme peut avoir des enfants (`children`). Les diagrammes racine sont dans le tableau `diagrammesDefaut` / `diagramsList`. Les enfants sont imbriqués récursivement.

```json
[
  {
    "id": 1700000000000,
    "titre": "Nom du diagramme",
    "shapes": [
      {
        "id": "s1", "type": "rect", "x": 100, "y": 80, "w": 120, "h": 50,
        "text": "Texte", "color": "t-sky",
        "fontSize": 12,
        "textAlign": "center",
        "textValign": "middle",
        "linkedDiagramId": "1700000000001"
      }
    ],
    "arrows": [
      { "id": "a1", "from": "s1", "to": "s2", "label": "" }
    ],
    "children": [
      {
        "id": 1700000000001,
        "titre": "Sous-diagramme",
        "shapes": [],
        "arrows": [],
        "children": []
      }
    ]
  }
]
```

Champs optionnels de chaque forme (fallback si absent) :

| Champ | Type | Défaut | Rôle |
|---|---|---|---|
| `fontSize` | `number` | `12` (`13` pour `text`) | Taille de police en px |
| `textAlign` | `"left"` \| `"center"` \| `"right"` | `"center"` | Alignement horizontal du texte |
| `textValign` | `"top"` \| `"middle"` \| `"bottom"` | `"middle"` | Alignement vertical du texte |
| `rotation` | `number` | `0` | Rotation en degrés (0–359) — appliquée via `transform="rotate(r, cx, cy)"` sur le groupe SVG |
| `linkedDiagramId` | `string` \| absent | — | ID du diagramme enfant lié — un clic simple navigue vers lui (indicateur orange ↗) |
| `externalUrl` | `string` \| absent | — | URL externe (`http://`, `https://` ou `file://`) — un clic ouvre dans un nouvel onglet (indicateur bleu ↗) |

Le zoom de chaque diagramme est persisté séparément dans `localStorage["diagrammes_zoom"]` (objet `{ [diagramId]: scale }`) pour ne pas polluer le diff de `mes_diagrammes`.

Le verrouillage de chaque diagramme est persisté séparément dans `localStorage["diagrammes_lock"]` (objet `{ [diagramId]: boolean }`). Quand un diagramme est verrouillé, tout clic sur le canvas déclenche uniquement le pan global — aucune sélection, aucun outil, aucun raccourci clavier ne fonctionne sur le board. **Exception : un clic sans déplacement sur une forme ayant `linkedDiagramId` ou `externalUrl` navigue normalement, même en mode verrouillé.**

### Hiérarchie de diagrammes

La barre latérale (panneau ☰) affiche l'arbre complet des diagrammes avec indentation par niveau. Chaque item a :
- Un chevron **▶/▼** pour développer/réduire ses enfants
- Un bouton **+** (visible au survol) pour créer un diagramme enfant
- La largeur du panneau s'élargit dynamiquement : `220 + profondeur * 14` px

À l'ouverture du panneau, `getAncestorPath()` remonte l'arbre et ouvre automatiquement tous les ancêtres du diagramme courant.

**Navigation :**
- Clic sur un item de la barre → navigue et **vide** la pile de navigation
- Clic sur une forme avec `linkedDiagramId` → navigue et **empile** le diagramme courant dans `diagNavStack`
- Bouton ← (orange, après le cadenas) → dépile et revient — disparaît si la pile est vide

**Lier une forme :**
1. Sélectionner la forme
2. Cliquer le bouton ⛓ dans la palette → ouvre un picker avec trois options :
   - liste des diagrammes existants → indicateur **orange** ↗
   - "Nouveau diagramme enfant" → crée + lie → indicateur **orange** ↗
   - "Lien externe (URL)" → champ de saisie validé par Entrée (`http://`, `https://` ou `file://`) → indicateur **bleu** ↗
3. Un clic simple (sans déplacement) navigue vers le diagramme lié ou ouvre l'URL dans un nouvel onglet
4. Recliquer ⛓ sur une forme déjà liée → supprime le lien (`linkedDiagramId` ou `externalUrl`)

### Types de formes

| Type | Rendu SVG | Taille par défaut |
|---|---|---|
| `rect` | Rectangle avec coins légèrement arrondis (`rx=4`) | 120 × 50 |
| `rounded` | Rectangle très arrondi (`rx=22`) | 120 × 50 |
| `db` | Cylindre (ellipse cap + corps + ellipse bas) | 80 × 60 |
| `cloud` | Ellipse en trait continu (service externe) | 100 × 60 |
| `text` | Texte seul, sans fond | 0 × 0 |
| `postit` | Post-it avec coin replié, texte multi-lignes | 130 × 110 |

Toutes les formes sauf `postit` et `image` ont 4 points de connexion (conn-dots) et 1 poignée de redimensionnement (coin bas-droit).

### Rendu du texte — word wrap

Les types `rect`, `rounded`, `db`, `cloud` et `postit` utilisent `wrapPostitLines(text, maxWidth, fontSize)` pour découper le texte en lignes. Le padding latéral est :
- `postit` : 14 px de chaque côté
- `cloud` : 20 % de la largeur de chaque côté
- `rect`, `rounded`, `db` : 12 px de chaque côté

La hauteur de ligne est calculée dynamiquement : `lineH = Math.round(fontSize * 1.42)` (postit) ou `Math.round(fontSize * 1.33)` (autres).

L'alignement vertical tient compte de la face haute du cylindre (`db`) : pour `textValign = "top"`, le texte commence après le cap (`ry * 2 + vpad`).

### Interactions

| Action | Geste |
|---|---|
| Sélectionner / déplacer | Outil `select` + clic/drag sur une forme |
| Créer une forme | Outil `rect`/`rounded`/`db`/`cloud`/`text`/`postit` + clic sur le canvas |
| Créer une flèche | Outil `arrow` + clic source → clic cible, **ou** drag depuis un conn-dot (tout outil) — la saisie du label s'ouvre automatiquement |
| Éditer le texte d'une forme | Double-clic sur une forme **ou** bouton ✎ de la palette (forme sélectionnée) |
| Éditer le label d'une flèche | Double-clic sur la flèche **ou** bouton ✎ (flèche sélectionnée) |
| Changer la couleur | Palette couleurs (visible quand une forme est sélectionnée) — inclut blanc (`t-white`) |
| Changer la taille de police | Boutons `Aa+` / `Aa−` de la palette |
| Aligner le texte horizontalement | Boutons ← / ↔ / → de la palette |
| Aligner le texte verticalement | Boutons haut / milieu / bas de la palette |
| Copier la taille de police | Bouton goutte vide → clic sur la forme source |
| Copier le style complet | Bouton goutte pleine → clic sur la forme source (copie `fontSize`, `color`, `type`, `w`, `h`, `textAlign`, `textValign`, `rotation`) |
| Rotation | Boutons ↺ / ↻ de la palette — ±15° par clic, clampé 0–359, persisté dans `shape.rotation` |
| Z-order | Boutons "reculer" / "avancer" de la palette — déplace la forme d'un cran dans `diag.shapes` |
| Sélectionner tout | `Ctrl+A` / `Cmd+A` — sélectionne toutes les formes du diagramme courant |
| Couper | `Ctrl+X` / `Cmd+X` — copie dans le clipboard interne puis supprime |
| Redimensionner | Drag de la poignée bas-droit (carré orange) |
| Supprimer | Outil ✕ ou touche `Del` |
| Désélectionner / fermer palette | `Échap` — désélectionne tout, ferme le link picker et masque la palette |
| Pan | Drag sur le canvas vide (tout outil) |
| Zoom | Molette souris (centré sur le curseur) ou boutons `−` / `+` / `⊡` |
| Zoom persisté par diagramme | Chaque diagramme mémorise son niveau de zoom dans `localStorage["diagrammes_zoom"]` |
| Verrouiller / déverrouiller | Bouton cadenas (🔓/🔒) dans la barre d'outils — bloque toutes les interactions sauf le pan ; les clics sur formes liées naviguent quand même ; état persisté dans `localStorage["diagrammes_lock"]` |
| Naviguer vers un diagramme enfant | Clic simple sur une forme avec `linkedDiagramId` — empile le diagramme courant dans `diagNavStack` |
| Ouvrir un lien externe | Clic simple sur une forme avec `externalUrl` — ouvre dans un nouvel onglet |
| Revenir au diagramme précédent | Bouton ← orange (après le cadenas) — visible uniquement si `diagNavStack` non vide |
| Lier une forme | Bouton ⛓ dans la palette → picker : diagramme existant, nouveau diagramme enfant, ou URL externe |
| Ouvrir la barre latérale | Panneau ☰ — auto-expand des ancêtres du diagramme courant, item actif mis en évidence |
| Créer un diagramme enfant | Bouton + au survol d'un item dans le panneau ☰ |
| Fermer la barre latérale | Un clic sur un diagramme dans le panneau ☰ ferme automatiquement le panneau (et vide `diagNavStack`) |

### Double-clic — implémentation

Le `dblclick` natif ne fonctionne pas sur les formes/flèches SVG car `renderAll()` remplace les éléments DOM entre les deux clics, détachant la cible. Solution : détection manuelle par timestamp dans `onMouseDown`, avec deux paires de variables — une pour les formes, une pour les flèches :

```js
// Formes
var now = Date.now();
if (now - lastClickTime < 350 && lastClickShapeId === shape.id) {
  lastClickTime = 0; lastClickShapeId = null;
  startTextEdit(shape.id); return;
}
lastClickTime = now; lastClickShapeId = shape.id; lastClickArrowId = null;

// Flèches
var now2 = Date.now();
if (now2 - lastClickTime < 350 && lastClickArrowId === aid) {
  lastClickTime = 0; lastClickArrowId = null;
  startArrowTextEdit(aid); return;
}
lastClickTime = now2; lastClickArrowId = aid;
```

`input.focus()` est différé via `setTimeout(..., 10)` pour éviter que le blur sur le mouseup ne ferme immédiatement l'overlay.

### Fonctions JS clés (`diagram.js`)

| Fonction | Rôle |
|---|---|
| `svgPoint(clientX, clientY)` | Convertit coordonnées écran → SVG (tient compte du pan/zoom) |
| `renderShape(shape)` | Crée le groupe SVG d'une forme (fond, texte word-wrappé, conn-dots, resize grip) |
| `renderArrow(arrow, shapes)` | Crée le groupe SVG d'une flèche (ligne + zone de clic + marqueur) |
| `wrapPostitLines(text, maxWidth, fontSize)` | Découpe le texte en lignes selon la largeur disponible et la taille de police |
| `getEdgePoint(shape, tx, ty)` | Calcule le point de sortie sur le bord d'une forme selon l'angle vers la cible |
| `renderAll()` | Re-rendu complet du canvas SVG |
| `shapeAt(x, y)` | Hit-test par bounding box — retourne la forme sous le curseur |
| `arrowIdAt(x, y)` | Hit-test par distance au segment — retourne l'id de la flèche sous le curseur |
| `setTool(name)` | Change l'outil actif, met à jour les classes CSS des boutons |
| `setShapeColor(color)` | Applique une classe de thème à la/les forme(s) sélectionnée(s) |
| `changeShapeFontSize(delta)` | Incrémente / décrémente `fontSize` (clampé [8, 28]) sur les formes sélectionnées |
| `setShapeTextAlign(align)` | Applique `textAlign` (`"left"` / `"center"` / `"right"`) aux formes sélectionnées |
| `setShapeTextValign(valign)` | Applique `textValign` (`"top"` / `"middle"` / `"bottom"`) aux formes sélectionnées |
| `rotateShape(delta)` | Incrémente `shape.rotation` de `delta` degrés (±15 typiquement), clampé 0–359 |
| `changeShapeOrder(delta)` | Déplace les formes sélectionnées d'un cran dans `diag.shapes` (`delta=1` → avant-plan, `-1` → arrière-plan) |
| `startPickMode(mode)` | Active le mode pick (`"fontSize"` ou `"fullStyle"`) — curseur croix, bouton orange |
| `cancelPickMode()` | Annule le mode pick et restaure le curseur |
| `applyPickMode(srcShape)` | Copie les attributs de style de `srcShape` vers les formes cibles (inclut `rotation` en fullStyle) |
| `deleteSelected()` | Supprime la forme ou la flèche sélectionnée |
| `startTextEdit(shapeId)` | Ouvre l'overlay d'édition : textarea pour `postit`/`rect`/`rounded`/`db`/`cloud`, input pour `text` |
| `startArrowTextEdit(arrowId)` | Positionne l'overlay au milieu de la flèche pour éditer son label |
| `confirmTextEdit()` | Sauvegarde le texte saisi (forme ou flèche) et masque l'overlay |
| `createArrow(fromId, toId)` | Crée une flèche et ouvre immédiatement `startArrowTextEdit` |
| `findDiagramById(id, list)` | Recherche récursive d'un diagramme par ID dans l'arbre |
| `findParentListOf(id, list)` | Retourne `{ list, index }` — le tableau parent et la position du diagramme |
| `flattenDiagrams(list, result)` | Aplatit l'arbre en tableau (pour le link picker) |
| `getAncestorPath(targetId, list, path)` | Retourne le tableau des IDs ancêtres du diagramme cible (pour auto-expand) |
| `calcMaxExpandedDepth(list, depth)` | Calcule la profondeur maximale des nœuds développés (pour la largeur du panneau) |
| `updateSidebarWidth()` | Ajuste la largeur du panneau ☰ : `220 + profondeur * 14` px |
| `creerDiagramme()` | Ajoute un nouveau diagramme racine (saisie du titre via `#diagramTitle`) |
| `creerEnfantDiagramme(parentId)` | Ajoute un diagramme enfant à `parentId`, développe le parent dans la barre |
| `selectDiagramme(id, clearStack)` | Change de diagramme — si `clearStack=true` vide `diagNavStack` (appel depuis la sidebar) |
| `goBackDiagram()` | Dépile `diagNavStack` et navigue au diagramme précédent |
| `updateBackBtn()` | Affiche/masque le bouton ← selon `diagNavStack.length` |
| `toggleDiagramList()` | Affiche/masque le panneau ☰ — à l'ouverture, auto-expand des ancêtres du diagramme courant |
| `toggleDiagExpand(id)` | Développe/réduit un nœud dans le panneau ☰ |
| `renderDiagramListLevel(list, depth)` | Rendu récursif HTML d'un niveau de l'arbre (indentation, chevrons, boutons +/×) |
| `renderDiagramList()` | Rendu complet de l'arbre + `updateSidebarWidth()` |
| `toggleShapeLink()` | Lie / délie la forme sélectionnée (`linkedDiagramId` ou `externalUrl`) — bouton ⛓ palette |
| `showLinkPicker()` | Ouvre le panneau flottant `#linkPickerPanel` : liste diagrammes + "Nouveau enfant" + "Lien externe" |
| `showExternalLinkInput()` | Révèle le champ de saisie URL dans le picker |
| `lierFormeExterne()` | Valide l'URL (`http://`, `https://` ou `file://`), affecte `externalUrl`, efface `linkedDiagramId` |
| `hideLinkPicker()` | Ferme le panneau flottant |
| `lierForme(diagId)` | Affecte `linkedDiagramId` à la forme sélectionnée, efface `externalUrl`, ferme le picker |
| `creerEnfantEtLier()` | Crée un diagramme enfant nommé d'après le texte de la forme et lie celle-ci |
| `syncColorPanel()` | Met à jour l'état du bouton ⛓ (actif/inactif, tooltip) selon `linkedDiagramId` ou `externalUrl` |
| `enregistrerDiagrammes()` | Sauvegarde dans `diagrammes.js` via File System Access API |
| `getZoomMap()` / `saveCurrentZoom()` / `restoreZoomForDiagram(id)` | Persistance du zoom par diagramme dans `localStorage["diagrammes_zoom"]` |
| `getLockMap()` / `saveCurrentLock()` / `restoreLockForDiagram(id)` | Persistance du verrou par diagramme dans `localStorage["diagrammes_lock"]` |
| `toggleBoardLock()` | Bascule le verrou, sauvegarde, désélectionne tout si verrouillé, met à jour le bouton |
| `updateLockBtn()` | Met à jour l'icône et le titre du bouton `#btnLock` selon `boardLocked` |
| `zoomIn()` / `zoomOut()` / `resetZoom()` | Contrôle du zoom (sauvegarde automatique dans `diagrammes_zoom`) |
| `onMouseDown(e)` | Gestionnaire principal : pick mode, conn-dot drag, resize, sélection/déplacement, outil arrow, placement forme, double-clic |
| `onMouseMove(e)` | Déplacement/redimensionnement en cours, pan, flèche temporaire |
| `onMouseUp(e)` | Finalise drag, connexion flèche — navigue vers `linkedDiagramId` ou ouvre `externalUrl` si clic sans déplacement ; gère aussi ces navigations en mode verrouillé |
| `onWheel(e)` | Zoom centré sur le curseur |

### État global (`diagram.js`)

| Variable | Rôle |
|---|---|
| `currentTool` | Outil actif (`"select"`, `"rect"`, `"rounded"`, `"db"`, `"cloud"`, `"text"`, `"postit"`, `"arrow"`) |
| `diagramsList` | Arbre des diagrammes en mémoire (tableau racine, chaque nœud a `children`) |
| `currentDiagramId` | ID (string) du diagramme affiché — recherché dans l'arbre par `findDiagramById` |
| `diagNavStack` | Pile des IDs de diagrammes — alimentée uniquement par les clics sur formes liées ; vidée par les clics sidebar |
| `diagExpandedIds` | Objet `{ [id]: true }` — nœuds développés dans le panneau ☰ |
| `pendingParentId` | ID du parent lors de la création d'un diagramme enfant (`null` = racine) |
| `viewTransform` | `{ x, y, scale }` — état du pan/zoom |
| `selectedId` / `selectedType` | Id et type (`"shape"` ou `"arrow"`) de l'élément sélectionné |
| `selectedIds` | Tableau des ids sélectionnés (multi-sélection) |
| `dragState` | État du drag en cours (`null` ou objet de contexte) |
| `arrowSrcId` | Id de la forme source lors du dessin d'une flèche (outil arrow) |
| `pickMode` | Mode copie de style actif : `null` / `"fontSize"` / `"fullStyle"` |
| `pickTargetIds` | `selectedIds` sauvegardés au déclenchement du pick mode |
| `lastClickTime` / `lastClickShapeId` / `lastClickArrowId` | Détection du double-clic manuel (formes et flèches) |
| `editingShapeId` / `editingArrowId` | Id de l'élément dont le texte est en cours d'édition |
| `boardLocked` | `true` si le diagramme courant est verrouillé (pan uniquement sur le canvas) |

---

## Conventions de style

- Police principale : `"Segoe UI"`, system-ui
- Police monospace (labels, h2, tags) : `"Cascadia Code"`, `"SF Mono"`, `Consolas`
- Couleur accent : `#f97316` (orange)
- Fond page : `#fafaf9`
- Texte principal : `#292524`
- Boutons d'action colorés : fond pastel au repos, fond plein + texte blanc au survol
  - Orange : `background: #fff7ed / color: #f97316` → hover `background: #f97316 / color: #fff`
  - Rouge : `background: #fef2f2 / color: #ef4444` → hover `background: #ef4444 / color: #fff`
  - Vert (btn-save) : fond plein `#047857` au repos → `#059669` au survol (état "à enregistrer" très visible)
