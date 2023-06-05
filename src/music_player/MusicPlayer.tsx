import { Button, Col, Row, Slider, Space, Toast } from '@douyinfe/semi-ui';
import { IconPlay, IconFastForward, IconBackward, IconPause, IconMute } from '@douyinfe/semi-icons';
import './MusicPlayer.css';
import { useRef, useState, useEffect } from 'react';
import { secToTimeString } from '../utils';

export default function MusicPlayer(props: { music: File | undefined }) {
  // const audio = useSound(props.music);
  const audio = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [curSpeed, setCurSpeed] = useState(100);
  const [curTime, setCurTime] = useState(0);
  const [curVolume, setCurVolume] = useState(100);
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(100);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!props.music || !audio.current)
      return;
    console.log('changed: ', props.music);
    setIsPlaying(false);
    audio.current.pause();
    audio.current.load();
    setCurSpeed(100);
    setCurTime(0);
  }, [props.music]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!audio.current) return;
      setCurTime(audio.current.currentTime);
      // console.log('current time ', audio.current.currentTime);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const onMusicMetadataLoaded = () => {
    if (!audio.current)
      return;
    setDuration(audio.current.duration);
  };

  const onPlayBtnClick = () => {
    if (!audio.current || !props.music) {
      Toast.warning('No music to play!');
      return;
    }
    setIsPlaying(true);
    audio.current.play();
  };

  const onPauseBtnClick = () => {
    if (!audio.current || !props.music) {
      console.warn('bad op');
      return;
    }
    setIsPlaying(false);
    audio.current.pause();
  };

  const setVolume = (v: number) => {
    if (!audio.current || !props.music)
      return;
    setCurVolume(v);
    audio.current.volume = v / 100;
  };

  const setSpeed = (s: number) => {
    if (!audio.current || !props.music)
      return;
    setCurSpeed(s);
    audio.current.playbackRate = s / 100;
  };

  const seek = (t: number) => {
    if (!audio.current || !props.music) {
      Toast.error('No music to play!');
      return;
    }
    console.log(t);
    setCurTime(t);
    audio.current.currentTime = t;
  };

  const onMusicEnd = () => {
    setIsPlaying(false);
  };

  return (<div style={{ width: '100%' }}>
    <Row gutter={16}>
      <Col span={3}>
        <span>Speed</span>
        <br />
        <Slider
          tipFormatter={x => x as number / 100}
          min={30}
          max={120}
          step={1}
          marks={{ 30: '0.3', 50: '0.5', 70: '0.7', 100: '1', 120: '1.2' }}
          value={curSpeed}
          onChange={(x) => { setSpeed(x as number); }} />
      </Col>
      <Col span={12}>
        <audio ref={audio} preload="metadata" onLoadedMetadata={onMusicMetadataLoaded} onEnded={onMusicEnd}>
          <source src={props.music ? URL.createObjectURL(props.music) : undefined} />
        </audio>
        <div>
          <Slider
            tipFormatter={v => secToTimeString(v as number, true)}
            min={0.0}
            max={duration}
            key={duration} // ISSUE: https://github.com/DouyinFE/semi-design/issues/1397
            step={0.01}
            defaultValue={0.0}
            value={curTime}
            onChange={(x) => { seek(x as number); }} />
          <div style={{ textAlign: 'end' }}>
            {secToTimeString(curTime || 0, !isPlaying)} / {secToTimeString(duration, true)}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Space style={{ alignItems: 'end' }}>
            <Button className='round-btn round-btn-size-regular'
              theme='solid'
              icon={<IconBackward />} />
            {isPlaying
              ? <Button className='round-btn round-btn-size-large'
                theme='solid'
                icon={<IconPause style={{ fontSize: '25px' }} />}
                onClick={onPauseBtnClick} />
              : <Button className='round-btn round-btn-size-large'
                theme='solid'
                icon={<IconPlay style={{ fontSize: '25px' }} />}
                onClick={onPlayBtnClick} />}
            <Button className='round-btn round-btn-size-regular'
              theme='solid'
              icon={<IconFastForward />} />
          </Space>
        </div>
      </Col>
      <Col span={4}>
        <div><span>Volume</span></div>
        <Space style={{ alignItems: 'end' }}>
          <div style={{ height: 70, margin: '10px' }}>
            <Slider vertical verticalReverse
              min={0}
              max={100}
              step={1}
              // defaultValue={100}
              value={curVolume}
              onChange={v => setVolume(v as number)} />
          </div>
          <Button className='round-btn round-btn-size-regular'
            theme={curVolume === 0 ? 'solid' : 'light'}
            icon={<IconMute />}
            onClick={() => {
              if (curVolume !== 0) {
                setVolumeBeforeMute(curVolume);
                setVolume(0);
              } else {
                setVolume(volumeBeforeMute);
              }
            }} />
        </Space>
      </Col>
    </Row>
  </div>);
}