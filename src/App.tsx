import { useRef, useState } from 'react';
import './App.css';
import { Layout } from '@douyinfe/semi-ui';

import FileSelector from './FileSelector';
import Navbar from './Navbar';
import MusicPlayer from './music_player/MusicPlayer';
import { LyricElement } from './lrcm/types';
import LyricPanel from './lrcm/LyricPanel';

function App() {
  const [audioFile, setAudioFile] = useState<File>();
  const { Header, Footer, Content } = Layout;
  const [lyricElems, setLyricElems] = useState<LyricElement[]>([]);
  const [l, setL] = useState('');

  return (
    <Layout>
      <Header style={{ backgroundColor: 'var(--semi-color-bg-1)' }}>
        <Navbar />
      </Header>
      <Content className='main-content'>
        <div className='main-element'>
          <FileSelector
            defaultValue='File...'
            text='Select Music'
            accept='audio/mpeg, video/mp4'
            strictChecking={true}
            onSelected={f => setAudioFile(f)} />
          <FileSelector
            defaultValue='File...'
            text='Select Lyric File'
            accept='*/*'
            strictChecking={false}
            onSelected={async f => setL(await f.text())} />
          <LyricPanel lyrics={l} />
        </div>
      </Content>
      <Footer className='sticky-footer'>
        <MusicPlayer music={audioFile} />
      </Footer>
    </Layout>
  );
}

export default App;