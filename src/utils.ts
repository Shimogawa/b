export function formatInt(n: number, len: number): string {
  const fs = String(Math.abs(Math.floor(n))).padStart(len, '0');
  if (n >= 0)
    return fs;
  return `-${fs}`;
}

export function secToTimeString(secs: number, showMs = false): string {
  if (!secs)
    return '00:00' + (showMs ? '.000' : '');
  const h = Math.floor(secs / 3600);
  secs = secs % 3600;
  const m = Math.floor(secs / 60);
  secs = Math.abs(secs % 60);
  const hstr = h === 0 ? '' : `${formatInt(h, 2)}:`;
  const hms = `${hstr}${formatInt(m, 2)}:${formatInt(secs, 2)}`;
  if (showMs)
    return `${hms}.${formatInt(Math.floor((secs - Math.floor(secs)) * 1000), 3)}`;
  return hms;
}

export function msToTimeString(ms: number): string {
  if (!ms)
    return '00:00.000';
  const lms = ms % 1000;
  return `${secToTimeString(Math.floor(ms / 1000))}.${formatInt(lms, 3)}`;
}

/**
 * Takes a character and a unicode range. Returns true if the char is in the range.
 * @param  {string}  char  unicode character
 * @param  {number}  start unicode start range
 * @param  {number}  end   unicode end range
 * @return {boolean}
 */
export function isCharInRange(c: string, start: number, end: number) {
  if (c.length === 0) return false;
  const code = c.charCodeAt(0);
  return start <= code && code <= end;
}
