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
        { date: "2026-06-26T00:00:00", main: "6월 26일(금) · 미정", sub: "미정" },
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

      // Hide SNP logo when Next Round is no longer SNP
      if (bgLogo) {
        const show = chosen?.sub === "써닝포인트 CC";
        bgLogo.style.display = show ? "" : "none";
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

      const BET_DEADLINE_MS = new Date(2026, 5, 25, 12, 0, 0).getTime();
      let countdownTimer = null;
      let matchupSubmitBusy = false;
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
      const cdLine = $("#matchupCountdownLine");
      const cdExpired = $("#matchupCountdownExpired");

      const isBettingClosed = () => Date.now() >= BET_DEADLINE_MS;

      const applyBettingClosedState = () => {
        const closed = isBettingClosed();
        root.classList.toggle("matchup--closed", closed);
        if (cdLine) cdLine.hidden = closed;
        if (cdExpired) cdExpired.hidden = !closed;
        if (submitBtn) {
          submitBtn.disabled = closed || matchupSubmitBusy;
          if (closed || matchupSubmitBusy) submitBtn.setAttribute("aria-disabled", "true");
          else submitBtn.removeAttribute("aria-disabled");
        }
        form?.querySelectorAll("select, input, textarea").forEach((el) => {
          if (!form.contains(el)) return;
          el.disabled = closed;
        });
      };

      const pad2 = (n) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

      const tickCountdown = () => {
        const left = BET_DEADLINE_MS - Date.now();
        if (left <= 0) {
          if (cdDays) cdDays.textContent = "00";
          if (cdHours) cdHours.textContent = "00";
          if (cdMins) cdMins.textContent = "00";
          if (cdSecs) cdSecs.textContent = "00";
          applyBettingClosedState();
          if (countdownTimer != null) {
            clearInterval(countdownTimer);
            countdownTimer = null;
          }
          return;
        }
        const d = Math.floor(left / 86400000);
        const h = Math.floor((left % 86400000) / 3600000);
        const m = Math.floor((left % 3600000) / 60000);
        const s = Math.floor((left % 60000) / 1000);
        if (cdDays) cdDays.textContent = d > 99 ? String(d) : pad2(d);
        if (cdHours) cdHours.textContent = pad2(h);
        if (cdMins) cdMins.textContent = pad2(m);
        if (cdSecs) cdSecs.textContent = pad2(s);
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

      const expectedPayoutForRow = (row, agg) => {
        const amt = Number(row.amount);
        const side = normalizeBetSide(row.bet_to);
        if (!Number.isFinite(amt) || amt <= 0 || !side) return null;
        const mult = side === "A" ? agg.oddsA : agg.oddsB;
        if (mult == null || !Number.isFinite(mult) || mult <= 0) return null;
        return amt * mult;
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
          td.textContent = "아직 베팅 내역이 없습니다.";
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
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "matchupTable__del";
            btn.setAttribute("data-matchup-delete", String(row.id));
            btn.setAttribute("aria-label", "이 베팅 삭제");
            btn.innerHTML =
              '<span class="matchupTable__delTxt">삭제</span><svg class="matchupTable__delIcon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
            tdAct.appendChild(btn);
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
        if (isBettingClosed()) {
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
        const sideTotal = side === "A" ? agg.totalA : agg.totalB;
        if (!Number.isFinite(agg.pool) || agg.pool <= 0 || !Number.isFinite(sideTotal) || sideTotal <= 0) {
          clearHighlight();
          return;
        }
        const odds = agg.pool / sideTotal;
        const payout = amount * odds;
        payoutValueEl.textContent = fmtKRW(payout);
        payoutWrapEl?.classList.add("matchupForm__payoutWrap--live");
      };

      let latestAgg = { totalA: 0, totalB: 0, pool: 0, oddsA: null, oddsB: null };

      const refreshFromRows = (rows) => {
        pruneMyBetIds(rows);
        const agg = aggregate(rows);
        latestAgg = agg;
        renderTotals(agg);
        renderHistory(rows, agg);
        updatePayoutPreview(agg);
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

      applyBettingClosedState();
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

        if (form) {
          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!client) return;
            if (isBettingClosed()) {
              setStatus("베팅이 종료되었습니다.", true);
              applyBettingClosedState();
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
              setStatus("베팅 대상을 선택해 주세요.", true);
              return;
            }
            if (!Number.isFinite(amount) || amount < 10000 || amount > 100000) {
              setStatus("금액은 10,000원 ~ 100,000원 사이로 입력해 주세요.", true);
              return;
            }

            matchupSubmitBusy = true;
            applyBettingClosedState();
            setStatus("베팅 저장 중…");

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
              applyBettingClosedState();
              return;
            }

            const newId = Array.isArray(insertedRows) && insertedRows[0] ? insertedRows[0].id : null;
            if (newId != null) addMyBetId(newId);

            setStatus("베팅이 반영되었습니다.");
            try {
              await loadAll();
            } catch (err) {
              console.error(err);
            } finally {
              matchupSubmitBusy = false;
              applyBettingClosedState();
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

          removeMyBetId(rawId);
          setStatus("삭제되었습니다.");
          try {
            await loadAll();
          } catch (err) {
            console.error(err);
          }
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

