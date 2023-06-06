import React, { Fragment, useEffect, useRef, useState } from 'react';
import SingleWord from './SingleWord';
import './LyricPanel.css';
import { LyricElement } from './types';

type LyricPanelProps = {
  // rawLyrics: string,
  lyricState: [LyricElement[], React.Dispatch<React.SetStateAction<LyricElement[]>>]
}

class DragSelection {
  private _anchor: number;
  private _dragTo: number;

  constructor(anchor = -1, dragTo = -1) {
    this._anchor = anchor;
    this._dragTo = dragTo;
  }

  public set anchor(v: number) {
    this._anchor = v;
  }

  public get anchor(): number {
    return this._anchor;
  }

  public set dragTo(v: number) {
    this._dragTo = v;
  }

  public get dragTo(): number {
    return this._dragTo;
  }

  public isInDragSelection(idx: number): boolean {
    const smaller = this._anchor < this._dragTo ? this._anchor : this._dragTo;
    const bigger = this._anchor === smaller ? this._dragTo : this._anchor;
    return smaller <= idx && idx <= bigger;
  }

  public clone(): DragSelection {
    const d = new DragSelection();
    d._anchor = this._anchor;
    d._dragTo = this._dragTo;
    return d;
  }
}

export default function LyricPanel(props: LyricPanelProps) {
  const [dragSelection, setDragSelection] = useState(new DragSelection());
  const [isMouseDown, setIsMouseDown] = useState(false);

  const [lyrics, setLyrics] = props.lyricState;

  const [lineBreakPositions, setLineBreakPositions] = useState<number[]>([]);
  useEffect(() => {
    const lbPos: number[] = [];
    lyrics.forEach((e, i) => { if (e.obj.text === '\n') lbPos.push(i); });
    setLineBreakPositions(lbPos);
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
          isSelected={dragSelection.isInDragSelection(i)}
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
