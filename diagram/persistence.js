// ══════════════════════════════════════
//  persistence.js — Chargement, sauvegarde, historique, verrou, zoom, File System API, images
// ══════════════════════════════════════

// ── Persistance localStorage ──
function loadDiagrammes() {
  try {
    var stored = JSON.parse(localStorage.getItem("mes_diagrammes"));
    if (stored && stored.length) {
      var migrate = function (list) {
        list.forEach(function (d) {
          if (!d.children) d.children = [];
          migrate(d.children);
        });
      };
      migrate(stored);
      return stored;
    }
  } catch (e) {}
  var defaults = JSON.parse(JSON.stringify(diagrammesDefaut));
  var migrate2 = function (list) {
    list.forEach(function (d) {
      if (!d.children) d.children = [];
      migrate2(d.children);
    });
  };
  migrate2(defaults);
  return defaults;
}

function saveDiagrammes() {
  localStorage.setItem("mes_diagrammes", JSON.stringify(diagramsList));
  checkDiffDiagrammes();
}

function pushHistory() {
  historyStack.push(JSON.stringify(diagramsList));
  if (historyStack.length > MAX_HISTORY) historyStack.shift();
}

function undoAction() {
  if (historyStack.length === 0) return;
  diagramsList = JSON.parse(historyStack.pop());
  if (!findDiagramById(currentDiagramId, diagramsList)) {
    currentDiagramId = diagramsList[0] ? String(diagramsList[0].id) : null;
  }
  saveDiagrammes();
  renderAll();
  renderDiagramList();
}

function checkDiffDiagrammes() {
  var stored = localStorage.getItem("mes_diagrammes");
  var diff = stored !== JSON.stringify(diagrammesDefaut);
  document.getElementById("btnSaveDiagram").style.display = diff ? "inline-flex" : "none";
}

// ── Verrouillage par diagramme ──
var LOCK_OPEN_SVG   = '<svg width="14" height="16" viewBox="0 0 14 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="7" width="12" height="8" rx="2"/><path d="M4 7V4.5a3 3 0 0 1 6 0"/></svg>';
var LOCK_CLOSED_SVG = '<svg width="14" height="16" viewBox="0 0 14 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="7" width="12" height="8" rx="2"/><path d="M4 7V5a3 3 0 0 1 6 0v2"/></svg>';

function getLockMap() {
  try { return JSON.parse(localStorage.getItem("diagrammes_lock") || "{}"); } catch(e) { return {}; }
}
function saveCurrentLock() {
  var diag = getCurrentDiagram();
  if (!diag) return;
  var map = getLockMap();
  map[diag.id] = boardLocked;
  localStorage.setItem("diagrammes_lock", JSON.stringify(map));
}
function restoreLockForDiagram(diagId) {
  var diag = findDiagramById(diagId, diagramsList);
  if (!diag) return;
  var map = getLockMap();
  boardLocked = map[diag.id] === true;
}
function toggleBoardLock() {
  boardLocked = !boardLocked;
  saveCurrentLock();
  if (boardLocked) {
    selectedId = null; selectedType = null;
    selectedIds = [];
    document.getElementById("colorPanel").style.display = "none";
    renderAll();
  }
  updateLockBtn();
}
function updateLockBtn() {
  var btn = document.getElementById("btnLock");
  if (!btn) return;
  btn.innerHTML = boardLocked ? LOCK_CLOSED_SVG : LOCK_OPEN_SVG;
  btn.title = boardLocked ? "Déverrouiller le diagramme" : "Verrouiller le diagramme";
  btn.classList.toggle("active", boardLocked);
}

// ── Zoom par diagramme ──
function getZoomMap() {
  try { return JSON.parse(localStorage.getItem("diagrammes_zoom") || "{}"); } catch(e) { return {}; }
}
function saveCurrentZoom() {
  var diag = getCurrentDiagram();
  if (!diag) return;
  var map = getZoomMap();
  map[diag.id] = viewTransform.scale;
  localStorage.setItem("diagrammes_zoom", JSON.stringify(map));
}
function restoreZoomForDiagram(diagId) {
  var diag = findDiagramById(diagId, diagramsList);
  if (!diag) return;
  var map = getZoomMap();
  viewTransform.scale = map[diag.id] !== undefined ? map[diag.id] : 1;
}

// ── File System Access API ──
var IDB_KEY_DIAG = "diagrammes";
var IDB_KEY_DIR  = "diagrammes_dir";

function ouvrirDB_Diag() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open("doc-survival-kit-db", 1);
    req.onupgradeneeded = function (e) {
      e.target.result.createObjectStore("fileHandles");
    };
    req.onsuccess = function (e) { resolve(e.target.result); };
    req.onerror  = function (e) { reject(e.target.error); };
  });
}

function sauvegarderHandle_Diag(handle) {
  return ouvrirDB_Diag().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction("fileHandles", "readwrite");
      tx.objectStore("fileHandles").put(handle, IDB_KEY_DIAG);
      tx.oncomplete = resolve;
      tx.onerror = function (e) { reject(e.target.error); };
    });
  });
}

function recupererHandle_Diag() {
  return ouvrirDB_Diag().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction("fileHandles", "readonly");
      var req = tx.objectStore("fileHandles").get(IDB_KEY_DIAG);
      req.onsuccess = function (e) { resolve(e.target.result || null); };
      req.onerror  = function (e) { reject(e.target.error); };
    });
  });
}

function sauvegarderDirHandle(handle) {
  return ouvrirDB_Diag().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction("fileHandles", "readwrite");
      tx.objectStore("fileHandles").put(handle, IDB_KEY_DIR);
      tx.oncomplete = resolve;
      tx.onerror = function (e) { reject(e.target.error); };
    });
  });
}

function recupererDirHandle() {
  return ouvrirDB_Diag().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction("fileHandles", "readonly");
      var req = tx.objectStore("fileHandles").get(IDB_KEY_DIR);
      req.onsuccess = function (e) { resolve(e.target.result || null); };
      req.onerror  = function (e) { reject(e.target.error); };
    });
  });
}

function enregistrerDiagrammes() {
  if (!("showDirectoryPicker" in window)) return;
  recupererHandle_Diag().then(function (handle) {
    if (!handle) {
      document.getElementById("erreurFichierDiag").style.display = "none";
      document.getElementById("modalPremiereSauvegardeDiag").classList.add("open");
    } else {
      ecrireFichierDiag(handle);
    }
  });
}

function fermerModalSauvegardeDiag() {
  document.getElementById("modalPremiereSauvegardeDiag").classList.remove("open");
}

function ouvrirSelecteurFichierDiag() {
  fermerModalSauvegardeDiag();
  var capturedDir = null;
  window.showDirectoryPicker()
    .then(function (dir) {
      capturedDir = dir;
      sauvegarderDirHandle(dir);
      return dir.getFileHandle("diagrammes.js");
    })
    .then(function (handle) {
      document.getElementById("erreurFichierDiag").style.display = "none";
      return sauvegarderHandle_Diag(handle).then(function () {
        return ecrireFichierDiag(handle);
      }).then(function () {
        if (pendingImageBlob && capturedDir) {
          var blob = pendingImageBlob;
          pendingImageBlob = null;
          enregistrerImageDansBoard(blob, capturedDir);
        }
      });
    })
    .catch(function (err) {
      if (err.name === "NotFoundError") {
        document.getElementById("erreurFichierDiag").style.display = "block";
        document.getElementById("modalPremiereSauvegardeDiag").classList.add("open");
      } else if (err.name !== "AbortError") {
        console.error(err);
      }
    });
}

function ecrireFichierDiag(handle) {
  return handle.queryPermission({ mode: "readwrite" })
    .then(function (p) {
      if (p !== "granted") return handle.requestPermission({ mode: "readwrite" });
      return p;
    })
    .then(function (p) {
      if (p !== "granted") return;
      var content = "var diagrammesDefaut = " + JSON.stringify(diagramsList, null, 2) + ";\n";
      return handle.createWritable().then(function (w) {
        return w.write(content).then(function () { return w.close(); });
      }).then(function () {
        diagrammesDefaut = JSON.parse(JSON.stringify(diagramsList));
        checkDiffDiagrammes();
      });
    })
    .catch(function (err) { console.error(err); });
}

// ── Image paste ──
function handleImagePaste(blob) {
  recupererDirHandle().then(function (dirHandle) {
    if (!dirHandle) {
      pendingImageBlob = blob;
      document.getElementById("erreurFichierDiag").style.display = "none";
      document.getElementById("modalPremiereSauvegardeDiag").classList.add("open");
    } else {
      dirHandle.queryPermission({ mode: "readwrite" }).then(function (p) {
        if (p !== "granted") return dirHandle.requestPermission({ mode: "readwrite" }).then(function (p2) { return p2; });
        return p;
      }).then(function (p) {
        if (p === "granted") enregistrerImageDansBoard(blob, dirHandle);
      });
    }
  });
}

function enregistrerImageDansBoard(blob, dirHandle) {
  var filename = "img_" + Date.now() + ".png";
  var src = "images/" + filename;
  dirHandle.getDirectoryHandle("images", { create: true })
    .then(function (imagesDir) {
      return imagesDir.getFileHandle(filename, { create: true });
    })
    .then(function (fileHandle) {
      return fileHandle.createWritable().then(function (w) {
        return w.write(blob).then(function () { return w.close(); });
      });
    })
    .then(function () {
      // Lire les dimensions réelles de l'image
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var maxW = 600;
        var w = Math.min(img.naturalWidth, maxW);
        var h = Math.round(img.naturalHeight * (w / img.naturalWidth));
        // Centrer sur la vue courante
        var svg = document.getElementById("canvas");
        var r = svg.getBoundingClientRect();
        var cx = Math.round((r.width  / 2 - viewTransform.x) / viewTransform.scale - w / 2);
        var cy = Math.round((r.height / 2 - viewTransform.y) / viewTransform.scale - h / 2);
        var diag = getCurrentDiagram();
        var shape = { id: "s" + Date.now(), type: "image", x: cx, y: cy, w: w, h: h, text: "", color: "", src: src };
        diag.shapes.push(shape);
        selectedIds = [shape.id];  selectedId = shape.id;  selectedType = "shape";
        saveDiagrammes();
        renderAll();
        document.getElementById("colorPanel").style.display = "none";
      };
      img.src = url;
    })
    .catch(function (err) { console.error("Image paste error:", err); });
}
