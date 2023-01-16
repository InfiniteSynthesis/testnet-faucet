import React from 'react';
import { FaucetPanel } from './faucet-panel';
import { FaucetStats } from './faucet-stats';
import './App.css';

class App extends React.Component<{}, {}> {
  render(): JSX.Element {
    return (
        <div className="container">
          <FaucetPanel />
          <FaucetStats />
        </div>
    );
  }
}

export default App;
