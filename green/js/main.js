/* TAM forever — varianta Vlnoplocha (green). Marquee + mobilní menu. */
(function () {
  "use strict";

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
    links.addEventListener("click", function (e) { if (e.target.tagName === "A") close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  function initMarquee() {
    var tracks = document.querySelectorAll(".marquee__track");
    for (var i = 0; i < tracks.length; i++) {
      tracks[i].innerHTML = tracks[i].innerHTML + tracks[i].innerHTML;
    }
  }

  function initScrollReveal() {
    var hl = document.querySelector(".hero__logo");
    function onScroll() {
      var t = hl ? (hl.getBoundingClientRect().bottom + window.scrollY) : 9999;
      document.body.classList.toggle("nav-scrolled", window.scrollY > t);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("load", onScroll);
    onScroll();
  }

  function init() { initNav(); initMarquee(); initScrollReveal(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
