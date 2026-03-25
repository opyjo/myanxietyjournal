import { DEFAULT_RANGE_PRESET, MAX_ANALYSIS_RANGE_DAYS } from "./constants";
export function padNumber(value) {
    return value.toString().padStart(2, "0");
}
export function toDateKey(date) {
    return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}
export function fromDateKey(dateKey) {
    return new Date(`${dateKey}T12:00:00`);
}
export function todayDateKey() {
    return toDateKey(new Date());
}
export function shiftDateKey(dateKey, deltaDays) {
    const date = fromDateKey(dateKey);
    date.setDate(date.getDate() + deltaDays);
    return toDateKey(date);
}
export function buildPresetRange(days = DEFAULT_RANGE_PRESET) {
    const end = todayDateKey();
    return {
        rangeStart: shiftDateKey(end, -(days - 1)),
        rangeEnd: end,
    };
}
export function diffDaysInclusive(rangeStart, rangeEnd) {
    const start = fromDateKey(rangeStart);
    const end = fromDateKey(rangeEnd);
    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / 86_400_000) + 1;
}
export function clampRange(rangeStart, rangeEnd) {
    const days = diffDaysInclusive(rangeStart, rangeEnd);
    if (days < 1) {
        throw new Error("End date must be on or after the start date.");
    }
    if (days > MAX_ANALYSIS_RANGE_DAYS) {
        throw new Error(`Range cannot exceed ${MAX_ANALYSIS_RANGE_DAYS} days.`);
    }
    return { rangeStart, rangeEnd, days };
}
export function enumerateDateKeys(rangeStart, rangeEnd) {
    const { days } = clampRange(rangeStart, rangeEnd);
    return Array.from({ length: days }, (_, index) => shiftDateKey(rangeStart, index));
}
export function formatFriendlyDate(dateKey) {
    return fromDateKey(dateKey).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}
export function formatFriendlyDateTime(isoString) {
    return new Date(isoString).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}
export function toLocalDateTimeInputValue(date = new Date()) {
    const year = date.getFullYear();
    const month = padNumber(date.getMonth() + 1);
    const day = padNumber(date.getDate());
    const hours = padNumber(date.getHours());
    const minutes = padNumber(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
export function localDateTimeToIso(value) {
    return new Date(value).toISOString();
}
