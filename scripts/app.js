const START_HOUR = 9;
const START_MINUTE = 0;
const END_HOUR = 18;
const END_MINUTE = 0;

const root = document.documentElement;
const percentNumber = document.getElementById("percentNumber");
const progressFill = document.getElementById("progressFill");
const statusEl = document.getElementById("status");
const afterHoursButton = document.getElementById("afterHoursButton");
const afterHoursNotice = document.getElementById("afterHoursNotice");
const shareButton = document.getElementById("shareButton");
const shareToast = document.getElementById("shareToast");
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
const SHARE_CARD_WIDTH = 1200;
const SHARE_CARD_HEIGHT = 630;
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
let shareToastTimer = 0;
let shareToastFrame = 0;

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
  if (day === null || day === "") return DEFAULT_ARC_END_DAY;

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

function formatShareDuration(milliseconds) {
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

function findPreviousScheduledPeriod(now) {
  for (let offset = 0; offset <= WEEKDAY_LABELS.length; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    const period = getScheduledDay(date);

    if (period.total > 0 && period.end <= now) return period;
  }

  return null;
}

function findNextScheduledPeriod(now) {
  for (let offset = 0; offset <= WEEKDAY_LABELS.length; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    const period = getScheduledDay(date);

    if (period.total > 0 && period.start > now) return period;
  }

  return null;
}

function formatCountdownTarget(date) {
  return `${WEEKDAY_LABELS[getWeekdayIndex(date)]} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getAfterHoursInfo(now) {
  const currentPeriod = getScheduledDay(now);
  if (currentPeriod.total > 0 && now >= currentPeriod.start && now < currentPeriod.end) return null;

  const sourcePeriod = findPreviousScheduledPeriod(now);
  const nextPeriod = findNextScheduledPeriod(now);
  if (!sourcePeriod || !nextPeriod) return null;

  const start = sourcePeriod.end;
  const end = nextPeriod.start;
  const sourceDayIndex = getWeekdayIndex(sourcePeriod.start);

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

function stopAfterHoursCountdown() {
  localStorage.removeItem(AFTER_HOURS_COUNTDOWN_STORAGE_KEY);
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
  afterHoursButton.title = isActive ? "Return to normal screen" : "Start after-hours countdown";
  afterHoursButton.setAttribute(
    "aria-label",
    isActive ? "Return to normal screen" : "Start after-hours countdown"
  );

  if (isActive || warningText) {
    afterHoursNotice.hidden = false;
    afterHoursNotice.textContent = warningText || `After-hours countdown running until ${formatCountdownTarget(info.end)}.`;
  } else {
    afterHoursNotice.hidden = true;
    afterHoursNotice.textContent = "";
  }
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

afterHoursButton.addEventListener("click", () => {
  const info = getAfterHoursInfo(new Date());

  if (!info) {
    showNotice({
      title: "Countdown unavailable",
      message: "The countdown is available between the end of a scheduled workday and the next scheduled workday.",
      mark: "i"
    });
    return;
  }

  if (isAfterHoursCountdownActive(info)) {
    showNotice({
      title: "Countdown running",
      message: `The after-hours countdown is running. ${formatShareDuration(info.remaining)} left until ${formatCountdownTarget(info.end)}. Return to the normal screen?`,
      mark: "!",
      confirmLabel: "Return",
      cancelLabel: "Keep countdown",
      onConfirm: stopAfterHoursCountdown
    });
    return;
  }

  const visitCount = getAfterHoursVisitCount(info);
  const checkBackWarning = visitCount >= 10
    ? ` This is after-hours check #${visitCount}, so this is the soft nudge you asked for.`
    : "";

  showNotice({
    title: "After-hours countdown",
    message: `The work window has ended. Start the countdown from 100% to 0% until ${formatCountdownTarget(info.end)}?${checkBackWarning}`,
    mark: "!",
    confirmLabel: "Start",
    cancelLabel: "Not now",
    onConfirm: () => startAfterHoursCountdown(info)
  });
});

function getBounds(now) {
  return activeMode === "arc" ? getArcBounds(now) : getDailyBounds(now);
}

function getCleanPageUrl() {
  try {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return window.location.href.split(/[?#]/, 1)[0];
  }
}

function getShareSnapshot(now = new Date()) {
  const afterHoursInfo = getAfterHoursInfo(now);
  const pageUrl = getCleanPageUrl();

  if (isAfterHoursCountdownActive(afterHoursInfo)) {
    return {
      heading: "UNTIL WORK STARTS",
      range: "COOLDOWN",
      value: `${afterHoursInfo.progress.toFixed(5)}%`,
      qualifier: "remaining",
      detail: `${formatShareDuration(afterHoursInfo.remaining)} until ${formatCountdownTarget(afterHoursInfo.end)}`,
      progress: afterHoursInfo.progress,
      pageUrl,
      now
    };
  }

  const bounds = getBounds(now);
  const progress = bounds.noWork ? 0 : clamp((bounds.elapsed / bounds.total) * 100, 0, 100);
  const remaining = Math.max(0, bounds.total - bounds.elapsed);
  const isComplete = !bounds.noWork && (remaining <= 0 || now >= bounds.end);

  if (activeMode === "arc") {
    const range = getArcRangeLabel();
    return {
      heading: "THIS WEEK",
      range,
      value: bounds.noWork ? "OFF" : `${progress.toFixed(5)}%`,
      qualifier: bounds.noWork ? "" : "complete",
      detail: bounds.noWork
        ? "No work scheduled in this range"
        : isComplete
          ? "Scheduled range complete"
          : `${formatShareDuration(remaining)} scheduled time left`,
      progress,
      pageUrl,
      now
    };
  }

  return {
    heading: "TODAY",
    range: "WORKDAY",
    value: bounds.noWork ? "OFF" : `${progress.toFixed(5)}%`,
    qualifier: bounds.noWork ? "" : "complete",
    detail: bounds.noWork
      ? "No work scheduled today"
      : isComplete
        ? "Workday complete"
        : `${formatShareDuration(remaining)} left today`,
    progress,
    pageUrl,
    now
  };
}

function roundedRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function fitCanvasText(context, text, maxWidth, startSize, minSize, weight = 800) {
  let size = startSize;
  do {
    context.font = `${weight} ${size}px "Segoe UI", Arial, sans-serif`;
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size > minSize);

  return minSize;
}

function truncateCanvasText(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) return text;

  let truncated = text;
  while (truncated.length > 1 && context.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function renderShareCard(snapshot) {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const hue = 205 + snapshot.progress * 2.55;
  const accent = `hsl(${hue.toFixed(1)}, 88%, 55%)`;
  const accentTwo = `hsl(${((hue + 112) % 360).toFixed(1)}, 86%, 58%)`;
  const accentThree = `hsl(${((hue + 224) % 360).toFixed(1)}, 82%, 60%)`;

  const backdrop = context.createLinearGradient(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);
  backdrop.addColorStop(0, "#f8f8f4");
  backdrop.addColorStop(0.48, "#eef0ea");
  backdrop.addColorStop(1, `hsla(${hue.toFixed(1)}, 72%, 78%, 0.72)`);
  context.fillStyle = backdrop;
  context.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  context.save();
  context.globalAlpha = 0.16;
  context.translate(860, -180);
  context.rotate(-0.22);
  const bands = [accent, accentTwo, accentThree];
  bands.forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(index * 96, 0, 64, 920);
  });
  context.restore();

  context.save();
  context.shadowColor = `hsla(${hue.toFixed(1)}, 90%, 48%, 0.24)`;
  context.shadowBlur = 44;
  context.shadowOffsetY = 18;
  roundedRectPath(context, 54, 44, 1092, 542, 22);
  context.fillStyle = "rgba(255, 255, 252, 0.91)";
  context.fill();
  context.restore();

  const edge = context.createLinearGradient(72, 0, 1128, 0);
  edge.addColorStop(0, accent);
  edge.addColorStop(0.5, accentTwo);
  edge.addColorStop(1, accentThree);
  roundedRectPath(context, 76, 64, 1048, 7, 4);
  context.fillStyle = edge;
  context.fill();

  context.textBaseline = "alphabetic";
  context.fillStyle = "#68706c";
  context.font = "700 22px \"Segoe UI\", Arial, sans-serif";
  context.fillText("IS IT TIME?", 96, 120);

  context.textAlign = "right";
  context.fillStyle = "#5f6864";
  context.font = "700 20px \"Segoe UI\", Arial, sans-serif";
  context.fillText(snapshot.range, 1104, 120);
  context.textAlign = "left";

  context.fillStyle = "#171b18";
  context.font = "800 38px \"Segoe UI\", Arial, sans-serif";
  context.fillText(snapshot.heading, 96, 176);

  const valueGradient = context.createLinearGradient(96, 0, 1010, 0);
  valueGradient.addColorStop(0, "#171b18");
  valueGradient.addColorStop(0.34, accent);
  valueGradient.addColorStop(0.68, accentTwo);
  valueGradient.addColorStop(1, accentThree);
  const valueSize = fitCanvasText(context, snapshot.value, 1008, 132, 82);
  context.font = `820 ${valueSize}px "Segoe UI", Arial, sans-serif`;
  context.fillStyle = valueGradient;
  context.shadowColor = `hsla(${hue.toFixed(1)}, 90%, 52%, 0.22)`;
  context.shadowBlur = 24;
  context.fillText(snapshot.value, 92, 322);
  context.shadowBlur = 0;

  if (snapshot.qualifier) {
    context.fillStyle = "#69716d";
    context.font = "650 27px \"Segoe UI\", Arial, sans-serif";
    context.fillText(snapshot.qualifier, 98, 365);
  }

  context.fillStyle = "#2a312d";
  context.font = "700 35px \"Segoe UI\", Arial, sans-serif";
  context.fillText(snapshot.detail, 96, 422);

  roundedRectPath(context, 96, 458, 1008, 20, 10);
  context.fillStyle = "rgba(24, 29, 26, 0.10)";
  context.fill();

  const fillWidth = 1008 * clamp(snapshot.progress / 100, 0, 1);
  if (fillWidth > 0) {
    roundedRectPath(context, 96, 458, Math.max(20, fillWidth), 20, 10);
    context.fillStyle = edge;
    context.fill();
  }

  context.strokeStyle = "rgba(24, 29, 26, 0.10)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(96, 512);
  context.lineTo(1104, 512);
  context.stroke();

  context.fillStyle = "#626b67";
  context.font = "600 22px \"Segoe UI\", Arial, sans-serif";
  const safeUrl = truncateCanvasText(context, snapshot.pageUrl, 690);
  context.fillText(safeUrl, 96, 556);

  const sharedLabel = `${WEEKDAY_LABELS[getWeekdayIndex(snapshot.now)]} ${snapshot.now.getDate()} ${MONTH_LABELS[snapshot.now.getMonth()]} · ${pad(snapshot.now.getHours())}:${pad(snapshot.now.getMinutes())}`;
  context.textAlign = "right";
  context.fillStyle = "#858d89";
  context.font = "600 20px \"Segoe UI\", Arial, sans-serif";
  context.fillText(sharedLabel, 1104, 556);
  context.textAlign = "left";

  return canvas;
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create share card"));
    }, "image/png");
  });
}

function formatShareFallback(snapshot) {
  const valueLine = snapshot.qualifier
    ? `${snapshot.value} ${snapshot.qualifier}`
    : snapshot.value;
  return [snapshot.heading, `${snapshot.range} · ${valueLine}`, snapshot.detail, snapshot.pageUrl].join("\n");
}

function fallbackCopyText(text) {
  const activeElement = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    if (activeElement && typeof activeElement.focus === "function") activeElement.focus();
  }
  return copied;
}

async function copyFallbackText(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through for local files and browsers that deny clipboard access.
    }
  }
  return fallbackCopyText(text);
}

async function copyShareCard(snapshot) {
  if (
    typeof ClipboardItem === "function" &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === "function"
  ) {
    try {
      const canvas = renderShareCard(snapshot);
      const pngPromise = canvasToPngBlob(canvas);
      const item = new ClipboardItem({ "image/png": pngPromise });
      await navigator.clipboard.write([item]);
      return "image";
    } catch {
      // Preserve sharing on browsers that support text but not image clipboard data.
    }
  }

  return await copyFallbackText(formatShareFallback(snapshot)) ? "text" : "failed";
}

function showShareToast(message, type = "success") {
  window.clearTimeout(shareToastTimer);
  window.cancelAnimationFrame(shareToastFrame);
  shareToast.classList.remove("is-visible");
  shareToast.textContent = "";

  shareToastFrame = window.requestAnimationFrame(() => {
    shareToast.textContent = message;
    shareToast.dataset.type = type;
    shareToast.classList.add("is-visible");
    shareToastTimer = window.setTimeout(() => {
      shareToast.classList.remove("is-visible");
    }, 1600);
  });
}

shareButton.addEventListener("click", async () => {
  shareButton.disabled = true;
  shareButton.setAttribute("aria-busy", "true");

  const result = await copyShareCard(getShareSnapshot());
  if (result === "image") showShareToast("Share card copied");
  else if (result === "text") showShareToast("Image unavailable · copied text");
  else showShareToast("Couldn't copy share card", "error");

  shareButton.disabled = false;
  shareButton.removeAttribute("aria-busy");
});

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

  windowLabel.textContent = `Until ${formatCountdownTarget(info.end)}`;
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

function update() {
  const now = new Date();
  const afterHoursInfo = getAfterHoursInfo(now);

  updateAfterHoursControls(afterHoursInfo);

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
