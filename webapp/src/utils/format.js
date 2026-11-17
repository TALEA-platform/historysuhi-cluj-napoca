// Locale-aware formatters shared across map and panel components.

const LOCALES = {
  ro: "ro-RO",
  it: "it-IT",
  en: "en-GB",
};

const MISSING_VALUES = {
  ro: "n.d.",
  it: "n.d.",
  en: "n/a",
};

const PERIOD_COPY = {
  ro: {
    summer: (year) => `Vara ${year} (1 iunie - 31 august)`,
    aggregated: "Perioadă agregată",
    localSummerTime: (time) => `în jur de ${time} (ora locală de vară)`,
  },
  it: {
    summer: (year) => `Estate ${year} (1 giugno - 31 agosto)`,
    aggregated: "Periodo aggregato",
    localSummerTime: (time) => `circa le ${time} (ora locale estiva)`,
  },
  en: {
    summer: (year) => `Summer ${year} (1 June - 31 August)`,
    aggregated: "Aggregated period",
    localSummerTime: (time) => `around ${time} (local summer time)`,
  },
};

function getLocale(language = "ro") {
  return LOCALES[language] || LOCALES.ro;
}

function getMissingValue(language = "ro") {
  return MISSING_VALUES[language] || MISSING_VALUES.ro;
}

function getPeriodCopy(language = "ro") {
  return PERIOD_COPY[language] || PERIOD_COPY.ro;
}

export function formatPeriod(label, year, language = "ro") {
  const copy = getPeriodCopy(language);
  if (label === "summer") return copy.summer(year);
  return `${label || copy.aggregated} ${year}`;
}

export function formatDecimal(value, digits = 1, language = "ro") {
  return Number.isFinite(value)
    ? value.toLocaleString(getLocale(language), { maximumFractionDigits: digits, minimumFractionDigits: digits })
    : getMissingValue(language);
}

export function formatPercent(value, digits = 1, language = "ro") {
  return Number.isFinite(value) ? `${formatDecimal(value, digits, language)}%` : getMissingValue(language);
}

export function formatIsoDate(date, language = "ro") {
  if (!date) return getMissingValue(language);
  const parsed = new Date(`${date}T00:00:00Z`);
  const formatted = new Intl.DateTimeFormat(getLocale(language), { day: "numeric", month: "short" }).format(parsed);
  return language === "en" ? formatted : formatted.replace(".", "");
}

export function formatDateRange(acquisition, year, period, language = "ro") {
  if (!acquisition?.startDate || !acquisition?.endDate) return formatPeriod(period, year, language);
  return `${formatIsoDate(acquisition.startDate, language)} - ${formatIsoDate(acquisition.endDate, language)} ${year}`;
}

function parseUtcTimeToMinutes(time) {
  const match = String(time || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatClock(minutes) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatLocalSummerTime(utcTimes = [], language = "ro") {
  const minutes = utcTimes.map(parseUtcTimeToMinutes).filter(Number.isFinite);
  if (!minutes.length) return getMissingValue(language);
  const averageMinutes = minutes.reduce((sum, value) => sum + value, 0) / minutes.length;
  const roundedToFiveMinutes = Math.round((averageMinutes + 120) / 5) * 5;
  return getPeriodCopy(language).localSummerTime(formatClock(roundedToFiveMinutes));
}
