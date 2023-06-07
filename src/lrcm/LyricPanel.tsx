import React, { Fragment, useEffect, useState } from 'react';
import SingleWord from './SingleWord';
import './LyricPanel.css';
import { DragSelection, LyricElement } from './types';

type LyricPanelProps = {
  // rawLyrics: string,
  lyricState: [LyricElement[], React.Dispatch<React.SetStateAction<LyricElement[]>>]
}

export default function LyricPanel(props: LyricPanelProps) {
  const [dragSelection, setDragSelection] = useState(new DragSelection());
  const [isMouseDown, setIsMouseDown] = useState(false);

  const [lyrics, setLyrics] = props.lyricState;

  const [lineBreakPositions, setLineBreakPositions] = useState<number[]>([]);
  const [curSelectedLineNo, setCurSelectedLineNo] = useState(-1);
  useEffect(() => {
    const lbPos: number[] = [];
    lyrics.forEach((e, i) => { if (e.obj.text === '\n') lbPos.push(i); });
    setLineBreakPositions(lbPos);
    setDragSelection(new DragSelection());
    setCurSelectedLineNo(-1);
    setIsMouseDown(false);
  }, [lyrics]);

  useEffect(() => {
    function mouseUpListener(e: MouseEvent) {
      e.stopPropagation();
      console.log('mouse up');
      setIsMouseDown(false);
    }
    document.addEventListener('mouseup', mouseUpListener);
    return () => document.removeEventListener('mouseup', mouseUpListener);
  }, []);

  useEffect(() => console.log(dragSelection), [dragSelection]);

  const checkState = (id: string): number => {
    if (!id.startsWith('le-middle-'))
      throw new Error('bad state');
    const num = parseInt(id.substring(10));
    if (isNaN(num)) throw new Error(`bad id: check code -> ${id} to ${num}`);
    return num;
  };

  const onElementMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMouseDown) return;
    const id = checkState(e.currentTarget.id);
    if (lineBreakPositions.indexOf(id) >= 0) {
      return;
    }
    // find the line #
    let lineNo = -1;
    let i = 0;
    for (; i < lineBreakPositions.length; i++) {
      if (lineBreakPositions[i] < id)
        continue;
      lineNo = i;
      break;
    }
    if (lineNo === -1) lineNo = i;
    // console.log(lineNo);
    // console.log(lineBreakPositions);
    setCurSelectedLineNo(lineNo);
    setIsMouseDown(true);
    setDragSelection(new DragSelection(id, id));
  };

  const onElementMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown) return;
    const id = checkState(e.currentTarget.id);
    const smaller = id < dragSelection.anchor ? id : dragSelection.anchor;
    const bigger = id === smaller ? dragSelection.anchor : id;
    for (const lbPos of lineBreakPositions) {
      if (lbPos > bigger)
        break;
      if (lbPos < smaller)
        continue;
      return;
    }
    setDragSelection(new DragSelection(dragSelection.anchor, id));
  };

  return (
    <div className='lyric-panel'>
      {lyrics.map((l, i) => {
        const singleWord = <SingleWord
          id={i} lyricElement={l} key={i}
          // isSelected={dragSelection.isInDragSelection(i)}
          lineBreakPositions={lineBreakPositions}
          selectedLineNo={curSelectedLineNo}
          retrieveSelection={() => dragSelection}
          onLyricElementChange={(e) => setLyrics([...lyrics.slice(undefined, i), e, ...lyrics.slice(i + 1)])}
          onMouseDown={onElementMouseDown}
          onMouseOver={onElementMouseOver}
        />;
        if (l.obj.text === '\n') {
          return (
            <Fragment key={i}>
              {singleWord}
              <div className='line-break' key={i + 'lb'} />
            </Fragment>
          );
        }
        return singleWord;
      })}
    </div>
  );
}
