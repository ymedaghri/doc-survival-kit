// ══════════════════════════════════════
//  events.js — Événements souris/clavier, hit-tests, création de flèches et initialisation
// ══════════════════════════════════════

// ── Hit-test ──
function shapeAt(x, y) {
  var diag = getCurrentDiagram();
  if (!diag) return null;
  for (var i = diag.shapes.length - 1; i >= 0; i--) {
    var s = diag.shapes[i];
    var lx = x, ly = y;
    if (s.rotation) {
      var scx = s.x + s.w / 2, scy = s.y + s.h / 2;
      var rad = -s.rotation * Math.PI / 180;
      var cos = Math.cos(rad), sin = Math.sin(rad);
      var ddx = x - scx, ddy = y - scy;
      lx = scx + ddx * cos - ddy * sin;
      ly = scy + ddx * sin + ddy * cos;
    }
    if (lx >= s.x && lx <= s.x + s.w && ly >= s.y && ly <= s.y + s.h) return s;
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

  // En mode verrouillé : détecter un clic (sans déplacement) sur une forme liée
  if (boardLocked && panStart) {
    var movedPx = Math.abs(e.clientX - panStart.cx) + Math.abs(e.clientY - panStart.cy);
    if (movedPx < 5 && !e.shiftKey) {
      var shape = shapeAt(pt.x, pt.y);
      if (shape && shape.linkedDiagramId) {
        var target = findDiagramById(shape.linkedDiagramId, diagramsList);
        if (target) {
          hideLinkPicker();
          diagNavStack.push(currentDiagramId);
          if (diagNavStack.length > 30) diagNavStack.shift();
          panStart = null;
          selectDiagramme(shape.linkedDiagramId);
          return;
        }
      } else if (shape && shape.externalUrl) {
        panStart = null;
        window.open(shape.externalUrl, "_blank");
        return;
      }
    }
    panStart = null;
    return;
  }

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
    var wasMoved = dragState.moved;
    var draggedId = dragState.id;
    var dragType = dragState.type;
    if (dragState.moved && dragState.snapshot) {
      historyStack.push(dragState.snapshot);
      if (historyStack.length > MAX_HISTORY) historyStack.shift();
    }
    saveDiagrammes();
    dragState = null;
    renderAll();
    // Naviguer vers le diagramme lié si clic sans déplacement
    if (!wasMoved && dragType === "move" && draggedId && !e.shiftKey) {
      var diag = getCurrentDiagram();
      var clickedShape = diag ? diag.shapes.find(function (s) { return s.id === draggedId; }) : null;
      if (clickedShape && clickedShape.linkedDiagramId) {
        var target = findDiagramById(clickedShape.linkedDiagramId, diagramsList);
        if (target) {
          hideLinkPicker();
          diagNavStack.push(currentDiagramId);
          if (diagNavStack.length > 30) diagNavStack.shift();
          selectDiagramme(clickedShape.linkedDiagramId);
          return;
        }
      } else if (clickedShape && clickedShape.externalUrl) {
        window.open(clickedShape.externalUrl, "_blank");
        return;
      }
    }
  }
  panStart = null;
}


function onWheel(e) {
  e.preventDefault();
  var svg = document.getElementById("canvas");
  var r = svg.getBoundingClientRect();
  applyZoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
}


// ── Init ──
document.addEventListener("DOMContentLoaded", function () {
  diagramsList = loadDiagrammes();
  if (!localStorage.getItem("mes_diagrammes")) saveDiagrammes();
  var savedDiagId = localStorage.getItem("current_diagram_id");
  if (savedDiagId && findDiagramById(savedDiagId, diagramsList)) {
    currentDiagramId = savedDiagId;
  } else {
    var savedIdx = parseInt(localStorage.getItem("current_diagram_idx"), 10);
    if (!isNaN(savedIdx) && savedIdx >= 0 && savedIdx < diagramsList.length) {
      currentDiagramId = String(diagramsList[savedIdx].id);
    } else {
      currentDiagramId = diagramsList[0] ? String(diagramsList[0].id) : null;
    }
  }
  restoreLockForDiagram(currentDiagramId);
  checkDiffDiagrammes();
  renderAll();
  updateLockBtn();
  updateBackBtn();

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
      var nextCol = editingTableCell.col;
      if (e.shiftKey) {
        // Shift+Tab : cellule précédente, s'arrête à la première
        nextCol -= 1;
        if (nextCol < 0) {
          if (nextRow > 0) { nextRow--; nextCol = cols - 1; }
          else { nextCol = 0; }
        }
      } else {
        // Tab : cellule suivante, ajoute une ligne à la fin
        nextCol += 1;
        if (nextCol >= cols) { nextRow++; nextCol = 0; }
        if (nextRow >= rows) {
          pushHistory();
          shape.rows = rows + 1;
          if (!shape.cells) shape.cells = [];
          while (shape.cells.length < shape.rows) shape.cells.push([]);
          shape.cells[shape.rows - 1] = new Array(cols).fill("");
        }
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
    if ((e.ctrlKey || e.metaKey) && e.key === "a") {
      e.preventDefault();
      var diag = getCurrentDiagram();
      if (diag && diag.shapes.length > 0) {
        selectedIds = diag.shapes.map(function (s) { return s.id; });
        selectedType = "shape";
        selectedId = selectedIds[selectedIds.length - 1];
        renderAll();
        document.getElementById("colorPanel").style.display = "flex";
        syncColorPanel();
      }
      return;
    }
    if (boardLocked) return;
    if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
    if (e.key === "Escape") {
      hideLinkPicker();
      arrowSrcId = null;
      document.getElementById("tempArrow").style.display = "none";
      setTool("select");
      selectedIds = []; selectedId = null; selectedType = null;
      document.getElementById("colorPanel").style.display = "none";
      renderAll();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "x") {
      e.preventDefault();
      if (selectedIds.length === 0) return;
      var diag = getCurrentDiagram();
      clipboard = selectedIds.map(function (id) {
        var s = diag.shapes.find(function (sh) { return sh.id === id; });
        return s ? JSON.parse(JSON.stringify(s)) : null;
      }).filter(Boolean);
      deleteSelected();
      return;
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
    var lp = document.getElementById("linkPickerPanel");
    if (lp && lp.style.display !== "none") {
      var lbtn = document.getElementById("btnShapeLink");
      if (!lp.contains(e.target) && e.target !== lbtn) hideLinkPicker();
    }
    var panel = document.getElementById("diagramListPanel");
    if (!panel.classList.contains("open")) return;
    var burgerBtn = document.querySelector(".diagram-tool[onclick=\"toggleDiagramList()\"]");
    if (!panel.contains(e.target) && (!burgerBtn || !burgerBtn.contains(e.target))) {
      panel.classList.remove("open");
    }
  });
});
