/* TAM forever — tamforever.cz
   Vanilla JS: pódiová silueta, mobilní menu, marquee. Žádné závislosti. */
(function () {
  "use strict";

  /* ---------- "OutdoorStage" silueta (sky je v CSS, siluetu kreslíme tady) ---------- */
  var STAGE_SVG =
    '<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMax meet" class="stage__svg" aria-hidden="true">' +
      '<g fill="#0a0c1d">' +
        '<rect x="58" y="32" width="6" height="180"/>' +
        '<rect x="336" y="32" width="6" height="180"/>' +
        '<rect x="56" y="28" width="288" height="6"/>' +
        '<path d="M120 215 L120 175 Q122 158 138 156 L138 138 Q138 128 148 128 Q158 128 158 138 L158 156 Q174 158 176 175 L176 215 Z"/>' +
        '<circle cx="148" cy="120" r="9"/>' +
        '<path d="M186 215 L186 168 Q188 150 206 147 L206 122 Q206 110 220 110 Q234 110 234 122 L234 147 Q252 150 254 168 L254 215 Z"/>' +
        '<circle cx="220" cy="100" r="11"/>' +
        '<path d="M260 215 L260 175 Q262 158 278 156 L278 138 Q278 128 288 128 Q298 128 298 138 L298 156 Q314 158 316 175 L316 215 Z"/>' +
        '<circle cx="288" cy="120" r="9"/>' +
      '</g>' +
      '<g fill="#06081a" opacity="0.92">' +
        '<path d="M0 240 L0 220 Q12 218 18 210 L22 198 L26 212 Q34 215 40 218 L50 206 L54 220 Q70 222 78 219 L88 205 L92 222 Q108 220 116 218 L128 208 L132 220 Q150 222 160 220 L172 206 L176 222 Q200 222 218 218 L232 206 L236 222 Q260 220 274 218 L286 208 L290 222 Q320 222 340 218 L356 206 L360 222 L400 222 L400 240 Z"/>' +
      '</g>' +
    '</svg>';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function renderStages() {
    var stages = document.querySelectorAll("[data-stage]");
    for (var i = 0; i < stages.length; i++) {
      var el = stages[i];
      var label = el.getAttribute("data-label");
      var html =
        '<div class="stage__sun"></div>' +
        '<div class="stage__horizon"></div>' +
        STAGE_SVG +
        '<div class="stage__grain"></div>';
      if (label) html += '<div class="stage__label">' + escapeHtml(label) + "</div>";
      el.innerHTML = html;
    }
  }

  /* ---------- Mobilní menu ---------- */
  function initNav() {
    var burger = document.getElementById("navBurger");
    var links = document.getElementById("navLinks");
    if (!burger || !links) return;

    function close() {
      document.body.classList.remove("nav-open");
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Otevřít menu");
    }
    function toggle() {
      var open = document.body.classList.toggle("nav-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Zavřít menu" : "Otevřít menu");
    }

    burger.addEventListener("click", toggle);
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ---------- Marquee (zdvojení pro plynulou smyčku) ---------- */
  function initMarquee() {
    var tracks = document.querySelectorAll(".marquee__track");
    for (var i = 0; i < tracks.length; i++) {
      tracks[i].innerHTML = tracks[i].innerHTML + tracks[i].innerHTML;
    }
  }

  /* ---------- Logo v liště se objeví po odscrollování (domovská stránka) ---------- */
  function initScrollReveal() {
    function onScroll() { document.body.classList.toggle("nav-scrolled", window.scrollY > 90); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function init() {
    renderStages();
    initNav();
    initMarquee();
    initScrollReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
