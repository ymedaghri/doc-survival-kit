# liens-utiles — Description du projet

## Vue d'ensemble

Application web sans framework ni dépendance externe, conçue pour fonctionner en mode **`file://`** (ouverture directe dans le navigateur, sans serveur HTTP). Testé sur Chrome et Edge (Chromium).

Fichiers du projet :
| Fichier | Rôle |
|---|---|
| `liens-utiles.html` | Structure HTML uniquement (markup + modales + balises `<script src>`) |
| `style.css` | Tout le CSS (layout, typo, tâches, liens, notes, thèmes, modales) |
| `mesLiens.js` | Données par défaut (`var mesLiensDefaut`) — chargé avant `liens.js` |
| `mesNotes.js` | Données par défaut (`var mesNotesDefaut`) — chargé avant `notes.js` |
| `liens.js` | Logique JS du panel mesLiens (CRUD catégories, liens, modales, mode édition, sauvegarde fichier) |
| `taches.js` | Logique JS du panel mesTaches (CRUD tâches, filtres, rendu) |
| `notes.js` | Logique JS du panel mesNotes (CRUD notes, blocs, modales, mode édition, sauvegarde fichier) |

Ordre de chargement des scripts dans le HTML (important — dépendances) :
```html
<script src="mesLiens.js"></script>  <!-- déclare mesLiensDefaut -->
<script src="mesNotes.js"></script>  <!-- déclare mesNotesDefaut -->
<script src="liens.js"></script>     <!-- utilise mesLiensDefaut -->
<script src="taches.js"></script>
<script src="notes.js"></script>     <!-- utilise mesNotesDefaut, esc() de taches.js -->
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
| Fonction | Rôle |
|---|---|
| `load()` | Lit le tableau de tâches depuis localStorage |
| `save(tasks)` | Persiste le tableau |
| `addTask()` | Ajoute une tâche depuis l'input + select |
| `toggle(id)` | Bascule l'état done/undone |
| `remove(id)` | Supprime une tâche |
| `setFilter(f, btn)` | Change le filtre actif |
| `render()` | Restitue la liste filtrée dans `#taskList` |
| `esc(s)` | Échappe le HTML pour éviter les injections — **globale, réutilisée par `notes.js`** |

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
      { "type": "ul", "items": ["item 1", "item 2"] }
    ]
  }
]
```

### Types de blocs
| Type | Balise rendue | Saisie dans la modale |
|---|---|---|
| `b` | `<b>` (display:block) | `<input>` monoligne (`#blocContentInput`) |
| `p` | `<p>` | `<input>` monoligne (`#blocContentInput`) |
| `pre` | `<pre>` | `<textarea>` (`#blocContent`), prend toute la largeur |
| `ul` | `<ul><li>…` | `<textarea>` (`#blocContent`), un élément par ligne |

La modale `#modalBloc` contient les deux éléments (`#blocContentInput` et `#blocContent`). `updateBlocPlaceholder()` affiche le bon champ via `display` et masque l'autre selon le type sélectionné.

Les blocs `pre` sont enveloppés dans un `.pre-wrapper` (position: relative) qui contient le `<pre>` et un bouton `.btn-copy-pre` positionné en absolu en haut à droite. Ce bouton est visible au survol du `.pre-wrapper`, appelle `copierBloc(btn)`, copie le contenu dans le clipboard et affiche temporairement "copié ✓" (classe `.copied`, fond vert) pendant 1,5 s. Il est indépendant des `.bloc-actions` et visible hors mode édition.

En mode édition, un `padding-right: 72px` est ajouté au `.bloc-wrapper` pour éviter que le contenu passe sous les boutons `.bloc-actions`.

### Fonctions JS clés (`notes.js`)
| Fonction | Rôle |
|---|---|
| `loadNotes()` | Lit le tableau depuis localStorage (fallback sur `mesNotesDefaut`) |
| `saveNotes(data)` | Persiste dans localStorage + appelle `checkDiffNotes()` |
| `renderNotes()` | Génère le HTML de toutes les notes, préserve `.edit-mode` |
| `checkDiffNotes()` | Compare localStorage avec `mesNotesDefaut` — affiche/masque `#btnSaveNotes` |
| `enregistrerModificationsNotes()` | Récupère le handle IndexedDB ; si absent, ouvre la modale d'instruction |
| `ouvrirSelecteurFichierNotes()` | Ouvre `showDirectoryPicker`, récupère `mesNotes.js` par nom, stocke le handle, écrit |
| `ecrireFichierNotes(handle)` | Écrit dans `mesNotes.js`, met à jour `mesNotesDefaut` en mémoire, appelle `checkDiffNotes()` |
| `toggleEditModeNotes()` | Active / désactive le mode édition sur `#notesContainer` |
| `openModalNote()` | Ouvre la modale de création de note |
| `confirmerNote()` | Valide et persiste la nouvelle note |
| `ouvrirModalEditNote(idx)` | Ouvre la modale d'édition de note pré-remplie |
| `confirmerEditNote()` | Sauvegarde titre/thème modifiés |
| `ouvrirConfirmSupprNote(idx)` | Ouvre la confirmation de suppression de note |
| `supprimerNote()` | Supprime la note à `noteIdxASupprimer` |
| `ouvrirModalBloc(noteIdx)` | Ouvre la modale d'ajout de bloc |
| `ouvrirModalEditBloc(noteIdx, blocIdx)` | Ouvre la modale d'édition de bloc pré-remplie |
| `confirmerBloc()` | Ajoute ou modifie un bloc |
| `ouvrirConfirmSupprBloc(noteIdx, blocIdx)` | Ouvre la confirmation de suppression de bloc |
| `supprimerBloc()` | Supprime le bloc à `supprBlocNoteIdx / supprBlocBlocIdx` |
| `updateBlocPlaceholder()` | Affiche `#blocContentInput` (input) pour les types `b`/`p`, `#blocContent` (textarea) pour `pre`/`ul` ; met à jour le placeholder |
| `copierBloc(btn)` | Copie dans le clipboard le `textContent` du `<pre>` frère dans `.pre-wrapper` ; affiche "copié ✓" + classe `.copied` pendant 1,5 s |

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
      { "nom": "GitHub", "desc": "Repos, issues, PRs", "url": "https://github.com" }
    ]
  }
]
```

### Fonctions JS clés (`liens.js`)
| Fonction | Rôle |
|---|---|
| `loadLiens()` | Lit le tableau depuis localStorage (fallback sur `mesLiensDefaut`) |
| `saveLiens(data)` | Persiste le tableau dans localStorage |
| `renderLiens()` | Génère tout le HTML des sections + appelle `checkDiff()` |
| `checkDiff()` | Compare localStorage avec `mesLiensDefaut` en mémoire — affiche/masque `#btnSave` |
| `enregistrerModifications()` | Récupère le handle IndexedDB ; si absent, ouvre la modale d'instruction |
| `ouvrirSelecteurFichier()` | Ouvre `showDirectoryPicker`, récupère `mesLiens.js` par nom, stocke le handle, écrit |
| `ecrireFichier(handle)` | Écrit le contenu dans `mesLiens.js`, met à jour `mesLiensDefaut` en mémoire, appelle `checkDiff()` |
| `openModalCategorie()` | Ouvre la modale d'ajout de catégorie |
| `confirmerCategorie()` | Valide et persiste la nouvelle catégorie |
| `ouvrirConfirmSupprCat(idx)` | Ouvre la modale de confirmation de suppression de catégorie |
| `supprimerCategorie()` | Supprime la catégorie à l'index `idxCatASupprimer` |
| `ouvrirModalLien(idx)` | Ouvre la modale d'ajout de lien pour la catégorie `idx` |
| `confirmerLien()` | Valide et persiste le nouveau lien |
| `supprimerLien(event, catIdx, lienIdx)` | Ouvre la confirmation de suppression d'un lien |
| `confirmerSupprLien()` | Supprime le lien à `supprLienCatIdx / supprLienIdx` |
| `ouvrirModalEditLien(event, catIdx, lienIdx)` | Ouvre la modale d'édition pré-remplie |
| `confirmerEditLien()` | Sauvegarde les modifications du lien édité |
| `toggleEditMode()` | Active / désactive le mode édition |

### Thèmes de catégories / notes (classes CSS)
| Classe | Couleur |
|---|---|
| `t-green` | Vert |
| `t-violet` | Violet |
| `t-amber` | Ambre / orange |
| `t-sky` | Bleu ciel |
| `t-rose` | Rose |
| `t-teal` | Teal |

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
- Le `FileSystemFileHandle` est persisté en **IndexedDB** (base `liens-utiles-db` / store `fileHandles`)
  - clé `"mesLiens"` pour `mesLiens.js`
  - clé `"mesNotes"` pour `mesNotes.js`
- **1ère utilisation** : modale d'instruction → `showDirectoryPicker()` (l'utilisateur sélectionne le **dossier** du projet) → `dirHandle.getFileHandle("mesLiens.js")` récupère le fichier par nom → handle sauvegardé en IndexedDB
- **Sécurité** : on ne manipule jamais directement un fichier via le sélecteur — le fichier cible est obtenu programmatiquement par son nom depuis le dossier. Si le fichier est absent du dossier sélectionné (`NotFoundError`), la modale se ré-ouvre avec un message d'erreur rouge. Aucun fichier n'est écrasé accidentellement.
- **Utilisations suivantes** : sauvegarde directe sans dialogue (handle récupéré depuis IndexedDB, permission vérifiée/redemandée si nécessaire)

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
| ID | Rôle |
|---|---|
| `#modalCategorie` | Ajout d'une catégorie (nom + sélecteur de couleur) |
| `#modalConfirmSupprCat` | Confirmation de suppression de catégorie |
| `#modalLien` | Ajout d'un lien (nom, description, url) |
| `#modalConfirmSupprLien` | Confirmation de suppression d'un lien |
| `#modalEditLien` | Édition d'un lien existant (pré-rempli) |
| `#modalPremiereSauvegarde` | Instructions pour la première sauvegarde de `mesLiens.js` (avec `#erreurFichierLiens`) |

### mesNotes
| ID | Rôle |
|---|---|
| `#modalNote` | Création d'une note (titre + couleur) |
| `#modalEditNote` | Édition titre/couleur d'une note existante |
| `#modalConfirmSupprNote` | Confirmation de suppression de note |
| `#modalBloc` | Ajout ou édition d'un bloc — titre dynamique via `#modalBlocTitre` ; contient `#blocContentInput` (input, pour `b`/`p`) et `#blocContent` (textarea, pour `pre`/`ul`), un seul affiché à la fois |
| `#modalConfirmSupprBloc` | Confirmation de suppression de bloc |
| `#modalPremiereSauvegardeNotes` | Instructions pour la première sauvegarde de `mesNotes.js` (avec `#erreurFichierNotes`) |

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
