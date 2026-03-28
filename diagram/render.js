// ══════════════════════════════════════
//  render.js — Rendu SVG, pan/zoom
// ══════════════════════════════════════

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

  // ── Indicateur de lien (diagramme enfant ou lien externe) ──
  if ((shape.linkedDiagramId || shape.externalUrl) && shape.type !== "image") {
    var lnkColor = shape.externalUrl ? "#0284c7" : "#f97316";
    var lnkCirc = createSVGEl("circle");
    lnkCirc.setAttribute("cx", shape.x + shape.w - 5);
    lnkCirc.setAttribute("cy", shape.y + 5);
    lnkCirc.setAttribute("r", 6);
    lnkCirc.setAttribute("fill", lnkColor);
    lnkCirc.setAttribute("stroke", "#fff");
    lnkCirc.setAttribute("stroke-width", 1.5);
    lnkCirc.setAttribute("pointer-events", "none");
    g.appendChild(lnkCirc);
    var lnkTxt = createSVGEl("text");
    lnkTxt.setAttribute("x", shape.x + shape.w - 5);
    lnkTxt.setAttribute("y", shape.y + 8.5);
    lnkTxt.setAttribute("text-anchor", "middle");
    lnkTxt.setAttribute("font-size", "8");
    lnkTxt.setAttribute("font-weight", "bold");
    lnkTxt.setAttribute("fill", "#fff");
    lnkTxt.setAttribute("pointer-events", "none");
    lnkTxt.textContent = "\u2197";
    g.appendChild(lnkTxt);
  }

  // ── Rotation ──
  if (shape.rotation) {
    var rcx = shape.x + shape.w / 2, rcy = shape.y + shape.h / 2;
    g.setAttribute("transform", "rotate(" + shape.rotation + "," + rcx + "," + rcy + ")");
  }

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
  var lTargetX = targetX, lTargetY = targetY;
  if (shape.rotation) {
    var rad = -shape.rotation * Math.PI / 180;
    var cos = Math.cos(rad), sin = Math.sin(rad);
    var ddx = targetX - cx, ddy = targetY - cy;
    lTargetX = cx + ddx * cos - ddy * sin;
    lTargetY = cy + ddx * sin + ddy * cos;
  }
  var dx = lTargetX - cx, dy = lTargetY - cy;
  var p;
  if (dx === 0 && dy === 0) {
    p = { x: cx, y: shape.y };
  } else {
    var hw = shape.w / 2, hh = shape.h / 2;
    if (Math.abs(dx) * hh > Math.abs(dy) * hw) {
      var sx = dx > 0 ? 1 : -1;
      p = { x: cx + sx * hw, y: cy + dy * hw / Math.abs(dx) };
    } else {
      var sy = dy > 0 ? 1 : -1;
      p = { x: cx + dx * hh / Math.abs(dy), y: cy + sy * hh };
    }
  }
  if (shape.rotation) {
    var rad2 = shape.rotation * Math.PI / 180;
    var cos2 = Math.cos(rad2), sin2 = Math.sin(rad2);
    var ex = p.x - cx, ey = p.y - cy;
    p = { x: cx + ex * cos2 - ey * sin2, y: cy + ex * sin2 + ey * cos2 };
  }
  return p;
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
