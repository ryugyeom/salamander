/* ══════════════════════════════════════════════════════════════
   🦎 도롱뇽 · 강화 RPG — 사이트 동작
   ──────────────────────────────────────────────────────────────
   · 링크는 LINKS 한 곳에서만 관리한다. HTML 여기저기에 초대 URL 을 박아 두면
     주소가 바뀔 때 반드시 한두 개가 옛 주소로 남는다(실제로 예전 사이트가
     그래서 한디리 링크를 주석 처리한 채 배포돼 있었다).
   · 숫자와 명령어 목록은 data/bot-data.js — 즉 **봇에서 뽑은 값** 만 쓴다.
     여기서 계산하거나 적어 넣지 않는다.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── ① 여기만 고치면 사이트 전체 링크가 바뀝니다 ───────────── */
  var LINKS = {
    invite: "https://discord.com/oauth2/authorize?client_id=1312263637078900816" +
            "&permissions=8&integration_type=0&scope=bot+applications.commands",
    koreanbots: "https://koreanbots.dev/bots/1312263637078900816",
    support: "https://discord.gg/mPb6EAp5EK",
    terms: "./terms.html",
    privacy: "./privacy.html"
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var B = window.BOT || { cats: [], cmds: [], stats: {} };
  var S = B.stats || {};

  /* ── 링크 주입 ── */
  $$("[data-link]").forEach(function (a) {
    var url = LINKS[a.getAttribute("data-link")];
    if (!url) return;
    a.href = url;
    if (/^https?:/.test(url)) { a.target = "_blank"; a.rel = "noopener"; }
  });

  /* ── 헤더 ── */
  var head = $("header");
  var onScroll = function () { head.classList.toggle("stuck", window.scrollY > 8); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var burger = $("#burger"), links = $("#links");
  if (burger) {
    burger.addEventListener("click", function () { links.classList.toggle("open"); });
    $$("#links a").forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); });
    });
  }

  /* ── ② 숫자 띠 — 값·라벨 모두 봇 데이터에서 ── */
  var BAR = [
    ["commands", "명령어", ""],
    ["slash", "슬래시 명령어", ""],
    ["helpers", "조력자", "종"],
    ["equips", "장비", "종"],
    ["images", "일러스트", "장"]
  ];
  var bar = $("#statbar");
  if (bar) {
    bar.innerHTML = BAR.map(function (r) {
      var v = S[r[0]];
      if (v == null) return "";
      return '<div><b data-n="' + v + '">0</b><span>' + r[1] + (r[2] ? " " + r[2] : "") + "</span></div>";
    }).join("");
  }

  /* 본문 곳곳의 인라인 숫자 — id 하나에 값 하나 */
  var FILL = {
    "n-img": S.images, "n-helpers": S.helpers, "n-equips": S.equips,
    "n-pity": S.pity, "n-months": S.season_months, "n-games": S.minigames,
    /* 환원율은 정책값(95%)이 아니라 **실측 범위**를 쓴다 — 게임마다 배당표가 달라
       실제로는 92~95% 로 흩어지고, 95% 단독 표기는 과장이 된다. */
    "n-rtp": (S.rtp_min === S.rtp_max ? S.rtp_max : S.rtp_min + "~" + S.rtp_max),
    "n-tiers": S.season_tiers, "n-cmds": S.commands_pub
  };
  Object.keys(FILL).forEach(function (id) {
    var el = document.getElementById(id);
    if (el && FILL[id] != null) el.textContent = FILL[id];
  });

  /* 숫자 카운트업 — 한 번만 */
  function countUp(el) {
    var end = parseInt(el.getAttribute("data-n"), 10) || 0, t0 = 0;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 900);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ── ③ 탭 ── */
  $$(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      $$(".tab").forEach(function (x) { x.classList.remove("on"); });
      $$(".panel").forEach(function (x) { x.classList.remove("on"); });
      t.classList.add("on");
      var p = document.getElementById("tab-" + t.getAttribute("data-tab"));
      if (p) p.classList.add("on");
    });
  });

  /* ── ④ 가챠 확률 — 가중치를 확률로 환산해 그린다 ── */
  var rates = $("#rates");
  if (rates && S.gacha_w) {
    var w = S.gacha_w;
    var sum = Object.keys(w).reduce(function (a, k) { return a + w[k]; }, 0) || 1;
    rates.innerHTML = Object.keys(w).map(function (k) {
      var pc = w[k] / sum * 100;
      /* 1% 짜리 막대는 눈에 안 보인다 — 비교용으로 제곱근 스케일을 쓴다 */
      var vis = Math.max(3, Math.sqrt(pc / 100) * 100);
      return '<div class="rate r-' + k + '"><span class="nm">' + k + '</span>' +
             '<span class="track"><i class="fill" data-w="' + vis.toFixed(0) + '"></i></span>' +
             '<span class="pc">' + (pc < 10 ? pc.toFixed(1) : pc.toFixed(0)) + "%</span></div>";
    }).join("");
  }

  /* ── ⑤ 아트 갤러리 ── */
  var ART = window.ART || { helpers: [], equip: [] };
  function gallery(id, list, base) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = list.map(function (a) {
      return '<figure class="art"><img src="./assets/art/' + base + "/" + a.f +
             '" alt="' + a.n + '" loading="lazy" width="320" height="320">' +
             '<figcaption class="cap">' + a.n + (a.g ? " · " + a.g : "") + "</figcaption></figure>";
    }).join("");
  }
  gallery("gal-helpers", ART.helpers, "helpers");
  gallery("gal-equip", ART.equip, "equip");

  /* ── ⑥ 명령어 탐색기 ── */
  var CHUNK = 24;
  var state = { q: "", cat: "전체", shown: CHUNK };
  var cmds = B.cmds || [];
  var cats = ["전체"].concat((B.cats || []).filter(function (c) {
    return cmds.some(function (x) { return x.cat === c; });
  }));
  var EMO = {
    "전체": "🗂️", "시작하기": "🚀", "금융": "💰", "투자": "💹", "강화": "⚒️", "룬": "💠",
    "직업": "🧭", "제작": "🔨", "펫": "🐾", "생활": "⛏️", "미니게임": "🎲", "퀘스트": "📋",
    "길드": "🏰", "전투": "⚔️", "상점": "🏪", "칭호": "🏅", "시스템": "🌩️",
    "공지": "📢", "프리미엄": "💎", "기타": "🔧"
  };

  var chips = $("#chips"), list = $("#cmdlist"), more = $("#more"), q = $("#q");

  if (chips) {
    chips.innerHTML = cats.map(function (c) {
      var n = c === "전체" ? cmds.length : cmds.filter(function (x) { return x.cat === c; }).length;
      return '<button class="chip' + (c === "전체" ? " on" : "") + '" data-cat="' + c + '">' +
             (EMO[c] || "") + " " + c + " <span style=\"opacity:.6\">" + n + "</span></button>";
    }).join("");
    $$(".chip", chips).forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".chip", chips).forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        state.cat = b.getAttribute("data-cat");
        state.shown = CHUNK;
        render();
      });
    });
  }

  if (q) {
    q.addEventListener("input", function () {
      state.q = q.value.trim().toLowerCase();
      state.shown = CHUNK;
      render();
    });
  }
  if (more) {
    more.addEventListener("click", function () { state.shown += CHUNK * 2; render(); });
  }

  function match(c) {
    if (state.cat !== "전체" && c.cat !== state.cat) return false;
    if (!state.q) return true;
    var hay = (c.name + " " + c.desc + " " + (c.alias || []).join(" ") + " " +
               (c.sub || []).join(" ")).toLowerCase();
    return hay.indexOf(state.q) >= 0;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m];
    });
  }

  function render() {
    if (!list) return;
    var hit = cmds.filter(match);
    if (!hit.length) {
      list.innerHTML = '<div class="cmd-empty" style="grid-column:1/-1">' +
                       "검색 결과가 없어요. 다른 말로 찾아보세요 🙂</div>";
      if (more) more.style.display = "none";
      return;
    }
    list.innerHTML = hit.slice(0, state.shown).map(function (c) {
      var sub = (c.sub && c.sub.length)
        ? '<div style="color:var(--dim);font-size:.78rem;margin-top:3px">└ ' +
          esc(c.sub.slice(0, 6).join(" · ")) + (c.sub.length > 6 ? " …" : "") + "</div>"
        : "";
      return '<div class="cmd"><span class="nm">/' + esc(c.name) + "</span>" +
             '<span class="ds">' + esc(c.desc || "") + sub + "</span>" +
             (c.slash ? '<span class="sl">/</span>' : "") + "</div>";
    }).join("");
    if (more) {
      more.style.display = hit.length > state.shown ? "" : "none";
      more.textContent = "더 보기 (" + (hit.length - state.shown) + "개 남음)";
    }
  }
  render();

  /* ── ⑦ 등장 애니메이션 (맨 마지막) ──────────────────────────
     순서가 중요하다: 확률 막대(④)·갤러리(⑤)가 **먼저 그려져 있어야** 화면에 들어올 때
     같이 켤 수 있다. 이 블록을 위로 올리면 가챠 막대가 0% 인 채로 남는다.
     ⚠️ 여기는 "장식" 이지 "표시 조건" 이 아니다. .rv 는 opacity:0 으로 시작하므로
        관찰자가 한 번도 안 돌면 **본문이 영영 안 보인다.** 실제로 탭이 백그라운드일 때
        IntersectionObserver 가 콜백을 미루는 걸 확인했다. 그래서 관찰자와 별개로
        (1) 로드 1.2초 뒤 (2) 탭이 보이게 될 때 화면 안 요소를 직접 켜는 안전망을 둔다. */
  function reveal(el) {
    if (el.dataset.rvDone) return;
    el.dataset.rvDone = "1";
    el.classList.add("in");
    $$("[data-n]", el).forEach(countUp);
    $$(".rate .fill", el).forEach(function (f) { f.style.width = f.getAttribute("data-w") + "%"; });
  }
  function sweep(all) {
    var h = window.innerHeight || 800;
    $$(".rv").forEach(function (el) {
      if (all || el.getBoundingClientRect().top < h * 0.95) reveal(el);
    });
  }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        reveal(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px" });
    $$(".rv").forEach(function (el) { io.observe(el); });
    setTimeout(function () { sweep(false); }, 1200);
    window.addEventListener("scroll", function () { sweep(false); }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) sweep(false);
    });
  } else {
    sweep(true);
  }
})();
