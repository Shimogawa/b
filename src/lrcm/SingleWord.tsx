import React, { RefObject, useEffect, useRef, useState } from 'react';
import './SingleWord.css';
import { Input, Popconfirm, Toast } from '@douyinfe/semi-ui';
import { LyricElement } from './types';
import { IconArrowDown, IconCaretup, IconPause } from '@douyinfe/semi-icons';
import { furiStringToList } from './lrc';

const lyricElementEqualWithoutDuration = (a: LyricElement, b: LyricElement) => {
  if (a.obj.text !== b.obj.text) return false;
  if (a.furi?.length !== b.furi?.length) return false;
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

  // hooks
  onLyricElementChange: (elem: LyricElement, id: number) => void,
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>,
  onMouseOver?: React.MouseEventHandler<HTMLDivElement>,
}

const SingleWord = React.memo(function SingleWord({
  id,
  lyricElement,
  onLyricElementChange,
  onMouseDown,
  onMouseOver,
  isSelected,
  isLast,
}: SingleWordProps) {
  console.error('re-render');
  const furiInputRef = useRef<React.RefObject<HTMLInputElement>>();
  const [hasStopper, setHasStopper] = useState(isLast);

  const onFuriConfirm = () => {
    if (!furiInputRef.current) {
      Toast.warning('Cannot find furi');
      return;
    }
    onLyricElementChange(
      {
        ...lyricElement,
        furi: furiStringToList(furiInputRef.current.current!.value),
      }, id
    );
    // setFuri([...furiInputRef.current.current!.value].map(c => ({ text: c, duration: {} })));
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
      tags.push(<IconCaretup key={`${id}-tag-0`} size="small" className="timetag" />);
    } else {
      for (let i = 0; i < lyricElement.furi.length; i++) {
        if (lyricElement.furi[i].duration) {
          tags.push(<IconCaretup key={`${id}-tag-${i}`} size="small" className="timetag" />);
        } else {
          break;
        }
      }
    }
    if (hasStopper) {
      tags.push(<IconPause key={`${id}-stopper`} size="extra-small" className="stoptag" />);
    }
    return tags;
  };

  return (<div className={'single-word' + (/\s/.test(lyricElement.obj.text) ? ' empty' : '')}>
    <Popconfirm
      title="Modify Furi"
      content={({ initialFocusRef }) => {
        furiInputRef.current = initialFocusRef as RefObject<HTMLInputElement>;
        return <Input // TODO: confirm on press enter. Not provided for now, probably need to heck with getElementById
          ref={initialFocusRef as React.RefObject<HTMLInputElement>}
          defaultValue={lyricElement.furi?.map(f => f.text).join('')}
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
      onMouseDown={onMouseDown}>
      {[...lyricElement.obj.text].map((c, i) =>
        <span key={`${id}-text-${i}`}>
          {processChar(c)}
        </span>)}
    </div>
    <div className='lower' id={`le-lower-${id}`} style={{ fontSize: '12px' }}>
      {/* {[...lyricElement.obj.text].reduce((prev, cur) => prev + ' ' + cur.codePointAt(0)?.toString(16), '')} */}
      {getLowerTags(lyricElement, hasStopper)}
    </div>
  </div>);
}, (prev, next) => {
  return prev.id === next.id
    && lyricElementEqualWithoutDuration(prev.lyricElement, next.lyricElement)
    && prev.isSelected === next.isSelected
    && prev.onLyricElementChange === next.onLyricElementChange
    && prev.onMouseDown === next.onMouseDown
    && prev.onMouseOver === next.onMouseOver;
});

export default SingleWord;