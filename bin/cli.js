#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const DEST_DIR = path.join(process.cwd(), "doc-survival-kit");
const SRC_DIR = path.join(__dirname, "..");
const APP_FILES = [
  "admin.html",
  "diagram.html",
  "index.html",
  "liens.js",
  "notes.js",
  "style.css",
  "taches.js",
];
const REFACTORED_FILES = [
  "diagram/diagrams.js",
  "diagram/events.js",
  "diagram/globals.js",
  "diagram/links.js",
  "diagram/persistence.js",
  "diagram/render.js",
  "diagram/shape-ops.js",
  "diagram/text-edit.js",
];

const DATA_FILES = ["mesLiens.js", "mesNotes.js", "diagrammes.js"];
const I18N_FILES = ["i18n/fr.js", "i18n/en.js", "i18n/i18n.js"];
const IMAGES_FILES = [
  "images/img_1774270331723.png",
  "images/img_1774709818351.png",
  "images/img_1774711575731.png",
  "images/img_1774712426980.png",
  "images/img_1774817912280.png",
];

function openBrowser(filePath) {
  const url = "file://" + filePath;
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) {
      console.log("Ouvre manuellement dans Chrome ou Edge :");
      console.log(filePath);
    }
  });
}

const htmlFile = path.join(DEST_DIR, "index.html");

if (fs.existsSync(DEST_DIR)) {
  console.log("Le dossier doc-survival-kit existe déjà.");
  console.log("Ouverture de l'application...");
  openBrowser(htmlFile);
} else {
  fs.mkdirSync(DEST_DIR, { recursive: true });

  // Fichiers app (toujours copiés)
  for (const file of APP_FILES) {
    fs.copyFileSync(path.join(SRC_DIR, file), path.join(DEST_DIR, file));
  }

  // Fichiers modularisés (toujours copiés)
  fs.mkdirSync(path.join(DEST_DIR, "diagram"), { recursive: true });
  for (const file of REFACTORED_FILES) {
    fs.copyFileSync(path.join(SRC_DIR, file), path.join(DEST_DIR, file));
  }

  // Fichiers i18n (toujours copiés)
  fs.mkdirSync(path.join(DEST_DIR, "i18n"), { recursive: true });
  for (const file of I18N_FILES) {
    fs.copyFileSync(path.join(SRC_DIR, file), path.join(DEST_DIR, file));
  }

  // Fichiers i18n (toujours copiés)
  fs.mkdirSync(path.join(DEST_DIR, "images"), { recursive: true });
  for (const file of IMAGES_FILES) {
    fs.copyFileSync(path.join(SRC_DIR, file), path.join(DEST_DIR, file));
  }
  // Fichiers de données (copiés seulement à la création)
  for (const file of DATA_FILES) {
    fs.copyFileSync(path.join(SRC_DIR, file), path.join(DEST_DIR, file));
  }

  console.log("doc-survival-kit créé dans : " + DEST_DIR);
  console.log("");
  console.log("Note : tes données sont sauvegardées dans ce dossier.");
  console.log("       Ouvre toujours le fichier depuis ce même dossier.");
  console.log("");
  console.log("Ouverture de l'application...");
  console.log("(Utilise Chrome ou Edge pour la sauvegarde de fichiers)");
  openBrowser(htmlFile);
}
