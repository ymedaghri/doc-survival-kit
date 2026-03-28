// ══════════════════════════════════════
//  text-edit.js — Édition inline du texte et des cellules de tableau
// ══════════════════════════════════════

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

// ── Édition du label d'une flèche ──
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
