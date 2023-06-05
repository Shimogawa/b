import { Fragment, useEffect, useState } from 'react';
import SingleWord from './SingleWord';
import './LyricPanel.css';
import { LyricElement } from './types';
// import * as kuromoji from '../kuromoji/kuromoji.js';
import type { IpadicFeatures, Kuromoji, Tokenizer } from '../kuromoji/kuromoji.d.ts';
import '../kuromoji/kuromoji';
import { Toast } from '@douyinfe/semi-ui';

type LyricPanelProps = {
  rawLyrics: string,
  lyrics: LyricElement[]
}

declare const kuromoji: Kuromoji;

export default function LyricPanel(props: LyricPanelProps) {
  let initialized = false;
  const [tokenizer, setTokenizer] = useState<Tokenizer<IpadicFeatures>>();

  useEffect(() => {
    if (initialized)
      return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    initialized = true;
    kuromoji.builder({ dicPath: 'https://raw.githubusercontent.com/takuyaa/kuromoji.js/master/dict/' })
      .build((err, tk) => {
        if (err) {
          console.error(err);
          return;
        }
        setTokenizer(tk);
        Toast.success('Analyzer ready.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!tokenizer) {
      Toast.warning('Analyzer not ready...');
      return;
    }
    const processLyricString = (l: string): LyricElement[] => {
      l = l.replace(/\r\n/g, '\n');
      console.log(tokenizer.tokenize(l));
      // const e = l.split('\n').map(line => {
      //   let res;
      //   b.build((err, tk) => {
      //     if (err) {
      //       console.error(err);
      //       return undefined;
      //     }
      //     res = tk.tokenize(line);
      //   });
      //   return res;
      // });
      // console.log(e);
      return [];
    };
    processLyricString(props.rawLyrics);
  }, [props.rawLyrics, tokenizer]);
  return (
    <div className='lyric-panel'>
      {props.lyrics.map((l, i) => {
        if (l.obj.text === '\n') {
          return (
            <Fragment key={i}>
              <SingleWord text={l.obj.text} key={i} />
              <div className='line-break' key={i + 'lb'} />
            </Fragment>
          );
        }
        return (<SingleWord text={l.obj.text} furi={l.furi && l.furi.map(x => x.text).join('')} key={i} />);
      })}
    </div>
  );
}
