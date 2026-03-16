import React, { Fragment, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import SingleWord from './SingleWord';
import './LyricPanel.css';
import { DragSelection, LyricElement } from './types';
import { Button, Dropdown, Toast } from '@douyinfe/semi-ui';
import { furiStringToList, getCurrentTimetagCount, getFuriAsString, getMaxTimetagCount, parseRawLyrics } from './lrc';
import { IconDelete, IconPause, IconPlus, IconTriangleUp } from '@douyinfe/semi-icons';

type LyricPanelProps = {
  // rawLyrics: string,
  lyricState: [LyricElement[], React.Dispatch<React.SetStateAction<LyricElement[]>>]
  isPlaying: boolean,
}

export type LyricPanelRef = {
  onAudioTick: (isPlaying: boolean, time: number) => void,
}

type TimeTagStatus = 'idle' | 'past' | 'cursor' | 'future';
type TimeTagPosition = {
  elementIndex: number,
  timetagIndex: number,
  kind: 'normal' | 'stopper',
};

// TODO: optimization to make the lyrics array line-based
const LyricPanel = forwardRef(function LyricPanel(props: LyricPanelProps, ref: React.Ref<LyricPanelRef>) {
  const isPlaying = props.isPlaying;
  const mouseDownRef = useRef(false);
  const dragAnchorRef = useRef<number | null>(null);
  const [dragTo, setDragTo] = useState<[number] | null>(null);

  const [lyrics, setLyrics] = props.lyricState;

  // const [lineBreakPositions, setLineBreakPositions] = useState<number[]>([]);
  const lineBreakPositionsRef = useRef<number[]>([]);
  const [curSelectedLineNo, setCurSelectedLineNo] = useState(-1);

  const [kanaInput, setKanaInput] = useState(false);
  const [ctxMenuVisible, setCtxMenuVisible] = useState(false);
  const [ctxMenuPos, setCtxMenuPos] = useState({ x: 0, y: 0 });
  const [ctxMenuSelection, setCtxMenuSelection] = useState(new DragSelection());
  const [playModeCursor, setPlayModeCursor] = useState<number>(-1);
  const playbackTimeRef = useRef(0);

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
    if (lineBreakPositionsRef.current.length !== lbPos.length
      || lineBreakPositionsRef.current.some((v, i) => v !== lbPos[i])) {
      lineBreakPositionsRef.current = lbPos;
      resetSelectionStates();
    }
  }, [lyrics]);

  useEffect(() => {
    function mouseUpListener() {
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
    e.stopPropagation();
    if (e.button !== 0) {
      return;
    }
    if (mouseDownRef.current) return;
    mouseDownRef.current = true;
    const id = checkState(e.currentTarget.id);
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

  const timetagPositions = useMemo(() => {
    const positions: TimeTagPosition[] = [];
    lyrics.forEach((element, elementIndex) => {
      const timetagCount = getCurrentTimetagCount(element);
      for (let timetagIndex = 0; timetagIndex < timetagCount; timetagIndex++) {
        positions.push({ elementIndex, timetagIndex, kind: 'normal' });
      }
      if (element.hasStopper) {
        positions.push({ elementIndex, timetagIndex: -1, kind: 'stopper' });
      }
    });
    return positions;
  }, [lyrics]);

  const getTimetagPositionKey = useCallback((position: TimeTagPosition) => {
    return `${position.elementIndex}:${position.kind === 'stopper' ? 'stopper' : position.timetagIndex}`;
  }, []);

  const getNormalTimetagKey = useCallback((elementIndex: number, timetagIndex: number) => {
    return `${elementIndex}:${timetagIndex}`;
  }, []);

  const getStopperKey = useCallback((elementIndex: number) => {
    return `${elementIndex}:stopper`;
  }, []);

  const timetagIndexByPosition = useMemo(() => {
    const map = new Map<string, number>();
    timetagPositions.forEach((position, index) => {
      map.set(getTimetagPositionKey(position), index);
    });
    return map;
  }, [getTimetagPositionKey, timetagPositions]);

  useEffect(() => {
    if (timetagPositions.length === 0) {
      if (playModeCursor !== -1) {
        setPlayModeCursor(-1);
      }
      return;
    }
    if (playModeCursor > timetagPositions.length) {
      setPlayModeCursor(timetagPositions.length);
    }
    if (playModeCursor < 0 && timetagPositions.length > 0) {
      setPlayModeCursor(0);
    }
  }, [playModeCursor, timetagPositions.length]);

  const isTimetagAssigned = useCallback((elementIndex: number, timetagIndex: number) => {
    const element = lyrics[elementIndex];
    if (!element) {
      return false;
    }
    if (!element.furi) {
      return element.obj.duration.startTime !== undefined;
    }
    if (timetagIndex < 0 || timetagIndex >= element.furi.length) {
      return false;
    }
    return element.furi[timetagIndex].duration?.startTime !== undefined;
  }, [lyrics]);

  const isStopperAssigned = useCallback((elementIndex: number) => {
    const element = lyrics[elementIndex];
    if (!element || !element.hasStopper) {
      return false;
    }
    return element.obj.duration.endTime !== undefined;
  }, [lyrics]);

  const timetagDebugRows = useMemo(() => {
    return timetagPositions.map((position, index) => {
      const element = lyrics[position.elementIndex];
      const isAssigned = position.kind === 'stopper'
        ? isStopperAssigned(position.elementIndex)
        : isTimetagAssigned(position.elementIndex, position.timetagIndex);
      const assignedTime = !isAssigned
        ? undefined
        : (position.kind === 'stopper'
          ? element.obj.duration.endTime
          : (element.furi
            ? element.furi[position.timetagIndex]?.duration?.startTime
            : element.obj.duration.startTime));
      return {
        globalIndex: index,
        elementIndex: position.elementIndex,
        timetagIndex: position.timetagIndex,
        kind: position.kind,
        text: element.obj.text,
        assignedTime,
        isAssigned,
      };
    });
  }, [isStopperAssigned, isTimetagAssigned, lyrics, timetagPositions]);

  const assignCurrentCursorTime = useCallback(() => {
    if (playModeCursor < 0 || playModeCursor >= timetagPositions.length) {
      return;
    }
    const target = timetagPositions[playModeCursor];
    const currentTime = playbackTimeRef.current;
    setLyrics((prev) => {
      const oldElement = prev[target.elementIndex];
      if (!oldElement) {
        return prev;
      }
      const next = [...prev];
      if (target.kind === 'stopper') {
        next[target.elementIndex] = {
          ...oldElement,
          obj: {
            ...oldElement.obj,
            duration: {
              ...oldElement.obj.duration,
              endTime: currentTime,
            },
          },
        };
      } else if (oldElement.furi && target.timetagIndex < oldElement.furi.length) {
        const nextFuri = [...oldElement.furi];
        const oldTimedObject = nextFuri[target.timetagIndex];
        nextFuri[target.timetagIndex] = {
          ...oldTimedObject,
          duration: {
            ...(oldTimedObject.duration ?? {}),
            startTime: currentTime,
          },
        };
        next[target.elementIndex] = {
          ...oldElement,
          furi: nextFuri,
        };
      } else {
        next[target.elementIndex] = {
          ...oldElement,
          obj: {
            ...oldElement.obj,
            duration: {
              ...oldElement.obj.duration,
              startTime: currentTime,
            },
          },
        };
      }
      return next;
    });
    setPlayModeCursor((prev) => {
      if (prev < 0 || timetagPositions.length === 0) {
        return prev;
      }
      return Math.min(prev + 1, timetagPositions.length);
    });
  }, [playModeCursor, setLyrics, timetagPositions]);

  const clearCurrentCursorTime = useCallback(() => {
    if (timetagPositions.length === 0 || playModeCursor < 0) {
      return;
    }

    const targetIndex = playModeCursor >= timetagPositions.length
      ? timetagPositions.length - 1
      : playModeCursor;
    const target = timetagPositions[targetIndex];

    setLyrics((prev) => {
      const oldElement = prev[target.elementIndex];
      if (!oldElement) {
        return prev;
      }

      const next = [...prev];
      if (target.kind === 'stopper') {
        next[target.elementIndex] = {
          ...oldElement,
          obj: {
            ...oldElement.obj,
            duration: {
              ...oldElement.obj.duration,
              endTime: undefined,
            },
          },
        };
      } else if (oldElement.furi && target.timetagIndex < oldElement.furi.length) {
        const nextFuri = [...oldElement.furi];
        const oldTimedObject = nextFuri[target.timetagIndex];
        nextFuri[target.timetagIndex] = {
          ...oldTimedObject,
          duration: oldTimedObject.duration
            ? {
              ...oldTimedObject.duration,
              startTime: undefined,
            }
            : undefined,
        };
        next[target.elementIndex] = {
          ...oldElement,
          furi: nextFuri,
        };
      } else {
        next[target.elementIndex] = {
          ...oldElement,
          obj: {
            ...oldElement.obj,
            duration: {
              ...oldElement.obj.duration,
              startTime: undefined,
            },
          },
        };
      }
      return next;
    });

    setPlayModeCursor(Math.max(targetIndex - 1, 0));
  }, [playModeCursor, setLyrics, timetagPositions]);

  const onPlayModeTimetagClick = useCallback((elementIndex: number, timetagIndex: number) => {
    const idx = timetagIndexByPosition.get(getNormalTimetagKey(elementIndex, timetagIndex));
    if (idx === undefined) {
      return;
    }
    setPlayModeCursor(idx);
  }, [getNormalTimetagKey, timetagIndexByPosition]);

  const onStopperClick = useCallback((elementIndex: number) => {
    const idx = timetagIndexByPosition.get(getStopperKey(elementIndex));
    if (idx === undefined) {
      return;
    }
    setPlayModeCursor(idx);
  }, [getStopperKey, timetagIndexByPosition]);

  const getTimetagStatus = useCallback((elementIndex: number, timetagIndex: number): TimeTagStatus => {
    const idx = timetagIndexByPosition.get(getNormalTimetagKey(elementIndex, timetagIndex));
    if (idx === undefined) {
      return 'future';
    }
    if (playModeCursor >= 0 && playModeCursor < timetagPositions.length && idx === playModeCursor) {
      return 'cursor';
    }
    if (isTimetagAssigned(elementIndex, timetagIndex)) {
      return 'past';
    }
    return 'future';
  }, [getNormalTimetagKey, isTimetagAssigned, playModeCursor, timetagIndexByPosition, timetagPositions.length]);

  const getStopperStatus = useCallback((elementIndex: number): TimeTagStatus => {
    const idx = timetagIndexByPosition.get(getStopperKey(elementIndex));
    if (idx === undefined) {
      return 'future';
    }
    if (playModeCursor >= 0 && playModeCursor < timetagPositions.length && idx === playModeCursor) {
      return 'cursor';
    }
    if (isStopperAssigned(elementIndex)) {
      return 'past';
    }
    return 'future';
  }, [getStopperKey, isStopperAssigned, playModeCursor, timetagIndexByPosition, timetagPositions.length]);

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

  // Stable ref so onWordContextMenu doesn't change every time dragTo changes
  const getCurrSelectionRef = useRef(getCurrSelection);
  useEffect(() => { getCurrSelectionRef.current = getCurrSelection; }, [getCurrSelection]);

  const onWordContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const id = checkState(e.currentTarget.id);
    const currSel = getCurrSelectionRef.current();
    let sel: DragSelection;
    if (!currSel.isValid() || !currSel.isInDragSelection(id)) {
      sel = new DragSelection(id, id);
      dragAnchorRef.current = id;
      setDragTo([id]);
      let lineNo = -1;
      let i = 0;
      for (; i < lineBreakPositionsRef.current.length; i++) {
        if (lineBreakPositionsRef.current[i] < id) continue;
        lineNo = i;
        break;
      }
      if (lineNo === -1) lineNo = i;
      setCurSelectedLineNo(lineNo);
    } else {
      sel = currSel.clone();
    }
    setCtxMenuSelection(sel);
    setCtxMenuPos({ x: e.clientX, y: e.clientY });
    setCtxMenuVisible(true);
  }, []);

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
        },
      },
      furi: selectedLrcs.map(e => e.furi
        ? e.furi
        : {
          text: e.obj.text,
          duration: e.obj.duration.startTime === undefined && e.obj.duration.endTime === undefined
            ? undefined
            : { ...e.obj.duration }
        }).flat(),
      hasTimeTag: selectedLrcs[0].hasTimeTag || selectedLrcs[selectedLrcs.length - 1].hasTimeTag,
      hasStopper: selectedLrcs[selectedLrcs.length - 1].hasStopper,
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

  const validateOnlyOneSelection = (currSelection: DragSelection) => {
    if (!currSelection.isValid()) {
      Toast.error('No selection!');
      return false;
    }
    if (currSelection.length !== 1) {
      Toast.error('Please select just one element!');
      return false;
    }
    return true;
  };

  const isNavigableIndex = useCallback((index: number) => {
    return index >= 0 && index < lyrics.length && lyrics[index].obj.text !== '\n';
  }, [lyrics]);

  const findLineNoByIndex = useCallback((index: number) => {
    let lineNo = 0;
    while (lineNo < lineBreakPositionsRef.current.length && lineBreakPositionsRef.current[lineNo] < index) {
      lineNo += 1;
    }
    return lineNo;
  }, []);

  const getLineNavigableBounds = useCallback((lineNo: number) => {
    if (lineNo < 0 || lineNo > lineBreakPositionsRef.current.length) {
      return { start: -1, end: -1 };
    }
    const start = lineNo === 0 ? 0 : lineBreakPositionsRef.current[lineNo - 1] + 1;
    const lineEndIncludingBreak = lineNo < lineBreakPositionsRef.current.length
      ? lineBreakPositionsRef.current[lineNo]
      : lyrics.length;
    const end = lineEndIncludingBreak - 1;
    return { start, end };
  }, [lyrics.length]);

  const findNextNavigableIndex = useCallback((from: number, step: 1 | -1) => {
    let idx = from + step;
    while (idx >= 0 && idx < lyrics.length) {
      if (isNavigableIndex(idx)) {
        return idx;
      }
      idx += step;
    }
    return null;
  }, [isNavigableIndex, lyrics.length]);

  const findClosestNavigableInLine = useCallback((lineNo: number, preferredColumn: number) => {
    const { start, end } = getLineNavigableBounds(lineNo);
    if (start > end) {
      return null;
    }
    const target = start + preferredColumn;
    if (target <= start) {
      return start;
    }
    if (target >= end) {
      return end;
    }
    return target;
  }, [getLineNavigableBounds]);

  const setSingleSelection = useCallback((index: number) => {
    if (!isNavigableIndex(index)) {
      return;
    }
    dragAnchorRef.current = index;
    setDragTo([index]);
    setCurSelectedLineNo(findLineNoByIndex(index));
  }, [findLineNoByIndex, isNavigableIndex]);

  const getKeyboardAnchor = useCallback((key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => {
    const currSelection = getCurrSelection();
    if (currSelection.isValid()) {
      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        return currSelection.smaller;
      }
      return currSelection.bigger;
    }
    return lyrics.findIndex((e) => e.obj.text !== '\n');
  }, [getCurrSelection, lyrics]);

  const moveSelectionByArrow = useCallback((key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => {
    const anchor = getKeyboardAnchor(key);
    if (anchor === null || anchor < 0) {
      return false;
    }
    let nextIndex: number | null = null;
    if (key === 'ArrowLeft') {
      nextIndex = findNextNavigableIndex(anchor, -1);
    } else if (key === 'ArrowRight') {
      nextIndex = findNextNavigableIndex(anchor, 1);
    } else {
      const currentLine = findLineNoByIndex(anchor);
      const { start: currStart } = getLineNavigableBounds(currentLine);
      const preferredColumn = Math.max(0, anchor - currStart);
      const step = key === 'ArrowUp' ? -1 : 1;
      let targetLine = currentLine + step;
      while (targetLine >= 0 && targetLine <= lineBreakPositionsRef.current.length) {
        nextIndex = findClosestNavigableInLine(targetLine, preferredColumn);
        if (nextIndex !== null) {
          break;
        }
        targetLine += step;
      }
    }
    if (nextIndex === null) {
      nextIndex = anchor;
    }
    setSingleSelection(nextIndex);
    return true;
  }, [findClosestNavigableInLine, findLineNoByIndex, findNextNavigableIndex, getKeyboardAnchor, getLineNavigableBounds, setSingleSelection]);

  const onSplitBtnClick = () => {
    const currSelection = getCurrSelection();
    if (!validateOnlyOneSelection(currSelection)) {
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
        },
      },
      furi: undefined,
      hasTimeTag: false,
      hasStopper: false,
    }));
    newLyrics[0].hasTimeTag = selectedLrc.obj.duration.startTime !== undefined;
    newLyrics[0].obj.duration.startTime = selectedLrc.obj.duration.startTime;
    newLyrics[0].furi = selectedLrc.furi;
    newLyrics[newLyrics.length - 1].hasTimeTag = selectedLrc.obj.duration.endTime !== undefined;
    newLyrics[newLyrics.length - 1].obj.duration.endTime = selectedLrc.obj.duration.endTime;
    setLyrics([
      ...lyrics.slice(undefined, currSelection.smaller),
      ...newLyrics,
      ...lyrics.slice(currSelection.smaller + 1)
    ]);
  };

  const onCtxMerge = () => {
    setCtxMenuVisible(false);
    if (!ctxMenuSelection.isValid() || ctxMenuSelection.length < 2) return;
    const selectedLrcs = lyrics.slice(ctxMenuSelection.smaller, ctxMenuSelection.bigger + 1);
    resetSelectionStates();
    const mergedObj: LyricElement = {
      obj: {
        text: selectedLrcs.reduce((prev, curr) => prev + curr.obj.text, ''),
        duration: {
          startTime: selectedLrcs[0].obj.duration.startTime,
          endTime: selectedLrcs[selectedLrcs.length - 1].obj.duration.endTime,
        },
      },
      furi: selectedLrcs.map(e => e.furi
        ? e.furi
        : {
          text: e.obj.text,
          duration: e.obj.duration.startTime === undefined && e.obj.duration.endTime === undefined
            ? undefined
            : { ...e.obj.duration },
        }).flat(),
      hasTimeTag: selectedLrcs[0].hasTimeTag || selectedLrcs[selectedLrcs.length - 1].hasTimeTag,
      hasStopper: selectedLrcs[selectedLrcs.length - 1].hasStopper,
    };
    setLyrics([
      ...lyrics.slice(undefined, ctxMenuSelection.smaller),
      mergedObj,
      ...lyrics.slice(ctxMenuSelection.bigger + 1),
    ]);
  };

  const onCtxSplit = () => {
    setCtxMenuVisible(false);
    if (!ctxMenuSelection.isValid() || ctxMenuSelection.length !== 1) return;
    const selectedLrc = lyrics[ctxMenuSelection.smaller];
    if ([...selectedLrc.obj.text].length <= 1) return;
    resetSelectionStates();
    const newSplitLyrics: LyricElement[] = [...selectedLrc.obj.text].map((ch) => ({
      obj: { text: ch, duration: { startTime: undefined, endTime: undefined } },
      furi: undefined,
      hasTimeTag: false,
      hasStopper: false,
    }));
    newSplitLyrics[0].hasTimeTag = selectedLrc.obj.duration.startTime !== undefined;
    newSplitLyrics[0].obj.duration.startTime = selectedLrc.obj.duration.startTime;
    newSplitLyrics[0].furi = selectedLrc.furi;
    newSplitLyrics[newSplitLyrics.length - 1].hasTimeTag = selectedLrc.obj.duration.endTime !== undefined;
    newSplitLyrics[newSplitLyrics.length - 1].obj.duration.endTime = selectedLrc.obj.duration.endTime;
    setLyrics([
      ...lyrics.slice(undefined, ctxMenuSelection.smaller),
      ...newSplitLyrics,
      ...lyrics.slice(ctxMenuSelection.smaller + 1),
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
    const currSelection = getCurrSelection();
    if (currSelection.isValid()) {
      setLyrics(lyrics.map((e, id) => {
        if (id >= currSelection.smaller && id <= currSelection.bigger) {
          return {
            obj: e.obj,
            furi: undefined,
            hasTimeTag: e.hasTimeTag,
            hasStopper: e.hasStopper,
          };
        }
        return e;
      }));
    } else {
      setLyrics(lyrics.map(e => {
        return {
          obj: e.obj,
          furi: undefined,
          hasTimeTag: e.hasTimeTag,
          hasStopper: e.hasStopper,
        };
      }));
    }
    resetSelectionStates();
  };

  const onInsertTimetagBtnClick = () => {
    const currSelection = getCurrSelection();
    if (!validateOnlyOneSelection(currSelection))
      return;
    const selectedElem = { ...lyrics[currSelection.smaller] };
    if (selectedElem.furi === undefined) {
      if (getCurrentTimetagCount(selectedElem) >= 1) {
        Toast.error('At most one timetag can be added to the element without furi.');
        return;
      }
    } else {
      // this operation will lose time information on furi
      if (getCurrentTimetagCount(selectedElem) >= getMaxTimetagCount(selectedElem)) {
        Toast.error('Number of timetags cannot exceed furi length.');
        return;
      }
      selectedElem.furi = furiStringToList(
        getFuriAsString(selectedElem),
        getCurrentTimetagCount(selectedElem) + 1);
    }
    selectedElem.hasTimeTag = true;
    setLyrics([
      ...lyrics.slice(undefined, currSelection.smaller),
      selectedElem,
      ...lyrics.slice(currSelection.smaller + 1)
    ]);
  };

  const onDeleteTimetagBtnClick = () => {
    const currSelection = getCurrSelection();
    if (!validateOnlyOneSelection(currSelection))
      return;
    const selectedElem = { ...lyrics[currSelection.smaller] };
    const currentTimetagCount = getCurrentTimetagCount(selectedElem);
    if (selectedElem.furi === undefined) {
      if (currentTimetagCount === 0) {
        return;
      }
      selectedElem.hasTimeTag = false;
    } else {
      if (currentTimetagCount === 0) {
        return;
      }
      if (currentTimetagCount === 1) {
        selectedElem.hasTimeTag = false;
      }
      selectedElem.furi = furiStringToList(
        getFuriAsString(selectedElem),
        currentTimetagCount - 1);
    }
    setLyrics([
      ...lyrics.slice(undefined, currSelection.smaller),
      selectedElem,
      ...lyrics.slice(currSelection.smaller + 1)
    ]);
  };

  const onLyricPanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLDivElement).id !== 'lyric-panel')
      return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const moved = moveSelectionByArrow(e.key);
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    if (!isPlaying) {
      switch (e.key) {
        default:
          return;
        case ' ':
          onInsertTimetagBtnClick();
          break;
        case 'Backspace':
        case 'Delete':
          onDeleteTimetagBtnClick();
          break;
      }
    } else {
      switch (e.key) {
        case ' ':
          assignCurrentCursorTime();
          break;
        case 'Backspace':
          clearCurrentCursorTime();
          break;
        default:
          return;
      }
    }
    e.preventDefault();
    e.stopPropagation();
  };

  useImperativeHandle(ref, () => ({
    onAudioTick: (_isPlaying: boolean, time: number) => {
      void _isPlaying;
      playbackTimeRef.current = time;
    }
  }), []);

  const currSelection = getCurrSelection();

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
            <Dropdown.Item onClick={onInsertTimetagBtnClick}><IconPlus />Insert Timetag</Dropdown.Item>
            <Dropdown.Item onClick={onDeleteTimetagBtnClick}><IconDelete />Delete Timetag</Dropdown.Item>
            <Dropdown.Title><IconPause size='extra-small' /> Stopper</Dropdown.Title>
            <Dropdown.Item><IconPlus />Add Stopper</Dropdown.Item>
            <Dropdown.Item><IconDelete />Delete Stopper</Dropdown.Item>
          </Dropdown.Menu>
        }>
        <Button>Timetag Operations</Button>
      </Dropdown>
      <Button>Edit Mode</Button>
      <Button onClick={() => setKanaInput(!kanaInput)} theme={kanaInput ? 'solid' : 'light'}>
        Kana Input: {kanaInput ? 'ON' : 'OFF'}
      </Button>
    </div>
    <div className='lyric-panel' tabIndex={0} id='lyric-panel'
      onMouseDown={mouseDownListener}
      onKeyDown={onLyricPanelKeyDown}
      onContextMenu={(e) => e.preventDefault()}>
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

        const isSelected = isLineSelected && currSelection.isInDragSelection(id);

        const singleWord = <SingleWord
          id={id} lyricElement={l} key={id}
          isSelected={isSelected}
          isLast={id === lyrics.length - 1}
          kanaInput={kanaInput}
          isPlayMode={isPlaying}
          getTimetagStatus={getTimetagStatus}
          onTimetagClick={onPlayModeTimetagClick}
          getStopperStatus={getStopperStatus}
          onStopperClick={onStopperClick}
          onLyricElementChange={onLyricElementChange}
          onMouseDown={onElementMouseDown}
          onMouseOver={onElementMouseOver}
          onContextMenu={onWordContextMenu}
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
    <div className='timetag-debug-window'>
      <div className='timetag-debug-title'>Timetag Debug</div>
      <div className='timetag-debug-list'>
        {timetagDebugRows.map((row) => {
          const isCursor = row.globalIndex === playModeCursor;
          const assignedText = row.assignedTime === undefined ? '-' : row.assignedTime.toFixed(3);
          return (
            <div
              key={`debug-${row.globalIndex}`}
              className={'timetag-debug-row'
                + (isCursor ? ' cursor' : '')
                + (row.isAssigned ? ' assigned' : ' unassigned')}
            >
              #{row.globalIndex} E{row.elementIndex} {row.kind === 'stopper' ? 'S' : `T${row.timetagIndex}`} "{row.text}" = {assignedText}
            </div>
          );
        })}
      </div>
    </div>
    {ctxMenuVisible && <>
      <div className='ctx-menu-backdrop' onMouseDown={() => setCtxMenuVisible(false)} />
      <div
        className='ctx-menu'
        style={{ top: ctxMenuPos.y, left: ctxMenuPos.x }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div
          className={'ctx-menu-item' + (!ctxMenuSelection.isValid() || ctxMenuSelection.length < 2 ? ' disabled' : '')}
          onClick={onCtxMerge}
        >
          Merge
        </div>
        <div
          className={'ctx-menu-item' + (
            !ctxMenuSelection.isValid() || ctxMenuSelection.length !== 1
              || [...(lyrics[ctxMenuSelection.smaller]?.obj.text ?? '')].length <= 1
              ? ' disabled' : ''
          )}
          onClick={onCtxSplit}
        >
          Split
        </div>
      </div>
    </>}
  </>) : <></>;
});

export default LyricPanel;
