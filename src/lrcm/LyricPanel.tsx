import { useEffect, useState } from 'react';
import SingleWord from './SingleWord';
import './LyricPanel.css';
import { LyricElement } from './types';
// import * as kuromoji from '../kuromoji/kuromoji.js';
import type { Kuromoji } from '../kuromoji/kuromoji.d.ts';
import '../kuromoji/kuromoji';
import { Toast } from '@douyinfe/semi-ui';

type LyricPanelProps = {
  lyrics: string
}



export default function LyricPanel(props: LyricPanelProps) {
  let initialized = false;
  const [tokenizer, setTokenizer] = useState<any>(undefined);

  useEffect(() => {
    if (initialized)
      return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    initialized = true;
    (kuromoji).builder({ dicPath: 'https://raw.githubusercontent.com/takuyaa/kuromoji.js/master/dict/' /*'dict/'*/ })
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
    const processLyricString = (l: string): LyricElement[] => {
      l = l.replace('\r\n', '\n');
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

    if (!tokenizer) {
      Toast.warning('Analyzer not ready...');
      return;
    }
    processLyricString(props.lyrics);
  }, [props.lyrics, tokenizer]);
  return (
    <div className='lyric-panel'>
      {[...props.lyrics.replace(/\r\n/g, '\n')].map((c, i) => {
        if (c === '\n') {
          return <><SingleWord text={c} key={i} /><div className='line-break' /></>;
        }
        if (c >= 'A' && c <= 'z') {
          return <SingleWord text={c} key={i} />;
        }
        return (<SingleWord text={c} furi='あき' key={i} />);
      })}
    </div>
  );
}
