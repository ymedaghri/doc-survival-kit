// ══════════════════════════════════════
//  mesDiagrammes — Éditeur SVG
// ══════════════════════════════════════

// ── État global ──
var currentTool = "select";
var diagramsList = [];
var currentDiagramIdx = 0;
var viewTransform = { x: 60, y: 60, scale: 1 };
var selectedId = null;
var selectedType = null;   // "shape" | "arrow"
var selectedIds = [];      // multi-sélection (ids de formes)
var rubberBandState = null; // { sx, sy } pendant le lasso
var clipboard = [];        // formes copiées (Ctrl+C / Ctrl+V)
var pendingImageBlob = null;    // image en attente de sélection du dossier
var pendingNewDiagram = false;  // true pendant la saisie du nom d'un nouveau diagramme
var dragState = null;
var panStart = null;
var arrowSrcId = null;
var editingShapeId = null;
var editingTableCell = null;  // { row, col } | null
var pickMode = null;          // "fontSize" | "fullStyle" | null
var pickTargetIds = [];       // selectedIds sauvegardés pendant le pick
var lastClickTime = 0;
var lastClickShapeId = null;
var lastClickArrowId = null;
var editingArrowId = null;
var boardLocked = false;
var diagDragSrcIdx = null;
var historyStack = [];
var MAX_HISTORY = 50;

// ── Helpers tableau ──
function getColWidths(shape) {
  var cols = shape.cols || 3;
  if (shape.colWidths && shape.colWidths.length === cols) return shape.colWidths;
  var w = shape.w / cols;
  var result = [];
  for (var i = 0; i < cols; i++) result.push(w);
  return result;
}

// xOffsets[i] = x du début de la colonne i (relatif à shape.x)
function getColOffsets(shape) {
  var cw = getColWidths(shape);
  var offsets = [0];
  for (var i = 0; i < cw.length - 1; i++) offsets.push(offsets[i] + cw[i]);
  return offsets;
}

// ── Palette ──
var COLORS = {
  "t-green":  { fill: "rgba(209,250,229,0.75)", stroke: "#059669", text: "#047857" },
  "t-violet": { fill: "rgba(237,233,254,0.75)", stroke: "#7c3aed", text: "#6d28d9" },
  "t-amber":  { fill: "rgba(254,243,199,0.75)", stroke: "#d97706", text: "#b45309" },
  "t-sky":    { fill: "rgba(224,242,254,0.75)", stroke: "#0284c7", text: "#0369a1" },
  "t-rose":   { fill: "rgba(255,228,230,0.75)", stroke: "#e11d48", text: "#be123c" },
  "t-teal":   { fill: "rgba(204,251,241,0.75)", stroke: "#0d9488", text: "#0f766e" },
};
var DEFAULT_COLOR = "t-sky";

var DEFAULT_SIZES = {
  rect:    { w: 130, h: 50 },
  rounded: { w: 130, h: 50 },
  db:      { w: 100, h: 65 },
  cloud:   { w: 110, h: 65 },
  nuage:   { w: 121, h: 96 },
  text:    { w: 110, h: 34 },
  postit:  { w: 130, h: 110 },
  actor:   { w: 60,  h: 90 },
  table:   { w: 210, h: 120 },
};

// ── Helpers ──
function escDiag(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createSVGEl(tag) {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

// Découpe le texte d'un post-it en lignes qui tiennent dans maxWidth px.
// Respecte les \n explicites, puis fait du word-wrap sur les mots.
var _measureCanvas = null;
function measureText(str, fontSize, fontWeight) {
  if (!_measureCanvas) _measureCanvas = document.createElement("canvas");
  var ctx = _measureCanvas.getContext("2d");
  ctx.font = (fontWeight || "600") + " " + (fontSize || 12) + "px \"Segoe UI\",system-ui,sans-serif";
  return ctx.measureText(str).width;
}

function wrapPostitLines(text, maxWidth, fontSize) {
  var fs = fontSize || 12;
  var result = [];
  (text || "").split("\n").forEach(function (line) {
    if (line === "") { result.push(""); return; }
    var words = line.split(" ");
    var current = "";
    words.forEach(function (word) {
      // Si le mot seul dépasse maxWidth, le couper caractère par caractère
      if (measureText(word, fs, "600") > maxWidth) {
        if (current !== "") { result.push(current); current = ""; }
        var chunk = "";
        for (var ci = 0; ci < word.length; ci++) {
          var chunkTest = chunk + word[ci];
          if (measureText(chunkTest, fs, "600") > maxWidth) {
            if (chunk !== "") result.push(chunk);
            chunk = word[ci];
          } else {
            chunk = chunkTest;
          }
        }
        current = chunk;
        return;
      }
      var test = current ? current + " " + word : word;
      if (current && measureText(test, fs, "600") > maxWidth) {
        result.push(current);
        current = word;
      } else {
        current = test;
      }
    });
    if (current !== "") result.push(current);
  });
  return result;
}

function getCurrentDiagram() {
  return diagramsList[currentDiagramIdx] || null;
}

// ── Persistance localStorage ──
function loadDiagrammes() {
  try {
    var stored = JSON.parse(localStorage.getItem("mes_diagrammes"));
    if (stored && stored.length) return stored;
  } catch (e) {}
  return JSON.parse(JSON.stringify(diagrammesDefaut));
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
  if (currentDiagramIdx >= diagramsList.length) currentDiagramIdx = diagramsList.length - 1;
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
  var diag = diagramsList[currentDiagramIdx];
  if (!diag) return;
  var map = getLockMap();
  map[diag.id] = boardLocked;
  localStorage.setItem("diagrammes_lock", JSON.stringify(map));
}
function restoreLockForDiagram(idx) {
  var diag = diagramsList[idx];
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
  var diag = diagramsList[currentDiagramIdx];
  if (!diag) return;
  var map = getZoomMap();
  map[diag.id] = viewTransform.scale;
  localStorage.setItem("diagrammes_zoom", JSON.stringify(map));
}
function restoreZoomForDiagram(idx) {
  var diag = diagramsList[idx];
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

// ── Coordonnées SVG ──
function svgPoint(clientX, clientY) {
  var svg = document.getElementById("canvas");
  var rect = svg.getBoundingClientRect();
  return {
    x: (clientX - rect.left - viewTransform.x) / viewTransform.scale,
    y: (clientY - rect.top  - viewTransform.y) / viewTransform.scale,
  };
}

function updateViewport() {
  var vp = document.getElementById("viewport");
  vp.setAttribute(
    "transform",
    "translate(" + viewTransform.x + "," + viewTransform.y + ") scale(" + viewTransform.scale + ")"
  );
  document.getElementById("zoomLevel").textContent =
    Math.round(viewTransform.scale * 100) + "%";
  updateTableOverlay();
}

// ── Zoom ──
function zoomIn()    { applyZoom(1.2, null, null); }
function zoomOut()   { applyZoom(1 / 1.2, null, null); }
function resetZoom() { viewTransform = { x: 60, y: 60, scale: 1 }; updateViewport(); saveCurrentZoom(); }

function applyZoom(factor, cx, cy) {
  var newScale = Math.min(4, Math.max(0.15, viewTransform.scale * factor));
  if (cx !== null && cy !== null) {
    viewTransform.x = cx - (cx - viewTransform.x) * (newScale / viewTransform.scale);
    viewTransform.y = cy - (cy - viewTransform.y) * (newScale / viewTransform.scale);
  }
  viewTransform.scale = newScale;
  updateViewport();
  saveCurrentZoom();
}

// ── Rendu des formes ──
function renderShape(shape) {
  var c = COLORS[shape.color] || COLORS[DEFAULT_COLOR];
  var isSel = selectedIds.indexOf(shape.id) !== -1;
  var stroke = isSel ? "#f97316" : c.stroke;
  var sw = isSel ? 2.5 : 1.5;

  var g = createSVGEl("g");
  g.setAttribute("data-id", shape.id);
  g.setAttribute("data-type", "shape");
  g.classList.add("shape-group");

  // ── Fond selon le type ──
  if (shape.type === "rect" || shape.type === "rounded") {
    var rx = shape.type === "rounded" ? 12 : 3;
    var r = createSVGEl("rect");
    r.setAttribute("x", shape.x);       r.setAttribute("y", shape.y);
    r.setAttribute("width", shape.w);   r.setAttribute("height", shape.h);
    r.setAttribute("rx", rx);
    r.setAttribute("fill", c.fill);     r.setAttribute("stroke", stroke);
    r.setAttribute("stroke-width", sw);
    g.appendChild(r);

  } else if (shape.type === "db") {
    var ry = Math.min(12, shape.h * 0.2);
    var cx = shape.x + shape.w / 2;
    // Corps : path latéral + arc bas
    var body = createSVGEl("path");
    body.setAttribute("d", [
      "M", shape.x, shape.y + ry,
      "L", shape.x, shape.y + shape.h - ry,
      "A", shape.w / 2, ry, 0, 0, 0, shape.x + shape.w, shape.y + shape.h - ry,
      "L", shape.x + shape.w, shape.y + ry,
      "A", shape.w / 2, ry, 0, 0, 0, shape.x, shape.y + ry,
      "Z",
    ].join(" "));
    body.setAttribute("fill", c.fill);
    body.setAttribute("stroke", stroke);
    body.setAttribute("stroke-width", sw);
    g.appendChild(body);
    // Ellipse du haut (face visible)
    var topEl = createSVGEl("ellipse");
    topEl.setAttribute("cx", cx);              topEl.setAttribute("cy", shape.y + ry);
    topEl.setAttribute("rx", shape.w / 2);     topEl.setAttribute("ry", ry);
    topEl.setAttribute("fill", c.fill);
    topEl.setAttribute("stroke", stroke);      topEl.setAttribute("stroke-width", sw);
    g.appendChild(topEl);

  } else if (shape.type === "cloud") {
    // Ellipse en trait continu = service externe / cloud
    var el = createSVGEl("ellipse");
    el.setAttribute("cx", shape.x + shape.w / 2);
    el.setAttribute("cy", shape.y + shape.h / 2);
    el.setAttribute("rx", shape.w / 2);
    el.setAttribute("ry", shape.h / 2);
    el.setAttribute("fill", c.fill);
    el.setAttribute("stroke", stroke);
    el.setAttribute("stroke-width", sw);
    g.appendChild(el);

  } else if (shape.type === "nuage") {
    // Nuage — contour extérieur du Bootstrap cloud icon (viewBox 0 0 16 16)
    // Le path se referme exactement : endpoint = startpoint, Z explicite
    var nuageG = createSVGEl("g");
    nuageG.setAttribute("transform",
      "translate(" + shape.x + "," + shape.y + ") scale(" + (shape.w / 16) + "," + (shape.h / 16) + ")"
    );
    var nuagePathEl = createSVGEl("path");
    nuagePathEl.setAttribute("d",
      "M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579" +
      "C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13" +
      "H3.781C1.708 13 0 11.366 0 9.318" +
      "c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383Z"
    );
    nuagePathEl.setAttribute("fill", c.fill);
    nuagePathEl.setAttribute("stroke", stroke);
    nuagePathEl.setAttribute("stroke-width", sw);
    nuagePathEl.setAttribute("vector-effect", "non-scaling-stroke");
    nuageG.appendChild(nuagePathEl);
    g.appendChild(nuageG);

  } else if (shape.type === "actor") {
    // Bonhomme UML (stick figure) — pas de fond, juste les traits
    var acx = shape.x + shape.w / 2;
    var aHeadR = Math.min(shape.w * 0.20, shape.h * 0.14);
    var aHeadCY = shape.y + aHeadR + shape.h * 0.02;
    // Tête
    var aHead = createSVGEl("circle");
    aHead.setAttribute("cx", acx);
    aHead.setAttribute("cy", aHeadCY);
    aHead.setAttribute("r", aHeadR);
    aHead.setAttribute("fill", c.fill);
    aHead.setAttribute("stroke", stroke);
    aHead.setAttribute("stroke-width", sw);
    g.appendChild(aHead);
    // Corps
    var aBodyTop = aHeadCY + aHeadR;
    var aBodyBot = shape.y + shape.h * 0.60;
    var aBody = createSVGEl("line");
    aBody.setAttribute("x1", acx); aBody.setAttribute("y1", aBodyTop);
    aBody.setAttribute("x2", acx); aBody.setAttribute("y2", aBodyBot);
    aBody.setAttribute("stroke", stroke); aBody.setAttribute("stroke-width", sw);
    aBody.setAttribute("stroke-linecap", "round");
    g.appendChild(aBody);
    // Bras
    var aArmY = shape.y + shape.h * 0.38;
    var aArmLX = shape.x + shape.w * 0.10;
    var aArmRX = shape.x + shape.w * 0.90;
    var aArms = createSVGEl("line");
    aArms.setAttribute("x1", aArmLX); aArms.setAttribute("y1", aArmY);
    aArms.setAttribute("x2", aArmRX); aArms.setAttribute("y2", aArmY);
    aArms.setAttribute("stroke", stroke); aArms.setAttribute("stroke-width", sw);
    aArms.setAttribute("stroke-linecap", "round");
    g.appendChild(aArms);
    // Jambe gauche
    var aLegLX = shape.x + shape.w * 0.18;
    var aLegRX = shape.x + shape.w * 0.82;
    var aLegBotY = shape.y + shape.h * 0.82;
    var aLegL = createSVGEl("line");
    aLegL.setAttribute("x1", acx); aLegL.setAttribute("y1", aBodyBot);
    aLegL.setAttribute("x2", aLegLX); aLegL.setAttribute("y2", aLegBotY);
    aLegL.setAttribute("stroke", stroke); aLegL.setAttribute("stroke-width", sw);
    aLegL.setAttribute("stroke-linecap", "round");
    g.appendChild(aLegL);
    // Jambe droite
    var aLegR = createSVGEl("line");
    aLegR.setAttribute("x1", acx); aLegR.setAttribute("y1", aBodyBot);
    aLegR.setAttribute("x2", aLegRX); aLegR.setAttribute("y2", aLegBotY);
    aLegR.setAttribute("stroke", stroke); aLegR.setAttribute("stroke-width", sw);
    aLegR.setAttribute("stroke-linecap", "round");
    g.appendChild(aLegR);

  } else if (shape.type === "table") {
    var tRows = shape.rows || 3;
    var tCols = shape.cols || 3;
    var tCells = shape.cells || [];
    var tColWidths = getColWidths(shape);
    var tColOffsets = getColOffsets(shape);
    var cellH = shape.h / tRows;
    var tfs = shape.fontSize || 12;
    // Fond
    var tBg = createSVGEl("rect");
    tBg.setAttribute("x", shape.x);      tBg.setAttribute("y", shape.y);
    tBg.setAttribute("width", shape.w);  tBg.setAttribute("height", shape.h);
    tBg.setAttribute("rx", 3);
    tBg.setAttribute("fill", c.fill);    tBg.setAttribute("stroke", stroke);
    tBg.setAttribute("stroke-width", sw);
    g.appendChild(tBg);
    // Lignes horizontales internes
    for (var tri = 1; tri < tRows; tri++) {
      var thl = createSVGEl("line");
      thl.setAttribute("x1", shape.x);            thl.setAttribute("y1", shape.y + tri * cellH);
      thl.setAttribute("x2", shape.x + shape.w);  thl.setAttribute("y2", shape.y + tri * cellH);
      thl.setAttribute("stroke", stroke);          thl.setAttribute("stroke-width", sw * 0.5);
      g.appendChild(thl);
    }
    // Lignes verticales internes
    for (var tci = 1; tci < tCols; tci++) {
      var tvl = createSVGEl("line");
      var tvlX = shape.x + tColOffsets[tci];
      tvl.setAttribute("x1", tvlX);  tvl.setAttribute("y1", shape.y);
      tvl.setAttribute("x2", tvlX);  tvl.setAttribute("y2", shape.y + shape.h);
      tvl.setAttribute("stroke", stroke);  tvl.setAttribute("stroke-width", sw * 0.5);
      g.appendChild(tvl);
    }
    // Textes des cellules avec word wrap
    var clineH = Math.round(tfs * 1.33);
    for (var tri2 = 0; tri2 < tRows; tri2++) {
      for (var tci2 = 0; tci2 < tCols; tci2++) {
        var cellVal = (tCells[tri2] && tCells[tri2][tci2]) || "";
        if (!cellVal) continue;
        var cellW2 = tColWidths[tci2];
        var cpad = 6;
        var clines = wrapPostitLines(cellVal, cellW2 - cpad * 2, tfs);
        var cCenterY = shape.y + tri2 * cellH + cellH / 2;
        var cfirstY = cCenterY - clines.length * clineH / 2 + clineH * 0.5 + tfs * 0.5;
        var cellCenterX = shape.x + tColOffsets[tci2] + cellW2 / 2;
        var ctxt = createSVGEl("text");
        ctxt.setAttribute("x", cellCenterX);
        ctxt.setAttribute("y", cfirstY);
        ctxt.setAttribute("text-anchor", "middle");
        ctxt.setAttribute("fill", c.text);
        ctxt.setAttribute("font-size", tfs);
        ctxt.setAttribute("data-cell", tri2 + "-" + tci2);
        ctxt.setAttribute("font-family", '"Segoe UI",system-ui,sans-serif');
        ctxt.setAttribute("font-weight", "600");
        ctxt.setAttribute("pointer-events", "none");
        (function(cx, lines) {
          lines.forEach(function(line, i) {
            var ts = createSVGEl("tspan");
            ts.setAttribute("x", cx);
            if (i > 0) ts.setAttribute("dy", clineH + "px");
            ts.textContent = line || " ";
            ctxt.appendChild(ts);
          });
        })(cellCenterX, clines);
        g.appendChild(ctxt);
      }
    }
    // Poignées de redimensionnement des colonnes (chevrons au-dessus de chaque séparateur)
    if (isSel && selectedIds.length === 1) {
      for (var tsi = 1; tsi < tCols; tsi++) {
        var hx = shape.x + tColOffsets[tsi];
        var hy = shape.y - 13;
        var hg = createSVGEl("g");
        hg.setAttribute("data-col-sep", tsi - 1);
        hg.setAttribute("data-shape-id", shape.id);
        hg.style.cursor = "col-resize";
        // Zone de clic transparente
        var hArea = createSVGEl("rect");
        hArea.setAttribute("x", hx - 9);  hArea.setAttribute("y", hy - 7);
        hArea.setAttribute("width", 18);   hArea.setAttribute("height", 22);
        hArea.setAttribute("fill", "transparent");
        hArea.setAttribute("data-col-sep", tsi - 1);
        hArea.setAttribute("data-shape-id", shape.id);
        hg.appendChild(hArea);
        // Chevron ∨
        var chev = createSVGEl("path");
        chev.setAttribute("d", "M" + (hx - 5) + "," + (hy - 1) + " L" + hx + "," + (hy + 5) + " L" + (hx + 5) + "," + (hy - 1));
        chev.setAttribute("fill", "none");
        chev.setAttribute("stroke", "#f97316");
        chev.setAttribute("stroke-width", "1.8");
        chev.setAttribute("stroke-linecap", "round");
        chev.setAttribute("stroke-linejoin", "round");
        chev.setAttribute("pointer-events", "none");
        hg.appendChild(chev);
        // Trait pointillé vers la table
        var hvl = createSVGEl("line");
        hvl.setAttribute("x1", hx);  hvl.setAttribute("y1", hy + 5);
        hvl.setAttribute("x2", hx);  hvl.setAttribute("y2", shape.y);
        hvl.setAttribute("stroke", "#f97316");
        hvl.setAttribute("stroke-width", "1");
        hvl.setAttribute("stroke-dasharray", "3,2");
        hvl.setAttribute("pointer-events", "none");
        hg.appendChild(hvl);
        g.appendChild(hg);
      }
    }
    // Poignée de redimensionnement
    if (isSel && selectedIds.length === 1) {
      var tGrip = createSVGEl("rect");
      tGrip.setAttribute("x", shape.x + shape.w - 5);  tGrip.setAttribute("y", shape.y + shape.h - 5);
      tGrip.setAttribute("width", 10);  tGrip.setAttribute("height", 10);
      tGrip.setAttribute("rx", 2);
      tGrip.setAttribute("fill", "#f97316");
      tGrip.setAttribute("stroke", "#fff");  tGrip.setAttribute("stroke-width", 1.5);
      tGrip.classList.add("resize-grip");
      tGrip.setAttribute("data-shape-id", shape.id);
      g.appendChild(tGrip);
    }
    // Points de connexion
    var thcx = shape.x + shape.w / 2, thcy = shape.y + shape.h / 2;
    [[thcx, shape.y], [thcx, shape.y + shape.h], [shape.x, thcy], [shape.x + shape.w, thcy]]
      .forEach(function (pt) {
        var tdot = createSVGEl("circle");
        tdot.setAttribute("cx", pt[0]);  tdot.setAttribute("cy", pt[1]);
        tdot.setAttribute("r", 5);
        tdot.setAttribute("fill", "#f97316");
        tdot.setAttribute("stroke", "#fff");  tdot.setAttribute("stroke-width", 1.5);
        tdot.classList.add("conn-dot");
        tdot.setAttribute("data-shape-id", shape.id);
        g.appendChild(tdot);
      });
    return g;

  } else if (shape.type === "postit") {
    var fold = 18;
    var body = createSVGEl("path");
    body.setAttribute("d", [
      "M", shape.x, shape.y,
      "L", shape.x + shape.w - fold, shape.y,
      "L", shape.x + shape.w, shape.y + fold,
      "L", shape.x + shape.w, shape.y + shape.h,
      "L", shape.x, shape.y + shape.h,
      "Z",
    ].join(" "));
    body.setAttribute("fill", c.fill);
    body.setAttribute("stroke", stroke);
    body.setAttribute("stroke-width", sw);
    g.appendChild(body);
    // Triangle du coin replié
    var foldTri = createSVGEl("path");
    foldTri.setAttribute("d", [
      "M", shape.x + shape.w - fold, shape.y,
      "L", shape.x + shape.w, shape.y + fold,
      "L", shape.x + shape.w - fold, shape.y + fold,
      "Z",
    ].join(" "));
    foldTri.setAttribute("fill", c.stroke);
    foldTri.setAttribute("fill-opacity", "0.25");
    foldTri.setAttribute("stroke", stroke);
    foldTri.setAttribute("stroke-width", sw * 0.7);
    g.appendChild(foldTri);

  } else if (shape.type === "image") {
    var imgEl = createSVGEl("image");
    imgEl.setAttribute("x", shape.x);        imgEl.setAttribute("y", shape.y);
    imgEl.setAttribute("width", shape.w);    imgEl.setAttribute("height", shape.h);
    imgEl.setAttribute("href", shape.src);
    imgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
    g.appendChild(imgEl);
    // Bordure de sélection
    if (isSel) {
      var selRect = createSVGEl("rect");
      selRect.setAttribute("x", shape.x);        selRect.setAttribute("y", shape.y);
      selRect.setAttribute("width", shape.w);    selRect.setAttribute("height", shape.h);
      selRect.setAttribute("fill", "none");
      selRect.setAttribute("stroke", "#f97316");  selRect.setAttribute("stroke-width", "2");
      selRect.setAttribute("stroke-dasharray", "6,3");
      selRect.setAttribute("pointer-events", "none");
      g.appendChild(selRect);
    }

  } else if (shape.type === "text") {
    // pas de fond — juste le texte
  }

  // ── Texte ──
  var textCy = shape.type === "db"
    ? shape.y + shape.h * 0.62
    : shape.type === "actor"
      ? shape.y + shape.h - 2
      : shape.y + shape.h / 2;
  var ta = shape.textAlign || "center";
  var textAnchor = ta === "left" ? "start" : ta === "right" ? "end" : "middle";
  var txt = createSVGEl("text");
  txt.setAttribute("x", shape.x + shape.w / 2);
  txt.setAttribute("y", textCy);
  txt.setAttribute("text-anchor", textAnchor);
  txt.setAttribute("dominant-baseline", "middle");
  var fs = shape.fontSize || (shape.type === "text" ? 13 : 12);
  txt.setAttribute("fill", shape.type === "text" ? "#292524" : c.text);
  txt.setAttribute("font-size", fs);
  txt.setAttribute("font-family", '"Segoe UI",system-ui,sans-serif');
  txt.setAttribute("font-weight", shape.type === "text" ? "400" : "600");
  txt.setAttribute("pointer-events", "none");
  var tv = shape.textValign || "middle";
  if (shape.type === "postit") {
    var pad = 14;
    var lines = wrapPostitLines(shape.text || "", shape.w - pad * 2, fs);
    var lineH = Math.round(fs * 1.42);
    var firstY = tv === "top"
      ? shape.y + pad + lineH * 0.5
      : tv === "bottom"
        ? shape.y + shape.h - pad - (lines.length - 1) * lineH - fs * 0.2
        : shape.y + (shape.h - lines.length * lineH) / 2 + lineH * 0.5 + fs * 0.3;
    var tspanX = ta === "left" ? shape.x + pad : ta === "right" ? shape.x + shape.w - pad : shape.x + shape.w / 2;
    txt.setAttribute("y", firstY);
    txt.removeAttribute("dominant-baseline");
    lines.forEach(function (line, i) {
      var ts = createSVGEl("tspan");
      ts.setAttribute("x", tspanX);
      if (i > 0) ts.setAttribute("dy", lineH + "px");
      ts.textContent = line || " ";
      txt.appendChild(ts);
    });
  } else if (shape.type === "actor") {
    var alines = wrapPostitLines(shape.text || "", shape.w * 1.2, fs);
    var alineH = Math.round(fs * 1.33);
    txt.setAttribute("text-anchor", "middle");
    txt.removeAttribute("dominant-baseline");
    alines.forEach(function (line, i) {
      var ts = createSVGEl("tspan");
      ts.setAttribute("x", shape.x + shape.w / 2);
      if (i > 0) ts.setAttribute("dy", alineH + "px");
      ts.textContent = line || " ";
      txt.appendChild(ts);
    });
  } else if (shape.type === "rect" || shape.type === "rounded" || shape.type === "db" || shape.type === "cloud" || shape.type === "nuage") {
    var wpad = shape.type === "cloud" ? Math.round(shape.w * 0.2) : shape.type === "nuage" ? Math.round(shape.w * 0.12) : 12;
    // Pour nuage : vpad = offset depuis le haut visible (y=2/16) + marge interne
    var wvpad = shape.type === "cloud" ? Math.round(shape.h * 0.12)
      : shape.type === "nuage" ? Math.round(shape.h * 2 / 16) + 6
      : 8;
    var wlines = wrapPostitLines(shape.text || "", shape.w - wpad * 2, fs);
    var wlineH = Math.round(fs * 1.33);
    // Pour nuage : centre de la forme visible = milieu entre y=2/16 et y=13/16
    var wcenterY = shape.type === "db" ? shape.y + shape.h * 0.62
      : shape.type === "nuage" ? shape.y + shape.h * ((2 + 13) / 2 / 16)
      : shape.y + shape.h / 2;
    var dbCapH = shape.type === "db" ? Math.min(12, shape.h * 0.2) * 2 : 0;
    var wfirstY = tv === "top"
      ? shape.y + dbCapH + wvpad + wlineH * 0.5
      : tv === "bottom"
        ? shape.y + shape.h - wvpad - (wlines.length - 1) * wlineH - fs * 0.2
        : wcenterY - wlines.length * wlineH / 2 + wlineH * 0.5 + fs * 0.5;
    var wtspanX = ta === "left" ? shape.x + wpad : ta === "right" ? shape.x + shape.w - wpad : shape.x + shape.w / 2;
    txt.setAttribute("x", wtspanX);
    txt.setAttribute("y", wfirstY);
    txt.removeAttribute("dominant-baseline");
    wlines.forEach(function (line, i) {
      var ts = createSVGEl("tspan");
      ts.setAttribute("x", wtspanX);
      if (i > 0) ts.setAttribute("dy", wlineH + "px");
      ts.textContent = line || " ";
      txt.appendChild(ts);
    });
  } else {
    txt.textContent = shape.text || "";
  }
  g.appendChild(txt);

  // ── Poignée de redimensionnement (coin bas-droit, sélection unique seulement) ──
  if (isSel && selectedIds.length === 1) {
    var grip = createSVGEl("rect");
    grip.setAttribute("x", shape.x + shape.w - 5);
    grip.setAttribute("y", shape.y + shape.h - 5);
    grip.setAttribute("width", 10);   grip.setAttribute("height", 10);
    grip.setAttribute("rx", 2);
    grip.setAttribute("fill", "#f97316");
    grip.setAttribute("stroke", "#fff");   grip.setAttribute("stroke-width", 1.5);
    grip.classList.add("resize-grip");
    grip.setAttribute("data-shape-id", shape.id);
    g.appendChild(grip);
  }

  // ── Texte non rendu pour les images ──
  if (shape.type === "image") return g;

  // ── Points de connexion (visibles au hover et en mode flèche — sauf postit) ──
  if (shape.type !== "postit") {
    var hcx = shape.x + shape.w / 2, hcy = shape.y + shape.h / 2;
    [
      [hcx, shape.y],
      [hcx, shape.y + shape.h],
      [shape.x, hcy],
      [shape.x + shape.w, hcy],
    ].forEach(function (pt) {
      var dot = createSVGEl("circle");
      dot.setAttribute("cx", pt[0]);  dot.setAttribute("cy", pt[1]);
      dot.setAttribute("r", 5);
      dot.setAttribute("fill", "#f97316");
      dot.setAttribute("stroke", "#fff");  dot.setAttribute("stroke-width", 1.5);
      dot.classList.add("conn-dot");
      dot.setAttribute("data-shape-id", shape.id);
      g.appendChild(dot);
    });
  }

  return g;
}

// ── Rendu d'une flèche ──
function getEdgePoint(shape, targetX, targetY) {
  var cx = shape.x + shape.w / 2;
  var cy = shape.y + shape.h / 2;
  var dx = targetX - cx, dy = targetY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: shape.y };
  var hw = shape.w / 2, hh = shape.h / 2;
  if (Math.abs(dx) * hh > Math.abs(dy) * hw) {
    var sx = dx > 0 ? 1 : -1;
    return { x: cx + sx * hw, y: cy + dy * hw / Math.abs(dx) };
  } else {
    var sy = dy > 0 ? 1 : -1;
    return { x: cx + dx * hh / Math.abs(dy), y: cy + sy * hh };
  }
}

function renderArrow(arrow, shapes) {
  var from = shapes.find(function (s) { return s.id === arrow.from; });
  var to   = shapes.find(function (s) { return s.id === arrow.to;   });
  if (!from || !to) return null;

  var toCx = to.x + to.w / 2, toCy = to.y + to.h / 2;
  var frCx = from.x + from.w / 2, frCy = from.y + from.h / 2;
  var fp = getEdgePoint(from, toCx, toCy);
  var tp = getEdgePoint(to,   frCx, frCy);

  // Raccourcir légèrement la pointe pour ne pas chevauchner la forme
  var dx = tp.x - fp.x, dy = tp.y - fp.y;
  var len = Math.sqrt(dx * dx + dy * dy);
  if (len > 16) {
    var off = 7 / len;
    tp = { x: tp.x - dx * off, y: tp.y - dy * off };
  }

  var isSel = selectedId === arrow.id && selectedType === "arrow";
  var stroke = isSel ? "#f97316" : "#a8a29e";
  var markerId = isSel ? "arrowhead-sel" : "arrowhead";

  var g = createSVGEl("g");
  g.setAttribute("data-id", arrow.id);
  g.setAttribute("data-type", "arrow");
  g.classList.add("arrow-group");

  var line = createSVGEl("line");
  line.setAttribute("x1", fp.x);  line.setAttribute("y1", fp.y);
  line.setAttribute("x2", tp.x);  line.setAttribute("y2", tp.y);
  line.setAttribute("stroke", stroke);
  line.setAttribute("stroke-width", isSel ? 2 : 1.5);
  line.setAttribute("marker-end", "url(#" + markerId + ")");
  g.appendChild(line);

  // Zone de clic élargie
  var hit = createSVGEl("line");
  hit.setAttribute("x1", fp.x);  hit.setAttribute("y1", fp.y);
  hit.setAttribute("x2", tp.x);  hit.setAttribute("y2", tp.y);
  hit.setAttribute("stroke", "transparent");
  hit.setAttribute("stroke-width", 14);
  g.appendChild(hit);

  // Label
  if (arrow.label) {
    var mx = (fp.x + tp.x) / 2, my = (fp.y + tp.y) / 2;
    var lbl = createSVGEl("text");
    lbl.setAttribute("x", mx);  lbl.setAttribute("y", my - 7);
    lbl.setAttribute("text-anchor", "middle");
    lbl.setAttribute("font-size", "10");
    lbl.setAttribute("font-family", '"Cascadia Code","SF Mono",Consolas,monospace');
    lbl.setAttribute("fill", "#a8a29e");
    lbl.setAttribute("pointer-events", "none");
    lbl.textContent = arrow.label;
    g.appendChild(lbl);
  }

  return g;
}

// ── Rendu complet ──
function renderAll() {
  var diag = getCurrentDiagram();
  if (!diag) return;

  document.getElementById("diagramTitle").value = diag.titre;

  var arrowsLayer = document.getElementById("arrowsLayer");
  arrowsLayer.innerHTML = "";
  (diag.arrows || []).forEach(function (a) {
    var el = renderArrow(a, diag.shapes);
    if (el) arrowsLayer.appendChild(el);
  });

  var shapesLayer = document.getElementById("shapesLayer");
  shapesLayer.innerHTML = "";
  (diag.shapes || []).forEach(function (s) {
    shapesLayer.appendChild(renderShape(s));
  });

  updateViewport();
  renderDiagramList();
  syncColorPanel();
  updateTableOverlay();
}

function renderDiagramList() {
  var el = document.getElementById("diagramList");
  el.innerHTML = diagramsList.map(function (d, i) {
    var active = i === currentDiagramIdx ? " active" : "";
    return (
      '<div class="diagram-list-item' + active + '" draggable="true"' +
      ' ondragstart="onDiagDragStart(event,' + i + ')"' +
      ' ondragover="onDiagDragOver(event,' + i + ')"' +
      ' ondragleave="onDiagDragLeave(event)"' +
      ' ondrop="onDiagDrop(event,' + i + ')"' +
      ' ondragend="onDiagDragEnd()"' +
      ' onclick="selectDiagramme(' + i + ')">' +
      '<span class="diagram-list-grip">⠿</span>' +
      '<span class="diagram-list-name">' + escDiag(d.titre) + '</span>' +
      (diagramsList.length > 1
        ? '<button class="diagram-list-del" onclick="event.stopPropagation();supprimerDiagramme(' + i + ')">×</button>'
        : "") +
      "</div>"
    );
  }).join("");
}

function onDiagDragStart(e, idx) {
  diagDragSrcIdx = idx;
  e.dataTransfer.effectAllowed = "move";
  e.currentTarget.classList.add("dragging");
}

function onDiagDragOver(e, idx) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  document.querySelectorAll(".diagram-list-item").forEach(function (el) {
    el.classList.remove("drag-over-after", "drag-over-before");
  });
  if (idx !== diagDragSrcIdx) {
    var goingDown = diagDragSrcIdx < idx;
    e.currentTarget.classList.add(goingDown ? "drag-over-after" : "drag-over-before");
  }
}

function onDiagDragLeave(e) {
  e.currentTarget.classList.remove("drag-over-after", "drag-over-before");
}

function onDiagDrop(e, idx) {
  e.preventDefault();
  if (diagDragSrcIdx === null || diagDragSrcIdx === idx) {
    onDiagDragEnd();
    return;
  }
  var src = diagDragSrcIdx;
  var item = diagramsList.splice(src, 1)[0];

  // insertAt = idx dans les deux cas :
  // - descente (src < idx) : après remove, la cible est à idx-1, on insère à idx = après elle ✓
  // - montée  (src > idx) : après remove, la cible est toujours à idx, on insère à idx = avant elle ✓
  diagramsList.splice(idx, 0, item);

  var cur = currentDiagramIdx;
  if (cur === src) {
    currentDiagramIdx = idx;
  } else {
    var adjustedCur = cur > src ? cur - 1 : cur;
    currentDiagramIdx = adjustedCur >= idx ? adjustedCur + 1 : adjustedCur;
  }
  localStorage.setItem("current_diagram_idx", currentDiagramIdx);
  diagDragSrcIdx = null;
  saveDiagrammes();
  renderDiagramList();
}

function onDiagDragEnd() {
  diagDragSrcIdx = null;
  document.querySelectorAll(".diagram-list-item").forEach(function (el) {
    el.classList.remove("dragging", "drag-over-after", "drag-over-before");
  });
}

// ── Gestion des diagrammes ──
function selectDiagramme(idx) {
  saveCurrentZoom();
  saveCurrentLock();
  currentDiagramIdx = idx;
  localStorage.setItem("current_diagram_idx", idx);
  selectedId = null;  selectedType = null;
  selectedIds = [];
  restoreZoomForDiagram(idx);
  restoreLockForDiagram(idx);
  viewTransform.x = 60;
  viewTransform.y = 60;
  document.getElementById("colorPanel").style.display = "none";
  renderAll();
  updateLockBtn();
  document.getElementById("diagramListPanel").classList.remove("open");
}

function creerDiagramme() {
  pendingNewDiagram = true;
  var input = document.getElementById("diagramTitle");
  input.value = "";
  input.placeholder = window.t ? window.t.diag_new_diagram : "Nouveau diagramme";
  input.focus();
  input.select();
}

function confirmerNouveauDiagramme() {
  if (!pendingNewDiagram) return;
  pendingNewDiagram = false;
  var input = document.getElementById("diagramTitle");
  var titre = input.value.trim() || (window.t ? window.t.diag_new_diagram : "Nouveau diagramme");
  input.placeholder = "";
  var d = { id: Date.now(), titre: titre, shapes: [], arrows: [] };
  diagramsList.push(d);
  saveDiagrammes();
  selectDiagramme(diagramsList.length - 1);
  document.getElementById("diagramTitle").blur();
}

function annulerNouveauDiagramme() {
  if (!pendingNewDiagram) return;
  pendingNewDiagram = false;
  var diag = getCurrentDiagram();
  var input = document.getElementById("diagramTitle");
  input.value = diag ? diag.titre : "";
  input.placeholder = "";
  input.blur();
}

function supprimerDiagramme(idx) {
  if (diagramsList.length <= 1) return;
  pushHistory();
  diagramsList.splice(idx, 1);
  if (currentDiagramIdx >= diagramsList.length) currentDiagramIdx = diagramsList.length - 1;
  localStorage.setItem("current_diagram_idx", currentDiagramIdx);
  saveDiagrammes();
  renderAll();
}

function toggleDiagramList() {
  document.getElementById("diagramListPanel").classList.toggle("open");
}

// ── Outil actif ──
function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll(".diagram-tool[id^='tool']").forEach(function (btn) {
    btn.classList.remove("active");
  });
  var btnId = "tool" + tool.charAt(0).toUpperCase() + tool.slice(1);
  var btn = document.getElementById(btnId);
  if (btn) btn.classList.add("active");

  arrowSrcId = null;
  selectedIds = [];
  document.getElementById("tempArrow").style.display = "none";
  document.getElementById("canvas").setAttribute(
    "data-tool", tool
  );
  if (tool !== "select") {
    selectedId = null;  selectedType = null;
    document.getElementById("colorPanel").style.display = "none";
  }
  renderAll();
}

// ── Ajout d'une forme ──
function addShape(type, x, y) {
  pushHistory();
  var diag = getCurrentDiagram();
  var size = DEFAULT_SIZES[type] || { w: 120, h: 50 };
  var shape = {
    id: "s" + Date.now(),
    type: type,
    x: Math.round(x - size.w / 2),
    y: Math.round(y - size.h / 2),
    w: size.w,
    h: size.h,
    text: "",
    color: type === "postit" ? "t-amber" : DEFAULT_COLOR,
  };
  if (type === "table") {
    shape.rows = 3; shape.cols = 3;
    shape.cells = [["","",""],["","",""],["","",""]];
    var initW = shape.w / 3;
    shape.colWidths = [initW, initW, initW];
  }
  diag.shapes.push(shape);
  saveDiagrammes();
  selectedId = shape.id;  selectedType = "shape";
  selectedIds = [shape.id];
  renderAll();
  document.getElementById("colorPanel").style.display = "flex";
  syncColorPanel();
  if (type !== "table") startTextEdit(shape.id);
}

// ── Suppression ──
function deleteSelected() {
  var diag = getCurrentDiagram();
  if (selectedIds.length === 0 && !(selectedId && selectedType === "arrow")) return;
  pushHistory();
  if (selectedIds.length > 0) {
    diag.shapes = diag.shapes.filter(function (s) { return selectedIds.indexOf(s.id) === -1; });
    diag.arrows = diag.arrows.filter(function (a) {
      return selectedIds.indexOf(a.from) === -1 && selectedIds.indexOf(a.to) === -1;
    });
    selectedIds = [];
    selectedId = null;  selectedType = null;
  } else if (selectedId && selectedType === "arrow") {
    diag.arrows = diag.arrows.filter(function (a) { return a.id !== selectedId; });
    selectedId = null;  selectedType = null;
  } else {
    return;
  }
  document.getElementById("colorPanel").style.display = "none";
  saveDiagrammes();
  renderAll();
}

// ── Couleur ──
function setShapeColor(color) {
  if (selectedIds.length === 0) return;
  pushHistory();
  var diag = getCurrentDiagram();
  selectedIds.forEach(function (id) {
    var shape = diag.shapes.find(function (s) { return s.id === id; });
    if (shape) shape.color = color;
  });
  saveDiagrammes();
  renderAll();
  document.getElementById("colorPanel").style.display = "flex";
}

function setShapeTextValign(valign) {
  if (selectedIds.length === 0) return;
  pushHistory();
  var diag = getCurrentDiagram();
  selectedIds.forEach(function (id) {
    var shape = diag.shapes.find(function (s) { return s.id === id; });
    if (shape) shape.textValign = valign;
  });
  saveDiagrammes();
  renderAll();
  document.getElementById("colorPanel").style.display = "flex";
}

function setShapeTextAlign(align) {
  if (selectedIds.length === 0) return;
  pushHistory();
  var diag = getCurrentDiagram();
  selectedIds.forEach(function (id) {
    var shape = diag.shapes.find(function (s) { return s.id === id; });
    if (shape) shape.textAlign = align;
  });
  saveDiagrammes();
  renderAll();
  document.getElementById("colorPanel").style.display = "flex";
}

function changeShapeFontSize(delta) {
  if (selectedIds.length === 0) return;
  pushHistory();
  var diag = getCurrentDiagram();
  selectedIds.forEach(function (id) {
    var shape = diag.shapes.find(function (s) { return s.id === id; });
    if (!shape) return;
    var current = shape.fontSize || (shape.type === "text" ? 13 : 12);
    shape.fontSize = Math.max(8, Math.min(28, current + delta));
  });
  saveDiagrammes();
  renderAll();
  document.getElementById("colorPanel").style.display = "flex";
}

// ── Copie de style (pick mode) ──
function startPickMode(mode) {
  pickTargetIds = selectedIds.slice();
  pickMode = mode;
  document.getElementById("canvas").style.cursor = "crosshair";
  document.getElementById("btnPickFont").classList.toggle("diagram-pick-active", mode === "fontSize");
  document.getElementById("btnPickStyle").classList.toggle("diagram-pick-active", mode === "fullStyle");
}

function cancelPickMode() {
  pickMode = null;
  pickTargetIds = [];
  document.getElementById("canvas").style.cursor = "";
  document.getElementById("btnPickFont").classList.remove("diagram-pick-active");
  document.getElementById("btnPickStyle").classList.remove("diagram-pick-active");
}

function applyPickMode(srcShape) {
  pushHistory();
  var diag = getCurrentDiagram();
  pickTargetIds.forEach(function (id) {
    if (id === srcShape.id) return;
    var shape = diag.shapes.find(function (s) { return s.id === id; });
    if (!shape) return;
    if (pickMode === "fontSize") {
      shape.fontSize = srcShape.fontSize || (srcShape.type === "text" ? 13 : 12);
    } else if (pickMode === "fullStyle") {
      shape.fontSize   = srcShape.fontSize || (srcShape.type === "text" ? 13 : 12);
      shape.color      = srcShape.color;
      shape.type       = srcShape.type;
      shape.w          = srcShape.w;
      shape.h          = srcShape.h;
      shape.textAlign  = srcShape.textAlign  || "center";
      shape.textValign = srcShape.textValign || "middle";
    }
  });
  selectedIds = pickTargetIds.slice();
  saveDiagrammes();
  renderAll();
  document.getElementById("colorPanel").style.display = "flex";
}

// ── Édition texte inline ──
function startTextEdit(shapeId) {
  var diag = getCurrentDiagram();
  var shape = diag.shapes.find(function (s) { return s.id === shapeId; });
  if (!shape || shape.type === "image") return;
  if (shape.type === "table") return;
  editingShapeId = shapeId;

  var svg = document.getElementById("canvas");
  var sr = svg.getBoundingClientRect();
  var sx = shape.x * viewTransform.scale + viewTransform.x + sr.left;
  var sy = shape.y * viewTransform.scale + viewTransform.y + sr.top;
  var sw = shape.w * viewTransform.scale;
  var sh = shape.h * viewTransform.scale;
  var c = COLORS[shape.color] || COLORS[DEFAULT_COLOR];

  var useTextarea = shape.type === "postit" || shape.type === "rect" || shape.type === "rounded" || shape.type === "db" || shape.type === "cloud" || shape.type === "nuage";
  if (useTextarea) {
    var ta = document.getElementById("postitTextInput");
    ta.value = shape.text || "";
    var hpad = shape.type === "cloud" ? Math.round(sw * 0.15) : shape.type === "nuage" ? Math.round(sw * 0.14) : 8;
    var vtop, vheight;
    if (shape.type === "cloud") {
      vtop    = sy + Math.round(sh * 0.12);
      vheight = sh - Math.round(sh * 0.12) * 2;
    } else if (shape.type === "nuage") {
      // Le nuage Bootstrap : haut visible ≈ y=2/16, bas de la zone texte ≈ y=10/16
      var nuageTop = Math.round(sh * 2 / 16);
      var nuageBot = Math.round(sh * 10 / 16);
      vtop    = sy + nuageTop;
      vheight = nuageBot - nuageTop - 4;
    } else if (shape.type === "db") {
      var dbRy = Math.min(12, shape.h * 0.2) * viewTransform.scale;
      vtop    = sy + dbRy * 2 + 4;
      vheight = sh - dbRy * 2 - 12;
    } else {
      vtop    = sy + 8;
      vheight = sh - 16;
    }
    ta.style.left      = (sx + hpad) + "px";
    ta.style.top       = vtop + "px";
    ta.style.width     = (sw - hpad * 2) + "px";
    ta.style.height    = vheight + "px";
    var editFs = shape.fontSize || (shape.type === "text" ? 13 : 12);
    ta.style.fontSize  = Math.max(10, editFs * viewTransform.scale) + "px";
    ta.style.color     = c.text;
    ta.style.display   = "block";
    document.getElementById("shapeTextInput").style.display = "none";
    document.getElementById("textOverlay").style.display = "block";
    // Masquer le texte SVG pour éviter la double lecture
    var sg = document.querySelector('#shapesLayer [data-id="' + shapeId + '"]');
    if (sg) { var tx = sg.querySelector("text"); if (tx) tx.style.visibility = "hidden"; }
    setTimeout(function () { ta.focus(); ta.select(); }, 10);
  } else {
    var input = document.getElementById("shapeTextInput");
    input.value = shape.text || "";
    if (shape.type === "actor") {
      input.style.left  = sx + "px";
      input.style.top   = (sy + sh * 0.84) + "px";
      input.style.width = sw + "px";
    } else {
      input.style.left  = (sx + sw * 0.08) + "px";
      input.style.top   = (sy + sh * 0.22) + "px";
      input.style.width = (sw * 0.84) + "px";
    }
    var editFs2 = shape.fontSize || 13;
    input.style.fontSize   = Math.max(10, editFs2 * viewTransform.scale) + "px";
    input.style.color      = c.text;
    input.style.display    = "block";
    document.getElementById("postitTextInput").style.display = "none";
    document.getElementById("textOverlay").style.display = "block";
    setTimeout(function () { input.focus(); input.select(); }, 10);
  }
}

function confirmTextEdit() {
  var input = document.getElementById("shapeTextInput");
  var diag = getCurrentDiagram();
  if (editingShapeId) {
    var shape = diag.shapes.find(function (s) { return s.id === editingShapeId; });
    if (shape) {
      if (shape.type === "table" && editingTableCell !== null) {
        var tval = document.getElementById("postitTextInput").value;
        var oldCellVal = (shape.cells && shape.cells[editingTableCell.row] && shape.cells[editingTableCell.row][editingTableCell.col]) || "";
        if (tval !== oldCellVal) pushHistory();
        if (!shape.cells) shape.cells = [];
        while (shape.cells.length <= editingTableCell.row) shape.cells.push([]);
        shape.cells[editingTableCell.row][editingTableCell.col] = tval;
        editingTableCell = null;
      } else {
        var usesTextarea = shape.type === "postit" || shape.type === "rect" || shape.type === "rounded" || shape.type === "db" || shape.type === "cloud" || shape.type === "nuage";
        var val = usesTextarea
          ? document.getElementById("postitTextInput").value
          : input.value;
        if (val !== (shape.text || "")) pushHistory();
        shape.text = val;
      }
      saveDiagrammes();
      renderAll();
    }
    editingShapeId = null;
  } else if (editingArrowId) {
    var arrow = (diag.arrows || []).find(function (a) { return a.id === editingArrowId; });
    if (arrow) {
      if (input.value !== (arrow.label || "")) pushHistory();
      arrow.label = input.value; saveDiagrammes(); renderAll();
    }
    editingArrowId = null;
  }
  document.getElementById("textOverlay").style.display = "none";
  document.getElementById("postitTextInput").style.display = "none";
  document.getElementById("shapeTextInput").style.display = "block";
}

function startTableCellEdit(shapeId, row, col) {
  var diag = getCurrentDiagram();
  var shape = diag.shapes.find(function (s) { return s.id === shapeId; });
  if (!shape) return;
  editingShapeId = shapeId;
  editingTableCell = { row: row, col: col };

  var tRows = shape.rows || 3;
  var scColWidths = getColWidths(shape);
  var scColOffsets = getColOffsets(shape);
  var cellW = scColWidths[col], cellH = shape.h / tRows;
  var cellX = shape.x + scColOffsets[col], cellY = shape.y + row * cellH;

  var svgEl = document.getElementById("canvas");
  var sr = svgEl.getBoundingClientRect();
  var csx = cellX * viewTransform.scale + viewTransform.x + sr.left;
  var csy = cellY * viewTransform.scale + viewTransform.y + sr.top;
  var csw = cellW * viewTransform.scale, csh = cellH * viewTransform.scale;
  var cc = COLORS[shape.color] || COLORS[DEFAULT_COLOR];

  var ta = document.getElementById("postitTextInput");
  ta.value = (shape.cells && shape.cells[row] && shape.cells[row][col]) || "";
  ta.style.left   = (csx + 2) + "px";
  ta.style.top    = (csy + 2) + "px";
  ta.style.width  = (csw - 4) + "px";
  ta.style.height = (csh - 4) + "px";
  var tfs = shape.fontSize || 12;
  ta.style.fontSize = Math.max(10, tfs * viewTransform.scale) + "px";
  ta.style.color  = cc.text;
  ta.style.display = "block";
  document.getElementById("shapeTextInput").style.display = "none";
  document.getElementById("textOverlay").style.display = "block";
  var sg = document.querySelector('#shapesLayer [data-id="' + shapeId + '"]');
  if (sg) { var cellTx = sg.querySelector('text[data-cell="' + row + '-' + col + '"]'); if (cellTx) cellTx.style.visibility = "hidden"; }
  setTimeout(function () { ta.focus(); ta.select(); }, 10);
}

function addTableRow() {
  var diag = getCurrentDiagram();
  var shape = selectedIds.length === 1 ? diag.shapes.find(function (s) { return s.id === selectedIds[0]; }) : null;
  if (!shape || shape.type !== "table") return;
  pushHistory();
  shape.rows = (shape.rows || 3) + 1;
  if (!shape.cells) shape.cells = [];
  while (shape.cells.length < shape.rows) shape.cells.push([]);
  shape.cells[shape.rows - 1] = new Array(shape.cols || 3).fill("");
  saveDiagrammes(); renderAll();
  document.getElementById("colorPanel").style.display = "flex";
  syncColorPanel();
}

function removeTableRow() {
  var diag = getCurrentDiagram();
  var shape = selectedIds.length === 1 ? diag.shapes.find(function (s) { return s.id === selectedIds[0]; }) : null;
  if (!shape || shape.type !== "table" || (shape.rows || 3) <= 1) return;
  pushHistory();
  shape.rows = (shape.rows || 3) - 1;
  if (shape.cells && shape.cells.length > shape.rows) shape.cells.splice(shape.rows);
  saveDiagrammes(); renderAll();
  document.getElementById("colorPanel").style.display = "flex";
  syncColorPanel();
}

function addTableCol() {
  var diag = getCurrentDiagram();
  var shape = selectedIds.length === 1 ? diag.shapes.find(function (s) { return s.id === selectedIds[0]; }) : null;
  if (!shape || shape.type !== "table") return;
  pushHistory();
  var oldCols = shape.cols || 3;
  shape.cols = oldCols + 1;
  if (!shape.cells) shape.cells = [];
  var rows = shape.rows || 3;
  for (var ri = 0; ri < rows; ri++) {
    if (!shape.cells[ri]) shape.cells[ri] = [];
    shape.cells[ri].push("");
  }
  // Répartir la largeur : réduire les colonnes existantes proportionnellement
  var oldWidths = getColWidths({ cols: oldCols, w: shape.w, colWidths: shape.colWidths });
  var newColW = shape.w / shape.cols;
  var scale = (shape.w - newColW) / shape.w;
  shape.colWidths = oldWidths.map(function (w) { return w * scale; });
  shape.colWidths.push(newColW);
  saveDiagrammes(); renderAll();
  document.getElementById("colorPanel").style.display = "flex";
  syncColorPanel();
}

function removeTableCol() {
  var diag = getCurrentDiagram();
  var shape = selectedIds.length === 1 ? diag.shapes.find(function (s) { return s.id === selectedIds[0]; }) : null;
  if (!shape || shape.type !== "table" || (shape.cols || 3) <= 1) return;
  pushHistory();
  var oldCols = shape.cols || 3;
  shape.cols = oldCols - 1;
  if (shape.cells) shape.cells.forEach(function (row) { if (row.length > shape.cols) row.splice(shape.cols); });
  // Retirer la dernière colonne et rescaler les restantes pour remplir shape.w
  var cw = getColWidths({ cols: oldCols, w: shape.w, colWidths: shape.colWidths });
  cw.splice(shape.cols);
  var total = cw.reduce(function (s, v) { return s + v; }, 0);
  shape.colWidths = cw.map(function (w) { return w * shape.w / total; });
  saveDiagrammes(); renderAll();
  document.getElementById("colorPanel").style.display = "flex";
  syncColorPanel();
}

// ── Overlay tableau (boutons +/− ligne/colonne sur le canvas) ──
function updateTableOverlay() {
  var ids = ["tcBtnAddCol","tcBtnRemoveCol","tcBtnAddRow","tcBtnRemoveRow"];
  var hide = function () { ids.forEach(function (id) { var el = document.getElementById(id); if (el) el.style.display = "none"; }); };
  if (boardLocked || selectedIds.length !== 1 || selectedType !== "shape") { hide(); return; }
  var diag = getCurrentDiagram();
  if (!diag) { hide(); return; }
  var shape = diag.shapes.find(function (s) { return s.id === selectedIds[0]; });
  if (!shape || shape.type !== "table") { hide(); return; }

  var svg = document.getElementById("canvas");
  var sr  = svg.getBoundingClientRect();
  var sc  = viewTransform.scale;
  var tx  = viewTransform.x, ty = viewTransform.y;
  var right  = (shape.x + shape.w) * sc + tx + sr.left;
  var bottom = (shape.y + shape.h) * sc + ty + sr.top;
  var rows   = shape.rows || 3;
  var cellH  = shape.h * sc / rows;
  var BW = 22, GAP = 4;

  // +/− col : à droite de la dernière ligne, centrés verticalement dans cette ligne
  var lastRowCy = bottom - cellH / 2;
  var ac = document.getElementById("tcBtnAddCol");
  var rc = document.getElementById("tcBtnRemoveCol");
  ac.style.left = (right + GAP) + "px";  ac.style.top = (lastRowCy - BW - 2) + "px";
  rc.style.left = (right + GAP) + "px";  rc.style.top = (lastRowCy + 2) + "px";
  ac.style.display = rc.style.display = "flex";

  // +/− row : sous la dernière ligne, alignés à droite de la table
  var ar = document.getElementById("tcBtnAddRow");
  var rr = document.getElementById("tcBtnRemoveRow");
  ar.style.left = (right - BW * 2 - GAP) + "px";  ar.style.top = (bottom + GAP) + "px";
  rr.style.left = (right - BW - 2) + "px";         rr.style.top = (bottom + GAP) + "px";
  ar.style.display = rr.style.display = "flex";
}

function syncColorPanel() {}

function startArrowTextEdit(arrowId) {
  var diag = getCurrentDiagram();
  var arrow = (diag.arrows || []).find(function (a) { return a.id === arrowId; });
  if (!arrow) return;
  var from = diag.shapes.find(function (s) { return s.id === arrow.from; });
  var to   = diag.shapes.find(function (s) { return s.id === arrow.to;   });
  if (!from || !to) return;

  var toCx = to.x + to.w / 2,   toCy = to.y + to.h / 2;
  var frCx = from.x + from.w / 2, frCy = from.y + from.h / 2;
  var fp = getEdgePoint(from, toCx, toCy);
  var tp = getEdgePoint(to,   frCx, frCy);
  var mx = (fp.x + tp.x) / 2;
  var my = (fp.y + tp.y) / 2;

  var svg = document.getElementById("canvas");
  var sr = svg.getBoundingClientRect();
  var sx = mx * viewTransform.scale + viewTransform.x + sr.left;
  var sy = my * viewTransform.scale + viewTransform.y + sr.top;

  editingArrowId = arrowId;
  var input = document.getElementById("shapeTextInput");
  input.value = arrow.label || "";
  input.style.left     = (sx - 60) + "px";
  input.style.top      = (sy - 12) + "px";
  input.style.width    = "120px";
  input.style.fontSize = Math.max(10, 11 * viewTransform.scale) + "px";
  input.style.color    = "#78716c";

  document.getElementById("textOverlay").style.display = "block";
  setTimeout(function () { input.focus(); input.select(); }, 10);
}

// ── Hit-test ──
function shapeAt(x, y) {
  var diag = getCurrentDiagram();
  if (!diag) return null;
  for (var i = diag.shapes.length - 1; i >= 0; i--) {
    var s = diag.shapes[i];
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s;
  }
  return null;
}

function arrowIdAt(x, y) {
  var groups = document.querySelectorAll(".arrow-group");
  for (var i = 0; i < groups.length; i++) {
    var lines = groups[i].querySelectorAll("line");
    if (lines.length < 2) continue;
    var hit = lines[lines.length - 1];
    var x1 = +hit.getAttribute("x1"), y1 = +hit.getAttribute("y1");
    var x2 = +hit.getAttribute("x2"), y2 = +hit.getAttribute("y2");
    if (distToSeg(x, y, x1, y1, x2, y2) < 8) {
      return groups[i].getAttribute("data-id");
    }
  }
  return null;
}

function distToSeg(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1;
  var lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  var t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ── Créer une flèche ──
function createArrow(fromId, toId) {
  var diag = getCurrentDiagram();
  if (diag.arrows.some(function (a) { return a.from === fromId && a.to === toId; })) return;
  pushHistory();
  var arrow = { id: "a" + Date.now(), from: fromId, to: toId, label: "" };
  diag.arrows.push(arrow);
  saveDiagrammes();
  selectedId = arrow.id;  selectedType = "arrow";
  selectedIds = [];
  renderAll();
  startArrowTextEdit(arrow.id);
}

// ── Renommer le diagramme ──
function onTitleChange() {
  if (pendingNewDiagram) return;
  var diag = getCurrentDiagram();
  if (!diag) return;
  diag.titre = document.getElementById("diagramTitle").value || "Diagramme";
  saveDiagrammes();
  renderDiagramList();
}

// ── Événements souris ──
function onMouseDown(e) {
  if (e.button !== 0) return;
  if (editingShapeId || editingArrowId) { confirmTextEdit(); return; }

  // Mode verrouillé : pan uniquement
  if (boardLocked) {
    panStart = { cx: e.clientX, cy: e.clientY, px: viewTransform.x, py: viewTransform.y };
    return;
  }

  var pt = svgPoint(e.clientX, e.clientY);

  // Mode pick (copie de style)
  if (pickMode) {
    var srcShape = shapeAt(pt.x, pt.y);
    if (srcShape) applyPickMode(srcShape);
    cancelPickMode();
    return;
  }

  // Clic sur un point de connexion → début de flèche
  var connDot = e.target.closest(".conn-dot");
  if (connDot) {
    arrowSrcId = connDot.getAttribute("data-shape-id");
    var srcShape = getCurrentDiagram().shapes.find(function (s) { return s.id === arrowSrcId; });
    var ta = document.getElementById("tempArrow");
    ta.setAttribute("x1", srcShape.x + srcShape.w / 2);
    ta.setAttribute("y1", srcShape.y + srcShape.h / 2);
    ta.setAttribute("x2", pt.x);  ta.setAttribute("y2", pt.y);
    ta.style.display = "";
    return;
  }

  // Clic sur un chevron de redimensionnement de colonne
  var colSepEl = e.target.closest("[data-col-sep]");
  if (colSepEl) {
    var csColIdx = parseInt(colSepEl.getAttribute("data-col-sep"), 10);
    var csSid = colSepEl.getAttribute("data-shape-id");
    var csShape = getCurrentDiagram().shapes.find(function (s) { return s.id === csSid; });
    if (csShape) {
      var csCw = getColWidths(csShape);
      dragState = { type: "col-resize", id: csSid, colIdx: csColIdx, sx: pt.x, origWidths: csCw.slice(), snapshot: JSON.stringify(diagramsList) };
    }
    return;
  }

  // Clic sur la poignée de resize
  var grip = e.target.closest(".resize-grip");
  if (grip) {
    var sid = grip.getAttribute("data-shape-id");
    var shape = getCurrentDiagram().shapes.find(function (s) { return s.id === sid; });
    if (shape) {
      dragState = { type: "resize", id: sid, sx: pt.x, sy: pt.y, ow: shape.w, oh: shape.h, snapshot: JSON.stringify(diagramsList) };
    }
    return;
  }

  var shape = shapeAt(pt.x, pt.y);

  if (currentTool === "select") {
    if (shape) {
      // Détection du double-clic par horodatage (avant tout renderAll)
      var now = Date.now();
      if (now - lastClickTime < 350 && lastClickShapeId === shape.id) {
        lastClickTime = 0;  lastClickShapeId = null;
        if (shape.type === "table") {
          var tDblRows = shape.rows || 3;
          var tDblOffsets = getColOffsets(shape);
          var tDblCw = getColWidths(shape);
          var tDblRx = pt.x - shape.x;
          var tDblC = tDblCw.length - 1;
          for (var tci3 = 0; tci3 < tDblCw.length; tci3++) {
            if (tDblRx < tDblOffsets[tci3] + tDblCw[tci3]) { tDblC = tci3; break; }
          }
          var tDblR = Math.min(tDblRows - 1, Math.max(0, Math.floor((pt.y - shape.y) / (shape.h / tDblRows))));
          startTableCellEdit(shape.id, tDblR, tDblC);
        } else {
          startTextEdit(shape.id);
        }
        return;
      }
      lastClickTime = now;  lastClickShapeId = shape.id;  lastClickArrowId = null;

      if (e.shiftKey) {
        // Shift+clic : ajouter/retirer de la multi-sélection
        var idx = selectedIds.indexOf(shape.id);
        if (idx === -1) {
          selectedIds.push(shape.id);
          selectedId = shape.id;  selectedType = "shape";
        } else {
          selectedIds.splice(idx, 1);
          selectedId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
          selectedType = selectedId ? "shape" : null;
        }
        document.getElementById("colorPanel").style.display = selectedIds.length > 0 ? "flex" : "none";
        renderAll();
      } else if (selectedIds.indexOf(shape.id) !== -1 && selectedIds.length > 1) {
        // Clic sur une forme déjà dans la multi-sélection → multi-déplacement
        var diag = getCurrentDiagram();
        dragState = {
          type: "multi-move",
          sx: pt.x, sy: pt.y,
          origPositions: selectedIds.map(function (id) {
            var s = diag.shapes.find(function (sh) { return sh.id === id; });
            return { id: id, ox: s ? s.x : 0, oy: s ? s.y : 0 };
          }),
          snapshot: JSON.stringify(diagramsList),
        };
      } else {
        // Clic simple → sélection unique
        selectedIds = [shape.id];
        selectedId = shape.id;  selectedType = "shape";
        dragState = { type: "move", id: shape.id, sx: pt.x, sy: pt.y, ox: shape.x, oy: shape.y, snapshot: JSON.stringify(diagramsList) };
        document.getElementById("colorPanel").style.display = "flex";
        renderAll();
      }
    } else {
      var aid = arrowIdAt(pt.x, pt.y);
      if (aid) {
        // Détection du double-clic sur une flèche
        var now2 = Date.now();
        if (now2 - lastClickTime < 350 && lastClickArrowId === aid) {
          lastClickTime = 0;  lastClickArrowId = null;
          selectedId = aid;  selectedType = "arrow";
          selectedIds = [];
          renderAll();
          startArrowTextEdit(aid);
          return;
        }
        lastClickTime = now2;  lastClickArrowId = aid;

        selectedId = aid;  selectedType = "arrow";
        selectedIds = [];
        document.getElementById("colorPanel").style.display = "none";
        renderAll();
      } else if (e.shiftKey) {
        // Shift+drag sur fond vide → lasso de sélection
        rubberBandState = { sx: pt.x, sy: pt.y };
      } else {
        // Pan
        panStart = { cx: e.clientX, cy: e.clientY, px: viewTransform.x, py: viewTransform.y };
        selectedId = null;  selectedType = null;
        selectedIds = [];
        document.getElementById("colorPanel").style.display = "none";
        renderAll();
      }
    }

  } else if (currentTool === "arrow") {
    if (shape && shape.type !== "postit") {
      if (!arrowSrcId) {
        arrowSrcId = shape.id;
        var ta = document.getElementById("tempArrow");
        ta.setAttribute("x1", shape.x + shape.w / 2);
        ta.setAttribute("y1", shape.y + shape.h / 2);
        ta.setAttribute("x2", pt.x);  ta.setAttribute("y2", pt.y);
        ta.style.display = "";
      } else if (arrowSrcId !== shape.id) {
        createArrow(arrowSrcId, shape.id);
        arrowSrcId = null;
        document.getElementById("tempArrow").style.display = "none";
      }
    } else {
      arrowSrcId = null;
      document.getElementById("tempArrow").style.display = "none";
    }

  } else {
    // Outils forme : placer au clic
    addShape(currentTool, pt.x, pt.y);
    setTool("select");
  }
}

function onMouseMove(e) {
  var pt = svgPoint(e.clientX, e.clientY);

  // Mise à jour de la flèche temporaire
  if (arrowSrcId) {
    var ta = document.getElementById("tempArrow");
    if (ta.style.display !== "none") {
      ta.setAttribute("x2", pt.x);  ta.setAttribute("y2", pt.y);
    }
  }

  if (rubberBandState) {
    var rb = document.getElementById("rubberBand");
    var rbX = Math.min(rubberBandState.sx, pt.x);
    var rbY = Math.min(rubberBandState.sy, pt.y);
    rb.setAttribute("x", rbX);  rb.setAttribute("y", rbY);
    rb.setAttribute("width",  Math.abs(pt.x - rubberBandState.sx));
    rb.setAttribute("height", Math.abs(pt.y - rubberBandState.sy));
    rb.style.display = "";
  } else if (dragState) {
    dragState.moved = true;
    var diag = getCurrentDiagram();
    if (dragState.type === "multi-move") {
      var dx = pt.x - dragState.sx;
      var dy = pt.y - dragState.sy;
      dragState.origPositions.forEach(function (op) {
        var s = diag.shapes.find(function (sh) { return sh.id === op.id; });
        if (s) { s.x = Math.round(op.ox + dx); s.y = Math.round(op.oy + dy); }
      });
      renderAll();
    } else {
      var shape = diag.shapes.find(function (s) { return s.id === dragState.id; });
      if (!shape) return;
      if (dragState.type === "move") {
        shape.x = Math.round(dragState.ox + pt.x - dragState.sx);
        shape.y = Math.round(dragState.oy + pt.y - dragState.sy);
      } else if (dragState.type === "resize") {
        var newW = Math.max(60, Math.round(dragState.ow + pt.x - dragState.sx));
        var newH = Math.max(30, Math.round(dragState.oh + pt.y - dragState.sy));
        if (shape.type === "table" && shape.colWidths && shape.colWidths.length === (shape.cols || 3)) {
          var oldW2 = shape.w;
          shape.colWidths = shape.colWidths.map(function (cw) { return cw * newW / oldW2; });
        }
        shape.w = newW;
        shape.h = newH;
      } else if (dragState.type === "col-resize") {
        var crCw = dragState.origWidths.slice();
        var crDx = pt.x - dragState.sx;
        var crCi = dragState.colIdx;
        var MIN_COL = 20;
        var crLeft  = Math.max(MIN_COL, crCw[crCi] + crDx);
        var crRight = Math.max(MIN_COL, crCw[crCi + 1] - crDx);
        var crTotal = crCw[crCi] + crCw[crCi + 1];
        crLeft  = Math.min(crTotal - MIN_COL, crLeft);
        crRight = crTotal - crLeft;
        crCw[crCi] = crLeft;
        crCw[crCi + 1] = crRight;
        shape.colWidths = crCw;
      }
      renderAll();
    }
  } else if (panStart) {
    viewTransform.x = panStart.px + (e.clientX - panStart.cx);
    viewTransform.y = panStart.py + (e.clientY - panStart.cy);
    updateViewport();
  }
}

function onMouseUp(e) {
  var pt = svgPoint(e.clientX, e.clientY);

  // Fin de tracé de flèche via conn-dot
  if (arrowSrcId && !dragState) {
    document.getElementById("tempArrow").style.display = "none";
    if (currentTool !== "arrow") {
      var target = shapeAt(pt.x, pt.y);
      if (target && target.id !== arrowSrcId && target.type !== "postit") {
        createArrow(arrowSrcId, target.id);
      }
      arrowSrcId = null;
    }
  }

  if (rubberBandState) {
    document.getElementById("rubberBand").style.display = "none";
    var minX = Math.min(rubberBandState.sx, pt.x);
    var minY = Math.min(rubberBandState.sy, pt.y);
    var maxX = Math.max(rubberBandState.sx, pt.x);
    var maxY = Math.max(rubberBandState.sy, pt.y);
    if (maxX - minX > 4 || maxY - minY > 4) {
      var diag = getCurrentDiagram();
      selectedIds = (diag.shapes || []).filter(function (s) {
        return s.x < maxX && s.x + s.w > minX && s.y < maxY && s.y + s.h > minY;
      }).map(function (s) { return s.id; });
      selectedId   = selectedIds.length > 0 ? selectedIds[0] : null;
      selectedType = selectedIds.length > 0 ? "shape" : null;
      document.getElementById("colorPanel").style.display = selectedIds.length > 0 ? "flex" : "none";
    }
    rubberBandState = null;
    renderAll();
  }

  if (dragState) {
    if (dragState.moved && dragState.snapshot) {
      historyStack.push(dragState.snapshot);
      if (historyStack.length > MAX_HISTORY) historyStack.shift();
    }
    saveDiagrammes();
    dragState = null;
    renderAll();
  }
  panStart = null;
}


function onWheel(e) {
  e.preventDefault();
  var svg = document.getElementById("canvas");
  var r = svg.getBoundingClientRect();
  applyZoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
}


// ── Coller des formes ──
function pasteShapes() {
  if (clipboard.length === 0) return;
  pushHistory();
  var diag = getCurrentDiagram();
  var now = Date.now();
  var pasted = clipboard.map(function (s, i) {
    return Object.assign({}, JSON.parse(JSON.stringify(s)), {
      id: "s" + (now + i),
      x: s.x + 20,
      y: s.y + 20,
    });
  });
  pasted.forEach(function (s) { diag.shapes.push(s); });
  selectedIds = pasted.map(function (s) { return s.id; });
  selectedId = selectedIds[0];  selectedType = "shape";
  clipboard = pasted.map(function (s) { return JSON.parse(JSON.stringify(s)); });
  saveDiagrammes();
  renderAll();
  document.getElementById("colorPanel").style.display = "flex";
}

// ── Init ──
document.addEventListener("DOMContentLoaded", function () {
  diagramsList = loadDiagrammes();
  if (!localStorage.getItem("mes_diagrammes")) saveDiagrammes();
  var savedIdx = parseInt(localStorage.getItem("current_diagram_idx"), 10);
  if (!isNaN(savedIdx) && savedIdx >= 0 && savedIdx < diagramsList.length) {
    currentDiagramIdx = savedIdx;
  }
  restoreLockForDiagram(currentDiagramIdx);
  checkDiffDiagrammes();
  renderAll();
  updateLockBtn();

  var canvas = document.getElementById("canvas");
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseup",   onMouseUp);
  canvas.addEventListener("wheel",     onWheel, { passive: false });

  var titleInput = document.getElementById("diagramTitle");
  titleInput.addEventListener("change", onTitleChange);
  titleInput.addEventListener("blur",   onTitleChange);
  titleInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (pendingNewDiagram) confirmerNouveauDiagramme();
      else titleInput.blur();
    }
    if (e.key === "Escape" && pendingNewDiagram) annulerNouveauDiagramme();
  });

  var textInput = document.getElementById("shapeTextInput");
  textInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter")  { e.preventDefault(); confirmTextEdit(); }
    if (e.key === "Escape") {
      document.getElementById("textOverlay").style.display = "none";
      editingShapeId = null;
    }
  });
  textInput.addEventListener("blur", function () {
    // Small delay to allow click on modal-confirm etc.
    setTimeout(confirmTextEdit, 100);
  });

  var postitInput = document.getElementById("postitTextInput");
  postitInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.getElementById("textOverlay").style.display = "none";
      postitInput.style.display = "none";
      document.getElementById("shapeTextInput").style.display = "block";
      editingShapeId = null;
      renderAll(); // restaure la visibilité du texte SVG
    }
    if (e.key === "Tab" && editingTableCell !== null) {
      e.preventDefault();
      var diag = getCurrentDiagram();
      var shape = diag.shapes.find(function (s) { return s.id === editingShapeId; });
      if (!shape) return;
      // Sauvegarder la cellule courante
      if (!shape.cells) shape.cells = [];
      while (shape.cells.length <= editingTableCell.row) shape.cells.push([]);
      shape.cells[editingTableCell.row][editingTableCell.col] = postitInput.value;
      var rows = shape.rows || 3;
      var cols = shape.cols || 3;
      var nextRow = editingTableCell.row;
      var nextCol = editingTableCell.col + 1;
      if (nextCol >= cols) { nextRow++; nextCol = 0; }
      // Dernière cellule → ajouter une ligne
      if (nextRow >= rows) {
        pushHistory();
        shape.rows = rows + 1;
        if (!shape.cells) shape.cells = [];
        while (shape.cells.length < shape.rows) shape.cells.push([]);
        shape.cells[shape.rows - 1] = new Array(cols).fill("");
      }
      var shapeId = editingShapeId;
      saveDiagrammes();
      renderAll();
      startTableCellEdit(shapeId, nextRow, nextCol);
    }
    // Enter ajoute un saut de ligne (comportement natif textarea — pas de preventDefault)
  });
  postitInput.addEventListener("blur", function () {
    setTimeout(confirmTextEdit, 100);
  });

  document.addEventListener("keydown", function (e) {
    if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
    if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undoAction(); return; }
    if (boardLocked) return;
    if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
    if (e.key === "Escape") {
      arrowSrcId = null;
      document.getElementById("tempArrow").style.display = "none";
      setTool("select");
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      e.preventDefault();
      if (selectedIds.length === 0) return;
      var diag = getCurrentDiagram();
      clipboard = selectedIds.map(function (id) {
        var s = diag.shapes.find(function (sh) { return sh.id === id; });
        return s ? JSON.parse(JSON.stringify(s)) : null;
      }).filter(Boolean);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      e.preventDefault();
      if (clipboard.length > 0) {
        pasteShapes();
        return;
      }
      if (!navigator.clipboard || !navigator.clipboard.read) return;
      navigator.clipboard.read().then(function (clipItems) {
        for (var i = 0; i < clipItems.length; i++) {
          for (var j = 0; j < clipItems[i].types.length; j++) {
            if (clipItems[i].types[j].indexOf("image") !== -1) {
              clipItems[i].getType(clipItems[i].types[j]).then(function (blob) {
                handleImagePaste(blob);
              });
              return;
            }
          }
        }
      }).catch(function () {});
    }
  });

  // Quand la fenêtre reprend le focus, l'utilisateur revient d'une autre app
  // où il a peut-être copié une image → vider le clipboard interne
  window.addEventListener("focus", function () {
    clipboard = [];
  });

  document.getElementById("modalPremiereSauvegardeDiag").addEventListener("click", function (e) {
    if (e.target === this) this.classList.remove("open");
  });


  document.addEventListener("mousedown", function (e) {
    var panel = document.getElementById("diagramListPanel");
    if (!panel.classList.contains("open")) return;
    var burgerBtn = document.querySelector(".diagram-tool[onclick=\"toggleDiagramList()\"]");
    if (!panel.contains(e.target) && (!burgerBtn || !burgerBtn.contains(e.target))) {
      panel.classList.remove("open");
    }
  });
});
