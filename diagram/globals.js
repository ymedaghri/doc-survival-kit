// ══════════════════════════════════════
//  globals.js — État global, constantes et helpers de base
// ══════════════════════════════════════

// ── État global ──
var currentTool = "select";
var diagramsList = [];
var currentDiagramId = null;
var diagNavStack = [];
var diagExpandedIds = {};
var pendingParentId = null;
var pendingNavDiagId = null;
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
var diagDragSrcId = null;
var historyStack = [];
var MAX_HISTORY = 50;

// ── Palette ──
var COLORS = {
  "t-green":  { fill: "rgba(209,250,229,0.75)", stroke: "#059669", text: "#047857" },
  "t-violet": { fill: "rgba(237,233,254,0.75)", stroke: "#7c3aed", text: "#6d28d9" },
  "t-amber":  { fill: "rgba(254,243,199,0.75)", stroke: "#d97706", text: "#b45309" },
  "t-sky":    { fill: "rgba(224,242,254,0.75)", stroke: "#0284c7", text: "#0369a1" },
  "t-rose":   { fill: "rgba(255,228,230,0.75)", stroke: "#e11d48", text: "#be123c" },
  "t-teal":   { fill: "rgba(204,251,241,0.75)", stroke: "#0d9488", text: "#0f766e" },
  "t-white":  { fill: "rgba(255,255,255,0.95)", stroke: "#d4d4d4", text: "#404040" },
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
