# liens-utiles — Description du projet

## Vue d'ensemble

Application web sans framework ni dépendance externe, conçue pour fonctionner en mode **`file://`** (ouverture directe dans le navigateur, sans serveur HTTP).

Fichiers du projet :
- `liens-utiles.html` — HTML, CSS et JavaScript principal
- `mesLiens.js` — données par défaut de `mesLiens`, chargé via `<script src="mesLiens.js">` avant le script principal

Layout deux colonnes côte à côte (flex), responsive (colonne unique sous 860px) :
- **Gauche** — `mesTaches` : gestionnaire de tâches avec priorités et filtres
- **Droite** — `mesLiens` : gestionnaire de liens organisés par catégories

Layout deux colonnes côte à côte (flex), responsive (colonne unique sous 860px) :
- **Gauche** — `mesTaches` : gestionnaire de tâches avec priorités et filtres
- **Droite** — `mesLiens` : gestionnaire de liens organisés par catégories

---

## Panel gauche — mesTaches

### Persistance
Stocké dans `localStorage` sous la clé `"mes_taches"`.

### Structure d'une tâche
```json
{ "id": 1700000000000, "text": "...", "priority": "normal", "done": false }
```
`priority` accepte : `"urgent"`, `"normal"`, `"later"`

### Fonctions JS clés
| Fonction | Rôle |
|---|---|
| `load()` | Lit le tableau de tâches depuis localStorage |
| `save(tasks)` | Persiste le tableau |
| `addTask()` | Ajoute une tâche depuis l'input + select |
| `toggle(id)` | Bascule l'état done/undone |
| `remove(id)` | Supprime une tâche |
| `setFilter(f, btn)` | Change le filtre actif |
| `render()` | Restitue la liste filtrée dans `#taskList` |
| `esc(s)` | Échappe le HTML pour éviter les injections |

### Couleurs par priorité (classes CSS)
- `.task-urgent` — rouge rosé
- `.task-normal` — bleu
- `.task-later` — gris

---

## Panel droit — mesLiens

### Persistance
Stocké dans `localStorage` sous la clé `"mes_liens"`.
Au premier chargement, si la clé est absente, on initialise avec `mesLiensDefaut`.

### Données par défaut
`mesLiensDefaut` est déclaré dans **`mesLiens.js`** (variable globale `var`) et chargé via `<script src="mesLiens.js">` placé avant le script principal dans le HTML. Cette approche est compatible avec le mode `file://` (contrairement à `fetch()` qui nécessite un serveur HTTP).

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

### Fonctions JS clés
| Fonction | Rôle |
|---|---|
| `loadLiens()` | Lit le tableau depuis localStorage (fallback sur `mesLiensDefaut`) |
| `saveLiens(data)` | Persiste le tableau |
| `renderLiens()` | Génère tout le HTML des sections à partir des données |
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

### Thèmes de catégories (classes CSS)
| Classe | Couleur |
|---|---|
| `t-green` | Vert |
| `t-violet` | Violet |
| `t-amber` | Ambre / orange |
| `t-sky` | Bleu ciel |
| `t-rose` | Rose |
| `t-teal` | Teal |

---

## Mode édition

Le mode édition est piloté par la classe CSS `.edit-mode` posée sur `#linksContainer`.

- **Hors mode édition** : les boutons d'action (`.cat-actions`, `.link-actions`) sont masqués (`opacity: 0`). Le bouton "nouvelle catégorie" est également masqué (`display: none`).
- **En mode édition** : `.edit-mode .cat-actions` et `.edit-mode .link-actions` passent en `opacity: 1`. Le bouton "nouvelle catégorie" réapparaît via `.inner:has(#linksContainer.edit-mode) .btn-add-cat`.
- Le bouton toggle `#btnEditMode` change uniquement son texte ("passer en mode édition" / "quitter le mode édition"), sans changement d'apparence visuelle.

---

## Modales

Toutes les modales partagent la même structure `.modal-backdrop > .modal` et la classe `.open` pour l'affichage.

| ID | Rôle |
|---|---|
| `#modalCategorie` | Ajout d'une catégorie (nom + sélecteur de couleur) |
| `#modalConfirmSupprCat` | Confirmation de suppression de catégorie |
| `#modalLien` | Ajout d'un lien (nom, description, url) |
| `#modalConfirmSupprLien` | Confirmation de suppression d'un lien |
| `#modalEditLien` | Édition d'un lien existant (pré-rempli) |

Toutes les modales se ferment en cliquant sur le fond (`.modal-backdrop`).

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
