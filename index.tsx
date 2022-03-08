import React from 'react';
import { render } from 'react-dom';
import App from './__test__';

/**
 * Ant design styles
 */
import 'antd/dist/antd.css';

render(<App />, document.querySelector('#app')!);
