import React, { RefObject, useEffect, useRef, useState } from 'react';
import './SingleWord.css';
import { Input, Popconfirm, Toast } from '@douyinfe/semi-ui';
import { LyricElement, TimedObject } from './types';

type SingleWordProps = {
  id: number
  lyricElement: LyricElement,
  isSelected: boolean,

  // hooks
  onLyricElementChange: (elem: LyricElement) => void,
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>,
  onMouseOver?: React.MouseEventHandler<HTMLDivElement>,
}

export default function SingleWord({
  id,
  lyricElement,
  isSelected,
  onLyricElementChange,
  onMouseDown,
  onMouseOver,
}: SingleWordProps) {
  // const [furi, setFuri] = useState<TimedObject[]>();
  const furiInputRef = useRef<React.RefObject<HTMLInputElement>>();

  // useEffect(() => {
  //   setFuri(lyricElement.furi);
  // }, [lyricElement]);

  const onFuriConfirm = () => {
    if (!furiInputRef.current) {
      Toast.warning('Cannot find furi');
      return;
    }
    onLyricElementChange(
      {
        ...lyricElement,
        furi: [...furiInputRef.current.current!.value].map(c => ({ text: c, duration: {} }))
      }
    );
    // setFuri([...furiInputRef.current.current!.value].map(c => ({ text: c, duration: {} })));
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
      {lyricElement.obj.text}
    </div>
    <div className='lower' id={`le-lower-${id}`} style={{ fontSize: 5 }}>{lyricElement.obj.text.codePointAt(0)}</div>
  </div>);
}