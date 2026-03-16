/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { IpadicFeatures, Kuromoji, Tokenizer } from '../kuromoji/kuromoji.d.ts';
import '../kuromoji/kuromoji';
import { LyricElement, TimedObject } from './types';
import * as wanakana from 'wanakana';
import { fit } from 'furigana';


declare const kuromoji: Kuromoji;

const tokenizer: { value?: Tokenizer<IpadicFeatures> } = {};

const smallKanaSet = new Set([
  'ゃ', 'ゅ', 'ょ', 'ゎ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ',
  'ャ', 'ュ', 'ョ', 'ヮ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ',
]);

export async function initLrc() {
  kuromoji.builder({ dicPath: 'https://raw.githubusercontent.com/takuyaa/kuromoji.js/master/dict/' })
    .build((err, tk) => {
      if (err) {
        console.error(err);
        return;
      }
      tokenizer.value = tk;
    });

  while (tokenizer.value === undefined) {
    await new Promise(r => setTimeout(r, 1000));
  }
}

// TODO: add a map for common mistaken tokens to improve correctness

function isSmallKana(c: string): boolean {
  return smallKanaSet.has(c);
}

function isSokuon(c: string): boolean {
  return c === 'っ' || c === 'ッ';
}

function isEnglishOrNumber(c: string): boolean {
  return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c === '’' || c === '\'';
}

export function getFuriAsString(e: LyricElement): string {
  if (e.furi === undefined)
    return '';
  return e.furi.map(f => f.text).join('');
}

export function getCurrentTimetagCount(e: LyricElement): number {
  return e.hasTimeTag
    ? (e.furi === undefined ? 1 : e.furi.length)
    : 0;
}

export function getMaxTimetagCount(e: LyricElement): number {
  if (e.furi === undefined)
    return 1;
  return e.furi.map(f => f.text.length).reduce((a, b) => a + b, 0);
}

export function furiStringToList(
  s: string | undefined, tagCount: number | undefined = undefined
): TimedObject[] | undefined {
  if (!s) return undefined;
  const res: TimedObject[] = [];
  const regularKanaCnt = [...s].filter(c => !isSmallKana(c) && !isSokuon(c)).length;
  const smallKanaCnt = [...s].filter(isSmallKana).length;
  const sokuonCnt = s.length - regularKanaCnt - smallKanaCnt;
  if (tagCount === 0 || tagCount === 1) {
    return [{
      text: s,
      duration: undefined,
    }];
  }
  tagCount = tagCount === undefined ? regularKanaCnt : Math.min(tagCount, s.length);
  let regularTagCnt = tagCount < regularKanaCnt ? tagCount : regularKanaCnt;
  tagCount -= regularTagCnt;
  let sokuonTagCnt = tagCount < sokuonCnt ? Math.max(0, tagCount) : sokuonCnt;
  tagCount -= sokuonTagCnt;
  let smallTagCnt = tagCount < smallKanaCnt ? Math.max(0, tagCount) : smallKanaCnt;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const isSmall = isSmallKana(c);
    const isSokuonChar = isSokuon(c);
    if (isSmall && smallTagCnt > 0) {
      res.push({
        text: c,
        duration: undefined,
      });
      smallTagCnt--;
    } else if (isSokuonChar && sokuonTagCnt > 0) {
      res.push({
        text: c,
        duration: undefined,
      });
      sokuonTagCnt--;
    } else if (!isSmall && !isSokuonChar && regularTagCnt > 0) {
      res.push({
        text: c,
        duration: undefined,
      });
      regularTagCnt--;
    } else if (res.length === 0) {
      res.push({
        text: c,
        duration: undefined,
      });
    } else {
      res[res.length - 1].text += c;
    }
  }
  return res;
}

function preprocessLyrics(s: string): string {
  s = s.replace(/\r\n/g, '\n').replace(/\n+/g, '\n');
  return s;
}

/**
 * Raw lyrics means that there's no LRC tag associated with the lyrics,
 * and it contains the lyrics ONLY
 * @param s Raw lyrics in string
 */
export function parseRawLyrics(s: string, processFuri = true): LyricElement[] {
  s = preprocessLyrics(s);
  const res: LyricElement[] = [];
  const englishBuf: string[] = [];
  if (!processFuri) {
    for (let i = 0; i < s.length; i++) {
      if (isEnglishOrNumber(s[i])) {
        englishBuf.push(s[i]);
        continue;
      }
      if (englishBuf.length > 0) {
        res.push({
          obj: { text: englishBuf.join(''), duration: {} },
          furi: undefined,
          hasTimeTag: true,
          hasStopper: false,
        });
        englishBuf.length = 0;
      }
      res.push({
        obj: { text: s[i], duration: {} },
        furi: undefined,
        hasTimeTag: true,
        hasStopper: false,
      });
    }
    return res;
  }
  const tokens = tokenizer.value!.tokenize(s);
  tokens.forEach((r) => {
    if (r.reading && [...r.basic_form].some(wanakana.isKanji)) {
      const cs = fit(r.surface_form, wanakana.toHiragana(r.reading), { type: 'object' });
      cs?.forEach(e => {
        if (!wanakana.isKanji(e.w)) {
          [...e.w].map(x => res.push({
            obj: { text: x, duration: {} },
            furi: undefined,
            hasTimeTag: true,
            hasStopper: false,
          }));
          return;
        }
        if (!e.r) console.log(e);
        res.push({
          obj: { text: e.w, duration: {} },
          furi: furiStringToList(e.r),
          hasTimeTag: true,
          hasStopper: false,
        });
      });
    } else {
      // no furi
      for (let i = 0; i < r.surface_form.length; i++) {
        if (isEnglishOrNumber(r.surface_form[i])) {
          englishBuf.push(r.surface_form[i]);
          continue;
        }
        if (englishBuf.length > 0) {
          res.push({
            obj: { text: englishBuf.join(''), duration: {} },
            furi: undefined,
            hasTimeTag: true,
            hasStopper: false,
          });
          englishBuf.length = 0;
        }
        res.push({
          obj: { text: r.surface_form[i], duration: {} },
          furi: undefined,
          hasTimeTag: true,
          hasStopper: false,
        });
      }
    }
  });
  res[res.length - 1].hasStopper = true;
  return res;
}