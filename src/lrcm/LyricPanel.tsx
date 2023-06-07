import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import SingleWord from './SingleWord';
import './LyricPanel.css';
import { DragSelection, LyricElement } from './types';

type LyricPanelProps = {
  // rawLyrics: string,
  lyricState: [LyricElement[], React.Dispatch<React.SetStateAction<LyricElement[]>>]
}

export default function LyricPanel(props: LyricPanelProps) {
  const dragAnchorRef = useRef<number | null>(null);
  const [dragTo, setDragTo] = useState<number | null>(null);

  const [lyrics, setLyrics] = props.lyricState;

  const [lineBreakPositions, setLineBreakPositions] = useState<number[]>([]);
  const [curSelectedLineNo, setCurSelectedLineNo] = useState(-1);
  useEffect(() => {
    const lbPos: number[] = [];
    lyrics.forEach((e, i) => { if (e.obj.text === '\n') lbPos.push(i); });
    setLineBreakPositions(lbPos);
    setCurSelectedLineNo(-1);
    dragAnchorRef.current = null;
    setDragTo(null);
  }, [lyrics]);

  useEffect(() => {
    function mouseUpListener(e: MouseEvent) {
      e.stopPropagation();
      console.log('mouse up');
      dragAnchorRef.current = null;
    }
    document.addEventListener('mouseup', mouseUpListener);
    return () => document.removeEventListener('mouseup', mouseUpListener);
  }, []);

  const checkState = (id: string): number => {
    if (!id.startsWith('le-middle-'))
      throw new Error('bad state');
    const num = parseInt(id.substring(10));
    if (isNaN(num)) throw new Error(`bad id: check code -> ${id} to ${num}`);
    return num;
  };

  const onElementMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragAnchorRef.current) return;
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
    // console.log(lineBreakPositions);
    setCurSelectedLineNo(lineNo);
    dragAnchorRef.current = id;
    setDragTo(id);
  }, [lineBreakPositions]);

  const onElementMouseOver = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragAnchorRef.current) return;
    const id = checkState(e.currentTarget.id);
    setDragTo(id);
  }, []);

  const onLyricElementChange = useCallback((e: LyricElement, id: number) => {
    setLyrics([...lyrics.slice(undefined, id), e, ...lyrics.slice(id + 1)]);
  }, []);

  const getCurrSelection = useCallback((id: number) => {
    if (!dragAnchorRef.current || !dragTo) {
      return new DragSelection();
    }
    const dragFrom = dragAnchorRef.current;
    const smaller = id < dragFrom ? id : dragFrom;
    const bigger = id === smaller ? dragFrom : id;
    for (const lbPos of lineBreakPositions) {
      if (lbPos > bigger)
        break;
      if (lbPos < smaller)
        continue;
      return new DragSelection();
    }
    return new DragSelection(dragAnchorRef.current, dragTo);
  }, [dragTo, lineBreakPositions]);

  return (
    <div className='lyric-panel'>
      {lyrics.map((l, id) => {

        let isLineSelected = false;
        if (curSelectedLineNo === 0 && id < lineBreakPositions[curSelectedLineNo]) {
          isLineSelected = true;
        } else if (curSelectedLineNo === lineBreakPositions.length && id > lineBreakPositions[curSelectedLineNo]) {
          isLineSelected = true;
        } else if (id > lineBreakPositions[curSelectedLineNo - 1] && id < lineBreakPositions[curSelectedLineNo]) {
          isLineSelected = true;
        }

        const isSelected = isLineSelected && getCurrSelection(id).isInDragSelection(id);

        const singleWord = <SingleWord
          id={id} lyricElement={l} key={id}
          isSelected={isSelected}
          onLyricElementChange={onLyricElementChange}
          onMouseDown={onElementMouseDown}
          onMouseOver={onElementMouseOver}
        />;
        if (l.obj.text === '\n') {
          return (
            <Fragment key={id}>
              {singleWord}
              <div className='line-break' key={id + 'lb'} />
            </Fragment>
          );
        }
        return singleWord;
      })}
    </div>
  );
}
