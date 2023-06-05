import { Nav } from '@douyinfe/semi-ui';

export default function Navbar() {
  return (<div>
    <Nav mode="horizontal" defaultSelectedKeys={['Home']}>
      <Nav.Header>
        LRCM
      </Nav.Header>
      <Nav.Item text="X" />
      <Nav.Footer>
      </Nav.Footer>
    </Nav>
  </div>);
}