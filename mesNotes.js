var mesNotesDefaut = [
  {
    "id": 1700000000001,
    "theme": "t-green",
    "titre": "Commandes Git",
    "blocs": [
      { "type": "b", "content": "Annuler le dernier commit (garder les modifs)" },
      { "type": "pre", "content": "git reset --soft HEAD~1" },
      { "type": "b", "content": "Stash — mettre de côté" },
      { "type": "pre", "content": "git stash\ngit stash pop" },
      { "type": "b", "content": "Rebaser sur main" },
      { "type": "pre", "content": "git fetch origin\ngit rebase origin/main" },
      { "type": "b", "content": "Voir les branches distantes" },
      { "type": "pre", "content": "git branch -r" }
    ]
  },
  {
    "id": 1700000000002,
    "theme": "t-sky",
    "titre": "Raccourcis VS Code",
    "blocs": [
      { "type": "b", "content": "Édition" },
      {
        "type": "ul",
        "items": [
          "Ctrl+D — sélectionner le mot suivant",
          "Alt+↑/↓ — déplacer la ligne",
          "Ctrl+Shift+K — supprimer la ligne",
          "Ctrl+/ — commenter / décommenter"
        ]
      },
      { "type": "b", "content": "Navigation" },
      {
        "type": "ul",
        "items": [
          "Ctrl+P — ouvrir un fichier",
          "Ctrl+Shift+F — recherche globale",
          "Ctrl+` — ouvrir le terminal",
          "Ctrl+B — afficher/masquer l'explorateur"
        ]
      }
    ]
  },
  {
    "id": 1700000000003,
    "theme": "t-amber",
    "titre": "Regex utiles",
    "blocs": [
      {
        "type": "table",
        "headers": ["Sujet", "Expression"],
        "rows": [
          ["Email", "^[\\w.-]+@[\\w.-]+\\.[a-z]{2,}$"],
          ["URL", "https?:\\/\\/[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=%]+"],
          ["Date JJ/MM/AAAA", "^(0[1-9]|[12]\\d|3[01])\\/(0[1-9]|1[0-2])\\/\\d{4}$"]
        ]
      },
      {
        "type": "table",
        "headers": ["Flag", "Description"],
        "rows": [
          ["g", "global — toutes les occurrences"],
          ["i", "insensible à la casse"],
          ["m", "multiligne (^ et $ par ligne)"]
        ]
      }
    ]
  },
  {
    "id": 1700000000004,
    "theme": "t-violet",
    "titre": "Comment utiliser mesNotes",
    "blocs": [
      { "type": "p", "content": "Chaque note est composée de blocs que tu empiles librement." },
      { "type": "b", "content": "Types de blocs disponibles" },
      {
        "type": "ul",
        "items": [
          "Titre — texte court mis en gras",
          "Texte — paragraphe libre",
          "Code — bloc monospace à fond gris",
          "Liste — bullet points, un élément par ligne",
          "Tableau — lignes séparées par |, 1re ligne = en-têtes"
        ]
      },
      { "type": "b", "content": "Pour modifier" },
      { "type": "p", "content": "Active le mode édition pour ajouter, modifier ou supprimer des blocs et des notes. N'oublie pas d'enregistrer les modifications dans le fichier." }
    ]
  }
];
