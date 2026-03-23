var i18n_en = {
  page_title: "Dashboard",
  page_title_admin: "Administration — doc-survival-kit",

  // Panel titles
  panel_taches_title: "myTasks",
  panel_notes_title: "myNotes",
  panel_liens_title: "myLinks",

  // mesTaches
  taches_subtitle: "everything I need to do",
  taches_input_placeholder: "New task…",
  taches_priority_normal: "Normal",
  taches_priority_urgent: "Urgent",
  taches_priority_later: "Later",
  taches_filter_all: "All",
  taches_filter_todo: "To do",
  taches_filter_done: "Done",
  taches_filter_urgent: "Urgent",
  taches_filter_normal: "Normal",
  taches_filter_later: "Later",
  taches_empty: "Nothing here yet.",
  taches_delete_title: "Delete",

  // mesNotes
  notes_subtitle: "everything I need to remember",
  notes_btn_save: "save",
  notes_btn_edit_mode: "edit mode",
  notes_btn_quit_edit_mode: "read mode",
  notes_btn_add: "+ new note",
  notes_empty: "No notes yet.",
  notes_btn_copy: "copy",
  notes_btn_copied: "copied ✓",
  notes_btn_edit_bloc: "edit",
  notes_btn_add_bloc: "+ add a block",
  notes_btn_edit_note: "edit",
  notes_btn_expand: "Expand",
  notes_btn_collapse: "Collapse",
  notes_btn_expand_all: "expand all",
  notes_btn_collapse_all: "collapse all",

  // mesLiens
  liens_subtitle: "everything I don't want to lose",
  liens_btn_save: "save",
  liens_btn_edit_mode: "edit mode",
  liens_btn_expand_all: "expand all",
  liens_btn_collapse_all: "collapse all",
  liens_btn_expand: "Expand",
  liens_btn_collapse: "Collapse",
  liens_btn_quit_edit_mode: "read mode",
  liens_btn_add_cat: "+ new category",
  liens_add_link_title: "Add a link",
  liens_del_cat_title: "Delete category",
  liens_edit_link_title: "Edit link",
  liens_del_link_title: "Delete link",

  // Colors
  color_green: "Green",
  color_violet: "Violet",
  color_amber: "Amber",
  color_sky: "Sky blue",
  color_rose: "Rose",
  color_teal: "Teal",

  // Common modals
  cancel: "Cancel",
  irreversible: "This action is irreversible.",
  irreversible_delete: "Delete",

  // Modal category
  modal_cat_title: "New category",
  modal_cat_label_name: "Name",
  modal_cat_placeholder_name: "e.g. Reading list…",
  modal_cat_label_color: "Color",
  modal_cat_btn_add: "Add",

  // Modal link
  modal_lien_title: "New link",
  modal_lien_label_name: "Name",
  modal_lien_placeholder_name: "e.g. Figma",
  modal_lien_label_desc: "Description",
  modal_lien_placeholder_desc: "e.g. UI design tool",
  modal_lien_label_url: "URL",
  modal_lien_btn_add: "Add",

  // Modal edit link
  modal_edit_lien_title: "Edit link",
  modal_edit_lien_btn_save: "Save",

  // Modal confirm delete link
  modal_suppr_lien_title: "Delete this link?",

  // Modal confirm delete category
  modal_suppr_cat_title: "Delete this category?",
  modal_suppr_cat_msg:
    "All links in this category will also be deleted. This action is irreversible.",

  // Modal first save (links & notes)
  modal_first_save_title: "First save",
  modal_first_save_intro:
    "A dialog box will open to select the project folder.",
  modal_first_save_navigate: "Navigate to the folder containing the file:",
  modal_first_save_once:
    "This step will only happen once. Subsequent saves will be direct.",
  modal_first_save_error_liens:
    "File not found in this folder. Please select the folder containing <strong>mesLiens.js</strong>.",
  modal_first_save_error_notes:
    "File not found in this folder. Please select the folder containing <strong>mesNotes.js</strong>.",
  modal_first_save_btn_choose: "Choose folder",

  // Modal note
  modal_note_title: "New note",
  modal_note_label_titre: "Title",
  modal_note_placeholder: "e.g. Git shortcuts…",
  modal_note_label_color: "Color",
  modal_note_btn_create: "Create",

  // Modal edit note
  modal_edit_note_title: "Edit note",
  modal_edit_note_btn_save: "Save",

  // Modal confirm delete note
  modal_suppr_note_title: "Delete this note?",
  modal_suppr_note_msg:
    "All blocks in this note will also be deleted. This action is irreversible.",

  // Modal block
  modal_bloc_label_type: "Type",
  modal_bloc_type_b: "Title",
  modal_bloc_type_p: "Text",
  modal_bloc_type_pre: "Code",
  modal_bloc_type_ul: "Bullet list",
  modal_bloc_type_table: "Table",
  modal_bloc_label_content: "Content",
  modal_bloc_new: "New block",
  modal_bloc_edit: "Edit block",
  modal_bloc_placeholder_ul: "One item per line…",
  modal_bloc_placeholder_pre: "Code…",
  modal_bloc_placeholder_b: "Title…",
  modal_bloc_placeholder_p: "Text…",
  modal_bloc_placeholder_table: "Header 1 | Header 2 | Header 3\nValue A | Value B | Value C\nValue D | Value E | Value F",
  modal_bloc_btn_save: "Save",

  // Modal confirm delete block
  modal_suppr_bloc_title: "Delete this block?",

  // Diagrams
  diag_page_title: "Diagrams",
  diag_btn_save: "save",
  diag_btn_new: "+ New",
  diag_my_diagrams: "My diagrams",
  diag_new_diagram: "New diagram",
  diag_tool_select:  "Select / Move",
  diag_tool_rect:    "Rectangle",
  diag_tool_rounded: "Rounded rectangle",
  diag_tool_db:      "Database",
  diag_tool_cloud:   "External service / Cloud",
  diag_tool_text:    "Free text",
  diag_tool_postit:  "Post-it (no arrow connection)",
  diag_tool_arrow:   "Arrow (click source → click target, or drag from a connection dot)",
  diag_tool_delete:  "Delete selection (Del)",
  diag_first_save_error: "File not found. Select the folder containing <strong>diagrammes.js</strong>.",
  diag_edit_text: "Edit text",

  // Admin
  admin_subtitle: "data reset",
  admin_why_title: "Why this page?",
  admin_why_p1:
    "The application stores your data in two places in your browser: <strong>localStorage</strong> (tasks, notes, links) and <strong>IndexedDB</strong> (the file handle for direct saving).",
  admin_why_p2:
    "This data <strong>is not deleted</strong> by clearing the cache or closing the browser. This page lets you erase it cleanly, for example to start fresh or resolve a sync issue between the file and the browser.",
  admin_why_p3:
    "<strong>Warning:</strong> these actions are irreversible. If you haven't saved your changes to <code>mesLiens.js</code> and <code>mesNotes.js</code>, your data will be lost.",
  admin_ls_label: "Clear localStorage",
  admin_ls_desc:
    "Deletes all tasks, notes and links stored in the browser. On next load, the application will start from the default data in <code>mesLiens.js</code> and <code>mesNotes.js</code>.",
  admin_idb_label: "Delete IndexedDB",
  admin_idb_desc:
    "Clears the stored file handle for direct saving. The next save will prompt you to select the project folder again, as on first use.",
  admin_execute_btn: "execute selected actions",
  admin_feedback_ls: "localStorage cleared.",
  admin_feedback_idb: "IndexedDB deleted.",
  admin_feedback_return: "Return to the dashboard to see the changes.",
  admin_lang_title: "Langue / Language",
  admin_lang_applied: "Language applied.",
};
