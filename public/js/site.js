/* Be My Guest Lodge – site runtime (static pages; all text is already in the HTML) */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* draft notice */
  var d = document.getElementById("draft");
  if (d) {
    try { if (localStorage.getItem("bmg-draft-hidden") === "1") d.hidden = true; } catch (e) {}
    var dc = document.getElementById("draftClose");
    if (dc) dc.addEventListener("click", function () { d.hidden = true; try { localStorage.setItem("bmg-draft-hidden", "1"); } catch (e) {} });
  }

  /* language switch: each option carries the URL of this page in that language */
  var sel = document.getElementById("lang");
  if (sel) sel.addEventListener("change", function () {
    var o = sel.options[sel.selectedIndex];
    try { localStorage.setItem("bmg-lang", o.value); } catch (e) {}
    if (o.getAttribute("data-href")) location.href = o.getAttribute("data-href");
  });

  /* drop photo slots whose image is missing so the designed placeholder shows */
  Array.prototype.forEach.call(document.querySelectorAll("img.real"), function (i) {
    var kill = function () { i.remove(); };
    if (i.complete && !i.naturalWidth) kill(); else i.addEventListener("error", kill, { once: true });
  });

  /* hero: video first, then photo slideshow */
  var hero = document.getElementById("hero");
  if (hero) {
    var slides = Array.prototype.slice.call(document.querySelectorAll("#heroSlides img"));
    var dotsBox = document.getElementById("heroDots");
    var vid = document.getElementById("heroVid");
    var bRep = document.getElementById("vidReplay");
    var si = 0, timer = null, vidActive = false, vidOk = false;
    var show = function (n) {
      si = n;
      slides.forEach(function (im, k) { im.classList.toggle("on", k === n); });
      if (dotsBox) Array.prototype.forEach.call(dotsBox.children, function (b, k) { b.setAttribute("aria-pressed", k === n); });
    };
    if (dotsBox && slides.length > 1) {
      dotsBox.innerHTML = slides.map(function (_, k) { return '<button type="button" aria-label="' + (k + 1) + '" aria-pressed="' + (k === 0) + '"></button>'; }).join("");
      dotsBox.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) show(Array.prototype.indexOf.call(dotsBox.children, b)); });
    }
    var startSlides = function () {
      if (!slides.length) return;
      hero.classList.add("has-photo"); show(si);
      if (!timer && !reduce) timer = setInterval(function () { if (!vidActive && slides.length > 1) show((si + 1) % slides.length); }, 5500);
    };
    var toSlides = function () {
      vidActive = false;
      if (vid) vid.classList.add("off");
      hero.classList.remove("has-video");
      if (bRep) bRep.hidden = !vid;
      startSlides();
    };
    if (slides.length) { hero.classList.add("has-photo"); show(0); }
    if (vid) {
      var src = (window.innerWidth < 800 && vid.getAttribute("data-src-mobile")) || vid.getAttribute("data-src");
      vid.muted = true; vid.defaultMuted = true; vid.playsInline = true;
      vid.addEventListener("playing", function () { vidOk = true; vidActive = true; vid.classList.remove("off"); hero.classList.add("has-photo", "has-video"); if (bRep) bRep.hidden = true; });
      vid.addEventListener("ended", function () { vidOk = false; toSlides(); });
      vid.addEventListener("error", function () { vid.remove(); vid = null; toSlides(); }, { once: true });
      if (bRep) bRep.addEventListener("click", function () { if (vid) { vid.currentTime = 0; vid.play().catch(function () {}); } });
      if (reduce || !src) { toSlides(); }
      else {
        vid.src = src;
        var pr = vid.play(); if (pr && pr.catch) pr.catch(function () { if (!vidOk) toSlides(); });
        setTimeout(function () { if (!vidOk) toSlides(); }, 4000);
      }
    } else { startSlides(); }
  }

  /* in-page links: scroll with room for the sticky header */
  var goTo = function (el) { var hd = document.querySelector("header.nav"); var off = (hd ? hd.getBoundingClientRect().height : 70) + 28;
    var tgt = el.classList.contains("family") ? el : (el.querySelector(".eyebrow, h2") || el);
    window.scrollTo({ top: tgt.getBoundingClientRect().top + window.pageYOffset - (tgt === el && el.classList.contains("family") ? off - 28 : off), behavior: reduce ? "auto" : "smooth" }); };
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var el = document.getElementById(a.getAttribute("href").slice(1)); if (!el) return;
    e.preventDefault(); goTo(el); try { history.replaceState(null, "", a.getAttribute("href")); } catch (x) {}
  });
  if (location.hash.length > 1) { var t0 = document.getElementById(location.hash.slice(1)); if (t0) setTimeout(function () { goTo(t0); }, 60); }

  /* blog overview: filter by tag (also via link …/blog/#kitesurfing) */
  var tf = document.getElementById("tagFilters");
  if (tf) {
    var applyTag = function (tag) {
      var hit = false;
      Array.prototype.forEach.call(tf.querySelectorAll("button"), function (x) { var on = x.getAttribute("data-tag") === tag; x.setAttribute("aria-pressed", on); if (on) hit = true; });
      if (!hit) return applyTag("all");
      Array.prototype.forEach.call(document.querySelectorAll(".blog-list .post"), function (p) { p.hidden = !(tag === "all" || (" " + p.getAttribute("data-tags") + " ").indexOf(" " + tag + " ") > -1); });
    };
    tf.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var tag = b.getAttribute("data-tag"); applyTag(tag);
      try { history.replaceState(null, "", tag === "all" ? location.pathname : "#" + tag); } catch (x) {}
    });
    if (location.hash.length > 1) applyTag(decodeURIComponent(location.hash.slice(1)));
  }

  /* "How did you hear about us?" – optional answer sent to Umami (no personal data) */
  Array.prototype.forEach.call(document.querySelectorAll("select[data-srcq]"), function (sel) {
    sel.addEventListener("change", function () {
      if (!sel.value) return;
      try { if (window.umami && umami.track) umami.track("source_answer", { answer: sel.value }); } catch (e) {}
      var th = sel.parentNode.querySelector(".srcq-thanks"); if (th) th.hidden = false;
      sel.disabled = true;
    });
  });

  /* event calendar: filter by category / free entry */
  var ef = document.getElementById("evFilters");
  if (ef) ef.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var c = b.getAttribute("data-cat");
    Array.prototype.forEach.call(ef.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", x === b); });
    Array.prototype.forEach.call(document.querySelectorAll(".ev-month .event"), function (li) {
      li.hidden = !(c === "all" || (c === "free" ? li.getAttribute("data-free") === "true" : li.getAttribute("data-cat") === c));
    });
    Array.prototype.forEach.call(document.querySelectorAll(".ev-month"), function (m) { m.hidden = !m.querySelector(".event:not([hidden])"); });
  });

  /* partner filter */
  var fEl = document.getElementById("filters");
  if (fEl) fEl.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var c = b.getAttribute("data-c");
    Array.prototype.forEach.call(fEl.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", x === b); });
    Array.prototype.forEach.call(document.querySelectorAll(".partner"), function (p) { p.hidden = !(c === "all" || p.getAttribute("data-c") === c); });
  });

  /* room gallery lightbox */
  var lb = document.getElementById("lb");
  if (lb) {
    var lbImg = document.getElementById("lbImg"), lbCap = document.getElementById("lbCap"), set = [], li = 0;
    var lbShow = function (n) { li = (n + set.length) % set.length; lbImg.src = set[li].src; lbImg.alt = set[li].alt; lbCap.textContent = set[li].alt; };
    document.addEventListener("click", function (e) {
      var b = e.target.closest(".rgal .ph"); if (!b) return;
      var own = b.querySelector("img.real"); if (!own) return;
      set = Array.prototype.slice.call(b.parentElement.querySelectorAll("img.real")); lb.hidden = false; lbShow(set.indexOf(own));
      document.getElementById("lbX").focus();
    });
    document.getElementById("lbX").onclick = function () { lb.hidden = true; };
    document.getElementById("lbP").onclick = function () { lbShow(li - 1); };
    document.getElementById("lbN").onclick = function () { lbShow(li + 1); };
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.hidden = true; });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") lb.hidden = true;
      if (e.key === "ArrowLeft") lbShow(li - 1);
      if (e.key === "ArrowRight") lbShow(li + 1);
    });
  }
})();
