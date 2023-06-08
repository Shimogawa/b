import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import SingleWord from './SingleWord';
import './LyricPanel.css';
import { DragSelection, LyricElement, TimedObject } from './types';
import { Button, Toast } from '@douyinfe/semi-ui';

type LyricPanelProps = {
  // rawLyrics: string,
  lyricState: [LyricElement[], React.Dispatch<React.SetStateAction<LyricElement[]>>]
}

// TODO: optimization to make the lyrics array line-based

export default function LyricPanel(props: LyricPanelProps) {
  const mouseDownRef = useRef(false);
  const dragAnchorRef = useRef<number | null>(null);
  const [dragTo, setDragTo] = useState<number | null>(null);

  const [lyrics, setLyrics] = props.lyricState;

  const [lineBreakPositions, setLineBreakPositions] = useState<number[]>([]);
  const [curSelectedLineNo, setCurSelectedLineNo] = useState(-1);

  const resetSelectionStates = () => {
    mouseDownRef.current = false;
    setCurSelectedLineNo(-1);
    dragAnchorRef.current = null;
    setDragTo(null);
  };

  useEffect(() => {
    const lbPos: number[] = [];
    lyrics.forEach((e, i) => { if (e.obj.text === '\n') lbPos.push(i); });
    setLineBreakPositions(lbPos);
    resetSelectionStates();
  }, [lyrics]);

  useEffect(() => {
    function mouseUpListener(e: MouseEvent) {
      e.stopPropagation();
      console.log('mouse up');
      mouseDownRef.current = false;
      // dragAnchorRef.current = null;
    }
    document.addEventListener('mouseup', mouseUpListener);
    return () => {
      document.removeEventListener('mouseup', mouseUpListener);
    };
  }, []);

  const checkState = (id: string): number => {
    if (!id.startsWith('le-middle-'))
      throw new Error('bad state');
    const num = parseInt(id.substring(10));
    if (isNaN(num)) throw new Error(`bad id: check code -> ${id} to ${num}`);
    return num;
  };

  const onElementMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mouseDownRef.current) return;
    e.stopPropagation();
    mouseDownRef.current = true;
    const id = checkState(e.currentTarget.id);
    let lineNo = -1;
    if ((lineNo = lineBreakPositions.indexOf(id)) >= 0) {
      console.log('line break');
      setCurSelectedLineNo(lineNo);
      dragAnchorRef.current = id;
      setDragTo(id);
      return;
    }
    // find the line #
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
    console.log('mouse over');
    if (!mouseDownRef.current || !dragAnchorRef.current) return;
    const id = checkState(e.currentTarget.id);
    if (dragAnchorRef.current === id) {
      return;
    }
    if (lineBreakPositions.indexOf(id) >= 0) {
      setDragTo(null);
      return;
    }
    if (lineBreakPositions.indexOf(dragAnchorRef.current) >= 0) {
      resetSelectionStates();
      return;
    }
    setDragTo(id);
  }, [lineBreakPositions]);

  const onLyricElementChange = useCallback((e: LyricElement, id: number) => {
    setLyrics([...lyrics.slice(undefined, id), e, ...lyrics.slice(id + 1)]);
  }, [lyrics, setLyrics]);

  const getCurrSelection = useCallback(() => {
    if (dragAnchorRef.current === null || dragTo === null) {
      return new DragSelection();
    }
    if (dragAnchorRef.current === dragTo) {
      return new DragSelection(dragAnchorRef.current, dragTo);
    }
    const dragFrom = dragAnchorRef.current;
    const smaller = dragTo < dragFrom ? dragTo : dragFrom;
    const bigger = dragTo === smaller ? dragFrom : dragTo;
    for (const lbPos of lineBreakPositions) {
      if (lbPos > bigger)
        break;
      if (lbPos < smaller)
        continue;
      return new DragSelection();
    }
    return new DragSelection(dragAnchorRef.current, dragTo);
  }, [dragTo, lineBreakPositions]);

  const mouseDownListener = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    console.log('mouse down outside');
    resetSelectionStates();
  };

  const onMergeBtnClick = () => {
    const selection = getCurrSelection();
    if (!selection.isValid()) {
      Toast.error('No selection!');
      return;
    }
    if (selection.length < 2) {
      Toast.error('Please select more than one element to merge');
      return;
    }
    const selectedLrcs = lyrics.slice(selection.smaller, selection.bigger + 1);
    resetSelectionStates();
    const mergedObj: LyricElement = {
      obj: {
        text: selectedLrcs.reduce((prev, curr) => prev + curr.obj.text, ''),
        duration: {
          startTime: selectedLrcs[0].obj.duration.startTime,
          endTime: selectedLrcs[selectedLrcs.length - 1].obj.duration.endTime,
        }
      },
      furi: selectedLrcs.map(e => e.furi).filter(e => e !== undefined).flat() as TimedObject[],
    };
    // console.log(mergedObj);

    const newLyrics = [
      ...lyrics.slice(undefined, selection.smaller),
      mergedObj,
      ...lyrics.slice(selection.bigger + 1)
    ];
    // console.log(newLyrics);
    // return;
    setLyrics(newLyrics);
  };

  return lyrics.length > 0 ? (<>
    <div>
      <Button onClick={onMergeBtnClick}>Merge</Button>
    </div>
    <div className='lyric-panel' onMouseDown={mouseDownListener}>
      {lyrics.map((l, id) => {

        let isLineSelected = false;
        if (curSelectedLineNo === 0 && id <= lineBreakPositions[curSelectedLineNo]) {
          isLineSelected = true;
        } else if (curSelectedLineNo === lineBreakPositions.length && id > lineBreakPositions[curSelectedLineNo]) {
          isLineSelected = true;
        } else if (id > lineBreakPositions[curSelectedLineNo - 1] && id <= lineBreakPositions[curSelectedLineNo]) {
          isLineSelected = true;
        }

        const isSelected = isLineSelected && getCurrSelection().isInDragSelection(id);

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
  </>) : <></>;
}
