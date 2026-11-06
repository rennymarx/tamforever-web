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
    var hl = document.querySelector(".hero__logo");
    function onScroll() {
      // logo v liště odhalíme, až když velké hero logo odscrolluje nad viewport
      var t = hl ? (hl.getBoundingClientRect().bottom + window.scrollY) : 9999;
      document.body.classList.toggle("nav-scrolled", window.scrollY > t);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("load", onScroll);
    onScroll();
  }

  /* ---------- Demo video (YouTube) — přehrávač se vloží až po kliknutí, bez cookies do té doby ---------- */
  function initVideo() {
    var media = document.querySelector(".media[data-youtube-id]");
    if (!media) return;
    media.addEventListener("click", function (e) {
      e.preventDefault();
      var box = document.createElement("div");
      box.className = "media media--playing";
      box.innerHTML =
        '<iframe src="https://www.youtube-nocookie.com/embed/' + media.getAttribute("data-youtube-id") + '?autoplay=1&rel=0"' +
        ' allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Demo video TAM forever"></iframe>';
      media.parentNode.replaceChild(box, media);
    });
  }

  /* ---------- Odkaz s kotvou (např. QR kód v dopise → tamforever.cz/#demo) ----------
     Prohlížeč skočí na kotvu dřív, než se načtou fotky a písma, a stránka se pak posune.
     Po načtení proto cíl dorovnáme (scroll-margin v CSS počítá s lištou navigace). */
  function initHashScroll() {
    var id = window.location.hash.slice(1);
    var target = id && document.getElementById(id);
    if (!target) return;
    // jakmile návštěvník sám scrolluje, už do toho nesaháme
    var touched = false;
    ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (ev) {
      window.addEventListener(ev, function () { touched = true; }, { passive: true, once: true });
    });
    function go() { if (!touched) target.scrollIntoView({ block: "start", behavior: "instant" }); }
    window.addEventListener("load", function () {
      // písma z Google se dotahují i po „load“ a nadpisy nad cílem pak změní výšku
      var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      fonts.then(function () { setTimeout(go, 60); setTimeout(go, 700); });
    });
    // vrací dorovnání pro případ, že se nad cílem později odkryje sekce (koncerty)
    return go;
  }

  /* ---------- Koncerty z Google Kalendáře (přes /api/concerts) ----------
     Sekce #koncerty a odkaz v menu jsou v HTML skryté; odkryjí se jen s platnými daty.
     Chyba, prázdná odpověď nebo nevalidní tvar = vše zůstane skryté (nikdy falešné „žádné koncerty“).
     Render výhradně přes createElement/textContent – data z kalendáře se nikdy nevkládají jako HTML. */
  function initConcerts(onFirstRender) {
    var section = document.getElementById("koncerty");
    if (!section || typeof window.fetch !== "function") return;
    var upcomingList = section.querySelector(".js-concerts-upcoming");
    var pastList = section.querySelector(".js-concerts-past");
    var archive = section.querySelector(".js-concerts-archive");
    var note = section.querySelector(".js-concerts-note");
    var navLink = document.querySelector(".js-nav-koncerty");
    var lastFetch = 0;
    var lastData = null; // poslední platná odpověď – po návratu do záložky se z ní přepočítá „právě hrajeme“ / archiv
    var rendered = false;
    var tz = "Europe/Prague";
    var fmtDay = new Intl.DateTimeFormat("cs-CZ", { timeZone: tz, day: "numeric", month: "numeric", year: "numeric" });
    var fmtWeekday = new Intl.DateTimeFormat("cs-CZ", { timeZone: tz, weekday: "short" });
    var fmtTime = new Intl.DateTimeFormat("cs-CZ", { timeZone: tz, hour: "2-digit", minute: "2-digit" });

    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }

    function validConcert(c) {
      return c && typeof c === "object" &&
        typeof c.title === "string" && c.title.length > 0 && c.title.length <= 200 &&
        typeof c.start === "string" && typeof c.end === "string" &&
        isFinite(Date.parse(c.start)) && isFinite(Date.parse(c.end)) &&
        (c.location == null || typeof c.location === "string") &&
        (c.publicText == null || typeof c.publicText === "string");
    }

    function row(c, now, highlight) {
      var li = el("li", "concert" + (highlight ? " concert--next" : ""));
      var start = new Date(c.start), end = new Date(c.end);
      var date = el("div", "concert__date", fmtDay.format(start));
      date.appendChild(el("small", null, fmtWeekday.format(start) + " · " + fmtTime.format(start)));
      li.appendChild(date);

      var body = el("div");
      var title = el("div", "concert__title", c.title);
      if (start.getTime() <= now && now < end.getTime()) title.appendChild(el("span", "concert__badge", "právě hrajeme"));
      body.appendChild(title);
      if (c.location) body.appendChild(el("div", "concert__meta", c.location));
      if (c.publicText) body.appendChild(el("p", "concert__text", c.publicText));
      li.appendChild(body);

      if (c.location) {
        var actions = el("div", "concert__actions");
        var map = el("a", "btn btn--sm btn--ghost", "Mapa");
        map.href = "https://mapy.com/?q=" + encodeURIComponent(c.location);
        map.target = "_blank";
        map.rel = "noopener noreferrer";
        map.setAttribute("aria-label", "Mapa: " + c.location);
        actions.appendChild(map);
        li.appendChild(actions);
      }
      return li;
    }

    function render(data) {
      if (!data || data.version !== 1 || data.status !== "ok" || !Array.isArray(data.concerts)) return false;
      var concerts = data.concerts.filter(validConcert);
      var now = Date.now();
      var upcoming = concerts.filter(function (c) { return Date.parse(c.end) >= now; })
        .sort(function (a, b) { return Date.parse(a.start) - Date.parse(b.start); });
      var past = concerts.filter(function (c) { return Date.parse(c.end) < now; })
        .sort(function (a, b) { return Date.parse(b.start) - Date.parse(a.start); });
      if (!upcoming.length && !past.length) return false;

      upcomingList.textContent = "";
      upcoming.forEach(function (c, i) { upcomingList.appendChild(row(c, now, i === 0)); });
      upcomingList.hidden = upcoming.length === 0;
      note.hidden = upcoming.length > 0;

      pastList.textContent = "";
      past.forEach(function (c) { pastList.appendChild(row(c, now, false)); });
      archive.hidden = past.length === 0;

      section.hidden = false;
      if (navLink) navLink.hidden = false;
      lastData = data;
      if (!rendered) {
        rendered = true;
        // sekce se odkryla nad kotvou (#demo, #kontakt…) → cíl odkazu znovu dorovnat
        if (typeof onFirstRender === "function") onFirstRender();
      }
      return true;
    }

    /* Vypnuto / výpadek / prázdný program → web vypadá jako bez sekce (nikdy falešné „žádné koncerty“). */
    function hide() {
      section.hidden = true;
      if (navLink) navLink.hidden = true;
      lastData = null;
    }

    function load() {
      lastFetch = Date.now();
      fetch("/api/concerts", { credentials: "omit" })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) { if (!render(data)) hide(); })
        .catch(function () {
          // síť selhala (ne odpověď serveru): necháme poslední platná data, jen přepočítáme časy
          if (!lastData || !render(lastData)) hide();
        });
    }

    load();
    // po návratu do záložky obnovit (nejvýš jednou za minutu) – bez periodického pollingu
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastFetch > 60000) load();
      else if (lastData) render(lastData);
    });
  }

  function init() {
    renderStages();
    initNav();
    initMarquee();
    initScrollReveal();
    initVideo();
    var realign = initHashScroll(); // jen registruje posluchače; dorovnání běží až po „load“
    initConcerts(realign);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
