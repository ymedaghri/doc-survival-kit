// ══════════════════════════════════════
//  shape-ops.js — Manipulation des formes (outil, ajout, suppression, style, copie)
// ══════════════════════════════════════

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
      shape.rotation   = srcShape.rotation   || 0;
    }
  });
  selectedIds = pickTargetIds.slice();
  saveDiagrammes();
  renderAll();
  document.getElementById("colorPanel").style.display = "flex";
}

function rotateShape(delta) {
  var diag = getCurrentDiagram();
  if (!diag || selectedIds.length === 0) return;
  pushHistory();
  selectedIds.forEach(function (id) {
    var s = diag.shapes.find(function (sh) { return sh.id === id; });
    if (!s || s.type === "image") return;
    s.rotation = ((s.rotation || 0) + delta + 360) % 360;
  });
  saveDiagrammes();
  renderAll();
}

function changeShapeOrder(delta) {
  var diag = getCurrentDiagram();
  if (!diag || selectedIds.length === 0) return;
  pushHistory();
  if (delta > 0) {
    // Avancer : parcourir de la fin vers le début
    for (var i = diag.shapes.length - 1; i >= 0; i--) {
      if (selectedIds.indexOf(diag.shapes[i].id) !== -1 && i < diag.shapes.length - 1) {
        var tmp = diag.shapes[i]; diag.shapes[i] = diag.shapes[i + 1]; diag.shapes[i + 1] = tmp;
      }
    }
  } else {
    // Reculer : parcourir du début vers la fin
    for (var i = 0; i < diag.shapes.length; i++) {
      if (selectedIds.indexOf(diag.shapes[i].id) !== -1 && i > 0) {
        var tmp = diag.shapes[i]; diag.shapes[i] = diag.shapes[i - 1]; diag.shapes[i - 1] = tmp;
      }
    }
  }
  saveDiagrammes();
  renderAll();
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
