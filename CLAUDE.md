# doc-survival-kit — Description du projet

## Vue d'ensemble

Application web sans framework ni dépendance externe, conçue pour fonctionner en mode **`file://`** (ouverture directe dans le navigateur, sans serveur HTTP). Testé sur Chrome et Edge (Chromium).

Fichiers du projet :
| Fichier | Rôle |
|---|---|
| `index.html` | Structure HTML uniquement (markup + modales + balises `<script src>`) — contient le bouton `.btn-admin` (⚙) liant vers `admin.html` |
| `admin.html` | Page d'administration : sélecteur de langue, réinitialisation localStorage et IndexedDB — styles inline, JS inline, lien retour vers `index.html` |
| `style.css` | Tout le CSS (layout, typo, tâches, liens, notes, thèmes, modales, `.btn-admin`) |
| `mesLiens.js` | Données par défaut (`var mesLiensDefaut`) — chargé avant `liens.js` |
| `mesNotes.js` | Données par défaut (`var mesNotesDefaut`) — chargé avant `notes.js` |
| `liens.js` | Logique JS du panel mesLiens (CRUD catégories, liens, modales, mode édition, sauvegarde fichier) |
| `taches.js` | Logique JS du panel mesTaches (CRUD tâches, filtres, rendu) |
| `notes.js` | Logique JS du panel mesNotes (CRUD notes, blocs, modales, mode édition, sauvegarde fichier) |
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
| `p`       | `<p>`                 | `<input>` monoligne (`#blocContentInput`)                                          |
| `pre`     | `<pre>`               | `<textarea>` (`#blocContent`), prend toute la largeur                              |
| `ul`      | `<ul><li>…`           | `<textarea>` (`#blocContent`), un élément par ligne                                |
| `table`   | `<table>`             | `<textarea>` (`#blocContent`), colonnes séparées par `\|`, 1re ligne = en-têtes   |

La modale `#modalBloc` contient les deux éléments (`#blocContentInput` et `#blocContent`). `updateBlocPlaceholder()` affiche le bon champ via `display` et masque l'autre selon le type sélectionné.

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
| `updateBlocPlaceholder()`                  | Affiche `#blocContentInput` (input) pour les types `b`/`p`, `#blocContent` (textarea) pour `pre`/`ul`/`table` ; met à jour le placeholder  |
| `copierBloc(btn)`                          | Copie dans le clipboard le `textContent` du `<pre>` frère dans `.pre-wrapper` ; affiche "copié ✓" + classe `.copied` pendant 1,5 s |

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
| `renderLiens()`                               | Génère tout le HTML des sections + appelle `checkDiff()`                                           |
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

### Thèmes de catégories / notes (classes CSS)

| Classe     | Couleur        |
| ---------- | -------------- |
| `t-green`  | Vert           |
| `t-violet` | Violet         |
| `t-amber`  | Ambre / orange |
| `t-sky`    | Bleu ciel      |
| `t-rose`   | Rose           |
| `t-teal`   | Teal           |

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

Préfixe par domaine : `taches_*`, `notes_*`, `liens_*`, `modal_cat_*`, `modal_lien_*`, `modal_note_*`, `modal_bloc_*`, `modal_first_save_*`, `modal_suppr_*`, `admin_*`, `panel_*`.

### Conflit de nommage important

Dans `taches.js`, la variable locale `t` est utilisée comme paramètre dans les arrow functions (`filtered.map((t) => ...)`). Toujours utiliser `window.t.clé` (préfixe explicite) dans ce fichier pour éviter la collision avec le nom `t`.

### Ajouter une langue

1. Créer `i18n/xx.js` avec `var i18n_xx = { ...mêmes clés... }`
2. Charger le fichier via `<script src="i18n/xx.js">` dans `index.html` et `admin.html` (avant `i18n/i18n.js`)
3. Mettre à jour `i18n/i18n.js` pour reconnaître la nouvelle valeur de `lang`
4. Ajouter le bouton dans `admin.html`
5. Ajouter le fichier dans `bin/cli.js` (`I18N_FILES`) et `package.json` (`files`)

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
