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
})();

