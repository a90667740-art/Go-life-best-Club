(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Mobile nav toggle
  const navToggle = $(".nav__toggle");
  const navMenu = $("#navMenu");
  if (navToggle && navMenu) {
    const setOpen = (open) => {
      document.body.dataset.menuOpen = open ? "true" : "false";
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    };

    setOpen(false);

    navToggle.addEventListener("click", () => {
      const open = document.body.dataset.menuOpen === "true";
      setOpen(!open);
    });

    // Close when clicking a link
    navMenu.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      setOpen(false);
    });

    // Close on Escape
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
    });
  }

  // Accordion (all [data-accordion] blocks on the page)
  const accordions = $$("[data-accordion]");
  accordions.forEach((accordion) => {
    const items = $$(".accordion__item", accordion);
    const closeItem = (item) => {
      item.dataset.open = "false";
      const trigger = $(".accordion__trigger", item);
      const panel = $(".accordion__panel", item);
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      if (panel) panel.style.maxHeight = "0px";
    };
    const openItem = (item) => {
      item.dataset.open = "true";
      const trigger = $(".accordion__trigger", item);
      const panel = $(".accordion__panel", item);
      if (trigger) trigger.setAttribute("aria-expanded", "true");
      if (panel) {
        panel.style.maxHeight = "0px";
        panel.offsetHeight;
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      }
    };

    // Default open behavior: only when explicitly requested (e.g., Club Rules)
    if (accordion.dataset.defaultOpen === "first" && items[0]) openItem(items[0]);

    items.forEach((item) => {
      const trigger = $(".accordion__trigger", item);
      if (!trigger) return;
      trigger.addEventListener("click", () => {
        const isOpen = item.dataset.open === "true";
        items.forEach(closeItem);
        if (!isOpen) openItem(item);
      });
    });
  });

  window.addEventListener("resize", () => {
    document.querySelectorAll("[data-accordion]").forEach((accordion) => {
      const items = $$(".accordion__item", accordion);
      const open = items.find((it) => it.dataset.open === "true");
      if (!open) return;
      const panel = $(".accordion__panel", open);
      if (!panel) return;
      panel.style.maxHeight = `${panel.scrollHeight}px`;
    });
  });

  // Members: handicap auto sort (cards + handicap table)
  {
    const membersSection = $("#members");
    const membersGrid = membersSection && $(".membersGrid", membersSection);
    if (membersGrid) {
      const cards = $$(".memberCard", membersGrid);
      cards
        .sort((a, b) => {
          const aHandi = Number.parseInt(($(".memberMeta dd", a)?.textContent || "").trim(), 10);
          const bHandi = Number.parseInt(($(".memberMeta dd", b)?.textContent || "").trim(), 10);
          const safeA = Number.isFinite(aHandi) ? aHandi : Number.MAX_SAFE_INTEGER;
          const safeB = Number.isFinite(bHandi) ? bHandi : Number.MAX_SAFE_INTEGER;
          if (safeA !== safeB) return safeA - safeB;
          const aName = ($(".memberCard__name", a)?.childNodes?.[0]?.textContent || "").trim();
          const bName = ($(".memberCard__name", b)?.childNodes?.[0]?.textContent || "").trim();
          return aName.localeCompare(bName, "ko");
        })
        .forEach((card) => membersGrid.appendChild(card));
    }

    const handicapBody = membersSection && $(".scoreTable--handicap tbody", membersSection);
    if (handicapBody) {
      const rows = $$("tr", handicapBody);
      const parsed = rows.map((row) => {
        const score = Number.parseInt(($("td:nth-child(3)", row)?.textContent || "").trim(), 10);
        const name = (($("td:nth-child(2)", row)?.textContent || "").replace(/\s+/g, " ").trim());
        return { row, score: Number.isFinite(score) ? score : Number.MAX_SAFE_INTEGER, name };
      });
      parsed.sort((a, b) => (a.score !== b.score ? a.score - b.score : a.name.localeCompare(b.name, "ko")));

      let prevScore = null;
      let currentRank = 0;
      parsed.forEach((item, idx) => {
        if (item.score !== prevScore) currentRank = idx + 1;
        prevScore = item.score;
        item.row.dataset.rank = String(currentRank);
      });

      parsed.forEach((item, idx) => {
        const row = item.row;
        const rank = Number.parseInt(row.dataset.rank || String(idx + 1), 10);
        const tied = parsed.some((p, i) => i !== idx && p.score === item.score);
        const rankCell = $("td:first-child", row);
        row.classList.remove("rank", "rank--1", "rank--2", "rank--3");
        if (rankCell) {
          rankCell.innerHTML = `<span class="rankNum">${rank}</span>${tied ? ' <span class="tieMedal" title="동순위">동</span>' : ""}`;
        }
        if (rank === 1) {
          row.classList.add("rank", "rank--1");
          if (rankCell) rankCell.innerHTML = `<span class="medal medal--gold">🥇</span> <span class="rankNum">${rank}</span>`;
        } else if (rank === 2) {
          row.classList.add("rank", "rank--2");
          if (rankCell) rankCell.innerHTML = `<span class="medal medal--silver">🥈</span> <span class="rankNum">${rank}</span>`;
        } else if (rank === 3) {
          row.classList.add("rank", "rank--3");
          if (rankCell) rankCell.innerHTML = `<span class="medal medal--bronze">🥉</span> <span class="rankNum">${rank}</span>`;
        }
        handicapBody.appendChild(row);
      });
    }
  }

  // Next Round (nearest upcoming regular round)
  {
    const elMain = $("#nextRoundMain");
    const elSub = $("#nextRoundSub");
    const bgLogo = document.querySelector(".hero__bgLogo");
    if (elMain && elSub) {
      const rounds = [
        { date: "2026-04-15T07:21:00", main: "4월 15일(수) · 07:21", sub: "써닝포인트 CC" },
        { date: "2026-06-26T07:31:00", main: "6월 26일(금) · 07:31", sub: "Golf Club Q" },
        { date: "2026-07-12T00:00:00", main: "7월 12일(일) · 미정", sub: "미정" },
        { date: "2026-09-18T00:00:00", main: "9월 18일(금) · 미정", sub: "미정" },
        { date: "2026-11-06T00:00:00", main: "11월 6일(금) · 미정", sub: "미정" },
      ].map((r) => ({ ...r, ts: new Date(r.date).getTime() }));

      const now = Date.now();
      const upcoming = rounds
        .filter((r) => Number.isFinite(r.ts) && r.ts >= now)
        .sort((a, b) => a.ts - b.ts)[0];

      // If all passed, show the last one (or keep default)
      const chosen = upcoming ?? rounds.sort((a, b) => b.ts - a.ts)[0];
      if (chosen) {
        elMain.textContent = chosen.main;
        elSub.textContent = chosen.sub;
      }

      // Course logo by next venue (SNP / Golf Club Q / 미정 등)
      if (bgLogo) {
        const venue = chosen?.sub;
        if (venue === "써닝포인트 CC") {
          bgLogo.src = "./images/logo_snp.png";
          bgLogo.alt = "써닝포인트 CC 로고";
          bgLogo.style.display = "";
        } else if (venue === "Golf Club Q") {
          bgLogo.src = "./qlogo.png";
          bgLogo.alt = "Golf Club Q 로고";
          bgLogo.style.display = "";
        } else {
          bgLogo.style.display = "none";
        }
      }
    }
  }

  // RSVP: + 클릭 → 같은 카드 안 .eventCard__detail 표시 (위임 + !important로 스타일 덮어쓰기 방지)
  const rsvpSection = $("#rsvp");
  if (rsvpSection) {
    rsvpSection.addEventListener("click", (e) => {
      const btn = e.target.closest(".eventCard__expand");
      if (!btn || !rsvpSection.contains(btn)) return;
      e.preventDefault();
      const card = btn.closest(".eventCard--schedule");
      const panel = card && card.querySelector(".eventCard__detail");
      if (!panel) return;
      const expanded = btn.getAttribute("aria-expanded") === "true";
      const next = !expanded;
      btn.setAttribute("aria-expanded", next ? "true" : "false");
      btn.textContent = next ? "×" : "+";
      btn.setAttribute("aria-label", next ? "세부 안내 닫기" : "세부 안내 펼치기");
      btn.classList.toggle("is-open", next);
      panel.classList.toggle("eventCard__detail--open", next);
      panel.setAttribute("aria-hidden", next ? "false" : "true");
      if (next) {
        panel.style.setProperty("display", "block", "important");
        panel.style.setProperty("visibility", "visible", "important");
      } else {
        panel.style.setProperty("display", "none", "important");
        panel.style.setProperty("visibility", "hidden", "important");
      }
    });
  }

  // Gallery newest-first order:
  // Add new image paths to the start of this array to show first.
  {
    const gallery = $("#gallery .gallery");
    if (gallery) {
      const latestGalleryImages = [
        "./images/sunning12.jpg",
        "./images/sunning11.jpg",
        "./images/sunning10.jpg",
        "./images/sunning9.jpg",
        "./images/sunning8.jpg",
        "./images/sunning7.jpg",
        "./images/sunning6.jpg",
        "./images/sunning5.jpg",
        "./images/sunning4.jpg",
        "./images/sunning3.jpg",
        "./images/sunning2.jpg",
        "./images/sunning1.jpg",
      ];

      const figures = $$(".shot", gallery);
      const figureBySrc = new Map();
      figures.forEach((figure) => {
        const img = $(".shot__img", figure);
        if (!img) return;
        const src = img.getAttribute("src");
        if (!src) return;
        figureBySrc.set(src, figure);
      });

      const existingSrcs = figures
        .map((figure) => $(".shot__img", figure)?.getAttribute("src"))
        .filter(Boolean);

      const latestSet = new Set(latestGalleryImages);
      const orderedSrcs = [
        ...latestGalleryImages.filter((src) => figureBySrc.has(src)),
        ...existingSrcs.filter((src) => !latestSet.has(src)),
      ];

      // Re-append in newest-first order; keeps current grid styles intact.
      orderedSrcs.forEach((src) => {
        const figure = figureBySrc.get(src);
        if (figure) gallery.appendChild(figure);
      });
    }
  }

  // Supabase: 실시간 매치업 배당 시뮬레이터
  {
    const SUPABASE_URL = "https://mfjhfoofnapqeblfsgmd.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_LiZGA1wRbaraQyLb9GFpRg_u9nzg6gh";

    const root = $("#matchup");
    if (root) {
      const MY_BET_IDS_KEY = "my_bet_ids";
      const LEGACY_MY_BET_IDS_KEY = "golife_matchup_my_bet_ids";
      try {
        if (!localStorage.getItem(MY_BET_IDS_KEY) && localStorage.getItem(LEGACY_MY_BET_IDS_KEY)) {
          localStorage.setItem(MY_BET_IDS_KEY, localStorage.getItem(LEGACY_MY_BET_IDS_KEY));
        }
      } catch {
        /* noop */
      }

      const OPEN_MS = new Date(2026, 4, 26, 12, 0, 0).getTime();
      const BET_DEADLINE_MS = new Date(2026, 5, 25, 12, 0, 0).getTime();
      let countdownTimer = null;
      let matchupSubmitBusy = false;
      let editingBetId = null;
      const prevRowSnapshot = new Map();

      const loadMyBetIds = () => {
        try {
          const raw = localStorage.getItem(MY_BET_IDS_KEY);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
        } catch {
          return [];
        }
      };

      const saveMyBetIds = (ids) => {
        const uniq = [...new Set(ids.map((x) => String(x)))];
        try {
          localStorage.setItem(MY_BET_IDS_KEY, JSON.stringify(uniq));
        } catch {
          /* noop */
        }
      };

      const addMyBetId = (id) => {
        if (id == null) return;
        const s = String(id);
        const cur = loadMyBetIds();
        if (!cur.includes(s)) cur.push(s);
        saveMyBetIds(cur);
      };

      const removeMyBetId = (id) => {
        if (id == null) return;
        const s = String(id);
        saveMyBetIds(loadMyBetIds().filter((x) => x !== s));
      };

      const isMyBetRow = (id) => (id != null ? loadMyBetIds().includes(String(id)) : false);

      const pruneMyBetIds = (serverRows) => {
        const serverIds = new Set((serverRows || []).map((r) => String(r.id)));
        saveMyBetIds(loadMyBetIds().filter((id) => serverIds.has(id)));
      };

      const createClient = window.supabase?.createClient;
      const statusEl = $("#matchupStatus");
      const form = $("#matchupForm");
      const amountInput = $("#matchupAmount");
      const payoutValueEl = $("#matchupPayoutValue");
      const payoutWrapEl = $("#matchupPayout");
      const historyBody = $("#matchupHistoryBody");
      const oddsSlotA = $("#matchupOddsSlotA");
      const oddsSlotB = $("#matchupOddsSlotB");
      const submitBtn = $("#matchupSubmit");
      const poolValueEl = $("#matchupPoolValue");
      const cdDays = $("#matchupCdDays");
      const cdHours = $("#matchupCdHours");
      const cdMins = $("#matchupCdMins");
      const cdSecs = $("#matchupCdSecs");
      const cdExpired = $("#matchupCountdownExpired");
      const cdDeadlinePhase = $("#matchupCountdownDeadline");
      const preopenGate = $("#matchupPreopenGate");
      const liveDash = $("#matchupLiveDash");
      const cdWrap = $("#matchupCountdown");
      const oDays = $("#matchupOpenCdDays");
      const oHours = $("#matchupOpenCdHours");
      const oMins = $("#matchupOpenCdMins");
      const oSecs = $("#matchupOpenCdSecs");
      const headerSub = $("#matchupHeaderSub");

      const isOpen = () => Date.now() >= OPEN_MS;
      const isBettingClosed = () => Date.now() >= BET_DEADLINE_MS;
      const canBet = () => isOpen() && !isBettingClosed();

      const pad2 = (n) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

      const setDigitsFromMs = (ms, dayEl, hourEl, minEl, secEl) => {
        const left = Math.max(0, ms);
        const d = Math.floor(left / 86400000);
        const h = Math.floor((left % 86400000) / 3600000);
        const m = Math.floor((left % 3600000) / 60000);
        const s = Math.floor((left % 60000) / 1000);
        if (dayEl) dayEl.textContent = d > 99 ? String(d) : pad2(d);
        if (hourEl) hourEl.textContent = pad2(h);
        if (minEl) minEl.textContent = pad2(m);
        if (secEl) secEl.textContent = pad2(s);
      };

      const resetEditMode = () => {
        editingBetId = null;
        if (submitBtn) submitBtn.textContent = "배팅하기";
      };

      const applyBettingPhaseState = () => {
        const open = isOpen();
        const closed = isBettingClosed();
        const allow = canBet();

        if (headerSub) {
          headerSub.textContent = open
            ? "6월 26일 단발성 Event 입니다."
            : "5월 26일 오후 12시에 오픈됩니다!";
        }

        if (!allow && editingBetId) resetEditMode();

        root.classList.toggle("matchup--preopen", !open && !closed);
        root.classList.toggle("matchup--closed", closed);

        if (submitBtn) {
          submitBtn.disabled = !allow || matchupSubmitBusy;
          submitBtn.textContent = editingBetId ? "수정완료" : "배팅하기";
          if (!allow || matchupSubmitBusy) submitBtn.setAttribute("aria-disabled", "true");
          else submitBtn.removeAttribute("aria-disabled");
        }

        form?.querySelectorAll("select, input, textarea").forEach((el) => {
          if (!form.contains(el)) return;
          el.disabled = !allow;
        });
      };

      const syncMatchupPanels = () => {
        const open = isOpen();
        const closed = isBettingClosed();
        const preOnly = !open && !closed;
        if (preopenGate) preopenGate.hidden = !preOnly;
        if (liveDash) liveDash.hidden = preOnly;
        if (cdWrap) cdWrap.hidden = preOnly;
      };

      const elTotalA = $("#matchupTotalA");
      const elTotalB = $("#matchupTotalB");
      const elOddsA = $("#matchupOddsA");
      const elOddsB = $("#matchupOddsB");

      let client = null;
      let channel = null;
      let lastOddsStr = { A: "", B: "" };
      let oddsAnimateReady = false;

      const fmtKRW = (n) =>
        `${Math.round(n).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}원`;

      const fmtOdds = (pool, side) => {
        if (!Number.isFinite(pool) || pool <= 0 || !Number.isFinite(side) || side <= 0) return null;
        const x = pool / side;
        if (!Number.isFinite(x) || x <= 0) return null;
        return `×${x.toFixed(2)}`;
      };

      const fmtRowTime = (row) => {
        if (!row.created_at) return "—";
        const d = new Date(row.created_at);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleString("ko-KR", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      const setOddsSlot = (slotEl, elOdds, str) => {
        if (!slotEl || !elOdds) return;
        const has = Boolean(str);
        slotEl.dataset.empty = has ? "false" : "true";
        elOdds.textContent = has ? str : "";
      };

      const normalizeBetSide = (v) => {
        const s = String(v ?? "").trim();
        if (s === "A" || s === "a" || s === "최지훈") return "A";
        if (s === "B" || s === "b" || s === "박민웅") return "B";
        return null;
      };

      const labelForSide = (side) => (side === "A" ? "최지훈" : "박민웅");

      const sortRowsNewestFirst = (rows) =>
        [...rows].sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : NaN;
          const tb = b.created_at ? new Date(b.created_at).getTime() : NaN;
          if (Number.isFinite(tb) || Number.isFinite(ta)) {
            if (tb !== ta) return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
          }
          const ida = a.id != null ? Number(a.id) : 0;
          const idb = b.id != null ? Number(b.id) : 0;
          return idb - ida;
        });

      const aggregate = (rows) => {
        let totalA = 0;
        let totalB = 0;
        for (const row of rows) {
          const amt = Number(row.amount);
          if (!Number.isFinite(amt) || amt <= 0) continue;
          const side = normalizeBetSide(row.bet_to);
          if (side === "A") totalA += amt;
          else if (side === "B") totalB += amt;
        }
        const pool = totalA + totalB;
        const oddsA = pool > 0 && totalA > 0 ? pool / totalA : null;
        const oddsB = pool > 0 && totalB > 0 ? pool / totalB : null;
        return { totalA, totalB, pool, oddsA, oddsB };
      };

      const calcExpectedPayout = (pool, sideTotal, betAmount) => {
        if (!Number.isFinite(betAmount) || betAmount <= 0) return null;
        if (!Number.isFinite(pool) || pool <= 0 || !Number.isFinite(sideTotal) || sideTotal <= 0) {
          return null;
        }
        return (pool / sideTotal) * betAmount;
      };

      const poolTotalsForPreview = (baseAgg, side, amount, rows) => {
        let totalA = baseAgg.totalA;
        let totalB = baseAgg.totalB;
        if (editingBetId && Array.isArray(rows)) {
          const row = rows.find((r) => String(r.id) === String(editingBetId));
          if (row) {
            const oldAmt = Number(row.amount);
            const oldSide = normalizeBetSide(row.bet_to);
            if (Number.isFinite(oldAmt) && oldAmt > 0) {
              if (oldSide === "A") totalA -= oldAmt;
              else if (oldSide === "B") totalB -= oldAmt;
            }
          }
        }
        if (side === "A") totalA += amount;
        else if (side === "B") totalB += amount;
        const pool = totalA + totalB;
        const sideTotal = side === "A" ? totalA : totalB;
        return { pool, sideTotal };
      };

      const expectedPayoutForRow = (row, agg) => {
        const amt = Number(row.amount);
        const side = normalizeBetSide(row.bet_to);
        if (!Number.isFinite(amt) || amt <= 0 || !side) return null;
        const sideTotal = side === "A" ? agg.totalA : agg.totalB;
        return calcExpectedPayout(agg.pool, sideTotal, amt);
      };

      const flashOddsIfChanged = (el, key, displayStr) => {
        if (!el) return;
        const keyStr = displayStr ?? "";
        if (lastOddsStr[key] === keyStr) return;
        lastOddsStr[key] = keyStr;
        if (!oddsAnimateReady) return;
        el.classList.remove("is-tick");
        void el.offsetWidth;
        el.classList.add("is-tick");
      };

      const renderTotals = (agg) => {
        if (elTotalA) elTotalA.textContent = fmtKRW(agg.totalA);
        if (elTotalB) elTotalB.textContent = fmtKRW(agg.totalB);
        if (poolValueEl) poolValueEl.textContent = fmtKRW(agg.pool);

        const strA = fmtOdds(agg.pool, agg.totalA);
        const strB = fmtOdds(agg.pool, agg.totalB);
        setOddsSlot(oddsSlotA, elOddsA, strA);
        setOddsSlot(oddsSlotB, elOddsB, strB);
        if (elOddsA) flashOddsIfChanged(elOddsA, "A", strA);
        if (elOddsB) flashOddsIfChanged(elOddsB, "B", strB);
        oddsAnimateReady = true;
      };

      const renderHistory = (rows, agg) => {
        if (!historyBody) return;
        const sorted = sortRowsNewestFirst(rows).slice(0, 5);
        historyBody.innerHTML = "";
        if (!sorted.length) {
          prevRowSnapshot.clear();
          const tr = document.createElement("tr");
          tr.className = "matchupTable__emptyRow";
          const td = document.createElement("td");
          td.colSpan = 6;
          td.className = "matchupTable__empty muted";
          td.textContent = "아직 배팅 내역이 없습니다.";
          tr.appendChild(td);
          historyBody.appendChild(tr);
          return;
        }
        const seenIds = new Set();
        sorted.forEach((row) => {
          const side = normalizeBetSide(row.bet_to);
          const tr = document.createElement("tr");
          const name = String(row.player_name ?? "").trim() || "—";
          const choice = side ? labelForSide(side) : String(row.bet_to ?? "—");
          const amt = Number(row.amount);
          const amtStr = Number.isFinite(amt) ? fmtKRW(amt) : "—";
          const payVal = expectedPayoutForRow(row, agg);
          const payStr = payVal != null && Number.isFinite(payVal) ? fmtKRW(payVal) : "—";

          const idKey = row.id != null ? String(row.id) : "";
          if (idKey) seenIds.add(idKey);
          const prev = idKey ? prevRowSnapshot.get(idKey) : null;

          const tdTime = document.createElement("td");
          tdTime.textContent = fmtRowTime(row);
          const tdName = document.createElement("td");
          tdName.textContent = name;
          const tdTarget = document.createElement("td");
          tdTarget.textContent = choice;
          const tdAmt = document.createElement("td");
          tdAmt.className = "matchupTable__num matchupTable__numCell";
          tdAmt.textContent = amtStr;
          if (prev && prev.amt !== amtStr) {
            tdAmt.classList.add("matchupTable__cell--pulse");
            setTimeout(() => tdAmt.classList.remove("matchupTable__cell--pulse"), 500);
          }

          const tdPay = document.createElement("td");
          tdPay.className = "matchupTable__num matchupTable__payoutEst matchupTable__payCell";
          tdPay.textContent = payStr;
          if (prev && prev.pay !== payStr) {
            tdPay.classList.add("matchupTable__cell--pulse");
            setTimeout(() => tdPay.classList.remove("matchupTable__cell--pulse"), 500);
          }

          const tdAct = document.createElement("td");
          tdAct.className = "matchupTable__act";
          if (isMyBetRow(row.id)) {
            const wrap = document.createElement("div");
            wrap.className = "matchupTable__actions";

            const sideRaw = normalizeBetSide(row.bet_to);
            if (sideRaw) {
              const editBtn = document.createElement("button");
              editBtn.type = "button";
              editBtn.className = "matchupTable__edit";
              editBtn.setAttribute("data-matchup-edit", String(row.id));
              editBtn.setAttribute("data-matchup-edit-side", sideRaw);
              editBtn.setAttribute("data-matchup-edit-name", name);
              editBtn.setAttribute("data-matchup-edit-amount", Number.isFinite(amt) ? String(amt) : "");
              editBtn.setAttribute("aria-label", "이 배팅 수정");
              editBtn.innerHTML =
                '<span class="matchupTable__editTxt">수정</span><svg class="matchupTable__editIcon" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
              wrap.appendChild(editBtn);
            }

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "matchupTable__del";
            delBtn.setAttribute("data-matchup-delete", String(row.id));
            delBtn.setAttribute("aria-label", "이 배팅 삭제");
            delBtn.innerHTML =
              '<span class="matchupTable__delTxt">삭제</span><svg class="matchupTable__delIcon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
            wrap.appendChild(delBtn);
            tdAct.appendChild(wrap);
          }

          tr.append(tdTime, tdName, tdTarget, tdAmt, tdPay, tdAct);
          historyBody.appendChild(tr);
          if (idKey) prevRowSnapshot.set(idKey, { amt: amtStr, pay: payStr });
        });
        for (const k of [...prevRowSnapshot.keys()]) {
          if (!seenIds.has(k)) prevRowSnapshot.delete(k);
        }
      };

      const updatePayoutPreview = (agg) => {
        if (!amountInput || !payoutValueEl) return;
        if (!isOpen() || isBettingClosed()) {
          payoutWrapEl?.classList.remove("matchupForm__payoutWrap--live");
          payoutValueEl.textContent = "—";
          return;
        }
        const raw = amountInput.value;
        const amount = raw === "" ? NaN : Number(raw);
        const checked = form?.querySelector('input[name="bet_to"]:checked');
        const side = checked ? normalizeBetSide(checked.value) : null;

        const clearHighlight = () => {
          payoutWrapEl?.classList.remove("matchupForm__payoutWrap--live");
          payoutValueEl.textContent = "—";
        };

        if (!Number.isFinite(amount) || amount < 10000 || amount > 100000 || !side) {
          clearHighlight();
          return;
        }
        const { pool, sideTotal } = poolTotalsForPreview(agg, side, amount, latestRows);
        const payout = calcExpectedPayout(pool, sideTotal, amount);
        if (payout == null || !Number.isFinite(payout)) {
          clearHighlight();
          return;
        }
        payoutValueEl.textContent = fmtKRW(payout);
        payoutWrapEl?.classList.add("matchupForm__payoutWrap--live");
      };

      let latestAgg = { totalA: 0, totalB: 0, pool: 0, oddsA: null, oddsB: null };
      let latestRows = [];

      const refreshFromRows = (rows) => {
        pruneMyBetIds(rows);
        latestRows = Array.isArray(rows) ? rows : [];
        const agg = aggregate(rows);
        latestAgg = agg;
        renderTotals(agg);
        renderHistory(rows, agg);
        if (editingBetId && !rows.some((r) => String(r.id) === editingBetId)) resetEditMode();
        updatePayoutPreview(agg);
        applyBettingPhaseState();
      };

      const loadAll = async () => {
        if (!client) return;
        const { data, error } = await client.from("match_bets").select("*");
        if (error) throw error;
        refreshFromRows(Array.isArray(data) ? data : []);
      };

      const setStatus = (msg, isError = false) => {
        if (!statusEl) return;
        statusEl.textContent = msg || "";
        statusEl.style.color = isError ? "rgba(255, 180, 160, .95)" : "";
      };

      let matchupRealtimeStarted = false;

      const startMatchupRealtime = () => {
        if (matchupRealtimeStarted || !client) return;
        matchupRealtimeStarted = true;
        loadAll()
          .then(() => {})
          .catch((err) => {
            console.error(err);
            setStatus(err?.message ? `불러오기 실패: ${err.message}` : "데이터를 불러오지 못했습니다.", true);
            if (historyBody) {
              historyBody.innerHTML =
                '<tr class="matchupTable__emptyRow"><td colspan="6" class="matchupTable__empty muted">데이터를 불러올 수 없습니다.</td></tr>';
            }
          });

        channel = client
          .channel("match_bets_realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "match_bets" },
            () => {
              loadAll().catch((err) => console.error(err));
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") setStatus("");
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setStatus("실시간 구독에 문제가 있습니다. 새로고침 해 보세요.", true);
            }
          });
      };

      const tickCountdown = () => {
        const now = Date.now();
        if (now >= BET_DEADLINE_MS) {
          setDigitsFromMs(0, cdDays, cdHours, cdMins, cdSecs);
          setDigitsFromMs(0, oDays, oHours, oMins, oSecs);
          if (cdDeadlinePhase) cdDeadlinePhase.hidden = true;
          if (cdExpired) cdExpired.hidden = false;
          syncMatchupPanels();
          applyBettingPhaseState();
          if (countdownTimer != null) {
            clearInterval(countdownTimer);
            countdownTimer = null;
          }
          return;
        }

        if (cdExpired) cdExpired.hidden = true;

        if (now < OPEN_MS) {
          if (cdDeadlinePhase) cdDeadlinePhase.hidden = true;
          setDigitsFromMs(OPEN_MS - now, oDays, oHours, oMins, oSecs);
        } else {
          if (cdDeadlinePhase) cdDeadlinePhase.hidden = false;
          setDigitsFromMs(BET_DEADLINE_MS - now, cdDays, cdHours, cdMins, cdSecs);
        }

        syncMatchupPanels();
        applyBettingPhaseState();
        if (!matchupRealtimeStarted && isOpen() && client) startMatchupRealtime();
      };

      applyBettingPhaseState();
      tickCountdown();
      countdownTimer = window.setInterval(tickCountdown, 1000);

      if (typeof createClient !== "function") {
        setStatus("Supabase 클라이언트를 불러오지 못했습니다. 네트워크를 확인해 주세요.", true);
        if (historyBody) {
          historyBody.innerHTML =
            '<tr class="matchupTable__emptyRow"><td colspan="6" class="matchupTable__empty muted">초기화 실패</td></tr>';
        }
      } else {
        client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        if (isOpen()) {
          startMatchupRealtime();
        } else if (historyBody) {
          historyBody.innerHTML =
            '<tr class="matchupTable__emptyRow"><td colspan="6" class="matchupTable__empty muted">배팅 오픈 후 내역이 표시됩니다.</td></tr>';
        }

        if (form) {
          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!client) return;
            if (!isOpen()) {
              setStatus("아직 오픈 전입니다.", true);
              applyBettingPhaseState();
              return;
            }
            if (isBettingClosed()) {
              setStatus("배팅이 종료되었습니다.", true);
              applyBettingPhaseState();
              return;
            }

            const fd = new FormData(form);
            const player_name = String(fd.get("player_name") || "").trim();
            const bet_to = normalizeBetSide(fd.get("bet_to"));
            const amount = Number(fd.get("amount"));

            if (!player_name) {
              setStatus("참여자(회원)를 선택해 주세요.", true);
              return;
            }
            if (!bet_to) {
              setStatus("배팅 대상을 선택해 주세요.", true);
              return;
            }
            if (!Number.isFinite(amount) || amount < 10000 || amount > 100000) {
              setStatus("금액은 10,000원 ~ 100,000원 사이로 입력해 주세요.", true);
              return;
            }

            matchupSubmitBusy = true;
            applyBettingPhaseState();

            const idForQuery = (raw) => {
              const str = String(raw);
              return /^\d+$/.test(str) && Number(str) <= Number.MAX_SAFE_INTEGER ? Number(str) : raw;
            };

            if (editingBetId) {
              if (!isMyBetRow(editingBetId)) {
                resetEditMode();
                matchupSubmitBusy = false;
                applyBettingPhaseState();
                return;
              }
              setStatus("수정 반영 중…");
              const { error: upErr } = await client
                .from("match_bets")
                .update({
                  player_name,
                  bet_to,
                  amount: Math.round(amount),
                })
                .eq("id", idForQuery(editingBetId));

              if (upErr) {
                console.error(upErr);
                setStatus(upErr.message ? `수정 실패: ${upErr.message}` : "수정에 실패했습니다.", true);
                matchupSubmitBusy = false;
                applyBettingPhaseState();
                return;
              }

              resetEditMode();
              setStatus("수정되었습니다.");
              try {
                await loadAll();
              } catch (err) {
                console.error(err);
              } finally {
                matchupSubmitBusy = false;
                applyBettingPhaseState();
              }
              return;
            }

            setStatus("배팅 저장 중…");

            const { data: insertedRows, error } = await client
              .from("match_bets")
              .insert({
                player_name,
                bet_to,
                amount: Math.round(amount),
              })
              .select("id");

            if (error) {
              console.error(error);
              setStatus(error.message ? `저장 실패: ${error.message}` : "저장에 실패했습니다.", true);
              matchupSubmitBusy = false;
              applyBettingPhaseState();
              return;
            }

            const newId = Array.isArray(insertedRows) && insertedRows[0] ? insertedRows[0].id : null;
            if (newId != null) addMyBetId(newId);

            setStatus("배팅이 반영되었습니다.");
            try {
              await loadAll();
            } catch (err) {
              console.error(err);
            } finally {
              matchupSubmitBusy = false;
              applyBettingPhaseState();
            }
          });
        }

        ["input", "change"].forEach((ev) => {
          amountInput?.addEventListener(ev, () => updatePayoutPreview(latestAgg));
          form?.addEventListener(ev, (e) => {
            if (e.target?.matches?.('input[name="bet_to"]')) updatePayoutPreview(latestAgg);
          });
        });

        historyBody?.addEventListener("click", async (e) => {
          const editBtn = e.target.closest(".matchupTable__edit");
          if (editBtn && historyBody.contains(editBtn)) {
            const rawId = editBtn.getAttribute("data-matchup-edit");
            if (rawId == null || !isMyBetRow(rawId)) return;
            if (!canBet()) {
              setStatus("배팅 수정은 오픈 후 마감 전에만 가능합니다.", true);
              return;
            }
            const name = String(editBtn.getAttribute("data-matchup-edit-name") || "").trim();
            const side = normalizeBetSide(editBtn.getAttribute("data-matchup-edit-side"));
            const amtRaw = editBtn.getAttribute("data-matchup-edit-amount");
            const amt = amtRaw === "" || amtRaw == null ? NaN : Number(amtRaw);

            const sel = $("#matchupMember");
            if (sel) {
              sel.value = name;
              if (!name || !Array.from(sel.options).some((o) => o.value === name)) {
                setStatus("목록에 없는 이름입니다. 회원 목록을 확인해 주세요.", true);
                return;
              }
            }
            const rA = form?.querySelector('input[name="bet_to"][value="A"]');
            const rB = form?.querySelector('input[name="bet_to"][value="B"]');
            if (side === "A" && rA) {
              rA.checked = true;
            } else if (side === "B" && rB) {
              rB.checked = true;
            }
            if (amountInput && Number.isFinite(amt)) amountInput.value = String(amt);
            editingBetId = String(rawId);
            if (submitBtn) submitBtn.textContent = "수정완료";
            applyBettingPhaseState();
            updatePayoutPreview(latestAgg);
            setStatus("수정할 내용을 확인한 뒤 [수정완료]를 눌러 주세요.");
            return;
          }

          const btn = e.target.closest(".matchupTable__del");
          if (!btn || !historyBody.contains(btn)) return;
          const rawId = btn.getAttribute("data-matchup-delete");
          if (rawId == null || !client) return;
          if (!isMyBetRow(rawId)) return;

          const s = String(rawId);
          const idForQuery =
            /^\d+$/.test(s) && Number(s) <= Number.MAX_SAFE_INTEGER ? Number(s) : rawId;
          btn.disabled = true;
          setStatus("삭제 중…");

          const { error: delErr } = await client.from("match_bets").delete().eq("id", idForQuery);

          if (delErr) {
            console.error(delErr);
            setStatus(delErr.message ? `삭제 실패: ${delErr.message}` : "삭제에 실패했습니다.", true);
            btn.disabled = false;
            return;
          }

          if (editingBetId === String(rawId)) resetEditMode();
          removeMyBetId(rawId);
          setStatus("삭제되었습니다.");
          try {
            await loadAll();
          } catch (err) {
            console.error(err);
          }
          applyBettingPhaseState();
        });
      }

      window.addEventListener("beforeunload", () => {
        try {
          if (countdownTimer != null) clearInterval(countdownTimer);
        } catch {
          /* noop */
        }
        try {
          if (client && channel) client.removeChannel(channel);
        } catch {
          /* noop */
        }
      });
    }
  }
})();

