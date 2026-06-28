const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value, { compact = false } = {}) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "—";
  return compact ? compactCurrencyFormatter.format(n) : currencyFormatter.format(n);
}

export function formatSignedCurrency(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${currencyFormatter.format(Math.abs(n))}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(value) {
  // if (!value) return "—";
  // const d = value instanceof Date ? value : new Date(value);
  // if (Number.isNaN(d.getTime())) return "—";
  // return dateFormatter.format(d);
  return formatDateEST(value);
}

export function todayIsoDate() {
  // const d = new Date();
  // const tz = d.getTimezoneOffset() * 60000;
  // return new Date(d.getTime() - tz).toISOString().slice(0, 10);
  return getTodayEST();
}

export function ordinal(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  const s = ["th", "st", "nd", "rd"];
  const m = v % 100;
  return v + (s[(m - 20) % 10] || s[m] || s[0]);
}

/**
 * Generates today's date as "YYYY-MM-DD" strictly in Eastern Time
 */
export function getTodayEST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Formats any date (String, JS Date, or Firestore Timestamp) strictly in EST
 */
export function formatDateEST(date) {
  if (!date) return "N/A";
  
  let safeDate;
  if (date?.toDate) {
    // Handle Firestore Timestamps natively
    safeDate = date.toDate();
  } else if (typeof date === "string" && date.length === 10) {
    // Prevent "YYYY-MM-DD" strings from shifting backward a day 
    // by anchoring them to local midnight before formatting
    safeDate = new Date(`${date}T00:00:00`);
  } else {
    safeDate = new Date(date);
  }

  return safeDate.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}