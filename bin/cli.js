#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const DEST_DIR = path.join(process.cwd(), "kit-doc-survie");
const SRC_DIR = path.join(__dirname, "..");
const APP_FILES = [
  "index.html",
  "style.css",
  "liens.js",
  "taches.js",
  "notes.js",
];
const DATA_FILES = ["mesLiens.js", "mesNotes.js"];

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
  console.log("Le dossier kit-doc-survie existe déjà.");
  console.log("Ouverture de l'application...");
  openBrowser(htmlFile);
} else {
  fs.mkdirSync(DEST_DIR, { recursive: true });

  // Fichiers app (toujours copiés)
  for (const file of APP_FILES) {
    fs.copyFileSync(path.join(SRC_DIR, file), path.join(DEST_DIR, file));
  }

  // Fichiers de données (copiés seulement à la création)
  for (const file of DATA_FILES) {
    fs.copyFileSync(path.join(SRC_DIR, file), path.join(DEST_DIR, file));
  }

  console.log("kit-doc-survie créé dans : " + DEST_DIR);
  console.log("");
  console.log("Note : tes données sont sauvegardées dans ce dossier.");
  console.log("       Ouvre toujours le fichier depuis ce même dossier.");
  console.log("");
  console.log("Ouverture de l'application...");
  console.log("(Utilise Chrome ou Edge pour la sauvegarde de fichiers)");
  openBrowser(htmlFile);
}
