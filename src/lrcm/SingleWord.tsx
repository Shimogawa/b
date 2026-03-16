import React, { useCallback, useEffect, useState } from 'react';
import './SingleWord.css';
import { Input, Popconfirm } from '@douyinfe/semi-ui';
import { LyricElement } from './types';
import { IconArrowDown, IconCaretup, IconPause } from '@douyinfe/semi-icons';
import { furiStringToList, getCurrentTimetagCount } from './lrc';
import * as wanakana from 'wanakana';

const lyricElementEqualWithoutDuration = (a: LyricElement, b: LyricElement) => {
  if (a.obj.text !== b.obj.text
    || a.hasTimeTag !== b.hasTimeTag
    || a.hasStopper !== b.hasStopper
    || a.furi?.length !== b.furi?.length)
    return false;
  if (a.furi && b.furi) {
    for (let i = 0; i < a.furi.length; i++) {
      if (a.furi[i].text !== b.furi[i].text) return false;
    }
  }
  return true;
};

type SingleWordProps = {
  id: number
  lyricElement: LyricElement,
  // isSelected: boolean,
  isSelected: boolean,
  isLast: boolean,
  kanaInput: boolean,
  isPlayMode: boolean,
  getTimetagStatus: (elementIndex: number, timetagIndex: number) => 'idle' | 'past' | 'cursor' | 'future',
  onTimetagClick: (elementIndex: number, timetagIndex: number) => void,
  getStopperStatus: (elementIndex: number) => 'idle' | 'past' | 'cursor' | 'future',
  onStopperClick: (elementIndex: number) => void,

  // hooks
  onLyricElementChange: (elem: LyricElement, id: number) => void,
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>,
  onMouseOver?: React.MouseEventHandler<HTMLDivElement>,
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>,
}

const SingleWord = React.memo(function SingleWord({
  id,
  lyricElement,
  onLyricElementChange,
  onMouseDown,
  onMouseOver,
  onContextMenu,
  isSelected,
  isLast,
  kanaInput,
  isPlayMode,
  getTimetagStatus,
  onTimetagClick,
  getStopperStatus,
  onStopperClick,
}: SingleWordProps) {
  // const furiInputRef = useRef<React.RefObject<HTMLInputElement>>();
  const [furiInput, setFuriInput] = useState(lyricElement.furi?.map(f => f.text).join('') || '');

  useEffect(() => {
    setFuriInput(lyricElement.furi?.map(f => f.text).join('') || '');
  }, [lyricElement.furi]);

  const onFuriConfirm = () => {
    onLyricElementChange(
      {
        ...lyricElement,
        // furi: furiStringToList(furiInputRef.current.current!.value),
        furi: furiStringToList(furiInput),
      }, id
    );
  };

  const processChar = (c: string) => {
    switch (c) {
      case ' ':
        return <>&nbsp;</>;
      case '\n':
        return <IconArrowDown />;
      default:
        return c;
    }
  };

  const getLowerTags = (lyricElement: LyricElement, hasStopper: boolean) => {
    const tags = [];
    if (!lyricElement.furi) {
      if (getCurrentTimetagCount(lyricElement) !== 0) {
        const status = getTimetagStatus(id, 0);
        tags.push(
          <IconCaretup
            key={`${id}-tag-0`}
            size="small"
            className={`timetag timetag-${status} clickable${isPlayMode ? ' playing' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onTimetagClick(id, 0);
            }}
          />
        );
      }
    } else {
      for (let i = 0; i < getCurrentTimetagCount(lyricElement); i++) {
        const status = getTimetagStatus(id, i);
        tags.push(
          <IconCaretup
            key={`${id}-tag-${i}`}
            size="small"
            className={`timetag timetag-${status} clickable${isPlayMode ? ' playing' : ''}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onTimetagClick(id, i);
            }}
          />
        );
      }
    }
    if (hasStopper) {
      const stopperStatus = getStopperStatus(id);
      tags.push(
        <IconPause
          key={`${id}-stopper`}
          size="extra-small"
          className={`stoptag timetag-${stopperStatus} clickable${isPlayMode ? ' playing' : ''}`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onStopperClick(id);
          }}
        />
      );
    }
    return tags;
  };

  const listenFuriInput = useCallback((s: string) => {
    setFuriInput(kanaInput ? wanakana.toKana(s, { IMEMode: true }) : s);
  }, [kanaInput]);

  return (<div className={'single-word' + (/\s/.test(lyricElement.obj.text) ? ' empty' : '')}>
    <Popconfirm
      title="Modify Furi"
      content={({ initialFocusRef }) => {
        // console.log(furiInput);
        // furiInputRef.current = initialFocusRef as RefObject<HTMLInputElement>;
        return <Input // TODO: confirm on press enter. Not provided for now, probably need to heck with getElementById
          ref={initialFocusRef as React.RefObject<HTMLInputElement>}
          value={furiInput}
          // defaultValue={lyricElement.furi?.map(f => f.text).join('')}
          onChange={listenFuriInput}
        />;
      }
      }
      onConfirm={onFuriConfirm}
      okText='OK'
      cancelText='Cancel'
    >
      <div className='upper' id={`le-upper-${id}`}>
        {lyricElement.furi && [...lyricElement.furi].map((c, i) => <span key={`${id}-furi-${i}`}>{c.text}</span>)}
      </div>
    </Popconfirm>
    <div
      id={`le-middle-${id}`}
      className={'middle' + (isSelected ? ' selected' : '')}
      onMouseOver={onMouseOver}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}>
      {[...lyricElement.obj.text].map((c, i) =>
        <span key={`${id}-text-${i}`}>
          {processChar(c)}
        </span>)}
    </div>
    <div className='lower' id={`le-lower-${id}`} style={{ fontSize: '12px' }}>
      {/* {[...lyricElement.obj.text].reduce((prev, cur) => prev + ' ' + cur.codePointAt(0)?.toString(16), '')} */}
      {getLowerTags(lyricElement, isLast)}
    </div>
  </div>);
}, (prev, next) => {
  return prev.id === next.id
    && lyricElementEqualWithoutDuration(prev.lyricElement, next.lyricElement)
    && prev.isSelected === next.isSelected
    && prev.kanaInput === next.kanaInput
    && prev.isPlayMode === next.isPlayMode
    && prev.getTimetagStatus === next.getTimetagStatus
    && prev.onTimetagClick === next.onTimetagClick
    && prev.getStopperStatus === next.getStopperStatus
    && prev.onStopperClick === next.onStopperClick
    && prev.onLyricElementChange === next.onLyricElementChange
    && prev.onMouseDown === next.onMouseDown
    && prev.onMouseOver === next.onMouseOver
    && prev.onContextMenu === next.onContextMenu;
});

export default SingleWord;