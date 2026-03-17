# mesTaches. & mesLiens.

> Un mini-dashboard de productivité en un seul fichier HTML — zéro dépendance, zéro serveur, zéro compromis sur la sécurité.

![Aperçu du dashboard](mon_dashboard.jpg)

## Pourquoi ce projet ?

Certains environnements de travail sont **hautement sécurisés** : pas d'accès aux outils classiques de suivi des tâches, pas d'accès aux CDN, pas de possibilité d'installer quoi que ce soit.

Et pourtant, votre productivité dépend de votre capacité à **consigner vos tâches** et vos **liens utiles** quelque part, puis à les retrouver chaque matin.

Ce projet résout ce problème : un **unique fichier HTML** que vous déposez sur votre bureau et qui fonctionne dans n'importe quel navigateur, même hors ligne.

## Fonctionnalités

**mesTaches.** — Gestionnaire de tâches

- Ajout rapide de tâches avec niveau de priorité (Normal, Urgent, Plus tard)
- Filtres par statut : Tout, À faire, Fait, Urgent, Normal, Plus tard
- Case à cocher pour marquer une tâche comme terminée
- Suppression individuelle

**mesLiens.** — Répertoire de liens utiles

- Liens organisés par catégories personnalisables (Dev & Code, Design & Inspi, Outils, Veille…)
- Affichage clair avec nom et description

**Commun aux deux**

- Persistance des données via `localStorage` — vos contenus survivent à la fermeture du navigateur
- Aucune dépendance externe : HTML, CSS et JavaScript Vanilla uniquement
- Fonctionne en local, hors ligne, sans serveur

## Démarrage rapide

1. Clonez ou téléchargez ce dépôt
2. Ouvrez le fichier `index.html` dans votre navigateur
3. C'est tout.

```bash
git clone https://github.com/ymedaghri/liens-utiles.git
cd liens-utiles
open index.html   # macOS
# ou
start index.html  # Windows
```

## Stack technique

| Technologie | Détail |
|---|---|
| HTML | Structure sémantique, fichier unique |
| CSS | Styles intégrés, aucun framework |
| JavaScript | Vanilla, aucune bibliothèque tierce |
| Stockage | `localStorage` du navigateur |

## Licence

Ce projet est libre de droits. Utilisez-le, modifiez-le, partagez-le comme bon vous semble.
