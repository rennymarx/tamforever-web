/* TAM forever — tamforever.cz
   Vanilla JS bez závislostí. Data webu (P1–P7) se čtou z window.TAM
   (konfigurační blok na začátku index.html) — prázdná hodnota = prvek
   se nezobrazí. Dále: pódiová ilustrace, mobilní menu, marquee,
   video facade (youtube-nocookie), sticky CTA. */
(function () {
  "use strict";

  var TAM = window.TAM || {};

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
    burger.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Zavřít menu" : "Otevřít menu");
    });
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

  /* ---------- P2 · Video facade — youtube-nocookie, iframe až po kliknutí ---------- */
  function initVideo() {
    var id = (TAM.videoId || "").trim();
    if (!id) return; // bez videa nejsou play tlačítka viditelná (mají [hidden])

    var ctas = document.querySelectorAll(".js-video-cta");
    for (var i = 0; i < ctas.length; i++) ctas[i].hidden = false;

    function play() {
      var facade = document.getElementById("videoFacade");
      if (!facade || facade.querySelector("iframe")) return;
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0";
      iframe.title = "TAM forever — demo sestřih (Berounský jarmark 2025)";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.setAttribute("allowfullscreen", "");
      facade.innerHTML = "";
      facade.appendChild(iframe);
    }

    for (var j = 0; j < ctas.length; j++) {
      ctas[j].addEventListener("click", function (e) {
        // hero CTA je odkaz na #demo — nech doscrollovat a zároveň spusť video
        if (this.tagName === "BUTTON") e.preventDefault();
        play();
      });
    }
  }

  /* ---------- P4 · Telefon — klikací tel: odkazy (jen s reálným číslem) ---------- */
  function initPhone() {
    var phone = (TAM.phone || "").trim();
    if (!phone) return;
    var telHref = "tel:" + phone.replace(/\s+/g, "");

    // inline za e-mailem (formulář, patička)
    var inlines = document.querySelectorAll(".js-phone-inline");
    for (var i = 0; i < inlines.length; i++) {
      inlines[i].innerHTML = ' · <a href="' + telHref + '">' + escapeHtml(phone) + "</a>";
    }
    // velký odkaz v PIŠTE bloku
    var links = document.querySelectorAll(".js-phone-link");
    for (var j = 0; j < links.length; j++) {
      links[j].href = telHref;
      links[j].textContent = phone;
      links[j].hidden = false;
    }
  }

  /* ---------- P5 · Fakturační identita v patičce ---------- */
  function initBilling() {
    var b = (TAM.billing || "").trim();
    if (!b) return;
    var els = document.querySelectorAll(".js-billing");
    for (var i = 0; i < els.length; i++) els[i].textContent = " · " + b;
  }

  /* ---------- P6 · Streaming / sociální odkazy (jen existující profily) ---------- */
  var SOCIAL_LABELS = { spotify: "Spotify", youtube: "YouTube", apple: "Apple Music", facebook: "Facebook", instagram: "Instagram" };

  function socialEntries() {
    var s = TAM.socials || {};
    var out = [];
    for (var key in SOCIAL_LABELS) {
      if (s[key] && String(s[key]).trim()) out.push([SOCIAL_LABELS[key], String(s[key]).trim()]);
    }
    return out;
  }

  function initSocials() {
    var entries = socialEntries();
    if (!entries.length) return;

    var link = function (e, cls) {
      return '<a class="' + (cls || "") + '" href="' + escapeHtml(e[1]) + '" target="_blank" rel="noopener">' + escapeHtml(e[0]) + "</a>";
    };

    // repertoár: „spotify · youtube · apple music" jako skutečné odkazy
    var stream = document.querySelector(".js-streaming");
    if (stream) {
      var streamable = entries.filter(function (e) { return e[0] !== "Facebook" && e[0] !== "Instagram"; });
      stream.innerHTML = streamable.map(function (e) { return link(e); }).join(" · ");
    }
    // sekce Kde hrajeme
    var gigsSoc = document.querySelector(".js-socials");
    if (gigsSoc) gigsSoc.innerHTML = entries.map(function (e) { return link(e); }).join("");
    // patička
    var foot = document.querySelector(".js-footer-socials");
    if (foot) foot.innerHTML = entries.map(function (e) { return link(e); }).join("");
  }

  /* ---------- P7 · Kde hrajeme letos ---------- */
  function initConcerts() {
    var section = document.getElementById("hrajeme");
    if (!section) return;
    var concerts = TAM.concerts || [];
    var hasSocials = socialEntries().length > 0;
    if (!concerts.length && !hasSocials) return; // nic k zobrazení → sekce zůstane skrytá

    var list = section.querySelector(".js-concerts");
    if (list && concerts.length) {
      list.innerHTML = concerts.map(function (c) {
        return '<div class="gig-row"><span class="gig-row__date">' + escapeHtml(c[0]) + '</span>' +
          '<span class="gig-row__what"><b>' + escapeHtml(c[1]) + "</b> <span>· " + escapeHtml(c[2]) + "</span></span></div>";
      }).join("");
    } else if (list) {
      list.hidden = true;
    }
    section.hidden = false;
  }

  /* ---------- P1 · Volné termíny (jen reálné soboty z kalendáře) ---------- */
  function initDates() {
    var box = document.querySelector(".js-dates");
    var list = document.querySelector(".js-dates-list");
    var dates = TAM.dates || [];
    if (!box || !list || !dates.length) return; // bez dat zůstává skryté — lepší nic než špatná data
    list.innerHTML = dates.map(function (d) {
      return '<div class="date-row"><span>' + escapeHtml(d[0]) + "</span><span>" + escapeHtml(d[1]) + "</span></div>";
    }).join("");
    box.hidden = false;
  }

  /* ---------- Sticky CTA (mobil) — po odscrollování hero, skrýt u formuláře ---------- */
  function initStickyCta() {
    var bar = document.getElementById("stickyCta");
    var hero = document.querySelector(".hero");
    var contact = document.getElementById("kontakt");
    if (!bar || !hero || !contact || !("IntersectionObserver" in window)) return;

    bar.hidden = false; // viditelnost řídí třída .is-visible (transform), ne [hidden]
    var heroVisible = true, contactVisible = false;

    function update() {
      bar.classList.toggle("is-visible", !heroVisible && !contactVisible);
    }
    new IntersectionObserver(function (en) {
      heroVisible = en[0].isIntersecting; update();
    }, { rootMargin: "-80px 0px 0px 0px" }).observe(hero);
    new IntersectionObserver(function (en) {
      contactVisible = en[0].isIntersecting; update();
    }).observe(contact);
  }

  function init() {
    renderStages();
    initNav();
    initMarquee();
    initVideo();
    initPhone();
    initBilling();
    initSocials();
    initConcerts();
    initDates();
    initStickyCta();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
