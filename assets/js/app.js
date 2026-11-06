/* Exam prep — progress tracking, navigation and dashboard. No build step, no dependencies. */
(function () {
  "use strict";

  const M = window.MANIFEST;
  if (!M) return;

  /* ---------- storage ---------- */
  const KEY = "examprep.v1";
  const THEME_KEY = "examprep.theme";
  const blank = () => ({ done: {}, qa: {}, last: null });
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s === "object") return Object.assign(blank(), s);
    } catch (_) {}
    return blank();
  }
  let state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }

  /* ---------- helpers ---------- */
  const fa = (n) => Number(n).toLocaleString("fa-IR");
  const pctFa = (p) => fa(Math.round(p)) + "٪";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function h(tag, attrs, html) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") el.className = attrs[k];
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    if (html != null) el.innerHTML = html;
    return el;
  }

  const topicIndex = [];
  const bySlug = {};
  M.exams.forEach((exam) => exam.topics.forEach((t) => {
    const entry = Object.assign({}, t, { exam });
    topicIndex.push(entry);
    bySlug[t.slug] = entry;
  }));

  function topicProgress(t) {
    const total = t.sections.length;
    const done = t.sections.filter((s) => state.done[t.slug + "/" + s.id]).length;
    return { done, total, pct: total ? (done / total) * 100 : 0 };
  }
  function examProgress(exam) {
    let done = 0, total = 0;
    exam.topics.forEach((t) => { const p = topicProgress(t); done += p.done; total += p.total; });
    return { done, total, pct: total ? (done / total) * 100 : 0 };
  }
  function overallProgress() {
    let done = 0, total = 0;
    M.exams.forEach((e) => { const p = examProgress(e); done += p.done; total += p.total; });
    return { done, total, pct: total ? (done / total) * 100 : 0 };
  }

  /* ---------- theme ---------- */
  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  let theme = null;
  try { theme = localStorage.getItem(THEME_KEY); } catch (_) {}
  applyTheme(theme);
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
  }

  const ICON = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  };

  function topbar(base, crumb) {
    const bar = h("header", { class: "topbar" });
    bar.innerHTML =
      (crumb ? `<button class="icon-btn menu-btn" aria-label="فهرست">${ICON.menu}</button>` : "") +
      `<a class="brand" href="${base}index.html">آمادگی آزمون</a>` +
      (crumb ? `<span class="crumb">/ ${crumb}</span>` : "") +
      `<span class="spacer"></span>` +
      (crumb ? `<a class="icon-btn" href="${base}index.html" aria-label="داشبورد">${ICON.home}</a>` : "") +
      `<button class="icon-btn theme-btn" aria-label="تغییر تم">${ICON.theme}</button>`;
    $(".theme-btn", bar).addEventListener("click", toggleTheme);
    const mb = $(".menu-btn", bar);
    if (mb) mb.addEventListener("click", () => document.body.classList.toggle("nav-open"));
    return bar;
  }

  /* ---------- export / import ---------- */
  function exportProgress() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: "exam-prep-progress.json" });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function importProgress() {
    const input = h("input", { type: "file", accept: "application/json,.json" });
    input.addEventListener("change", () => {
      const f = input.files[0]; if (!f) return;
      f.text().then((txt) => {
        try {
          const s = JSON.parse(txt);
          if (!s || typeof s.done !== "object") throw new Error("bad file");
          state = Object.assign(blank(), s); save(); location.reload();
        } catch (_) { alert("فایل معتبر نیست."); }
      });
    });
    input.click();
  }
  function resetProgress() {
    if (!confirm("همه پیشرفت‌ها و ارزیابی سوال‌ها پاک شود؟")) return;
    state = blank(); save(); location.reload();
  }

  /* =====================================================
     Topic page
     ===================================================== */
  function initTopic(slug) {
    const t = bySlug[slug];
    const content = $("#content");
    if (!t || !content) return;
    const exam = t.exam;
    const base = "../";
    document.body.classList.add(exam.color);

    // shell
    const bar = topbar(base, `آزمون ${fa(exam.num)} · ${esc(t.title)}`);
    const progLine = h("i", { class: "topic-progress" });
    bar.appendChild(progLine);
    const layout = h("div", { class: "layout" });
    const sidebar = h("aside", { class: "sidebar" });
    const wrap = h("div", { class: "content-wrap" });
    content.parentNode.insertBefore(layout, content);
    wrap.appendChild(content);
    layout.append(sidebar, wrap);
    document.body.insertBefore(bar, layout);

    // hero meta + progress
    const hero = $(".topic-hero", content);
    if (hero) {
      const meta = h("div", { class: "meta" },
        `<span class="chip">آزمون ${fa(exam.num)} · ${esc(exam.short)}</span><span>${esc(exam.day)} — ${esc(exam.time)}</span>`);
      hero.insertBefore(meta, hero.firstChild);
      hero.appendChild(h("div", { class: "hero-progress" }, `<div class="bar"><i></i></div><span class="hp-text"></span>`));
    }

    // sections
    const sections = $$("section.lesson", content);
    sections.forEach((sec, i) => {
      const h2 = $(":scope > h2", sec);
      if (h2 && !$(".num", h2)) {
        const span = h("span");
        while (h2.firstChild) span.appendChild(h2.firstChild);
        h2.append(h("span", { class: "num" }, fa(i + 1)), span);
      }
      const key = slug + "/" + sec.id;
      const btn = h("button", { type: "button" }, `<span class="box"></span><span class="lbl"></span>`);
      btn.addEventListener("click", () => {
        if (state.done[key]) delete state.done[key]; else state.done[key] = Date.now();
        save(); refresh();
      });
      const mark = h("div", { class: "mark" }); mark.appendChild(btn);
      sec.appendChild(mark);
      sec._btn = btn; sec._key = key;
    });

    // sidebar: TOC
    sidebar.appendChild(h("h3", null, "در این صفحه"));
    const toc = h("ul", { class: "toc" });
    sections.forEach((sec) => {
      const li = h("li");
      const a = h("a", { href: "#" + sec.id }, `<span class="dot"></span><span>${esc(sec.dataset.title || sec.id)}</span>`);
      a.addEventListener("click", () => document.body.classList.remove("nav-open"));
      li.appendChild(a); toc.appendChild(li); sec._toc = a;
    });
    sidebar.appendChild(toc);

    // sidebar: all topics
    sidebar.appendChild(h("h3", null, "همه مباحث"));
    const tree = h("div", { class: "navtree" });
    M.exams.forEach((e) => {
      const d = h("details", { class: e.color });
      if (e === exam) d.open = true;
      const ep = examProgress(e);
      d.innerHTML = `<summary><span class="chip">آزمون ${fa(e.num)}</span><span>${esc(e.short)}</span></summary>`;
      const ul = h("ul");
      e.topics.forEach((tt) => {
        const p = topicProgress(tt);
        ul.appendChild(h("li", null,
          `<a href="${tt.slug}.html" class="${tt.slug === slug ? "current" : ""}"><span>${esc(tt.title)}</span><span class="pct ${p.pct === 100 ? "full" : ""}" data-slug="${tt.slug}">${pctFa(p.pct)}</span></a>`));
      });
      d.appendChild(ul);
      tree.appendChild(d);
      void ep;
    });
    sidebar.appendChild(tree);
    const tools = h("div", { class: "sidebar-tools" });
    tools.appendChild(h("a", { class: "btn small", href: base + "index.html" }, "داشبورد"));
    tools.appendChild(h("button", { class: "btn small", type: "button", onclick: markAll }, "علامت همه"));
    sidebar.appendChild(tools);
    function markAll() {
      const allDone = sections.every((s) => state.done[s._key]);
      sections.forEach((s) => { if (allDone) delete state.done[s._key]; else state.done[s._key] = Date.now(); });
      save(); refresh();
    }

    // Q&A practice
    initQA(content, slug);

    // pager
    const idx = topicIndex.findIndex((x) => x.slug === slug);
    const prev = topicIndex[idx - 1], next = topicIndex[idx + 1];
    const pager = h("nav", { class: "pager" });
    pager.innerHTML =
      (prev ? `<a href="${prev.slug}.html"><small>→ مبحث قبلی</small><strong>${esc(prev.title)}</strong></a>` : "<span></span>") +
      (next ? `<a class="next" href="${next.slug}.html"><small>مبحث بعدی ←</small><strong>${esc(next.title)}</strong></a>` : "<span></span>");
    content.appendChild(pager);

    // code blocks
    enhanceCode(content);

    function refresh() {
      sections.forEach((sec) => {
        const done = !!state.done[sec._key];
        sec._btn.classList.toggle("done", done);
        $(".lbl", sec._btn).textContent = done ? "خوانده شد" : "این بخش را خواندم";
        sec._toc.parentNode.classList.toggle("done", done);
      });
      const p = topicProgress(t);
      progLine.style.width = p.pct + "%";
      const hb = $(".hero-progress .bar > i", content);
      if (hb) hb.style.width = p.pct + "%";
      const ht = $(".hp-text", content);
      if (ht) ht.textContent = `${fa(p.done)} از ${fa(p.total)} بخش · ${pctFa(p.pct)}`;
      $$(".navtree .pct", sidebar).forEach((el) => {
        const tp = topicProgress(bySlug[el.dataset.slug]);
        el.textContent = pctFa(tp.pct);
        el.classList.toggle("full", tp.pct === 100);
      });
    }
    refresh();

    // scroll spy + remember position
    let activeId = null;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          activeId = en.target.id;
          sections.forEach((s) => s._toc.classList.toggle("active", s.id === activeId));
          state.last = { slug, section: activeId, at: Date.now() };
          save();
        }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    sections.forEach((s) => io.observe(s));
    if (!activeId) { state.last = { slug, section: sections[0] && sections[0].id, at: Date.now() }; save(); }
  }

  /* ---------- Q&A self-assessment ---------- */
  function initQA(content, slug) {
    const qas = $$("details.qa", content);
    if (!qas.length) return;
    qas.forEach((d, i) => {
      const id = d.id || "q" + (i + 1);
      const key = slug + "/" + id;
      const sum = $(":scope > summary", d);
      if (sum) { const span = h("span"); while (sum.firstChild) span.appendChild(sum.firstChild); sum.appendChild(span); }
      const qText = sum ? sum.textContent.trim() : "";
      let ans = $(":scope > .answer", d);
      if (!ans) { ans = h("div", { class: "answer" }); while (sum && sum.nextSibling) ans.appendChild(sum.nextSibling); d.appendChild(ans); }
      const row = h("div", { class: "qa-rate" });
      row.innerHTML = `<span>خودت رو ارزیابی کن:</span>`;
      const ok = h("button", { type: "button", class: "ok" }, "✓ بلد بودم");
      const no = h("button", { type: "button", class: "no" }, "↺ نیاز به مرور");
      row.append(ok, no);
      ans.appendChild(row);
      const paint = () => {
        const v = state.qa[key] && state.qa[key].v;
        ok.classList.toggle("on", v === "ok");
        no.classList.toggle("on", v === "no");
        d.classList.toggle("rated-ok", v === "ok");
        d.classList.toggle("rated-no", v === "no");
      };
      const set = (v) => {
        if (state.qa[key] && state.qa[key].v === v) delete state.qa[key];
        else state.qa[key] = { v, q: qText.slice(0, 220), at: Date.now() };
        save(); paint();
      };
      ok.addEventListener("click", () => set("ok"));
      no.addEventListener("click", () => set("no"));
      paint();
    });
    // open / close all, per section that holds questions
    const holders = new Set(qas.map((d) => d.parentElement));
    holders.forEach((holder) => {
      const first = $(":scope > details.qa", holder);
      const list = $$(":scope > details.qa", holder);
      const tools = h("div", { class: "qa-tools" });
      tools.append(
        h("button", { class: "btn small", type: "button", onclick: () => list.forEach((d) => (d.open = true)) }, "نمایش همه جواب‌ها"),
        h("button", { class: "btn small", type: "button", onclick: () => list.forEach((d) => (d.open = false)) }, "بستن همه"),
        h("button", { class: "btn small", type: "button", onclick: () => list.forEach((d) => { const k = slug + "/" + (d.id || "q" + (qas.indexOf(d) + 1)); d.open = !(state.qa[k] && state.qa[k].v === "ok"); }) }, "فقط سوال‌های مرور")
      );
      holder.insertBefore(tools, first);
    });
  }

  function enhanceCode(root) {
    $$("pre > code", root).forEach((code) => {
      const pre = code.parentElement;
      const m = (code.className || "").match(/language-([\w+-]+)/);
      if (m && !pre.dataset.lang) pre.dataset.lang = m[1];
      if (window.hljs && m) { try { window.hljs.highlightElement(code); } catch (_) {} }
      const btn = h("button", { class: "copy", type: "button" }, "کپی");
      btn.addEventListener("click", () => {
        navigator.clipboard && navigator.clipboard.writeText(code.innerText).then(() => {
          btn.textContent = "کپی شد"; setTimeout(() => (btn.textContent = "کپی"), 1200);
        });
      });
      pre.appendChild(btn);
    });
  }

  /* =====================================================
     Dashboard
     ===================================================== */
  function initDashboard() {
    const root = $("#dashboard");
    if (!root) return;
    document.body.insertBefore(topbar("", null), document.body.firstChild);

    const o = overallProgress();
    const topicsDone = topicIndex.filter((t) => t.sections.length && topicProgress(t).pct === 100).length;
    const review = Object.entries(state.qa).filter(([, v]) => v.v === "no");
    const known = Object.values(state.qa).filter((v) => v.v === "ok").length;
    const last = state.last && bySlug[state.last.slug];

    let html = `
    <div class="dash-hero">
      <div class="panel">
        <h1>${esc(M.title)}</h1>
        <p>۵ آزمون، ۲۵ مبحث. هر بخش رو که خوندی تیک بزن و سوال‌های تشریحی رو اول خودت جواب بده، بعد با جواب نمونه مقایسه کن.</p>
        <div class="overall">
          <div class="ring" style="--p:${o.pct.toFixed(1)}"><div><strong>${pctFa(o.pct)}</strong><small>کل پیشرفت</small></div></div>
          <div class="stats">
            <div><b>${fa(o.done)}<small style="font-size:14px;color:var(--muted)">/${fa(o.total)}</small></b><span>بخش خوانده‌شده</span></div>
            <div><b>${fa(topicsDone)}<small style="font-size:14px;color:var(--muted)">/${fa(topicIndex.length)}</small></b><span>مبحث کامل</span></div>
            <div><b>${fa(known)}</b><span>سوال بلد بودم</span></div>
          </div>
        </div>
        <div class="resume">
          ${last ? `<a class="btn primary" href="topics/${last.slug}.html#${esc(state.last.section || "")}">ادامه از ${esc(last.title)}</a>` : `<a class="btn primary" href="topics/${topicIndex[0].slug}.html">شروع از ${esc(topicIndex[0].title)}</a>`}
          ${review.length ? `<a class="btn" href="#review">${fa(review.length)} سوال برای مرور</a>` : ""}
        </div>
      </div>
      <div class="panel countdown" id="countdown"></div>
    </div>`;

    // schedule
    const days = {};
    M.exams.forEach((e) => { (days[e.day] = days[e.day] || []).push(e); });
    html += `<section class="schedule"><h2 class="section-title">برنامه آزمون‌ها <small>مسیر Laravel</small></h2><div class="days">`;
    Object.keys(days).forEach((day) => {
      const list = days[day].slice().sort((a, b) => a.start.localeCompare(b.start));
      html += `<div class="day"><h3>${esc(day)}</h3>`;
      list.forEach((e, i) => {
        const p = examProgress(e);
        const past = Date.now() > Date.parse(e.end);
        html += `<div class="slot ${e.color} ${past ? "past" : ""}"><span class="t">${esc(e.time)}</span><a href="#${e.id}"><span class="chip">آزمون ${fa(e.num)}</span> ${esc(e.short)}</a><div class="bar mini"><i style="width:${p.pct}%"></i></div></div>`;
        if (list[i + 1] && e.end.slice(11, 16) === "12:15" && list[i + 1].start.slice(11, 16) === "12:45")
          html += `<div class="slot lunch"><span class="t">۱۲:۱۵ تا ۱۲:۴۵</span><span>ناهار</span></div>`;
      });
      html += `</div>`;
    });
    html += `</div></section>`;

    // exams
    M.exams.forEach((e) => {
      const p = examProgress(e);
      html += `<section class="exam-block ${e.color}" id="${e.id}">
        <div class="exam-head">
          <span class="chip">آزمون ${fa(e.num)}</span>
          <h2>${esc(e.title)}</h2>
          <span class="when">${esc(e.day)} · ${esc(e.time)}</span>
          <span class="spacer" style="flex:1"></span>
          <div class="bar"><i style="width:${p.pct}%"></i></div><span class="pct">${pctFa(p.pct)}</span>
        </div>
        <div class="topic-grid">`;
      e.topics.forEach((t) => {
        const tp = topicProgress(t);
        const missing = !t.sections.length;
        html += `<a class="topic-card ${tp.pct === 100 ? "complete" : ""} ${missing ? "missing" : ""}" href="topics/${t.slug}.html">
          <h3>${esc(t.title)}</h3>
          <p>${esc(t.lead || (missing ? "به‌زودی" : ""))}</p>
          <div class="foot"><div class="bar"><i style="width:${tp.pct}%"></i></div><b>${fa(tp.done)}/${fa(tp.total)}</b></div>
        </a>`;
      });
      html += `</div></section>`;
    });

    // review list
    html += `<section class="exam-block" id="review"><h2 class="section-title">سوال‌هایی که باید مرور کنی <small>${review.length ? fa(review.length) + " سوال" : "هنوز چیزی علامت نزدی"}</small></h2>`;
    if (review.length) {
      html += `<div class="review-list">`;
      review.sort((a, b) => b[1].at - a[1].at).forEach(([k, v]) => {
        const [slug, qid] = k.split("/");
        const t = bySlug[slug];
        if (!t) return;
        html += `<a class="review-item ${t.exam.color}" href="topics/${slug}.html#${esc(qid)}"><span class="chip">${esc(t.title)}</span><span>${esc(v.q)}</span></a>`;
      });
      html += `</div>`;
    }
    html += `</section>`;

    // how to answer descriptive questions
    html += `<section class="exam-block"><h2 class="section-title">نوشتن جواب تشریحی</h2><div class="tips">
      <div class="card"><h4>۱. تعریف یک‌خطی</h4><p>جواب رو با یک تعریف دقیق شروع کن. مثلاً «Index یک ساختار داده جانبی (معمولاً B-Tree) است که …».</p></div>
      <div class="card"><h4>۲. چرا و کِی</h4><p>بگو چه مشکلی رو حل می‌کنه و کِی سراغش می‌ریم. نمره بیشتر برای درک کاربرده تا حفظ کردن.</p></div>
      <div class="card"><h4>۳. مثال یا کد کوتاه</h4><p>چند خط کد یا یک سناریوی واقعی (ترجیحاً با Laravel/PHP) نشون می‌ده واقعاً کار کردی.</p></div>
      <div class="card"><h4>۴. Trade-off و مقایسه</h4><p>مزایا و معایب، یا مقایسه با گزینه جایگزین. مثلاً SQL در برابر NoSQL، یا Monolith در برابر Microservices.</p></div>
      <div class="card"><h4>۵. ساختار تمیز</h4><p>بولت‌پوینت، عنوان کوتاه و کلیدواژه‌های انگلیسی. مصحح باید سریع کلیدواژه‌ها رو ببینه.</p></div>
      <div class="card"><h4>۶. مدیریت زمان</h4><p>۱۲۰ دقیقه برای ۵ مبحث، یعنی حدود ۲۰ دقیقه برای هر مبحث. اول سوال‌هایی رو بنویس که مطمئنی.</p></div>
    </div></section>`;

    html += `<div class="foot-note">
      پیشرفت فقط در همین مرورگر ذخیره می‌شه. برای انتقال به دستگاه دیگه از خروجی گرفتن استفاده کن.<br>
      <button class="btn small" id="exp">خروجی گرفتن از پیشرفت</button>
      <button class="btn small" id="imp">وارد کردن</button>
      <button class="btn small" id="rst">پاک کردن همه</button>
    </div>`;

    root.innerHTML = html;
    $("#exp").addEventListener("click", exportProgress);
    $("#imp").addEventListener("click", importProgress);
    $("#rst").addEventListener("click", resetProgress);
    startCountdown($("#countdown"));
  }

  function startCountdown(el) {
    function tick() {
      const now = Date.now();
      const sorted = M.exams.slice().sort((a, b) => a.start.localeCompare(b.start));
      const live = sorted.find((e) => now >= Date.parse(e.start) && now < Date.parse(e.end));
      const next = sorted.find((e) => Date.parse(e.start) > now);
      if (live) {
        el.innerHTML = `<h2>در حال برگزاری</h2><div class="next-name ${live.color}"><span class="chip">آزمون ${fa(live.num)}</span> ${esc(live.short)}</div><p class="when">${esc(live.day)} · ${esc(live.time)}<br>موفق باشی!</p>`;
      } else if (next) {
        let s = Math.max(0, Math.floor((Date.parse(next.start) - now) / 1000));
        const d = Math.floor(s / 86400); s -= d * 86400;
        const hh = Math.floor(s / 3600); s -= hh * 3600;
        const mm = Math.floor(s / 60); s -= mm * 60;
        el.innerHTML = `<h2>تا آزمون بعدی</h2>
          <div class="next-name ${next.color}"><span class="chip">آزمون ${fa(next.num)}</span> ${esc(next.short)}</div>
          <div class="cd-grid"><div><b>${fa(d)}</b><span>روز</span></div><div><b>${fa(hh)}</b><span>ساعت</span></div><div><b>${fa(mm)}</b><span>دقیقه</span></div><div><b>${fa(s)}</b><span>ثانیه</span></div></div>
          <p class="when">${esc(next.day)} · ${esc(next.time)}</p>`;
      } else {
        el.innerHTML = `<h2>همه آزمون‌ها برگزار شد</h2><div class="next-name">خسته نباشی 🎉</div>`;
        return;
      }
      setTimeout(tick, 1000);
    }
    tick();
  }

  /* ---------- boot ---------- */
  function boot() {
    const slug = document.body.dataset.topic;
    if (slug) initTopic(slug); else initDashboard();
    // jump to hash after the shell exists
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) {
        if (target.tagName === "DETAILS") target.open = true;
        setTimeout(() => target.scrollIntoView(), 50);
      }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
