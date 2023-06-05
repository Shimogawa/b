import { useEffect, useRef, useState } from 'react';
import './SingleWord.css';
import { Input, Popconfirm, Toast } from '@douyinfe/semi-ui';

type SingleWordProps = {
  text: string,
  furi?: string,
}

export default function SingleWord(props: SingleWordProps) {
  const [furi, setFuri] = useState(props.furi);
  const furiInputRef = useRef<HTMLInputElement>(null);

  const onFuriConfirm = () => {
    if (!furiInputRef.current) {
      Toast.warning('Cannot find furi');
      return;
    }
    setFuri(furiInputRef.current.value);
  };

  return (<div className={'single-word' + (/\s/.test(props.text) ? ' empty' : '')}>
    <Popconfirm
      title="Modify Furi"
      content={<Input ref={furiInputRef} defaultValue={furi} />}
      onConfirm={onFuriConfirm}
      okText='OK'
      cancelText='Cancel'
    >
      <div className='upper'>
        {furi && [...furi].map((c, i) => <span key={i}>{c}</span>)}
      </div>
    </Popconfirm>
    <div className='middle'>{props.text}</div>
    <div className='lower' style={{ fontSize: 5 }}>{props.text.codePointAt(0)}</div>
  </div>);
}