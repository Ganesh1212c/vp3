/* Vettiyil Packaging — core: helpers, smooth scroll, header, menu, small reveals */
(function () {
  "use strict";
  var VP = (window.VP = window.VP || {});
  VP.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  VP.hasGsap = !!(window.gsap && window.ScrollTrigger);
  VP.$ = function (s, c) { return (c || document).querySelector(s); };
  VP.$$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  VP.fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var doc = document.documentElement;
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  if (VP.hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
  } else {
    doc.classList.add("no-gsap");
  }

  /* ---------- Smooth scroll (Lenis), kept in step with ScrollTrigger ---------- */
  VP.lenis = null;
  if (VP.hasGsap && window.Lenis && !VP.reduced) {
    try {
      VP.lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.95, smoothWheel: true });
      VP.lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { VP.lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      // in-page anchors glide too
      document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest('a[href*="#"]');
        if (!a) return;
        var u = new URL(a.href, location.href);
        if (u.pathname !== location.pathname || !u.hash || u.hash === "#") return;
        var t = document.querySelector(u.hash);
        if (!t) return;
        e.preventDefault();
        VP.lenis.scrollTo(t, { offset: -70, duration: 1.4 });
        history.replaceState(null, "", u.hash);
      });
    } catch (err) { VP.lenis = null; }
  }

  /* ---------- Header: solid after scrolling, hides on the way down ---------- */
  var hdr = VP.$("[data-hdr]");
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY || doc.scrollTop;
    if (hdr) {
      hdr.classList.toggle("is-stuck", y > 24);
      var menuOpen = VP.$("#menu") && VP.$("#menu").classList.contains("is-open");
      hdr.classList.toggle("is-hidden", !menuOpen && y > 420 && y > lastY + 4);
      if (y < lastY - 4 || y < 420) hdr.classList.remove("is-hidden");
    }
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var burger = VP.$(".burger");
  var menu = VP.$("#menu");
  function setMenu(open) {
    if (!burger || !menu) return;
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    menu.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (VP.lenis) open ? VP.lenis.stop() : VP.lenis.start();
    if (hdr && open) hdr.classList.remove("is-hidden");
  }
  if (burger && menu) {
    burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    window.matchMedia("(min-width: 1061px)").addEventListener("change", function (m) { if (m.matches) setMenu(false); });
  }

  /* ---------- Reveals that run once when an element enters the screen ---------- */
  VP.reveal = function (selector, margin) {
    var els = VP.$$(selector);
    if (!els.length) return;
    if (!("IntersectionObserver" in window) || VP.reduced) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    /* A clip-path that hides an element completely also hides it from the observer,
       so clipped elements (.flap) are watched through their parent instead. */
    var owners = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        (owners.get(en.target) || []).forEach(function (el) { el.classList.add("is-in"); });
        io.unobserve(en.target);
      });
    }, { rootMargin: margin || "0px 0px -12% 0px", threshold: 0.05 });
    els.forEach(function (el) {
      var watch = el.classList.contains("flap") && el.parentElement ? el.parentElement : el;
      if (!owners.has(watch)) { owners.set(watch, []); io.observe(watch); }
      owners.get(watch).push(el);
    });
  };
  VP.reveal(".flap, [data-fade], .sheet, .grow, .ring");
  VP.reveal("[data-lines]", "0px 0px -6% 0px");

  /* ---------- Count-up numbers ---------- */
  VP.$$("[data-count]").forEach(function (el) {
    var end = parseFloat(el.getAttribute("data-count"));
    var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
    var fmt = function (v) { return v.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    var suffix = el.getAttribute("data-suffix") || "";
    if (!VP.hasGsap || VP.reduced) { el.textContent = fmt(end) + suffix; return; }
    var o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: "top 88%", once: true,
      onEnter: function () { gsap.to(o, { v: end, duration: 1.8, ease: "power3.out", onUpdate: function () { el.textContent = fmt(o.v) + suffix; } }); }
    });
    el.textContent = fmt(0) + suffix;
  });

  /* ---------- Parallax on large photos ---------- */
  if (VP.hasGsap && !VP.reduced) {
    VP.$$("[data-parallax]").forEach(function (el) {
      var amt = parseFloat(el.getAttribute("data-parallax")) || 8;
      gsap.fromTo(el, { yPercent: -amt }, {
        yPercent: amt, ease: "none",
        scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
  }

  /* make sure nothing stays hidden if a script step above fails */
  window.addEventListener("load", function () { if (VP.hasGsap) ScrollTrigger.refresh(); });
})();

;
/* Vettiyil Packaging — the 3D box. VP.buildBox(stage, options) draws the net and returns a small controller. */
(function () {
  "use strict";
  var VP = window.VP;

  var LOGO = "https://vettiyilpackaging.com/wp-content/uploads/2024/11/logo-copy.webp";

  VP.buildBox = function (stage, opts) {
    opts = opts || {};
    var logo = opts.logo || LOGO;
    var dimText = opts.dimText || { l: "L", w: "W", h: "H" };

    var face = function (cls, inner) {
      return '<b class="in"></b><b class="out">' + (inner || "") + "</b>";
    };
    var wordmark = '<span class="print print--flip"><span class="tape tape--cap"></span><span class="wm">Vettiyil<small>Packaging</small></span><span class="stencil">This side up</span></span>';
    var lidOut = '<span class="tape"></span><span class="label"><img src="' + logo + '" alt="" referrerpolicy="no-referrer" decoding="async"></span>';
    var side = '<span class="print print--q"><span class="mark-v">Since 1997</span></span>';
    var sideR = '<span class="print print--qq"><span class="mark-v">Bengaluru</span></span>';
    var back = '<span class="print"><span class="mark-v">Handle with care</span></span>';

    var html =
      '<div class="box3d" aria-hidden="true"><div class="box3d__pivot">' +
        '<div class="bx bx--base">' + face("base") +
          '<div class="bx bx--top">' + face("top", back) +
            '<div class="bx bx--lid">' + face("lid", lidOut) + "</div>" +
          "</div>" +
          '<div class="bx bx--bot">' + face("bot", wordmark) + "</div>" +
          '<div class="bx bx--lft">' + face("lft", side) + "</div>" +
          '<div class="bx bx--rgt">' + face("rgt", sideR) + "</div>" +
        "</div>" +
        '<div class="dim dim--x" data-dim="l" style="left:calc(var(--W) * -0.5);width:var(--W);top:calc(var(--D) * 0.5 + var(--H) + 34px)"><span>' + dimText.l + "</span></div>" +
        '<div class="dim dim--y" data-dim="w" style="left:calc(var(--W) * -0.5 - var(--H) - 36px);top:calc(var(--D) * -0.5);height:var(--D)"><span>' + dimText.w + "</span></div>" +
        '<div class="dim dim--x" data-dim="h" style="left:calc(var(--W) * 0.5);width:var(--H);top:calc(var(--D) * -0.5 - 24px)"><span>' + dimText.h + "</span></div>" +
      "</div></div>";

    var holder = document.createElement("div");
    holder.innerHTML = html;
    var box = holder.firstChild;
    stage.insertBefore(box, stage.firstChild);

    var api = {
      stage: stage,
      box: box,
      setSize: function (w, d, h) {
        stage.style.setProperty("--w", w);
        stage.style.setProperty("--d", d);
        stage.style.setProperty("--h", h);
      },
      setDimText: function (t) {
        ["l", "w", "h"].forEach(function (k) {
          var el = box.querySelector('[data-dim="' + k + '"] span');
          if (el && t[k] != null) el.textContent = t[k];
        });
      },
      /* fit the drawing to the stage: k = pixels per drawing unit */
      fit: function (ref) {
        var w = stage.clientWidth || 600;
        stage.style.setProperty("--k", (w / (ref || 640)).toFixed(4));
      },
      set: function (o) { Object.keys(o).forEach(function (k) { box.style.setProperty("--" + k, o[k]); }); },
      flat: function () {
        var d = parseFloat(getComputedStyle(stage).getPropertyValue("--d")) || 190;
        api.set({ f1: 0, f2: 0, f3: 0, open: 0, rx: 0, rz: 0, s: 0.86, cy: d / 2, lines: 1, dims: 1 });
      },
      folded: function (s) { api.set({ f1: 1, f2: 1, f3: 1, open: 0, rx: 58, rz: -32, s: s || 1.12, cy: 0, lines: 0, dims: 0 }); }
    };
    api.fit();
    return api;
  };
})();

;
/* Vettiyil Packaging — home hero.
   On load a flat die-cut sheet folds itself into a box (one autoplay moment).
   Scrolling then opens the lid and releases the product renders (scrubbed). */
(function () {
  "use strict";
  var VP = window.VP;
  var hero = VP.$("[data-hero]");
  if (!hero) return;
  var stage = VP.$("[data-stage]", hero);
  var api = VP.buildBox(stage, { dimText: { l: "L", w: "W", h: "H" } });
  var box = api.box;
  var prs = VP.$$(".pr", stage);
  var shadow = VP.$(".stage__shadow", stage);
  var legend = VP.$(".stage__legend", stage);
  var hint = VP.$(".hero__hint", hero);

  function offsets() {
    var w = stage.clientWidth, h = stage.clientHeight;
    prs.forEach(function (p) {
      var fx = parseFloat(p.style.getPropertyValue("--x")) * w / 100;
      var fy = parseFloat(p.style.getPropertyValue("--y")) * h / 100;
      p.style.setProperty("--ox", (0 - fx).toFixed(1));
      p.style.setProperty("--oy", (-0.15 * h - fy).toFixed(1));
      p.style.setProperty("--or", p.getAttribute("data-spin") || "-24");
    });
  }
  function fit() { api.fit(); offsets(); }
  fit();
  window.addEventListener("resize", fit);

  /* Final, finished state (also used for reduced motion and when scripts can't animate) */
  function finished() {
    api.folded(1.12);
    api.set({ open: 1 });
    prs.forEach(function (p) { p.style.setProperty("--t", 1); });
    if (shadow) { shadow.style.setProperty("--sho", 1); shadow.style.setProperty("--sh", 1); }
    stage.style.opacity = 1;
  }
  if (!VP.hasGsap || VP.reduced) { finished(); return; }

  /* start state: a flat sheet */
  api.flat();
  prs.forEach(function (p) { p.style.setProperty("--t", 0); });
  gsap.set(stage, { opacity: 0, y: 24 });

  var load = gsap.timeline({ delay: 0.25, defaults: { ease: "power3.inOut" } });
  load
    .to(stage, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, 0)
    .to(legend, { opacity: 1, duration: 0.6 }, 0.5)
    .to(box, { "--dims": 0, duration: 0.5 }, 1.45)
    .to(legend, { opacity: 0, duration: 0.4 }, 1.45)
    .to(box, { "--f1": 1, duration: 1.15 }, 1.6)
    .to(box, { "--f2": 1, duration: 1.05 }, 2.05)
    .to(box, { "--rx": 58, "--rz": -32, "--s": 1.12, "--cy": 0, duration: 1.9 }, 1.6)
    .to(box, { "--f3": 1, duration: 0.9, ease: "back.out(1.15)" }, 3.0)
    .to(box, { "--lines": 0, duration: 0.7 }, 3.0)
    .to(shadow, { "--sho": 1, "--sh": 1, duration: 1.2, ease: "power2.out" }, 3.0)
    .to(hint, { opacity: 1, duration: 0.6 }, 4.1);

  /* gentle idle float once it has landed */
  load.add(function () {
    gsap.to(box, { "--bob": -9, duration: 2.8, ease: "sine.inOut", yoyo: true, repeat: -1 });
  }, 4.0);

  /* the box leans toward the pointer (fine pointers only) */
  if (VP.fine) {
    var qx = gsap.quickTo(box, "--mrz", { duration: 1.2, ease: "power3" });
    var qy = gsap.quickTo(box, "--mrx", { duration: 1.2, ease: "power3" });
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      qx(((e.clientX - r.left) / r.width - 0.5) * 16);
      qy(((e.clientY - r.top) / r.height - 0.5) * -8);
    });
  }

  /* open the lid and release the products */
  function burstTimeline(vars) {
    var tl = gsap.timeline(vars || {});
    tl.to(box, { "--open": 1, duration: 0.5, ease: "power2.inOut" }, 0);
    prs.forEach(function (p, i) {
      tl.to(p, { "--t": 1, duration: 0.5, ease: "back.out(1.5)" }, 0.18 + i * 0.07);
    });
    tl.to(hint, { opacity: 0, duration: 0.15 }, 0);
    return tl;
  }

  var mm = gsap.matchMedia();
  mm.add("(min-width: 901px)", function () {
    var tl = burstTimeline({
      scrollTrigger: { trigger: hero, start: "top top", end: "+=85%", scrub: 0.6, pin: true, anticipatePin: 1 }
    });
    return function () { tl.kill(); };
  });
  mm.add("(max-width: 900px)", function () {
    var played = false;
    var st = ScrollTrigger.create({
      trigger: stage, start: "top 60%", once: true,
      onEnter: function () {
        played = true;
        burstTimeline({ delay: 0.2 });
      }
    });
    return function () { st.kill(); if (played) { api.set({ open: 1 }); prs.forEach(function (p) { p.style.setProperty("--t", 1); }); } };
  });
})();

;
/* Vettiyil Packaging — home sections: pinned process story, industries preview */
(function () {
  "use strict";
  var VP = window.VP;

  /* ---------- Process: scroll through the plant, one stage at a time ---------- */
  var proc = VP.$("[data-process]");
  if (proc) {
    var steps = VP.$$("[data-step]", proc);
    var imgs = VP.$$("[data-frame] img", proc);
    var label = VP.$("[data-count-label]", proc);
    var frame = VP.$("[data-frame]", proc);
    var n = steps.length, cur = 0, st = null;

    var pad = function (v) { return (v < 10 ? "0" : "") + v; };
    var setActive = function (i) {
      if (i === cur) return;
      imgs.forEach(function (im) { im.classList.remove("is-on", "was-on"); });
      if (imgs[cur]) imgs[cur].classList.add("was-on");
      if (imgs[i]) imgs[i].classList.add("is-on");
      steps.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
      if (label) label.textContent = pad(i + 1) + " / " + pad(n);
      cur = i;
    };

    steps.forEach(function (s, i) {
      VP.$(".proc__btn", s).addEventListener("click", function () {
        if (window.matchMedia("(max-width: 1000px)").matches) return;
        if (st) {
          var y = st.start + ((i + 0.5) / n) * (st.end - st.start);
          if (VP.lenis) VP.lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo({ top: y, behavior: "smooth" });
        } else { setActive(i); }
      });
    });

    if (VP.hasGsap) {
      var mm = gsap.matchMedia();
      mm.add("(min-width: 1001px)", function () {
        st = ScrollTrigger.create({
          trigger: proc, start: "top top", end: "+=" + n * 62 + "%", pin: true, anticipatePin: 1,
          onUpdate: function (self) {
            setActive(Math.min(n - 1, Math.floor(self.progress * n)));
            if (frame) frame.style.setProperty("--p", self.progress.toFixed(3));
          }
        });
        return function () { st && st.kill(); st = null; };
      });
    }
  }

  /* ---------- Industries: the product follows the pointer ---------- */
  var ind = VP.$("[data-ind]");
  var float = ind && VP.$("[data-float]", ind);
  if (ind && float && VP.hasGsap && VP.fine && !VP.reduced) {
    var rows = VP.$$(".ind__row", ind);
    var fimgs = VP.$$("img", float);
    var list = VP.$(".ind__list", ind);
    gsap.set(float, { xPercent: -50, yPercent: -50 });
    var xTo = gsap.quickTo(float, "x", { duration: 0.55, ease: "power3" });
    var yTo = gsap.quickTo(float, "y", { duration: 0.55, ease: "power3" });
    var on = function () { return window.matchMedia("(min-width: 901px)").matches; };
    list.addEventListener("pointermove", function (e) {
      if (!on()) return;
      xTo(e.clientX + 190); yTo(e.clientY - 20);
    });
    list.addEventListener("pointerenter", function (e) {
      if (!on()) return;
      gsap.set(float, { x: e.clientX + 190, y: e.clientY - 20 });
      gsap.to(float, { opacity: 1, duration: 0.3 });
    });
    list.addEventListener("pointerleave", function () {
      gsap.to(float, { opacity: 0, duration: 0.3 });
      rows.forEach(function (r) { r.classList.remove("is-hot"); });
      fimgs.forEach(function (im) { im.classList.remove("is-on"); });
    });
    rows.forEach(function (row, i) {
      row.addEventListener("pointerenter", function () {
        rows.forEach(function (r) { r.classList.toggle("is-hot", r === row); });
        fimgs.forEach(function (im, k) { im.classList.toggle("is-on", k === i); });
      });
    });
  }
})();

;
/* Vettiyil Packaging — inner pages: photo lightbox and the click-to-load company video. */
(function () {
  "use strict";
  var VP = window.VP;

  /* ---------- Company video: nothing loads from YouTube until the person asks ---------- */
  VP.$$("[data-video]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var frame = document.createElement("iframe");
      frame.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(btn.getAttribute("data-video")) + "?autoplay=1&rel=0";
      frame.title = btn.getAttribute("data-title") || "Video";
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      var holder = document.createElement("div");
      holder.className = "vf";
      holder.appendChild(frame);
      btn.parentNode.replaceChild(holder, btn);
      frame.focus();
    });
  });

  /* ---------- Photo lightbox (native <dialog>: focus trap, Esc to close) ---------- */
  var items = VP.$$("[data-lightbox]");
  if (!items.length || typeof HTMLDialogElement === "undefined") return;

  var icon = function (n) { return '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var dlg = document.createElement("dialog");
  dlg.className = "lb";
  dlg.setAttribute("aria-label", "Photo viewer");
  dlg.innerHTML =
    '<div class="lb__in"><figure style="margin:0;display:grid;justify-items:center"><img alt=""><figcaption class="lb__cap"></figcaption></figure></div>' +
    '<button class="lb__btn lb__btn--x" type="button" aria-label="Close">' + icon("close") + "</button>" +
    '<button class="lb__btn lb__btn--p" type="button" aria-label="Previous photo">' + icon("arrow") + "</button>" +
    '<button class="lb__btn lb__btn--n" type="button" aria-label="Next photo">' + icon("arrow") + "</button>";
  document.body.appendChild(dlg);

  var img = dlg.querySelector("img");
  var cap = dlg.querySelector(".lb__cap");
  var idx = 0;
  var opener = null;

  function show(i) {
    idx = (i + items.length) % items.length;
    var src = items[idx].querySelector("img");
    img.src = src.currentSrc || src.src;
    img.alt = src.alt;
    cap.textContent = src.alt + "  (" + (idx + 1) + " of " + items.length + ")";
    /* warm the neighbours */
    [idx - 1, idx + 1].forEach(function (n) {
      var s = items[(n + items.length) % items.length].querySelector("img");
      var pre = new Image();
      pre.referrerPolicy = "no-referrer";
      pre.src = s.currentSrc || s.src;
    });
  }
  function open(i, trigger) {
    opener = trigger;
    img.referrerPolicy = "no-referrer";
    show(i);
    if (VP.lenis) VP.lenis.stop();
    dlg.showModal();
  }
  function close() { dlg.close(); }

  items.forEach(function (b, i) {
    b.setAttribute("aria-haspopup", "dialog");
    b.addEventListener("click", function () { open(i, b); });
  });
  dlg.querySelector(".lb__btn--x").addEventListener("click", close);
  dlg.querySelector(".lb__btn--p").addEventListener("click", function () { show(idx - 1); });
  dlg.querySelector(".lb__btn--n").addEventListener("click", function () { show(idx + 1); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.classList.contains("lb__in")) close(); });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { show(idx - 1); e.preventDefault(); }
    if (e.key === "ArrowRight") { show(idx + 1); e.preventDefault(); }
  });
  dlg.addEventListener("close", function () {
    if (VP.lenis) VP.lenis.start();
    if (opener) opener.focus({ preventScroll: true });
  });

  /* swipe on touch screens */
  var x0 = null;
  dlg.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  dlg.addEventListener("touchend", function (e) {
    if (x0 == null) return;
    var dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();

;
/* Vettiyil Packaging — the box builder on the contact page.
   The person sets a size; the 3D box resizes; the details go out by email or WhatsApp. */
(function () {
  "use strict";
  var VP = window.VP;
  var wrap = VP.$("[data-bstage]");
  var form = VP.$("#bld-form");
  if (!wrap || !form) return;

  var EMAIL = "sales@vettiyilpackaging.com";
  var WA = "919606333756";

  var stage = VP.$("[data-bstage-box]", wrap);
  var api = VP.buildBox(stage, { dimText: { l: "300 mm", w: "200 mm", h: "150 mm" } });
  var box = api.box;
  var shadow = VP.$(".stage__shadow", stage);
  var legend = VP.$(".stage__legend", stage);
  var sizeOut = VP.$("#bld-size");
  var foldBtn = VP.$("#bld-fold");
  var sum = VP.$("#bld-sum");

  var animate = VP.hasGsap && !VP.reduced;
  var state = { flat: false, busy: false, rx: 58, rz: -32 };
  var bob = null;

  /* ---------- sizes ---------- */
  var f = {
    l: { n: VP.$("#dim-l"), r: VP.$("#dim-l-r") },
    w: { n: VP.$("#dim-w"), r: VP.$("#dim-w-r") },
    h: { n: VP.$("#dim-h"), r: VP.$("#dim-h-r") }
  };
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function mm(k) {
    var v = parseFloat(f[k].n.value);
    return isFinite(v) ? clamp(v, 10, 2000) : parseFloat(f[k].r.value);
  }
  function fill(el) {
    var min = +el.min, max = +el.max;
    el.style.setProperty("--fill", (clamp((+el.value - min) / (max - min), 0, 1) * 100).toFixed(1) + "%");
  }
  function flatScale(w, d, h) {
    return Math.min(0.86, 0.92 * 640 / Math.max(w + 2 * h, 2 * d + 2 * h));
  }
  /* length runs along x, width along y, height is the wall height; the drawing is scaled so any size reads well */
  function geometry() {
    var L = mm("l"), W = mm("w"), H = mm("h");
    var u = 330 / Math.sqrt(L * L + W * W + H * H);
    var w = Math.max(24, L * u), d = Math.max(24, W * u), h = Math.max(24, H * u);
    api.setSize(w.toFixed(1), d.toFixed(1), h.toFixed(1));
    api.setDimText({ l: Math.round(L) + " mm", w: Math.round(W) + " mm", h: Math.round(H) + " mm" });
    sizeOut.textContent = Math.round(L) + " × " + Math.round(W) + " × " + Math.round(H) + " mm";
    if (state.flat && !state.busy) api.set({ cy: d / 2, s: flatScale(w, d, h) });
    return { w: w, d: d, h: h };
  }

  /* ---------- fold and unfold ---------- */
  function startBob() {
    if (!animate || bob) return;
    bob = gsap.to(box, { "--bob": -6, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
  }
  function stopBob() {
    if (bob) { bob.kill(); bob = null; }
    if (animate) gsap.to(box, { "--bob": 0, duration: 0.4 });
    else api.set({ bob: 0 });
  }
  function setFoldLabel() {
    foldBtn.setAttribute("aria-pressed", state.flat ? "true" : "false");
    foldBtn.firstElementChild.textContent = state.flat ? "Fold the box" : "Unfold the box";
  }
  function viewVars() { return { "--rx": state.rx, "--rz": state.rz, "--s": 1.12, "--cy": 0 }; }

  function instantFolded() {
    api.set({ f1: 1, f2: 1, f3: 1, open: 0, rx: state.rx, rz: state.rz, s: 1.12, cy: 0, lines: 0, dims: 0 });
    if (shadow) { shadow.style.setProperty("--sho", 1); shadow.style.setProperty("--sh", 1); }
    if (legend) legend.style.opacity = 0;
    state.flat = false; setFoldLabel();
  }
  function instantFlat() {
    var g = geometry();
    api.set({ f1: 0, f2: 0, f3: 0, open: 0, rx: 0, rz: 0, s: flatScale(g.w, g.d, g.h), cy: g.d / 2, lines: 1, dims: 1 });
    if (shadow) { shadow.style.setProperty("--sho", 0); shadow.style.setProperty("--sh", 0.6); }
    if (legend) legend.style.opacity = 1;
    state.flat = true; setFoldLabel();
  }

  function foldUp(done) {
    state.busy = true;
    var tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: function () { state.busy = false; state.flat = false; setFoldLabel(); startBob(); if (done) done(); } });
    tl.to(box, { "--dims": 0, duration: 0.45 }, 0)
      .to(legend, { opacity: 0, duration: 0.4 }, 0)
      .to(box, { "--f1": 1, duration: 1.1 }, 0.25)
      .to(box, { "--f2": 1, duration: 1.0 }, 0.7)
      .to(box, Object.assign({ duration: 1.8 }, viewVars()), 0.25)
      .to(box, { "--f3": 1, duration: 0.85, ease: "back.out(1.15)" }, 1.65)
      .to(box, { "--lines": 0, duration: 0.7 }, 1.65)
      .to(shadow, { "--sho": 1, "--sh": 1, duration: 1.1, ease: "power2.out" }, 1.65);
  }
  function unfold() {
    state.busy = true;
    stopBob();
    var g = geometry();
    var tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: function () { state.busy = false; state.flat = true; setFoldLabel(); geometry(); } });
    tl.to(shadow, { "--sho": 0, "--sh": 0.6, duration: 0.5 }, 0)
      .to(box, { "--f3": 0, duration: 0.7 }, 0)
      .to(box, { "--lines": 1, duration: 0.5 }, 0.3)
      .to(box, { "--f2": 0, duration: 0.9 }, 0.5)
      .to(box, { "--f1": 0, duration: 1.0 }, 0.8)
      .to(box, { "--rx": 0, "--rz": 0, "--s": flatScale(g.w, g.d, g.h), "--cy": g.d / 2, duration: 1.5 }, 0.5)
      .to(box, { "--dims": 1, duration: 0.6 }, 1.7)
      .to(legend, { opacity: 1, duration: 0.5 }, 1.7);
  }

  foldBtn.hidden = false;
  foldBtn.addEventListener("click", function () {
    if (state.busy) return;
    if (!animate) { state.flat ? instantFolded() : instantFlat(); return; }
    state.flat ? foldUp() : unfold();
  });

  /* ---------- drag to turn the box ---------- */
  var drag = null;
  wrap.addEventListener("pointerdown", function (e) {
    if (state.flat || state.busy || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag = { x: e.clientX, y: e.clientY, rz: state.rz, rx: state.rx };
    try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
  });
  wrap.addEventListener("pointermove", function (e) {
    if (!drag) return;
    state.rz = drag.rz + (e.clientX - drag.x) * 0.45;
    state.rx = clamp(drag.rx - (e.clientY - drag.y) * 0.3, 28, 80);
    api.set({ rz: state.rz.toFixed(1), rx: state.rx.toFixed(1) });
  });
  function endDrag() { drag = null; }
  wrap.addEventListener("pointerup", endDrag);
  wrap.addEventListener("pointercancel", endDrag);

  /* ---------- fields ---------- */
  ["l", "w", "h"].forEach(function (k) {
    var n = f[k].n, r = f[k].r;
    fill(r);
    r.addEventListener("input", function () { n.value = r.value; fill(r); geometry(); summary(); });
    n.addEventListener("input", function () {
      var v = parseFloat(n.value);
      if (isFinite(v)) { r.value = clamp(v, +r.min, +r.max); fill(r); }
      geometry(); summary();
    });
    n.addEventListener("blur", function () {
      n.value = Math.round(mm(k));
      r.value = clamp(+n.value, +r.min, +r.max); fill(r); geometry(); summary();
    });
  });

  var qty = VP.$("#qty");
  var chips = VP.$$(".qty__chips button", form);
  function syncChips() {
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-q") === String(qty.value))); });
  }
  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      var on = c.getAttribute("aria-pressed") === "true";
      qty.value = on ? "" : c.getAttribute("data-q");
      syncChips(); summary();
    });
  });
  qty.addEventListener("input", syncChips);

  var need = VP.$("#need");
  (function () {
    var t = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    need.min = t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate());
  })();

  /* a link from the Products page can preselect the family */
  (function () {
    var q = "";
    try { q = new URLSearchParams(location.search).get("product") || ""; } catch (e) {}
    if (!q) return;
    var r = VP.$('input[name="type"][data-key="' + q + '"]', form);
    if (r) r.checked = true;
    if (q === "printed") { var p = VP.$('input[name="print"][value="Printed"]', form); if (p) p.checked = true; }
  })();

  /* ---------- the message ---------- */
  function val(id) { return (VP.$(id).value || "").trim(); }
  function radio(name) { var r = VP.$('input[name="' + name + '"]:checked', form); return r ? r.value : ""; }
  function fmtDate(v) {
    if (!v) return "";
    var d = new Date(v + "T00:00:00");
    return isNaN(d) ? v : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  function lines() {
    var L = Math.round(mm("l")), W = Math.round(mm("w")), H = Math.round(mm("h"));
    var q = parseFloat(qty.value);
    var rows = [
      ["Box type", radio("type")],
      ["Inside size (L × W × H)", L + " × " + W + " × " + H + " mm"],
      ["Print", radio("print")],
      ["Finish", radio("finish")],
      ["Quantity", isFinite(q) && q > 0 ? q.toLocaleString("en-IN") : ""],
      ["Needed by", fmtDate(need.value)],
      ["Name", val("#f-name")],
      ["Phone", val("#f-phone")],
      ["Email", val("#f-email")],
      ["City", val("#f-city")],
      ["Notes", val("#f-msg")]
    ];
    return rows.filter(function (r) { return r[1]; });
  }
  var pending = 0;
  function summary() {
    if (pending) return;
    pending = requestAnimationFrame(function () {
      pending = 0;
      sum.textContent = "";
      lines().forEach(function (r, i) {
        if (i) sum.appendChild(document.createTextNode("\n"));
        var b = document.createElement("b");
        b.textContent = r[0] + ": ";
        sum.appendChild(b);
        sum.appendChild(document.createTextNode(r[1]));
      });
    });
  }
  function message() {
    var body = lines().map(function (r) { return r[0] + ": " + r[1]; }).join("\n");
    return "Hello Vettiyil Packaging,\n\nI would like a quote for:\n\n" + body + "\n\nThank you.";
  }
  function subject() {
    return "Quote request: " + radio("type") + ", " + Math.round(mm("l")) + " x " + Math.round(mm("w")) + " x " + Math.round(mm("h")) + " mm";
  }

  /* ---------- checks before sending ---------- */
  function setErr(input, id, text) {
    var out = VP.$(id);
    out.textContent = text || "";
    if (text) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }
  function valid() {
    var name = VP.$("#f-name"), phone = VP.$("#f-phone"), first = null;
    if (!name.value.trim()) { setErr(name, "#e-name", "Enter your name."); first = first || name; } else setErr(name, "#e-name");
    if (phone.value.replace(/\D/g, "").length < 7) { setErr(phone, "#e-phone", "Enter a phone number we can call."); first = first || phone; } else setErr(phone, "#e-phone");
    if (first) { first.focus(); return false; }
    return true;
  }
  VP.$("#f-name").addEventListener("input", function () { if (this.value.trim()) setErr(this, "#e-name"); });
  VP.$("#f-phone").addEventListener("input", function () { if (this.value.replace(/\D/g, "").length >= 7) setErr(this, "#e-phone"); });

  form.addEventListener("input", summary);
  form.addEventListener("change", summary);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!valid()) return;
    location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject()) + "&body=" + encodeURIComponent(message());
  });
  VP.$("#send-wa").addEventListener("click", function () {
    if (!valid()) return;
    window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(message()), "_blank", "noopener");
  });

  /* ---------- start ---------- */
  geometry();
  summary();
  if (!animate) { instantFolded(); return; }

  /* the sheet folds itself once, as it scrolls into view */
  instantFlat();
  gsap.set(wrap, { opacity: 0, y: 20 });
  var played = false;
  function intro() {
    if (played) return;
    played = true;
    gsap.to(wrap, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" });
    gsap.delayedCall(0.9, function () { foldUp(); });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { io.disconnect(); intro(); }
    }, { threshold: 0.35 });
    io.observe(wrap);
  } else intro();

  window.addEventListener("resize", function () { api.fit(); });
})();
