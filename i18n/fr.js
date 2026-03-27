var i18n_fr = {
  page_title: "Dashboard",
  page_title_admin: "Administration — doc-survival-kit",

  // Titres des panels
  panel_taches_title: "mesTaches",
  panel_notes_title: "mesNotes",
  panel_liens_title: "mesLiens",

  // mesTaches
  taches_subtitle: "tout ce que je dois faire",
  taches_input_placeholder: "Nouvelle tâche…",
  taches_priority_normal: "Normal",
  taches_priority_urgent: "Urgent",
  taches_priority_later: "Plus tard",
  taches_filter_all: "Tout",
  taches_filter_todo: "À faire",
  taches_filter_done: "Fait",
  taches_filter_urgent: "Urgent",
  taches_filter_normal: "Normal",
  taches_filter_later: "Plus tard",
  taches_empty: "Rien ici pour l'instant.",
  taches_delete_title: "Supprimer",

  // mesNotes
  notes_subtitle: "tout ce que je dois hélas retenir",
  notes_btn_save: "enregistrer",
  notes_btn_edit_mode: "mode édition",
  notes_btn_quit_edit_mode: "mode lecture",
  notes_btn_add: "+ nouvelle note",
  notes_empty: "Aucune note pour l'instant.",
  notes_btn_copy: "copier",
  notes_btn_copied: "copié ✓",
  notes_btn_edit_bloc: "modifier",
  notes_btn_add_bloc: "+ ajouter un bloc",
  notes_btn_edit_note: "modifier",
  notes_btn_expand: "Développer",
  notes_btn_collapse: "Réduire",
  notes_btn_expand_all: "tout développer",
  notes_btn_collapse_all: "tout réduire",

  // mesLiens
  liens_subtitle: "tout ce que je ne veux pas perdre",
  liens_btn_save: "enregistrer",
  liens_btn_edit_mode: "mode édition",
  liens_btn_expand_all: "tout développer",
  liens_btn_collapse_all: "tout réduire",
  liens_btn_expand: "Développer",
  liens_btn_collapse: "Réduire",
  liens_btn_quit_edit_mode: "mode lecture",
  liens_btn_add_cat: "+ nouvelle catégorie",
  liens_add_link_title: "Ajouter un lien",
  liens_del_cat_title: "Supprimer la catégorie",
  liens_edit_link_title: "Modifier le lien",
  liens_del_link_title: "Supprimer le lien",

  // Couleurs
  color_green: "Vert",
  color_violet: "Violet",
  color_amber: "Ambre",
  color_sky: "Bleu ciel",
  color_rose: "Rose",
  color_teal: "Teal",

  // Commun modales
  cancel: "Annuler",
  irreversible: "Cette action est irréversible.",
  irreversible_delete: "Supprimer",

  // Modal catégorie
  modal_cat_title: "Nouvelle catégorie",
  modal_cat_label_name: "Nom",
  modal_cat_placeholder_name: "ex : Lectures…",
  modal_cat_label_color: "Couleur",
  modal_cat_btn_add: "Ajouter",

  // Modal lien
  modal_lien_title: "Nouveau lien",
  modal_lien_label_name: "Nom",
  modal_lien_placeholder_name: "ex : Figma",
  modal_lien_label_desc: "Description",
  modal_lien_placeholder_desc: "ex : Outil de design UI",
  modal_lien_label_url: "URL",
  modal_lien_btn_add: "Ajouter",

  // Modal edit lien
  modal_edit_lien_title: "Modifier le lien",
  modal_edit_lien_btn_save: "Enregistrer",

  // Modal confirm suppr lien
  modal_suppr_lien_title: "Supprimer le lien ?",

  // Modal confirm suppr cat
  modal_suppr_cat_title: "Supprimer la catégorie ?",
  modal_suppr_cat_msg:
    "Tous les liens de cette catégorie seront également supprimés. Cette action est irréversible.",

  // Modal première sauvegarde (liens & notes)
  modal_first_save_title: "Première sauvegarde",
  modal_first_save_intro:
    "Une boîte de dialogue va s'ouvrir pour sélectionner le dossier du projet.",
  modal_first_save_navigate: "Navigue jusqu'au dossier contenant le fichier :",
  modal_first_save_once:
    "Cette étape n'aura lieu qu'une seule fois. Les sauvegardes suivantes seront directes.",
  modal_first_save_error_liens:
    "Fichier introuvable dans ce dossier. Sélectionne le dossier qui contient <strong>mesLiens.js</strong>.",
  modal_first_save_error_notes:
    "Fichier introuvable dans ce dossier. Sélectionne le dossier qui contient <strong>mesNotes.js</strong>.",
  modal_first_save_btn_choose: "Choisir le dossier",

  // Modal note
  modal_note_title: "Nouvelle note",
  modal_note_label_titre: "Titre",
  modal_note_placeholder: "ex : Raccourcis Git…",
  modal_note_label_color: "Couleur",
  modal_note_btn_create: "Créer",

  // Modal edit note
  modal_edit_note_title: "Modifier la note",
  modal_edit_note_btn_save: "Enregistrer",

  // Modal confirm suppr note
  modal_suppr_note_title: "Supprimer la note ?",
  modal_suppr_note_msg:
    "Tous les blocs de cette note seront également supprimés. Cette action est irréversible.",

  // Modal bloc
  modal_bloc_label_type: "Type",
  modal_bloc_type_b: "Titre",
  modal_bloc_type_p: "Texte",
  modal_bloc_type_pre: "Code",
  modal_bloc_type_ul: "Liste à puces",
  modal_bloc_type_table: "Tableau",
  modal_bloc_label_content: "Contenu",
  modal_bloc_new: "Nouveau bloc",
  modal_bloc_edit: "Modifier le bloc",
  modal_bloc_placeholder_ul: "Un élément par ligne…",
  modal_bloc_placeholder_pre: "Code…",
  modal_bloc_placeholder_b: "Titre…",
  modal_bloc_placeholder_p: "Texte…",
  modal_bloc_placeholder_table: "En-tête 1 | En-tête 2 | En-tête 3\nValeur A | Valeur B | Valeur C\nValeur D | Valeur E | Valeur F",
  modal_bloc_btn_save: "Enregistrer",

  // Modal confirm suppr bloc
  modal_suppr_bloc_title: "Supprimer le bloc ?",

  // Diagrammes
  diag_page_title: "Diagrammes",
  diag_btn_save: "enregistrer",
  diag_btn_new: "+ Nouveau",
  diag_my_diagrams: "Mes diagrammes",
  diag_new_diagram: "Nouveau diagramme",
  diag_tool_select:  "Sélectionner / Déplacer",
  diag_tool_rect:    "Rectangle",
  diag_tool_rounded: "Rectangle arrondi",
  diag_tool_db:      "Base de données",
  diag_tool_cloud:   "Service externe / Ellipse",
  diag_tool_nuage:   "Nuage",
  diag_tool_actor:   "Acteur (UML)",
  diag_tool_text:    "Texte libre",
  diag_tool_postit:  "Post-it (sans connexion de flèche)",
  diag_tool_arrow:   "Flèche (clic source → clic cible, ou drag depuis un point de connexion)",
  diag_tool_delete:  "Supprimer la sélection (Del)",
  diag_first_save_error: "Fichier introuvable. Sélectionne le dossier contenant <strong>diagrammes.js</strong>.",
  diag_edit_text: "Modifier le texte",
  diag_tool_table:       "Tableau",
  diag_table_title:      "Éditer le tableau",
  diag_table_add_row:    "+ Ligne",
  diag_table_remove_row: "− Ligne",
  diag_table_add_col:    "+ Colonne",
  diag_table_remove_col: "− Colonne",
  diag_table_btn_save:   "Valider",

  // Admin
  admin_subtitle: "réinitialisation des données",
  admin_why_title: "Pourquoi cette page ?",
  admin_why_p1:
    "L'application stocke tes données à deux endroits dans ton navigateur : le <strong>localStorage</strong> (tâches, notes, liens) et l'<strong>IndexedDB</strong> (le handle du fichier pour la sauvegarde directe).",
  admin_why_p2:
    "Ces données <strong>ne sont pas supprimées</strong> en vidant le cache classique ou en fermant le navigateur. Cette page te permet de les effacer proprement, par exemple pour repartir d'une installation vierge ou résoudre un problème de synchronisation entre le fichier et le navigateur.",
  admin_why_p3:
    "<strong>Attention :</strong> ces actions sont irréversibles. Si tu n'as pas sauvegardé tes modifications dans les fichiers <code>mesLiens.js</code> et <code>mesNotes.js</code>, tes données seront perdues.",
  admin_ls_label: "Effacer le localStorage",
  admin_ls_desc:
    "Supprime toutes les tâches, notes et liens mémorisés dans le navigateur. Au prochain chargement, l'application repart des données par défaut contenues dans <code>mesLiens.js</code> et <code>mesNotes.js</code>.",
  admin_idb_label: "Supprimer l'IndexedDB",
  admin_idb_desc:
    "Efface le handle de fichier mémorisé pour la sauvegarde directe. La prochaine sauvegarde te demandera à nouveau de sélectionner le dossier du projet, comme lors de la première utilisation.",
  admin_execute_btn: "exécuter les actions sélectionnées",
  admin_feedback_ls: "localStorage effacé.",
  admin_feedback_idb: "IndexedDB supprimée.",
  admin_feedback_return:
    "Retourne sur le dashboard pour constater les changements.",
  admin_lang_title: "Langue / Language",
  admin_lang_applied: "Langue appliquée.",
};
