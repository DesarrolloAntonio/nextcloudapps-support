/* Apps for Nextcloud site: accent picker, morphing shapes, reveal on scroll. No dependencies. */
(function () {
  "use strict";
  var root = document.documentElement;
  var KEY = "afn-accent";
  var ACCENTS = ["terracotta", "coral", "gold", "sage", "sky", "lilac", "rose"];
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Accent picker ---------- */
  function setAccent(value) {
    if (ACCENTS.indexOf(value) < 0) return;
    if (value === "terracotta") delete root.dataset.accent;
    else root.dataset.accent = value;
    try { localStorage.setItem(KEY, value); } catch (e) { /* storage blocked: the choice lasts this visit */ }
  }
  var picker = document.querySelector("[data-picker]");
  if (picker) {
    var current = root.dataset.accent || "terracotta";
    Array.prototype.forEach.call(picker.querySelectorAll("input[name=accent]"), function (input) {
      input.checked = input.value === current;
      input.addEventListener("change", function () { if (input.checked) setAccent(input.value); });
    });
    picker.hidden = false;
  }

  /* ---------- Copy buttons (press page) ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("button[data-copy]"), function (btn) {
    var target = document.getElementById(btn.getAttribute("data-copy"));
    if (!target || !navigator.clipboard) return;
    var label = btn.textContent;
    btn.hidden = false;
    btn.addEventListener("click", function () {
      var text = Array.prototype.map.call(target.querySelectorAll("p"), function (p) {
        return p.textContent.replace(/\s+/g, " ").trim();
      }).join("\n\n");
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = "\u2713";
        setTimeout(function () { btn.textContent = label; }, 1600);
      }, function () { /* clipboard refused: the text can still be selected by hand */ });
    });
  });

  /* ---------- Shapes ----------
   * Polar outlines sampled at the same angles, so any two can be blended point by point.
   * Names follow the app's ExpressiveShape set (Home tiles: rest shape -> pressed shape). */
  var N = 96;
  var TAU = Math.PI * 2;
  function sample(fn) {
    var r = [], max = 0, i, v;
    for (i = 0; i < N; i++) { v = fn(i / N * TAU); r.push(v); if (v > max) max = v; }
    for (i = 0; i < N; i++) r[i] /= max;
    return r;
  }
  function petals(k, depth, p) {
    return function (t) { return 1 - depth * Math.pow(1 - Math.abs(Math.cos(k * t / 2)), p); };
  }
  function waves(k, amp) { return function (t) { return 1 + amp * Math.cos(k * t); }; }
  var SHAPES = {
    circle: sample(function () { return 1; }),
    clover: sample(petals(4, 0.34, 3)),
    flower: sample(petals(8, 0.2, 2.6)),
    cookie: sample(waves(9, 0.055)),
    sunny: sample(waves(8, 0.085)),
    burst: sample(waves(12, 0.11)),
    pentagon: sample(waves(5, 0.07)),
    squircle: sample(function (t) {
      return Math.pow(Math.pow(Math.abs(Math.cos(t)), 4) + Math.pow(Math.abs(Math.sin(t)), 4), -0.25);
    })
  };

  function pathFor(r, rotation) {
    var pts = [], i, a, n = r.length, rot = (rotation || 0) * Math.PI / 180;
    for (i = 0; i < n; i++) {
      a = i / n * TAU + rot - Math.PI / 2;
      pts.push([50 + 48 * r[i] * Math.cos(a), 50 + 48 * r[i] * Math.sin(a)]);
    }
    function f(v) { return v.toFixed(2); }
    var d = "M" + f(pts[0][0]) + " " + f(pts[0][1]);
    for (i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += "C" + f(p1[0] + (p2[0] - p0[0]) / 6) + " " + f(p1[1] + (p2[1] - p0[1]) / 6) + " " +
        f(p2[0] - (p3[0] - p1[0]) / 6) + " " + f(p2[1] - (p3[1] - p1[1]) / 6) + " " +
        f(p2[0]) + " " + f(p2[1]);
    }
    return d + "Z";
  }
  function blend(a, b, t) {
    var out = new Array(N);
    for (var i = 0; i < N; i++) out[i] = a[i] + (b[i] - a[i]) * t;
    return out;
  }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  var morphs = [];
  Array.prototype.forEach.call(document.querySelectorAll("svg[data-shapes]"), function (svg) {
    var names = svg.getAttribute("data-shapes").split(",").filter(function (n) { return SHAPES[n]; });
    if (!names.length) return;
    var path = svg.querySelector("path");
    var m = {
      svg: svg, path: path, names: names,
      mode: svg.getAttribute("data-mode") || "cycle",
      spin: parseFloat(svg.getAttribute("data-spin") || "0"),
      offset: Math.random() * 2000, visible: true,
      from: SHAPES[names[0]], to: SHAPES[names[0]], t0: 0, dur: 1, rotation: 0
    };
    path.setAttribute("d", pathFor(m.from, 0));
    morphs.push(m);
  });
  root.classList.add("shapes-ready");

  if (!reduce && morphs.length) {
    var HOLD = 1800, MORPH = 1400;
    // Cycling shapes: hold one shape, then morph to the next, turning slowly.
    var cycling = morphs.filter(function (m) { return m.mode === "cycle"; });
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          cycling.forEach(function (m) { if (m.svg === e.target) m.visible = e.isIntersecting; });
        });
      });
      cycling.forEach(function (m) { io.observe(m.svg); });
    }
    function frame(now) {
      cycling.forEach(function (m) {
        if (!m.visible || m.names.length < 2) return;
        var step = HOLD + MORPH, t = now + m.offset, idx = Math.floor(t / step), phase = t % step;
        var a = SHAPES[m.names[idx % m.names.length]], b = SHAPES[m.names[(idx + 1) % m.names.length]];
        var k = phase < HOLD ? 0 : ease((phase - HOLD) / MORPH);
        m.path.setAttribute("d", pathFor(blend(a, b, k), (t / 1000) * m.spin));
      });
      // Hover shapes: a short tween between the rest and the pressed shape.
      morphs.forEach(function (m) {
        if (m.mode !== "hover" || m.t0 === null) return;
        var k = Math.min(1, (now - m.t0) / m.dur);
        m.path.setAttribute("d", pathFor(blend(m.from, m.to, ease(k)), m.rotation * ease(k)));
        if (k >= 1) m.t0 = null;
      });
      if (document.hidden) { running = false; return; }
      requestAnimationFrame(frame);
    }
    var running = false;
    function start() { if (!running && !document.hidden) { running = true; requestAnimationFrame(frame); } }
    document.addEventListener("visibilitychange", start);
    start();

    morphs.filter(function (m) { return m.mode === "hover"; }).forEach(function (m) {
      m.t0 = null;
      var host = m.svg.closest("[data-hover-host]") || m.svg;
      var rest = SHAPES[m.names[0]], pressed = SHAPES[m.names[1] || m.names[0]];
      var current = rest;
      function go(target, rotation) {
        m.from = current; m.to = target; current = target; m.rotation = rotation;
        m.t0 = performance.now(); m.dur = 420;
      }
      host.addEventListener("pointerenter", function () { go(pressed, 0); });
      host.addEventListener("pointerleave", function () { go(rest, 0); });
      host.addEventListener("focusin", function () { go(pressed, 0); });
      host.addEventListener("focusout", function () { go(rest, 0); });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add("is-in"); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); ro.unobserve(e.target); }
      });
      root.classList.add("reveal-on");
    }, { rootMargin: "0px 0px -8% 0px" });
    Array.prototype.forEach.call(reveals, function (el) { ro.observe(el); });
  }
})();
