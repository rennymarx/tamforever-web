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

  /* Demo video (YouTube) — přehrávač se vloží až po kliknutí, bez cookies do té doby */
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

  function init() { initNav(); initMarquee(); initScrollReveal(); initVideo(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
