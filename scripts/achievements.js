const Achievements = (() => {
  const STORAGE_KEY = "isItTimeAchievements";
  const WEEK_START_DAY = 1;
  const DAILY_PROGRESS_WINDOW = 0.5;
  const WEEKLY_PROGRESS_WINDOW = 0.25;
  const WEEKLY_WINDOW_STABILITY_MS = 60000;
  const TOKEN_DURATION = 8000;
  const OFFER_COOLDOWN = 45000;
  const CLAIM_SETTLE_MS = 1200;

  const definitions = [
    {
      id: "first_flicker",
      name: "First Flicker",
      shortName: "10",
      description: "Caught a progress token between 10% and 10.5%.",
      isEligible: (state) => isDailyProgressWindow(state, 10)
    },
    {
      id: "quarter_signal",
      name: "Quarter Signal",
      shortName: "25",
      description: "Caught a progress token between 25% and 25.5%.",
      isEligible: (state) => isDailyProgressWindow(state, 25)
    },
    {
      id: "halfway_hum",
      name: "Halfway Hum",
      shortName: "50",
      description: "Collected a token during the halfway window.",
      isEligible: (state) => isDailyProgressWindow(state, 50)
    },
    {
      id: "three_quarter_glow",
      name: "Three Quarter Glow",
      shortName: "75",
      description: "Collected a token during the 75% window.",
      isEligible: (state) => isDailyProgressWindow(state, 75)
    },
    {
      id: "final_approach",
      name: "Final Approach",
      shortName: "90",
      description: "Caught a token right after 90%.",
      isEligible: (state) => isDailyProgressWindow(state, 90)
    },
    {
      id: "full_spectrum",
      name: "Full Spectrum",
      shortName: "100",
      description: "Collected a token in the final sliver before completion.",
      isEligible: (state) => isDailyProgressWindow(state, 99.5)
    },
    {
      id: "wide_lens",
      name: "Wide Lens",
      shortName: "WK",
      description: "Collected a token during the full Mon-Fri weekly window.",
      isEligible: (state) => (
        isWeeklyProgressWindow(state, 10)
        && hasStableFullWeekWindow(state)
      )
    },
    {
      id: "weekly_halfway",
      name: "Weekly Halfway",
      shortName: "W50",
      description: "Collected a weekly token during the 50% window.",
      isEligible: (state) => (
        isWeeklyProgressWindow(state, 50)
        && hasStableFullWeekWindow(state)
      )
    },
    {
      id: "weekly_finale",
      name: "Weekly Finale",
      shortName: "W90",
      description: "Collected a weekly token during the 90% window.",
      isEligible: (state) => (
        isWeeklyProgressWindow(state, 90)
        && hasStableFullWeekWindow(state)
      )
    },
    {
      id: "weekly_complete",
      name: "Weekly Complete",
      shortName: "W99",
      description: "Collected a weekly token in the final sliver.",
      isEligible: (state) => (
        isWeeklyProgressWindow(state, 99.75)
        && hasStableFullWeekWindow(state)
      )
    },
    {
      id: "weekly_window_guard",
      name: "Window Guard",
      shortName: "WF",
      description: "Collected a weekly token while using the real Mon-Fri window.",
      isEligible: ({ mode, arcEndDay, progress, noWork }) => (
        mode === "arc"
        && hasStableFullWeekWindow({ mode, arcEndDay })
        && !noWork
        && progress >= 30
        && progress < 35
      )
    },
    {
      id: "daily_driver",
      name: "Daily Driver",
      shortName: "DY",
      description: "Collected a token while watching today's progress.",
      isEligible: ({ mode }) => mode === "day"
    },
    {
      id: "quiet_signal",
      name: "Quiet Signal",
      shortName: "QS",
      description: "Collected a token before the scheduled window started.",
      isEligible: ({ now, bounds, noWork }) => !noWork && bounds?.start && now < bounds.start
    },
    {
      id: "afterglow",
      name: "Afterglow",
      shortName: "AG",
      description: "Collected a token after the scheduled window ended.",
      isEligible: ({ now, bounds, noWork }) => !noWork && bounds?.end && now >= bounds.end
    },
    {
      id: "rest_day_radar",
      name: "Rest Day Radar",
      shortName: "RD",
      description: "Found a token on a day marked as leave.",
      isEligible: ({ noWork }) => noWork
    },
    {
      id: "payday_ping",
      name: "Payday Ping",
      shortName: "PD",
      category: "bonus",
      description: "Collected a token on payday.",
      isEligible: ({ now }) => now.getDate() === 24
    },
    {
      id: "morning_marker",
      name: "Morning Marker",
      shortName: "AM",
      description: "Collected a token before noon.",
      isEligible: ({ now }) => now.getHours() < 12
    },
    {
      id: "afternoon_arc",
      name: "Afternoon Arc",
      shortName: "PM",
      description: "Collected a token after noon.",
      isEligible: ({ now }) => now.getHours() >= 12
    },
    {
      id: "monday_meter",
      name: "Monday Meter",
      shortName: "MO",
      description: "Collected a token on Monday.",
      isEligible: ({ now }) => now.getDay() === 1
    },
    {
      id: "friday_voltage",
      name: "Friday Voltage",
      shortName: "FR",
      description: "Collected a token on Friday.",
      isEligible: ({ now }) => now.getDay() === 5
    }
  ];

  let layerEl;
  let weeklyBadgesEl;
  let bonusBadgesEl;
  let clearButtonEl;
  let progressEl;
  let remainingEl;
  let streakEl;
  let bestEl;
  let openButtonEl;
  let screenEl;
  let closeButtonEl;
  let lastFocusedEl = null;
  let achievementState = readState();
  let activeOffer = null;
  let activeTimer = null;
  let nextOfferAllowedAt = 0;
  let dismissedUntil = {};
  let weeklyWindowTracker = {
    value: null,
    changedAt: Date.now()
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function getWeekStart(date) {
    const result = new Date(date);
    const dayOffset = (result.getDay() - WEEK_START_DAY + 7) % 7;

    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() - dayOffset);
    return result;
  }

  function getWeekKey(date) {
    const weekStart = getWeekStart(date);
    return `${weekStart.getFullYear()}-${pad(weekStart.getMonth() + 1)}-${pad(weekStart.getDate())}`;
  }

  function getWeekIndexFromKey(weekKey) {
    const [year, month, day] = String(weekKey).split("-").map(Number);
    if (!year || !month || !day) return null;

    return Math.floor(Date.UTC(year, month - 1, day) / 604800000);
  }

  function cleanUnlocked(unlockedValue) {
    const allowedIds = new Set(definitions.map(({ id }) => id));

    return Object.fromEntries(
      Object.entries(unlockedValue || {}).filter(([id]) => allowedIds.has(id))
    );
  }

  function isWeeklyAchievement(achievement) {
    return achievement.category !== "bonus";
  }

  function getWeeklyDefinitions() {
    return definitions.filter(isWeeklyAchievement);
  }

  function getUnlockedCountFor(unlockedValue) {
    const unlocked = cleanUnlocked(unlockedValue);
    return getWeeklyDefinitions().filter(({ id }) => unlocked[id]).length;
  }

  function createState(overrides = {}) {
    const currentWeekKey = getWeekKey(new Date());

    return {
      weekKey: currentWeekKey,
      unlocked: {},
      allClearStreak: 0,
      bestWeeklyCount: 0,
      bestWeeklyWeekKey: "",
      lastFinalizedWeekKey: "",
      ...overrides
    };
  }

  function rollStateForward(state, now = new Date()) {
    const currentWeekKey = getWeekKey(now);
    if (state.weekKey === currentWeekKey) return state;

    const previousWeekIndex = getWeekIndexFromKey(state.weekKey);
    const currentWeekIndex = getWeekIndexFromKey(currentWeekKey);
    const weekGap = previousWeekIndex === null || currentWeekIndex === null
      ? 1
      : currentWeekIndex - previousWeekIndex;
    const completedPreviousWeek = getUnlockedCountFor(state.unlocked) === getWeeklyDefinitions().length;
    const previousWeekCount = getUnlockedCountFor(state.unlocked);
    const beatBest = previousWeekCount > state.bestWeeklyCount;

    return {
      ...state,
      weekKey: currentWeekKey,
      unlocked: {},
      allClearStreak: completedPreviousWeek && weekGap === 1
        ? state.allClearStreak + 1
        : 0,
      bestWeeklyCount: beatBest ? previousWeekCount : state.bestWeeklyCount,
      bestWeeklyWeekKey: beatBest ? state.weekKey : state.bestWeeklyWeekKey,
      lastFinalizedWeekKey: state.weekKey
    };
  }

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || typeof parsed !== "object") return createState();

      if (!parsed.weekKey) {
        const unlocked = cleanUnlocked(parsed);
        return createState({
          unlocked,
          bestWeeklyCount: getUnlockedCountFor(unlocked),
          bestWeeklyWeekKey: getWeekKey(new Date())
        });
      }

      return rollStateForward(createState({
        ...parsed,
        unlocked: cleanUnlocked(parsed.unlocked),
        allClearStreak: Number(parsed.allClearStreak) || 0,
        bestWeeklyCount: Number(parsed.bestWeeklyCount) || 0,
        bestWeeklyWeekKey: parsed.bestWeeklyWeekKey || "",
        lastFinalizedWeekKey: parsed.lastFinalizedWeekKey || ""
      }));
    } catch {
      return createState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(achievementState));
    } catch {
      // Persistence can fail in private browsing or locked-down file contexts.
    }
  }

  function clearStored() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Best effort only; the in-memory reset still lets the current session test again.
    }
  }

  function isUnlocked(achievement) {
    return Boolean(achievementState.unlocked[achievement.id]);
  }

  function getProgressWindowWidth(mode) {
    return mode === "arc" ? WEEKLY_PROGRESS_WINDOW : DAILY_PROGRESS_WINDOW;
  }

  function isProgressWindow({ progress, mode, noWork }, start) {
    if (noWork) return false;

    const end = Math.min(100, start + getProgressWindowWidth(mode));
    return progress >= start && (end >= 100 ? progress <= 100 : progress < end);
  }

  function isDailyProgressWindow(state, start) {
    return state.mode === "day" && isProgressWindow(state, start);
  }

  function isWeeklyProgressWindow(state, start) {
    return state.mode === "arc" && isProgressWindow(state, start);
  }

  function syncWeeklyWindow(state) {
    if (weeklyWindowTracker.value === state.arcEndDay) return;

    weeklyWindowTracker = {
      value: state.arcEndDay,
      changedAt: Date.now()
    };
  }

  function hasStableFullWeekWindow({ mode, arcEndDay }) {
    return (
      mode === "arc"
      && arcEndDay === 4
      && weeklyWindowTracker.value === 4
      && Date.now() - weeklyWindowTracker.changedAt >= WEEKLY_WINDOW_STABILITY_MS
    );
  }

  function getUnlockedCount() {
    return getWeeklyDefinitions().filter(isUnlocked).length;
  }

  function updateBestIfNeeded() {
    const unlockedCount = getUnlockedCount();

    if (unlockedCount <= achievementState.bestWeeklyCount) return;

    achievementState = {
      ...achievementState,
      bestWeeklyCount: unlockedCount,
      bestWeeklyWeekKey: achievementState.weekKey
    };
    saveState();
  }

  function renderBadges() {
    if (!weeklyBadgesEl || !bonusBadgesEl) return;

    updateBestIfNeeded();

    const unlockedCount = getUnlockedCount();
    const weeklyTotal = getWeeklyDefinitions().length;
    const remainingCount = weeklyTotal - unlockedCount;

    if (progressEl) {
      progressEl.textContent = `${unlockedCount}/${weeklyTotal}`;
    }

    if (remainingEl) {
      remainingEl.textContent = remainingCount === 0
        ? "Weekly clear"
        : `${remainingCount} left this week`;
    }

    if (streakEl) {
      streakEl.textContent = `Streak ${achievementState.allClearStreak}`;
    }

    if (bestEl) {
      bestEl.textContent = `PB ${achievementState.bestWeeklyCount}/${weeklyTotal}`;
    }

    weeklyBadgesEl.replaceChildren(...getWeeklyDefinitions().map(createBadge));
    bonusBadgesEl.replaceChildren(...definitions.filter(({ category }) => category === "bonus").map(createBadge));
  }

  function createBadge(achievement) {
      const badge = document.createElement("div");
      const mark = document.createElement("span");
      const copy = document.createElement("span");
      const name = document.createElement("span");
      const detail = document.createElement("span");
      const unlockedAt = achievementState.unlocked[achievement.id];

      badge.className = `achievement-badge${unlockedAt ? " is-unlocked" : ""}${achievement.category === "bonus" ? " is-bonus" : ""}`;
      badge.title = unlockedAt ? achievement.description : "Find and claim this token";
      mark.className = "achievement-badge-mark";
      copy.className = "achievement-badge-copy";
      name.className = "achievement-badge-name";
      detail.className = "achievement-badge-detail";

      mark.textContent = achievement.shortName;
      name.textContent = unlockedAt ? achievement.name : "Locked";
      detail.textContent = unlockedAt ? achievement.description : "Find the token";

      copy.append(name, detail);
      badge.append(mark, copy);
      return badge;
  }

  function launchRewardBurst(sourceEl, achievement) {
    if (!layerEl || !sourceEl) return;

    const layerRect = layerEl.getBoundingClientRect();
    const sourceRect = sourceEl.getBoundingClientRect();
    const x = sourceRect.left + sourceRect.width / 2 - layerRect.left;
    const y = sourceRect.top + sourceRect.height / 2 - layerRect.top;
    const burst = document.createElement("div");
    const toast = document.createElement("div");

    burst.className = "achievement-reward";
    burst.style.setProperty("--reward-x", `${x.toFixed(1)}px`);
    burst.style.setProperty("--reward-y", `${y.toFixed(1)}px`);

    for (let index = 0; index < 18; index += 1) {
      const spark = document.createElement("span");
      const angle = (360 / 18) * index + Math.random() * 10;
      const distance = 42 + Math.random() * 58;

      spark.className = "achievement-reward-spark";
      spark.style.setProperty("--spark-angle", `${angle.toFixed(1)}deg`);
      spark.style.setProperty("--spark-distance", `${distance.toFixed(1)}px`);
      spark.style.setProperty("--spark-delay", `${(Math.random() * 80).toFixed(0)}ms`);
      burst.appendChild(spark);
    }

    toast.className = "achievement-toast";
    toast.style.setProperty("--reward-x", `${x.toFixed(1)}px`);
    toast.style.setProperty("--reward-y", `${y.toFixed(1)}px`);
    toast.innerHTML = `
      <span class="achievement-toast-kicker">Badge unlocked</span>
      <span class="achievement-toast-name">${achievement.name}</span>
    `;

    layerEl.append(burst, toast);
    window.setTimeout(() => {
      burst.remove();
      toast.remove();
    }, 1800);
  }

  function removeActiveOffer() {
    if (!activeOffer) return;

    activeOffer.el.remove();
    activeOffer = null;
    window.clearTimeout(activeTimer);
    activeTimer = null;
  }

  function dismissOffer(achievement) {
    dismissedUntil[achievement.id] = Date.now() + OFFER_COOLDOWN;
    removeActiveOffer();
  }

  function unlockAchievement(achievement) {
    const sourceEl = activeOffer?.el;

    achievementState.unlocked[achievement.id] = new Date().toISOString();
    saveState();
    renderBadges();
    launchRewardBurst(sourceEl, achievement);
    nextOfferAllowedAt = Date.now() + CLAIM_SETTLE_MS;

    if (!activeOffer) return;

    window.clearTimeout(activeTimer);
    activeTimer = null;
    activeOffer.claimed = true;
    activeOffer.el.classList.add("is-claimed");
    activeOffer.el.setAttribute("aria-label", `${achievement.name} unlocked`);
    activeOffer.el.innerHTML = `
      <span class="achievement-token-mark">${achievement.shortName}</span>
      <span class="achievement-token-text">Unlocked</span>
    `;

    window.setTimeout(removeActiveOffer, 900);
  }

  function showOffer(achievement) {
    if (!layerEl || activeOffer || isUnlocked(achievement) || Date.now() < nextOfferAllowedAt) return;

    const token = document.createElement("button");
    const x = 26 + Math.random() * 48;
    const y = 42 + Math.random() * 28;

    token.className = "achievement-token";
    token.type = "button";
    token.title = `Claim achievement: ${achievement.name}`;
    token.setAttribute("aria-label", `Claim achievement: ${achievement.name}`);
    token.style.setProperty("--token-x", `${x.toFixed(1)}%`);
    token.style.setProperty("--token-y", `${y.toFixed(1)}%`);
    token.innerHTML = `
      <span class="achievement-token-mark">${achievement.shortName}</span>
      <span class="achievement-token-text">Claim</span>
    `;

    token.addEventListener("click", () => {
      unlockAchievement(achievement);
    });

    activeOffer = { id: achievement.id, achievement, el: token, claimed: false };
    layerEl.appendChild(token);
    activeTimer = window.setTimeout(() => {
      dismissOffer(achievement);
    }, TOKEN_DURATION);
  }

  function update(state) {
    if (!layerEl) return;

    syncWeeklyWindow(state);

    const nextState = rollStateForward(achievementState, state.now);
    if (nextState.weekKey !== achievementState.weekKey) {
      achievementState = nextState;
      dismissedUntil = {};
      removeActiveOffer();
      saveState();
      renderBadges();
    }

    if (
      activeOffer
      && !activeOffer.claimed
      && (
        isUnlocked(activeOffer.achievement)
        || !activeOffer.achievement.isEligible(state)
      )
    ) {
      dismissOffer(activeOffer.achievement);
    }

    const now = Date.now();
    if (now < nextOfferAllowedAt) return;

    const achievement = definitions.find((definition) => (
      !isUnlocked(definition)
      && !activeOffer
      && (dismissedUntil[definition.id] || 0) <= now
      && definition.isEligible(state)
    ));

    if (achievement) showOffer(achievement);
  }

  function clearForTesting() {
    achievementState = createState();
    dismissedUntil = {};
    removeActiveOffer();
    clearStored();
    renderBadges();
  }

  function openScreen() {
    if (!screenEl) return;

    lastFocusedEl = document.activeElement;
    screenEl.hidden = false;
    document.body.classList.add("achievements-open");
    closeButtonEl?.focus();
  }

  function closeScreen() {
    if (!screenEl || screenEl.hidden) return;

    screenEl.hidden = true;
    document.body.classList.remove("achievements-open");
    lastFocusedEl?.focus?.();
  }

  function handleScreenClick(event) {
    if (event.target === screenEl) closeScreen();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") closeScreen();
  }

  function init() {
    layerEl = document.getElementById("achievementLayer");
    weeklyBadgesEl = document.getElementById("weeklyAchievementBadges");
    bonusBadgesEl = document.getElementById("bonusAchievementBadges");
    clearButtonEl = document.getElementById("clearAchievementsButton");
    progressEl = document.getElementById("achievementProgress");
    remainingEl = document.getElementById("achievementRemaining");
    streakEl = document.getElementById("achievementStreak");
    bestEl = document.getElementById("achievementBest");
    openButtonEl = document.getElementById("achievementsOpenButton");
    screenEl = document.getElementById("achievementsScreen");
    closeButtonEl = document.getElementById("achievementsCloseButton");

    clearButtonEl?.addEventListener("click", clearForTesting);
    openButtonEl?.addEventListener("click", openScreen);
    closeButtonEl?.addEventListener("click", closeScreen);
    screenEl?.addEventListener("click", handleScreenClick);
    document.addEventListener("keydown", handleKeydown);
    saveState();
    renderBadges();

    return { update };
  }

  return { init };
})();

window.Achievements = Achievements;
