import React, { RefObject, useEffect, useRef, useState } from 'react';
import './SingleWord.css';
import { Input, Popconfirm, Toast } from '@douyinfe/semi-ui';
import { DragSelection, LyricElement, TimedObject } from './types';

type SingleWordProps = {
  id: number
  lyricElement: LyricElement,
  // isSelected: boolean,
  selectedLineNo: number,
  lineBreakPositions: number[],

  // hooks
  retrieveSelection: () => DragSelection,
  onLyricElementChange: (elem: LyricElement) => void,
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>,
  onMouseOver?: React.MouseEventHandler<HTMLDivElement>,
}

export default function SingleWord({
  id,
  lyricElement,
  // isSelected,
  selectedLineNo,
  lineBreakPositions,
  retrieveSelection,
  onLyricElementChange,
  onMouseDown,
  onMouseOver,
}: SingleWordProps) {
  // const [furi, setFuri] = useState<TimedObject[]>();
  const furiInputRef = useRef<React.RefObject<HTMLInputElement>>();
  // const [isSelected, setIsSelected] = useState(false);
  const [isLineSelected, setIsLineSelected] = useState(false);

  useEffect(() => {
    if (selectedLineNo < 0) return;
    if (selectedLineNo === 0 && id < lineBreakPositions[selectedLineNo]) {
      setIsLineSelected(true);
      return;
    } else if (selectedLineNo === lineBreakPositions.length && id > lineBreakPositions[selectedLineNo]) {
      // last line
      setIsLineSelected(true);
      return;
    } else if (id > lineBreakPositions[selectedLineNo - 1] && id < lineBreakPositions[selectedLineNo]) {
      setIsLineSelected(true);
      return;
    }
  }, [id, selectedLineNo, lineBreakPositions]);

  const checkIsSelected = () => {
    if (!isLineSelected) return false;
    const selection = retrieveSelection();
    return selection.isInDragSelection(id);
  };

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
    {isLineSelected
      ? <div
        id={`le-middle-${id}`}
        className={'middle' + (checkIsSelected() ? ' selected' : '')}
        onMouseOver={onMouseOver}
        onMouseDown={onMouseDown}>
        {lyricElement.obj.text}
      </div>
      : <div
        id={`le-middle-${id}`}
        className={'middle'}
        onMouseOver={onMouseOver}
        onMouseDown={onMouseDown}>
        {lyricElement.obj.text}
      </div>
    }
    <div className='lower' id={`le-lower-${id}`} style={{ fontSize: 5 }}>{lyricElement.obj.text.codePointAt(0)}</div>
  </div>);
}