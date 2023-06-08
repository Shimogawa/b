import React, { RefObject, useRef, useState } from 'react';
import './SingleWord.css';
import { Input, Popconfirm, Toast } from '@douyinfe/semi-ui';
import { LyricElement } from './types';

type SingleWordProps = {
  id: number
  lyricElement: LyricElement,
  // isSelected: boolean,
  isSelected: boolean

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
}: SingleWordProps) {
  console.error('re-render');
  // const [furi, setFuri] = useState<TimedObject[]>();
  const furiInputRef = useRef<React.RefObject<HTMLInputElement>>();
  // const [isSelected, setIsSelected] = useState(false);



  const onFuriConfirm = () => {
    if (!furiInputRef.current) {
      Toast.warning('Cannot find furi');
      return;
    }
    onLyricElementChange(
      {
        ...lyricElement,
        furi: [...furiInputRef.current.current!.value].map(c => ({ text: c, duration: {} }))
      }, id
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
    <div className='lower' id={`le-lower-${id}`} style={{ fontSize: '12px' }}>
      {[...lyricElement.obj.text].reduce((prev, cur) => prev + ' ' + cur.codePointAt(0)?.toString(16), '')}
    </div>
  </div>);
});

export default SingleWord;