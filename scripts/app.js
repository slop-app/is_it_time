const START_HOUR = 9;
const START_MINUTE = 0;
const END_HOUR = 18;
const END_MINUTE = 0;

const root = document.documentElement;
const percentNumber = document.getElementById("percentNumber");
const progressFill = document.getElementById("progressFill");
const statusEl = document.getElementById("status");
const windowLabel = document.getElementById("windowLabel");
const currentTimeEl = document.getElementById("currentTime");
const elapsedTimeEl = document.getElementById("elapsedTime");
const remainingTimeEl = document.getElementById("remainingTime");
const flavorText = document.getElementById("flavorText");
const paydayDateEl = document.getElementById("paydayDate");
const paydayCounterEl = document.getElementById("paydayCounter");
const effectSelect = document.getElementById("effectSelect");
const arcEndDaySelect = document.getElementById("arcEndDaySelect");
const settingsMenu = document.getElementById("settingsMenu");
const modeButtons = document.querySelectorAll(".tab-button");
const arcModeButton = document.querySelector('[data-mode="arc"]');
const fireworksLayer = document.getElementById("fireworksLayer");
const EFFECT_STORAGE_KEY = "isItTimeNumberEffect";
const MODE_STORAGE_KEY = "isItTimeProgressMode";
const ARC_END_DAY_STORAGE_KEY = "isItTimeArcEndDay";
const PAYDAY_DAY = 24;
const DEFAULT_ARC_END_DAY = 3;
const MILESTONE_STEP = 10;
const FIREWORK_COLORS = [
  "hsl(350 100% 62%)",
  "hsl(42 100% 58%)",
  "hsl(112 100% 52%)",
  "hsl(184 100% 52%)",
  "hsl(246 100% 66%)",
  "hsl(302 100% 64%)"
];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let activeMode = "day";
let activeArcEndDay = DEFAULT_ARC_END_DAY;
let milestoneState = {
  key: "",
  lastProgress: null,
  highestMilestone: 0
};

const flavorBank = {
  before: [
    "Tiny engines stretching. No heroics required.",
    "The meter is awake, just not making a scene.",
    "Perfectly legal warm-up lap.",
    "Nothing to prove yet. Hydrate mysteriously."
  ],
  early: [
    "Small number, honest effort.",
    "The bar has shoes on. Barely.",
    "Early pixels are doing their best.",
    "One calm step, then another suspiciously calm step.",
    "You are not behind. The percentage is just dramatic."
  ],
  firstHalf: [
    "Momentum found the light switch.",
    "The graph is quietly rooting for you.",
    "Respectable progress. Very adult of everyone.",
    "Tiny wins are still wins, just with better posture.",
    "Keep going. The number has started behaving."
  ],
  secondHalf: [
    "Past the squishy middle. Excellent news.",
    "The meter is nodding like it understands.",
    "This is the part where persistence looks suspiciously like skill.",
    "Not finished, but definitely no longer hypothetical.",
    "The percentage has stopped whispering and started helping."
  ],
  late: [
    "Visible progress. Emotionally load-bearing.",
    "The end of the bar is making eye contact.",
    "You can almost hear the tiny spreadsheet applause.",
    "Steady now. The graph believes in follow-through.",
    "Nearly cooked, in the wholesome sense."
  ],
  final: [
    "Nearly there. The pixels know it.",
    "Final stretch. Do not start a side quest.",
    "Excellent form. Very aerodynamic.",
    "The number is basically clearing its throat.",
    "Hold course. Dramatic blinking optional."
  ],
  after: [
    "Done enough for the meter to stop arguing.",
    "Full spectrum achieved. Nicely handled.",
    "The neon can rest now. So can you, ideally.",
    "Complete. The color did its job.",
    "The graph has no further notes."
  ]
};

const selectedFlavor = Object.fromEntries(
  Object.entries(flavorBank).map(([key, lines]) => [
    key,
    lines[Math.floor(Math.random() * lines.length)]
  ])
);

function setNumberEffect(effect) {
  const allowedEffects = ["prism", "rolling", "aurora", "pulse", "scanner"];
  const normalizedEffect = allowedEffects.includes(effect) ? effect : "prism";

  document.body.dataset.scheme = normalizedEffect;
  effectSelect.value = normalizedEffect;
  localStorage.setItem(EFFECT_STORAGE_KEY, normalizedEffect);
}

setNumberEffect(localStorage.getItem(EFFECT_STORAGE_KEY));
effectSelect.addEventListener("change", () => {
  setNumberEffect(effectSelect.value);
});

function normalizeArcEndDay(day) {
  const numericDay = Number(day);
  return Number.isInteger(numericDay) && numericDay >= 0 && numericDay < WEEKDAY_LABELS.length
    ? numericDay
    : DEFAULT_ARC_END_DAY;
}

function getArcRangeLabel() {
  return activeArcEndDay === 0
    ? "Mon"
    : `Mon-${WEEKDAY_LABELS[activeArcEndDay]}`;
}

function syncRangeLabels() {
  const arcLabel = getArcRangeLabel();
  arcModeButton.textContent = arcLabel;
  windowLabel.textContent = activeMode === "arc" ? arcLabel : "Today";
}

function setArcEndDay(day) {
  activeArcEndDay = normalizeArcEndDay(day);
  arcEndDaySelect.value = String(activeArcEndDay);
  localStorage.setItem(ARC_END_DAY_STORAGE_KEY, String(activeArcEndDay));
  syncRangeLabels();
}

setArcEndDay(localStorage.getItem(ARC_END_DAY_STORAGE_KEY));
arcEndDaySelect.addEventListener("change", () => {
  setArcEndDay(arcEndDaySelect.value);
  update();
});

function setMode(mode) {
  activeMode = mode === "arc" ? "arc" : "day";
  localStorage.setItem(MODE_STORAGE_KEY, activeMode);

  modeButtons.forEach((button) => {
    const isSelected = button.dataset.mode === activeMode;
    button.setAttribute("aria-selected", String(isSelected));
  });

  syncRangeLabels();
}

setMode(localStorage.getItem(MODE_STORAGE_KEY));
modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
    update();
  });
});

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatClock(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${pad(minutes)}m`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
}

function formatPaydayCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${pad(hours)}h`;
  if (hours > 0) return `${hours}h ${pad(minutes)}m`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
}

function formatPaydayDate(date, now) {
  const yearLabel = date.getFullYear() === now.getFullYear() ? "" : ` ${date.getFullYear()}`;
  return `${PAYDAY_DAY} ${MONTH_LABELS[date.getMonth()]}${yearLabel}`;
}

function smoothStep(edge0, edge1, value) {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

function getDailyBounds(now) {
  const start = new Date(now);
  start.setHours(START_HOUR, START_MINUTE, 0, 0);

  const end = new Date(now);
  end.setHours(END_HOUR, END_MINUTE, 0, 0);

  return { start, end };
}

function getArcBounds(now) {
  const start = new Date(now);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(START_HOUR, START_MINUTE, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + activeArcEndDay);
  end.setHours(END_HOUR, END_MINUTE, 0, 0);

  return { start, end };
}

document.addEventListener("click", (event) => {
  if (!settingsMenu.open || settingsMenu.contains(event.target)) return;
  settingsMenu.open = false;
});

function getBounds(now) {
  return activeMode === "arc" ? getArcBounds(now) : getDailyBounds(now);
}

function getPaydayInfo(now) {
  const paydayStart = new Date(now.getFullYear(), now.getMonth(), PAYDAY_DAY, 0, 0, 0, 0);
  const paydayEnd = new Date(now.getFullYear(), now.getMonth(), PAYDAY_DAY + 1, 0, 0, 0, 0);

  if (now >= paydayStart && now < paydayEnd) {
    return { target: paydayStart, isToday: true };
  }

  if (now < paydayStart) {
    return { target: paydayStart, isToday: false };
  }

  return {
    target: new Date(now.getFullYear(), now.getMonth() + 1, PAYDAY_DAY, 0, 0, 0, 0),
    isToday: false
  };
}

function updatePayday(now) {
  const payday = getPaydayInfo(now);

  paydayDateEl.textContent = payday.isToday
    ? "24th, right now"
    : `Next: ${formatPaydayDate(payday.target, now)}`;
  paydayCounterEl.textContent = payday.isToday
    ? "Today"
    : formatPaydayCountdown(payday.target - now);
}

function setMood(progress) {
  const earlyGlow = smoothStep(8, 48, progress) * 0.24;
  const lateGlow = smoothStep(52, 100, progress) * 0.76;
  const energy = Math.min(1, earlyGlow + lateGlow);
  const hue = 205 + progress * 2.55;

  root.style.setProperty("--progress", progress.toFixed(3));
  root.style.setProperty("--energy", energy.toFixed(3));
  root.style.setProperty("--hue", hue.toFixed(1));
  root.style.setProperty("--scheme-speed", `${(8.5 - energy * 5.2).toFixed(2)}s`);
  root.style.setProperty("--scheme-speed-slow", `${(10.5 - energy * 6.1).toFixed(2)}s`);
  root.style.setProperty("--pulse-speed", `${(3.1 - energy * 1.7).toFixed(2)}s`);
}

function getWindowKey(start, end) {
  return `${activeMode}:${start.getTime()}:${end.getTime()}`;
}

function resetMilestoneState(progress, key) {
  milestoneState = {
    key,
    lastProgress: progress,
    highestMilestone: Math.floor(progress / MILESTONE_STEP) * MILESTONE_STEP
  };
}

function getBurstPoint(progress, offset = 0) {
  const track = progressFill.parentElement.getBoundingClientRect();
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const x = track.left + (track.width * clampedProgress) / 100;
  const y = track.top + track.height / 2;

  return {
    x: Math.max(38, Math.min(window.innerWidth - 38, x + offset)),
    y: Math.max(54, y - 18 - Math.random() * 62)
  };
}

function launchFirework(milestone, progress, delay = 0) {
  if (reducedMotion.matches) return;

  window.setTimeout(() => {
    const point = getBurstPoint(progress, (Math.random() - 0.5) * 92);
    const burst = document.createElement("div");
    const label = document.createElement("div");
    const sparkCount = milestone === 100 ? 34 : 24;
    const baseHue = 205 + progress * 2.55;
    const burstColor = `hsl(${baseHue.toFixed(1)} 100% 62%)`;

    burst.className = "firework-burst";
    burst.style.setProperty("--burst-x", `${point.x}px`);
    burst.style.setProperty("--burst-y", `${point.y}px`);
    burst.style.setProperty("--burst-color", burstColor);

    for (let i = 0; i < sparkCount; i += 1) {
      const spark = document.createElement("span");
      const color = FIREWORK_COLORS[(i + milestone / MILESTONE_STEP) % FIREWORK_COLORS.length];
      const angle = (360 / sparkCount) * i + Math.random() * 12;
      const distance = 54 + Math.random() * (milestone === 100 ? 74 : 52);

      spark.className = "firework-spark";
      spark.style.setProperty("--spark-angle", `${angle.toFixed(1)}deg`);
      spark.style.setProperty("--spark-distance", `${distance.toFixed(1)}px`);
      spark.style.setProperty("--spark-size", `${(3 + Math.random() * 3).toFixed(1)}px`);
      spark.style.setProperty("--spark-duration", `${(720 + Math.random() * 360).toFixed(0)}ms`);
      spark.style.setProperty("--spark-color", color);
      burst.appendChild(spark);
    }

    label.className = "milestone-pop";
    label.textContent = `${milestone}%`;
    label.style.setProperty("--burst-x", `${point.x}px`);
    label.style.setProperty("--burst-y", `${point.y}px`);

    fireworksLayer.append(burst, label);
    window.setTimeout(() => {
      burst.remove();
      label.remove();
    }, 1300);
  }, delay);
}

function checkMilestones(progress, start, end) {
  const key = getWindowKey(start, end);

  if (milestoneState.key !== key || milestoneState.lastProgress === null || progress < milestoneState.lastProgress) {
    resetMilestoneState(progress, key);
    return;
  }

  const currentMilestone = Math.floor(progress / MILESTONE_STEP) * MILESTONE_STEP;

  if (currentMilestone >= MILESTONE_STEP && currentMilestone > milestoneState.highestMilestone) {
    let burstIndex = 0;

    for (
      let milestone = milestoneState.highestMilestone + MILESTONE_STEP;
      milestone <= currentMilestone;
      milestone += MILESTONE_STEP
    ) {
      launchFirework(milestone, progress, burstIndex * 90);
      burstIndex += 1;
    }

    milestoneState.highestMilestone = currentMilestone;
  }

  milestoneState.lastProgress = progress;
}

function update() {
  const now = new Date();
  const { start, end } = getBounds(now);
  const total = end - start;
  const progress = Math.max(0, Math.min(100, ((now - start) / total) * 100));

  percentNumber.textContent = progress.toFixed(5).padStart(8, "0");
  progressFill.style.width = `${progress}%`;
  currentTimeEl.textContent = formatClock(now);
  setMood(progress);
  updatePayday(now);
  checkMilestones(progress, start, end);

  if (now < start) {
    statusEl.textContent = "Quiet";
    elapsedTimeEl.textContent = "0s";
    remainingTimeEl.textContent = formatDuration(end - start);
    flavorText.textContent = selectedFlavor.before;
  } else if (now >= end) {
    statusEl.textContent = "Done";
    elapsedTimeEl.textContent = formatDuration(end - start);
    remainingTimeEl.textContent = "0s";
    flavorText.textContent = selectedFlavor.after;
  } else if (progress >= 92) {
    statusEl.textContent = "Nearly";
    elapsedTimeEl.textContent = formatDuration(now - start);
    remainingTimeEl.textContent = formatDuration(end - now);
    flavorText.textContent = selectedFlavor.final;
  } else if (progress >= 70) {
    statusEl.textContent = "Bright";
    elapsedTimeEl.textContent = formatDuration(now - start);
    remainingTimeEl.textContent = formatDuration(end - now);
    flavorText.textContent = progress >= 84
      ? selectedFlavor.late
      : selectedFlavor.secondHalf;
  } else {
    statusEl.textContent = "Moving";
    elapsedTimeEl.textContent = formatDuration(now - start);
    remainingTimeEl.textContent = formatDuration(end - now);
    flavorText.textContent = progress >= 45
      ? selectedFlavor.firstHalf
      : selectedFlavor.early;
  }
}

function animate() {
  update();
  requestAnimationFrame(animate);
}

animate();
