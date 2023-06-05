import type { IpadicFeatures, Kuromoji, Tokenizer } from '../kuromoji/kuromoji.d.ts';
import '../kuromoji/kuromoji';
import { LyricElement } from './types';
import * as wanakana from 'wanakana';
import { fit } from 'furigana';


declare const kuromoji: Kuromoji;

const _tokenizer: { value?: Tokenizer<IpadicFeatures> } = {};
kuromoji.builder({ dicPath: 'https://raw.githubusercontent.com/takuyaa/kuromoji.js/master/dict/' })
  .build((err, tk) => {
    if (err) {
      console.error(err);
      return;
    }
    _tokenizer.value = tk;
  });

while (_tokenizer.value === undefined) {
  await new Promise(r => setTimeout(r, 1000));
}


const tokenizer = <Tokenizer<IpadicFeatures>>_tokenizer.value;

// TODO: add a map for common mistaken tokens to improve correctness

/**
 * Raw lyrics means that there's no LRC tag associated with the lyrics,
 * and it contains the lyrics ONLY
 * @param s Raw lyrics in string
 */
export function parseRawLyrics(s: string, processFuri = true): LyricElement[] {
  s = s.replace(/\r\n/g, '\n');
  // const x = [...s].map((c) => ({
  //   obj: { text: c, duration: {} },
  //   furi: undefined,
  // }));
  const tokens = tokenizer.tokenize(s);
  const res: LyricElement[] = [];
  tokens.forEach((r) => {
    if (processFuri && r.reading && [...r.basic_form].some(wanakana.isKanji)) {
      const cs = fit(r.surface_form, wanakana.toHiragana(r.reading), { type: 'object' });
      cs?.forEach(e => {
        if (!wanakana.isKanji(e.w)) {
          [...e.w].map(x => res.push({
            obj: { text: x, duration: {} },
            furi: undefined,
          }));
          return;
        }
        if (!e.r) console.log(e);
        res.push({
          obj: { text: e.w, duration: {} },
          furi: e.r ? [...e.r].map(c => ({
            text: c,
            duration: {},
          })) : undefined,
        });
      });
    } else {
      for (let i = 0; i < r.surface_form.length; i++) {
        res.push({
          obj: { text: r.surface_form[i], duration: {} },
          furi: undefined,
        });
      }
    }
  });
  return res;
}