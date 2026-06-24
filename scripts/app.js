const START_HOUR = 9;
const START_MINUTE = 0;
const END_HOUR = 18;
const END_MINUTE = 0;

const root = document.documentElement;
const percentNumber = document.getElementById("percentNumber");
const progressFill = document.getElementById("progressFill");
const statusEl = document.getElementById("status");
const testCountdownButton = document.getElementById("testCountdownButton");
const afterHoursButton = document.getElementById("afterHoursButton");
const afterHoursNotice = document.getElementById("afterHoursNotice");
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
const scheduleButtons = document.querySelectorAll(".schedule-button");
const fireworksLayer = document.getElementById("fireworksLayer");
const EFFECT_STORAGE_KEY = "isItTimeNumberEffect";
const MODE_STORAGE_KEY = "isItTimeProgressMode";
const ARC_END_DAY_STORAGE_KEY = "isItTimeArcEndDay";
const SCHEDULE_STORAGE_KEY = "isItTimeWeeklySchedule";
const AFTER_HOURS_COUNTDOWN_STORAGE_KEY = "isItTimeAfterHoursCountdown";
const AFTER_HOURS_VISITS_STORAGE_KEY = "isItTimeAfterHoursVisits";
const PAYDAY_DAY = 24;
const DEFAULT_ARC_END_DAY = 3;
const MILESTONE_STEP = 10;
const TEST_COUNTDOWN_DURATION = 30000;
const SCHEDULE_VALUES = ["work", "half", "off"];
const SCHEDULE_LABELS = {
  work: "Work",
  half: "Half",
  off: "Leave"
};
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
let weeklySchedule = Array(WEEKDAY_LABELS.length).fill("work");
let milestoneState = {
  key: "",
  lastProgress: null,
  highestMilestone: 0
};
let afterHoursVisitState = {
  key: "",
  count: 0
};
let testCountdown = null;

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
  ],
  cooldown: [
    "Work has clocked out. Let the number drift down.",
    "A softer meter for a softer part of the day.",
    "The countdown is handling the exit music.",
    "Gentle descent mode. Nothing else to prove tonight.",
    "The bar is walking itself home."
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

function normalizeScheduleValue(value) {
  return SCHEDULE_VALUES.includes(value) ? value : "work";
}

function readStoredSchedule() {
  try {
    const parsedSchedule = JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY));

    if (!Array.isArray(parsedSchedule)) return Array(WEEKDAY_LABELS.length).fill("work");

    return WEEKDAY_LABELS.map((_, index) => normalizeScheduleValue(parsedSchedule[index]));
  } catch {
    return Array(WEEKDAY_LABELS.length).fill("work");
  }
}

function saveSchedule() {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(weeklySchedule));
}

function syncScheduleControls() {
  scheduleButtons.forEach((button) => {
    const dayIndex = Number(button.dataset.scheduleDay);
    const scheduleValue = normalizeScheduleValue(weeklySchedule[dayIndex]);
    const stateEl = button.querySelector(".schedule-day-state");

    button.dataset.scheduleValue = scheduleValue;
    button.setAttribute("aria-label", `${WEEKDAY_LABELS[dayIndex]} schedule: ${SCHEDULE_LABELS[scheduleValue]}`);
    button.title = `${WEEKDAY_LABELS[dayIndex]}: ${SCHEDULE_LABELS[scheduleValue]}`;
    stateEl.textContent = SCHEDULE_LABELS[scheduleValue];
  });
}

function setScheduleDay(day, value) {
  const dayIndex = Number(day);
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex >= WEEKDAY_LABELS.length) return;

  weeklySchedule[dayIndex] = normalizeScheduleValue(value);
  saveSchedule();
  syncScheduleControls();
}

weeklySchedule = readStoredSchedule();
syncScheduleControls();
scheduleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const currentValue = normalizeScheduleValue(weeklySchedule[Number(button.dataset.scheduleDay)]);
    const nextIndex = (SCHEDULE_VALUES.indexOf(currentValue) + 1) % SCHEDULE_VALUES.length;

    setScheduleDay(button.dataset.scheduleDay, SCHEDULE_VALUES[nextIndex]);
    update();
  });
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getWeekdayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function getDateAt(date, hour, minute) {
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function getMonday(date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - getWeekdayIndex(monday));
  return monday;
}

function getScheduledDay(date, dayIndex = getWeekdayIndex(date)) {
  const start = getDateAt(date, START_HOUR, START_MINUTE);
  const normalEnd = getDateAt(date, END_HOUR, END_MINUTE);
  const normalDuration = normalEnd - start;
  const scheduleValue = normalizeScheduleValue(weeklySchedule[dayIndex]);
  const total = scheduleValue === "off"
    ? 0
    : normalDuration * (scheduleValue === "half" ? 0.5 : 1);
  const end = new Date(start.getTime() + total);

  return { start, end, total, scheduleValue };
}

function getAfterHoursInfo(now) {
  const todayStart = getDateAt(now, START_HOUR, START_MINUTE);
  const todayEnd = getDateAt(now, END_HOUR, END_MINUTE);
  let sourceDate = null;
  let start = null;
  let end = null;

  if (now >= todayEnd) {
    sourceDate = new Date(now);
    start = todayEnd;
    end = getDateAt(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), START_HOUR, START_MINUTE);
  } else if (now < todayStart) {
    sourceDate = new Date(now);
    sourceDate.setDate(sourceDate.getDate() - 1);
    start = getDateAt(sourceDate, END_HOUR, END_MINUTE);
    end = todayStart;
  } else {
    return null;
  }

  const sourceDayIndex = getWeekdayIndex(sourceDate);
  const sourcePeriod = getScheduledDay(sourceDate, sourceDayIndex);

  if (sourcePeriod.scheduleValue === "off") return null;

  const total = end - start;
  const elapsed = clamp(now - start, 0, total);
  const remaining = clamp(end - now, 0, total);
  const progress = total > 0 ? clamp((remaining / total) * 100, 0, 100) : 0;

  return {
    key: `after:${start.getTime()}:${end.getTime()}:${sourcePeriod.scheduleValue}`,
    start,
    end,
    total,
    elapsed,
    remaining,
    progress,
    visitCount: 0,
    sourceDayIndex,
    scheduleValue: sourcePeriod.scheduleValue
  };
}

function readAfterHoursVisitRecord() {
  try {
    const parsedRecord = JSON.parse(localStorage.getItem(AFTER_HOURS_VISITS_STORAGE_KEY));

    return parsedRecord && typeof parsedRecord === "object"
      ? parsedRecord
      : { key: "", count: 0 };
  } catch {
    return { key: "", count: 0 };
  }
}

function getAfterHoursVisitCount(info) {
  if (!info) return 0;
  if (afterHoursVisitState.key === info.key) return afterHoursVisitState.count;

  const record = readAfterHoursVisitRecord();
  return record.key === info.key ? Number(record.count) || 0 : 0;
}

function registerAfterHoursVisit() {
  const info = getAfterHoursInfo(new Date());

  if (!info) {
    afterHoursVisitState = { key: "", count: 0 };
    return;
  }

  const record = readAfterHoursVisitRecord();
  const previousCount = record.key === info.key ? Number(record.count) || 0 : 0;
  const count = previousCount + 1;

  afterHoursVisitState = {
    key: info.key,
    count
  };
  localStorage.setItem(AFTER_HOURS_VISITS_STORAGE_KEY, JSON.stringify({ key: info.key, count }));
}

function getAfterHoursCountdownKey() {
  return localStorage.getItem(AFTER_HOURS_COUNTDOWN_STORAGE_KEY) || "";
}

function isAfterHoursCountdownActive(info) {
  return Boolean(info && getAfterHoursCountdownKey() === info.key);
}

function syncAfterHoursCountdownKey(info) {
  const storedKey = getAfterHoursCountdownKey();

  if (storedKey && (!info || storedKey !== info.key)) {
    localStorage.removeItem(AFTER_HOURS_COUNTDOWN_STORAGE_KEY);
  }
}

function startAfterHoursCountdown(info) {
  if (!info) return;
  localStorage.setItem(AFTER_HOURS_COUNTDOWN_STORAGE_KEY, info.key);
  update();
}

function getAfterHoursWarningText(info) {
  if (!info) return "";

  const visitCount = getAfterHoursVisitCount(info);
  if (visitCount < 10) return "";

  return `After-hours check #${visitCount}. Gentle warning: the work window is already closed.`;
}

function updateAfterHoursControls(info) {
  syncAfterHoursCountdownKey(info);

  if (!info) {
    afterHoursButton.hidden = true;
    afterHoursButton.dataset.active = "false";
    afterHoursNotice.hidden = true;
    afterHoursNotice.textContent = "";
    return;
  }

  const isActive = isAfterHoursCountdownActive(info);
  const warningText = getAfterHoursWarningText(info);

  afterHoursButton.hidden = false;
  afterHoursButton.dataset.active = String(isActive);
  afterHoursButton.title = isActive ? "After-hours countdown running" : "Start after-hours countdown";
  afterHoursButton.setAttribute(
    "aria-label",
    isActive ? "After-hours countdown running" : "Start after-hours countdown"
  );

  if (isActive || warningText) {
    afterHoursNotice.hidden = false;
    afterHoursNotice.textContent = warningText || `After-hours countdown running until ${formatClock(info.end)}.`;
  } else {
    afterHoursNotice.hidden = true;
    afterHoursNotice.textContent = "";
  }
}

function getWorkingHoursInfo(now) {
  const bounds = getDailyBounds(now);
  const isWorking = !bounds.noWork && now >= bounds.start && now < bounds.end;

  return { ...bounds, isWorking };
}

function getTestCountdownInfo(now) {
  if (!testCountdown) return null;

  if (now >= testCountdown.end) {
    testCountdown = null;
    return null;
  }

  const total = testCountdown.end - testCountdown.start;
  const elapsed = clamp(now - testCountdown.start, 0, total);
  const remaining = clamp(testCountdown.end - now, 0, total);
  const progress = total > 0 ? clamp((remaining / total) * 100, 0, 100) : 0;

  return {
    key: testCountdown.key,
    start: testCountdown.start,
    end: testCountdown.end,
    total,
    elapsed,
    remaining,
    progress
  };
}

function startTestCountdown() {
  const now = new Date();

  testCountdown = {
    key: `test:${now.getTime()}`,
    start: now,
    end: new Date(now.getTime() + TEST_COUNTDOWN_DURATION)
  };
  update();
}

function updateTestControls(now, testInfo) {
  const isWorking = getWorkingHoursInfo(now).isWorking;

  testCountdownButton.hidden = !isWorking && !testInfo;
  testCountdownButton.dataset.active = String(Boolean(testInfo));
  testCountdownButton.title = testInfo ? "Test countdown running" : "Run a short test countdown";
  testCountdownButton.setAttribute(
    "aria-label",
    testInfo ? "Test countdown running" : "Run a short test countdown"
  );
}

function getScheduledElapsed(period, now) {
  if (period.total === 0) return 0;
  return clamp(now - period.start, 0, period.total);
}

function getDailyBounds(now) {
  const period = getScheduledDay(now);

  return {
    ...period,
    elapsed: getScheduledElapsed(period, now),
    noWork: period.total === 0
  };
}

function getArcBounds(now) {
  const monday = getMonday(now);
  let start = null;
  let end = null;
  let fallbackStart = null;
  let fallbackEnd = null;
  let total = 0;
  let elapsed = 0;

  for (let dayIndex = 0; dayIndex <= activeArcEndDay; dayIndex += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + dayIndex);

    const period = getScheduledDay(date, dayIndex);
    fallbackStart = fallbackStart || period.start;
    fallbackEnd = period.end;

    if (period.total > 0) {
      start = start || period.start;
      end = period.end;
    }

    total += period.total;
    elapsed += getScheduledElapsed(period, now);
  }

  return {
    start: start || fallbackStart,
    end: end || fallbackEnd,
    total,
    elapsed,
    noWork: total === 0
  };
}

document.addEventListener("click", (event) => {
  if (!settingsMenu.open || settingsMenu.contains(event.target)) return;
  settingsMenu.open = false;
});

testCountdownButton.addEventListener("click", () => {
  const now = new Date();
  const testInfo = getTestCountdownInfo(now);

  if (testInfo) {
    showNotice({
      title: "Test running",
      message: `The test countdown is running. ${formatDuration(testInfo.remaining)} left.`,
      mark: "T"
    });
    return;
  }

  if (!getWorkingHoursInfo(now).isWorking) {
    showNotice({
      title: "Test unavailable",
      message: "The test button is only available during working hours on a work or half day.",
      mark: "i"
    });
    return;
  }

  showNotice({
    title: "Test countdown",
    message: "Start a 30-second countdown from 100% to 0%? This is only for checking the after-hours behavior quickly.",
    mark: "T",
    confirmLabel: "Start test",
    cancelLabel: "Not now",
    onConfirm: startTestCountdown
  });
});

afterHoursButton.addEventListener("click", () => {
  const info = getAfterHoursInfo(new Date());

  if (!info) {
    showNotice({
      title: "Countdown unavailable",
      message: "The after-hours countdown opens from 18:00 to the next 09:00 on non-leave days.",
      mark: "i"
    });
    return;
  }

  if (isAfterHoursCountdownActive(info)) {
    showNotice({
      title: "Already running",
      message: `The after-hours countdown is running. ${formatDuration(info.remaining)} left until ${formatClock(info.end)}.`,
      mark: "!"
    });
    return;
  }

  const visitCount = getAfterHoursVisitCount(info);
  const checkBackWarning = visitCount >= 10
    ? ` This is after-hours check #${visitCount}, so this is the soft nudge you asked for.`
    : "";

  showNotice({
    title: "After-hours countdown",
    message: `The work window has ended. Start the countdown from 100% to 0% until ${formatClock(info.end)}?${checkBackWarning}`,
    mark: "!",
    confirmLabel: "Start",
    cancelLabel: "Not now",
    onConfirm: () => startAfterHoursCountdown(info)
  });
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

function getWindowKey(bounds) {
  return `${activeMode}:${startKey(bounds.start)}:${startKey(bounds.end)}:${bounds.total}:${weeklySchedule.join(",")}`;
}

function startKey(date) {
  return date ? date.getTime() : "none";
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

function checkMilestones(progress, bounds) {
  const key = getWindowKey(bounds);

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

function updateAfterHoursCountdown(now, info) {
  const progress = info.progress;

  windowLabel.textContent = "After hours";
  percentNumber.textContent = progress.toFixed(5).padStart(8, "0");
  progressFill.style.width = `${progress}%`;
  currentTimeEl.textContent = formatClock(now);
  elapsedTimeEl.textContent = formatDuration(info.elapsed);
  remainingTimeEl.textContent = formatDuration(info.remaining);
  statusEl.textContent = "Cooldown";
  flavorText.textContent = selectedFlavor.cooldown;
  setMood(progress);
  updatePayday(now);
}

function updateTestCountdown(now, info) {
  const progress = info.progress;

  windowLabel.textContent = "Test countdown";
  percentNumber.textContent = progress.toFixed(5).padStart(8, "0");
  progressFill.style.width = `${progress}%`;
  currentTimeEl.textContent = formatClock(now);
  elapsedTimeEl.textContent = formatDuration(info.elapsed);
  remainingTimeEl.textContent = formatDuration(info.remaining);
  statusEl.textContent = "Test";
  flavorText.textContent = "Short countdown test. The normal meter will be right back.";
  setMood(progress);
  updatePayday(now);
}

function update() {
  const now = new Date();
  const afterHoursInfo = getAfterHoursInfo(now);
  const testInfo = getTestCountdownInfo(now);

  updateTestControls(now, testInfo);
  updateAfterHoursControls(afterHoursInfo);

  if (testInfo) {
    updateTestCountdown(now, testInfo);
    return;
  }

  if (isAfterHoursCountdownActive(afterHoursInfo)) {
    updateAfterHoursCountdown(now, afterHoursInfo);
    return;
  }

  syncRangeLabels();

  const bounds = getBounds(now);
  const { start, end, total, elapsed, noWork } = bounds;
  const progress = noWork ? 100 : clamp((elapsed / total) * 100, 0, 100);
  const remaining = Math.max(0, total - elapsed);

  percentNumber.textContent = progress.toFixed(5).padStart(8, "0");
  progressFill.style.width = `${progress}%`;
  currentTimeEl.textContent = formatClock(now);
  setMood(progress);
  updatePayday(now);
  checkMilestones(progress, bounds);

  if (noWork) {
    statusEl.textContent = "Off";
    elapsedTimeEl.textContent = "0s";
    remainingTimeEl.textContent = "0s";
    flavorText.textContent = selectedFlavor.after;
  } else if (now < start) {
    statusEl.textContent = "Quiet";
    elapsedTimeEl.textContent = "0s";
    remainingTimeEl.textContent = formatDuration(total);
    flavorText.textContent = selectedFlavor.before;
  } else if (remaining <= 0 || now >= end) {
    statusEl.textContent = "Done";
    elapsedTimeEl.textContent = formatDuration(total);
    remainingTimeEl.textContent = "0s";
    flavorText.textContent = selectedFlavor.after;
  } else if (progress >= 92) {
    statusEl.textContent = "Nearly";
    elapsedTimeEl.textContent = formatDuration(elapsed);
    remainingTimeEl.textContent = formatDuration(remaining);
    flavorText.textContent = selectedFlavor.final;
  } else if (progress >= 70) {
    statusEl.textContent = "Bright";
    elapsedTimeEl.textContent = formatDuration(elapsed);
    remainingTimeEl.textContent = formatDuration(remaining);
    flavorText.textContent = progress >= 84
      ? selectedFlavor.late
      : selectedFlavor.secondHalf;
  } else {
    statusEl.textContent = "Moving";
    elapsedTimeEl.textContent = formatDuration(elapsed);
    remainingTimeEl.textContent = formatDuration(remaining);
    flavorText.textContent = progress >= 45
      ? selectedFlavor.firstHalf
      : selectedFlavor.early;
  }
}

function animate() {
  update();
  requestAnimationFrame(animate);
}

registerAfterHoursVisit();
animate();
