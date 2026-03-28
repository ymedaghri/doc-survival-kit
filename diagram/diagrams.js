// ══════════════════════════════════════
//  diagrams.js — Arbre de diagrammes et gestion de la barre latérale
// ══════════════════════════════════════

function findDiagramById(id, list) {
  if (!list) return null;
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].id) === String(id)) return list[i];
    var found = findDiagramById(id, list[i].children);
    if (found) return found;
  }
  return null;
}

function findParentListOf(id, list) {
  if (!list) return null;
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].id) === String(id)) return { list: list, index: i };
    var found = findParentListOf(id, list[i].children);
    if (found) return found;
  }
  return null;
}

function flattenDiagrams(list, result) {
  result = result || [];
  (list || []).forEach(function (d) {
    result.push(d);
    flattenDiagrams(d.children, result);
  });
  return result;
}

function calcMaxExpandedDepth(list, depth) {
  var max = depth;
  (list || []).forEach(function (d) {
    if (d.children && d.children.length > 0 && diagExpandedIds[String(d.id)]) {
      var childMax = calcMaxExpandedDepth(d.children, depth + 1);
      max = Math.max(max, childMax);
    }
  });
  return max;
}

function updateSidebarWidth() {
  var depth = calcMaxExpandedDepth(diagramsList, 0);
  var totalW = 220 + depth * 14;
  var panel = document.getElementById("diagramListPanel");
  if (!panel) return;
  panel.style.width = totalW + "px";
}

function getAncestorPath(targetId, list, path) {
  path = path || [];
  for (var i = 0; i < (list || []).length; i++) {
    var d = list[i];
    if (String(d.id) === String(targetId)) return path;
    var childPath = getAncestorPath(targetId, d.children, path.concat([String(d.id)]));
    if (childPath !== null) return childPath;
  }
  return null;
}

function getCurrentDiagram() {
  if (currentDiagramId !== null) {
    var found = findDiagramById(currentDiagramId, diagramsList);
    if (found) return found;
  }
  return diagramsList[0] || null;
}

function updateBackBtn() {
  var btn = document.getElementById("btnDiagBack");
  if (!btn) return;
  btn.style.display = diagNavStack.length > 0 ? "inline-flex" : "none";
}

function selectDiagramme(id, clearStack) {
  if (clearStack) diagNavStack = [];
  saveCurrentZoom();
  saveCurrentLock();
  currentDiagramId = String(id);
  localStorage.setItem("current_diagram_id", String(id));
  selectedId = null; selectedType = null;
  selectedIds = [];
  pendingNavDiagId = null;
  restoreZoomForDiagram(id);
  restoreLockForDiagram(id);
  viewTransform.x = 60;
  viewTransform.y = 60;
  document.getElementById("colorPanel").style.display = "none";
  renderAll();
  updateLockBtn();
  updateBackBtn();
  document.getElementById("diagramListPanel").classList.remove("open");
}

function goBackDiagram() {
  if (diagNavStack.length === 0) return;
  var prevId = diagNavStack.pop();
  selectDiagramme(prevId);
}

function creerDiagramme() {
  pendingParentId = null;
  pendingNewDiagram = true;
  var input = document.getElementById("diagramTitle");
  input.value = "";
  input.placeholder = window.t ? window.t.diag_new_diagram : "Nouveau diagramme";
  input.focus();
  input.select();
}

function creerEnfantDiagramme(parentId) {
  pendingParentId = String(parentId);
  pendingNewDiagram = true;
  diagExpandedIds[String(parentId)] = true;
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
  var d = { id: Date.now(), titre: titre, shapes: [], arrows: [], children: [] };
  if (pendingParentId) {
    var parent = findDiagramById(pendingParentId, diagramsList);
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(d);
    } else {
      diagramsList.push(d);
    }
    pendingParentId = null;
  } else {
    diagramsList.push(d);
  }
  saveDiagrammes();
  selectDiagramme(d.id);
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

function supprimerDiagramme(id) {
  var info = findParentListOf(id, diagramsList);
  if (!info) return;
  if (info.list === diagramsList && info.list.length <= 1) return;
  pushHistory();
  info.list.splice(info.index, 1);
  if (!findDiagramById(currentDiagramId, diagramsList)) {
    currentDiagramId = diagramsList[0] ? String(diagramsList[0].id) : null;
    localStorage.setItem("current_diagram_id", currentDiagramId || "");
  }
  saveDiagrammes();
  renderAll();
}

function toggleDiagramList() {
  var panel = document.getElementById("diagramListPanel");
  var isOpening = !panel.classList.contains("open");
  panel.classList.toggle("open");
  if (isOpening && currentDiagramId) {
    var path = getAncestorPath(currentDiagramId, diagramsList);
    if (path) {
      path.forEach(function (id) { diagExpandedIds[id] = true; });
      renderDiagramList();
    }
  }
}

function toggleDiagExpand(id) {
  var key = String(id);
  if (diagExpandedIds[key]) {
    delete diagExpandedIds[key];
  } else {
    diagExpandedIds[key] = true;
  }
  renderDiagramList();
}

function renderDiagramListLevel(list, depth) {
  return (list || []).map(function (d) {
    var isActive = String(d.id) === String(currentDiagramId);
    var isExpanded = !!diagExpandedIds[String(d.id)];
    var hasChildren = d.children && d.children.length > 0;
    var indent = 10 + depth * 14;
    var childrenHtml = (isExpanded && hasChildren)
      ? '<div class="diagram-list-children">' + renderDiagramListLevel(d.children, depth + 1) + '</div>'
      : '';
    return (
      '<div class="diagram-list-group">' +
      '<div class="diagram-list-item' + (isActive ? ' active' : '') + '"' +
      ' style="padding-left:' + indent + 'px"' +
      ' onclick="selectDiagramme(\'' + d.id + '\', true)">' +
      '<span class="diagram-list-expand" onclick="event.stopPropagation();toggleDiagExpand(\'' + d.id + '\')">' +
      (hasChildren ? (isExpanded ? '&#9660;' : '&#9658;') : '<span style="display:inline-block;width:0.7em"></span>') +
      '</span>' +
      '<span class="diagram-list-name">' + escDiag(d.titre) + '</span>' +
      '<button class="diagram-list-add" onclick="event.stopPropagation();creerEnfantDiagramme(\'' + d.id + '\')" title="Ajouter un diagramme enfant">+</button>' +
      (depth > 0 || list.length > 1
        ? '<button class="diagram-list-del" onclick="event.stopPropagation();supprimerDiagramme(\'' + d.id + '\')">×</button>'
        : '') +
      '</div>' +
      childrenHtml +
      '</div>'
    );
  }).join('');
}

function renderDiagramList() {
  var el = document.getElementById("diagramList");
  if (!el) return;
  el.innerHTML = renderDiagramListLevel(diagramsList, 0);
  updateSidebarWidth();
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
