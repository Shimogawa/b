import { useState } from 'react';
import './SingleWord.css';

type SingleWordProps = {
  text: string,
  furi?: string,
}

export default function SingleWord(props: SingleWordProps) {
  return (<div className={'single-word' + (/\s/.test(props.text) ? ' empty' : '')}>
    <div className='upper'>{props.furi || ''}</div>
    <div className={'middle'}>{props.text}</div>
    <div className='lower' style={{ fontSize: 5 }}>{props.text.codePointAt(0)}</div>
  </div>);
}