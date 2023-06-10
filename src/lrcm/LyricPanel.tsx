import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import SingleWord from './SingleWord';
import './LyricPanel.css';
import { DragSelection, LyricElement, TimedObject } from './types';
import { Button, Dropdown, Toast } from '@douyinfe/semi-ui';
import { parseRawLyrics } from './lrc';
import { IconCaretup, IconDelete, IconPause, IconPlus, IconTriangleUp } from '@douyinfe/semi-icons';

type LyricPanelProps = {
  // rawLyrics: string,
  lyricState: [LyricElement[], React.Dispatch<React.SetStateAction<LyricElement[]>>]
}

// TODO: optimization to make the lyrics array line-based

export default function LyricPanel(props: LyricPanelProps) {
  const mouseDownRef = useRef(false);
  const dragAnchorRef = useRef<number | null>(null);
  const lyricsRef = useRef<LyricElement[]>([]);
  const [dragTo, setDragTo] = useState<[number] | null>(null);

  const [lyrics, setLyrics] = props.lyricState;

  // const [lineBreakPositions, setLineBreakPositions] = useState<number[]>([]);
  const lineBreakPositionsRef = useRef<number[]>([]);
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
    // setLineBreakPositions(lbPos);
    lineBreakPositionsRef.current = lbPos;
    resetSelectionStates();
  }, [lyrics]);

  useEffect(() => {
    function mouseUpListener(e: MouseEvent) {
      e.stopPropagation();
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
    // BUG: clicking on the last dragged item doesn't work
    if (mouseDownRef.current) return;
    e.stopPropagation();
    mouseDownRef.current = true;
    const id = checkState(e.currentTarget.id);
    console.log(id);
    let lineNo = -1;
    if ((lineNo = lineBreakPositionsRef.current.indexOf(id)) >= 0) {
      setCurSelectedLineNo(lineNo);
      dragAnchorRef.current = id;
      setDragTo([id]);
      return;
    }
    // find the line #
    let i = 0;
    for (; i < lineBreakPositionsRef.current.length; i++) {
      if (lineBreakPositionsRef.current[i] < id)
        continue;
      lineNo = i;
      break;
    }
    if (lineNo === -1) lineNo = i;
    setCurSelectedLineNo(lineNo);
    dragAnchorRef.current = id;
    setDragTo([id]);
  }, []);

  const onElementMouseOver = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mouseDownRef.current || dragAnchorRef.current === null) return;
    const id = checkState(e.currentTarget.id);
    if (dragAnchorRef.current === id) {
      return;
    }
    if (lineBreakPositionsRef.current.indexOf(dragAnchorRef.current) >= 0) {
      resetSelectionStates();
      return;
    }
    setDragTo([id]);
  }, []);

  const onLyricElementChange = useCallback((e: LyricElement, id: number) => {
    setLyrics((prev) => [...prev.slice(undefined, id), e, ...prev.slice(id + 1)]);
  }, [setLyrics]);

  const getCurrSelection = useCallback(() => {
    if (dragAnchorRef.current === null || dragTo === null) {
      return new DragSelection();
    }
    if (dragAnchorRef.current === dragTo[0]) {
      return new DragSelection(dragAnchorRef.current, dragTo[0]);
    }
    const dragFrom = dragAnchorRef.current;
    const smaller = dragTo[0] < dragFrom ? dragTo[0] : dragFrom;
    const bigger = dragTo[0] === smaller ? dragFrom : dragTo[0];
    for (const lbPos of lineBreakPositionsRef.current) {
      if (lbPos > bigger)
        break;
      if (lbPos < smaller)
        continue;
      return new DragSelection();
    }
    return new DragSelection(dragAnchorRef.current, dragTo[0]);
  }, [dragTo]);

  const mouseDownListener = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    resetSelectionStates();
  };

  // TODO: add merge options: separator, merge english only
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
      furi: selectedLrcs.map(e => e.furi ? e.furi : { text: e.obj.text, duration: { ...e.obj.duration } }).flat(),
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

  const onSplitBtnClick = () => {
    const currSelection = getCurrSelection();
    if (!currSelection.isValid()) {
      Toast.error('No selection!');
      return;
    }
    if (currSelection.length !== 1) {
      Toast.error('Please select at just one element to split');
      return;
    }
    const selectedLrc = lyrics[currSelection.smaller];
    resetSelectionStates();
    const newLyrics: LyricElement[] = [...selectedLrc.obj.text].map((e) => ({
      obj: {
        text: e,
        duration: {
          startTime: undefined,
          endTime: undefined,
        }
      },
      furi: undefined
    }));
    newLyrics[0].obj.duration.startTime = selectedLrc.obj.duration.startTime;
    newLyrics[0].furi = selectedLrc.furi;
    newLyrics[newLyrics.length - 1].obj.duration.endTime = selectedLrc.obj.duration.endTime;
    setLyrics([
      ...lyrics.slice(undefined, currSelection.smaller),
      ...newLyrics,
      ...lyrics.slice(currSelection.smaller + 1)
    ]);
  };

  const onLoadFuriBtnClick = () => {
    const currSelection = getCurrSelection();
    if (currSelection.isValid()) {
      const l = lyrics.slice(undefined, currSelection.smaller);
      const r = lyrics.slice(currSelection.bigger + 1);
      setLyrics([
        ...l,
        ...parseRawLyrics(lyrics.slice(currSelection.smaller, currSelection.bigger + 1).map(e => e.obj.text).join('')),
        ...r
      ]);
    } else {
      setLyrics(parseRawLyrics(lyrics.map(e => e.obj.text).join('')));
    }
    resetSelectionStates();
  };

  const onClearFuriBtnClick = () => {
    if (getCurrSelection().isValid()) {
      setLyrics(lyrics.map((e, id) => {
        if (id >= getCurrSelection().smaller && id <= getCurrSelection().bigger) {
          return {
            obj: e.obj,
            furi: undefined,
          };
        }
        return e;
      }));
    } else {
      setLyrics(lyrics.map(e => {
        return {
          obj: e.obj,
          furi: undefined,
        };
      }));
    }
    resetSelectionStates();
  };

  return lyrics.length > 0 ? (<>
    <div className='lyric-toolbar'>
      <Button onClick={onMergeBtnClick}>Merge</Button>
      <Button onClick={onSplitBtnClick}>Split</Button>
      <Button onClick={onLoadFuriBtnClick}>Load Furi</Button>
      <Button onClick={onClearFuriBtnClick}>Clear Furi</Button>
      <Dropdown
        render={
          <Dropdown.Menu>
            <Dropdown.Title><IconTriangleUp size='extra-small' /> Timetag</Dropdown.Title>
            <Dropdown.Item><IconPlus />Insert Timetag</Dropdown.Item>
            <Dropdown.Item><IconDelete />Delete Timetag</Dropdown.Item>
            <Dropdown.Title><IconPause size='extra-small' /> Stopper</Dropdown.Title>
            <Dropdown.Item><IconPlus />Add Stopper</Dropdown.Item>
            <Dropdown.Item><IconDelete />Delete Stopper</Dropdown.Item>
          </Dropdown.Menu>
        }>
        <Button>Timetag Operations</Button>
      </Dropdown>
      <Button>Edit Mode</Button>
    </div>
    <div className='lyric-panel' onMouseDown={mouseDownListener}>
      {lyrics.map((l, id) => {
        let isLineSelected = false;
        if (curSelectedLineNo === 0 && id <= lineBreakPositionsRef.current[curSelectedLineNo]) {
          isLineSelected = true;
        } else if (curSelectedLineNo === lineBreakPositionsRef.current.length
          && id > lineBreakPositionsRef.current[curSelectedLineNo - 1]
        ) {
          isLineSelected = true;
        } else if (id > lineBreakPositionsRef.current[curSelectedLineNo - 1]
          && id <= lineBreakPositionsRef.current[curSelectedLineNo]
        ) {
          isLineSelected = true;
        }

        const isSelected = isLineSelected && getCurrSelection().isInDragSelection(id);

        const singleWord = <SingleWord
          id={id} lyricElement={l} key={id}
          isSelected={isSelected}
          isLast={id === lyrics.length - 1}
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
