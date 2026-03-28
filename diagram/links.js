// ══════════════════════════════════════
//  links.js — Lien picker et URLs externes
// ══════════════════════════════════════

function syncColorPanel() {
  var btn = document.getElementById("btnShapeLink");
  if (!btn) return;
  if (selectedIds.length === 1 && selectedType === "shape") {
    var diag = getCurrentDiagram();
    var shape = diag ? diag.shapes.find(function (s) { return s.id === selectedIds[0]; }) : null;
    if (shape && shape.linkedDiagramId) {
      btn.classList.add("active");
      var linked = findDiagramById(shape.linkedDiagramId, diagramsList);
      btn.title = linked ? "Lié à : " + linked.titre + " (cliquer pour délier)" : "Supprimer le lien";
    } else if (shape && shape.externalUrl) {
      btn.classList.add("active");
      btn.title = "Lien externe : " + shape.externalUrl + " (cliquer pour délier)";
    } else {
      btn.classList.remove("active");
      btn.title = "Lier à un diagramme enfant ou URL externe";
    }
    btn.style.display = "";
  } else {
    btn.classList.remove("active");
    btn.style.display = "none";
  }
}

function toggleShapeLink() {
  if (selectedIds.length !== 1 || selectedType !== "shape") return;
  var diag = getCurrentDiagram();
  var shape = diag ? diag.shapes.find(function (s) { return s.id === selectedIds[0]; }) : null;
  if (!shape) return;
  if (shape.linkedDiagramId || shape.externalUrl) {
    pushHistory();
    delete shape.linkedDiagramId;
    delete shape.externalUrl;
    saveDiagrammes();
    renderAll();
    syncColorPanel();
    hideLinkPicker();
  } else {
    showLinkPicker();
  }
}

function showLinkPicker() {
  var panel = document.getElementById("linkPickerPanel");
  if (!panel) return;
  var btn = document.getElementById("btnShapeLink");
  var r = btn ? btn.getBoundingClientRect() : { bottom: 100, left: 200 };
  panel.style.top = (r.bottom + 6) + "px";
  panel.style.left = r.left + "px";
  var all = flattenDiagrams(diagramsList);
  var curId = String(currentDiagramId);
  var items = all.filter(function (d) { return String(d.id) !== curId; });
  var html = items.map(function (d) {
    return '<div class="link-picker-item" onclick="lierForme(\'' + d.id + '\')">' + escDiag(d.titre) + '</div>';
  }).join("");
  html += '<div class="link-picker-new" onclick="creerEnfantEtLier()">+ Nouveau diagramme enfant</div>';
  html += '<div class="link-picker-new link-picker-ext-toggle" onclick="showExternalLinkInput()" style="display:flex;align-items:center;gap:6px;">'
        + '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="#0284c7" stroke="#fff" stroke-width="1.5"/><text x="7" y="10.5" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">\u2197</text></svg>'
        + 'Lien externe (URL)</div>';
  html += '<div id="linkPickerExtRow" style="display:none;padding:6px 8px;border-top:1px solid #e7e5e4;">'
        + '<input id="linkPickerExtUrl" type="text" placeholder="https://..." '
        + 'style="width:100%;box-sizing:border-box;padding:4px 6px;border:1px solid #d4d4d4;border-radius:4px;font-size:12px;" '
        + 'onkeydown="if(event.key===\'Enter\')lierFormeExterne()">'
        + '<div id="linkPickerExtErr" style="color:#e11d48;font-size:11px;margin-top:3px;display:none;">URL invalide (http://, https:// ou file://)</div>'
        + '</div>';
  document.getElementById("linkPickerList").innerHTML = html;
  panel.style.display = "block";
}

function showExternalLinkInput() {
  var row = document.getElementById("linkPickerExtRow");
  if (!row) return;
  row.style.display = "block";
  var input = document.getElementById("linkPickerExtUrl");
  if (input) setTimeout(function () { input.focus(); }, 10);
}

function lierFormeExterne() {
  var input = document.getElementById("linkPickerExtUrl");
  if (!input) return;
  var url = input.value.trim();
  var err = document.getElementById("linkPickerExtErr");
  if (!/^(https?|file):\/\//i.test(url)) {
    if (err) err.style.display = "block";
    return;
  }
  if (err) err.style.display = "none";
  if (selectedIds.length !== 1) return;
  var diag = getCurrentDiagram();
  var shape = diag ? diag.shapes.find(function (s) { return s.id === selectedIds[0]; }) : null;
  if (!shape) return;
  pushHistory();
  shape.externalUrl = url;
  delete shape.linkedDiagramId;
  hideLinkPicker();
  saveDiagrammes();
  renderAll();
  syncColorPanel();
}

function hideLinkPicker() {
  var panel = document.getElementById("linkPickerPanel");
  if (panel) panel.style.display = "none";
}

function lierForme(diagId) {
  if (selectedIds.length !== 1) return;
  var diag = getCurrentDiagram();
  var shape = diag ? diag.shapes.find(function (s) { return s.id === selectedIds[0]; }) : null;
  if (!shape) return;
  pushHistory();
  shape.linkedDiagramId = String(diagId);
  delete shape.externalUrl;
  hideLinkPicker();
  saveDiagrammes();
  renderAll();
  syncColorPanel();
}

function creerEnfantEtLier() {
  if (selectedIds.length !== 1) return;
  var diag = getCurrentDiagram();
  var shape = diag ? diag.shapes.find(function (s) { return s.id === selectedIds[0]; }) : null;
  if (!shape) return;
  hideLinkPicker();
  var titre = shape.text || "Sous-diagramme";
  var child = { id: Date.now(), titre: titre, shapes: [], arrows: [], children: [] };
  if (!diag.children) diag.children = [];
  diag.children.push(child);
  diagExpandedIds[String(diag.id)] = true;
  pushHistory();
  shape.linkedDiagramId = String(child.id);
  saveDiagrammes();
  renderAll();
  renderDiagramList();
  syncColorPanel();
}
