/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Button, Col, Input, Row, Toast } from '@douyinfe/semi-ui';
import React, { useRef, useState } from 'react';
import './styles/FileSelector.css';
import { ValidateStatus } from '@douyinfe/semi-ui/lib/es/input';

export default function FileSelector(
  props: {
    defaultValue: string,
    accept: string,
    onSelected: (file: File) => void,
    text?: string,
    strictChecking?: boolean,
  }
) {
  const fileTypes = new Set(props.accept.split(',').map(x => x.trim()));

  const inputRef = useRef<HTMLInputElement>(null);
  const showNameRef = useRef<HTMLInputElement>(null);
  const [validateStatus, setValidateStatus] = useState<ValidateStatus>('default');
  const [message, setMessage] = useState('');

  const processClick = () => {
    inputRef.current!.value = '';
    inputRef.current!.click();
  };

  const selectError = (file: File | undefined, msg: string) => {
    Toast.error(`${msg}${': ' + file?.name || ''}`);
    setMessage('Error');
    setValidateStatus('error');
  };

  const selectSuccess = (file: File) => {
    setMessage(file.name);
    props.onSelected(file);
  };

  const processInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidateStatus('default');
    if (!e.target.files || e.target.files.length < 1) {
      selectError(undefined, 'No file selected!');
      return;
    }
    const file = e.target.files[0];
    if (!props.strictChecking) {
      selectSuccess(file);
      return;
    }
    if (!fileTypes.has(file.type)) {
      selectError(file, 'Bad file type');
      return;
    }
    selectSuccess(file);
  };

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Input ref={showNameRef} readonly
          placeholder={props.defaultValue} value={message} validateStatus={validateStatus} />
      </Col>
      <Col span={12}>
        <Button onClick={processClick}>{props.text || 'Select'}</Button>
        <input
          ref={inputRef} type="file"
          accept={props.accept}
          className="file-selector-input"
          onChange={processInput} />
      </Col>
    </Row >
  );
}