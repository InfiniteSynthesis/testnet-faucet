import React from 'react';
import './faucet-stats.css';

interface lastSendType {
  time: number;
  address: string;
  txHash: string;
}

const compressHash = (target: string) => {
  return target.slice(0, 6) + '...' + target.slice(-4);
};

const formatTime = (target: number) => {
  const time = new Date(target);
  return time.toLocaleTimeString('en-GB') + ' ' + time.toLocaleDateString('en-GB');
};

class LastSend extends React.Component<{}, { lastSend: lastSendType[]; timer: NodeJS.Timer | undefined }> {
  state = { lastSend: [], timer: undefined };

  async componentDidMount(): Promise<void> {
    await this.requestLastSend();

    const newTimer = setInterval(async () => {
      await this.requestLastSend();
    }, 10 * 1000);
    this.setState({ timer: newTimer });
  }

  async requestLastSend(): Promise<void> {
    const response = await fetch('/queue', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!response.ok) return;

    const result = await response.json();
    this.setState({ lastSend: result.lastSend });
  }

  componentWillUnmount() {
    if (this.state.timer) clearInterval(this.state.timer);
  }

  render() {
    if (!this.state.lastSend) return <div />;

    const tdElement: JSX.Element[] = [];
    this.state.lastSend.forEach((item: lastSendType) => {
      tdElement.push(
        <tr>
          <td>{formatTime(item.time)}</td>
          <td>
            {compressHash(item.address)} / {compressHash(item.txHash)}
          </td>
        </tr>
      );
    });

    tdElement.reverse();

    return (
      <table style={{ width: '100%' }}>
        <caption>Last 5 Transactions From Faucet</caption>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Address / TxHash</th>
          </tr>
        </thead>
        <tbody>{tdElement}</tbody>
      </table>
    );
  }
}

class FaucetStats extends React.Component<
  {},
  { account: string; balance: string; dailyLimit: number; blockNumber: number }
> {
  state = { account: '', balance: '', dailyLimit: -1, blockNumber: -1 };

  async componentDidMount(): Promise<void> {
    const response = await fetch('/stats', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!response.ok) return;

    const result = await response.json();
    this.setState({
      account: result.account,
      balance: result.balance,
      dailyLimit: result.dailyLimit,
      blockNumber: result.blockNumber,
    });
  }

  render(): JSX.Element {
    const accountInfo = this.state.account ? (
      <p>
        Faucet <span className="highlightSpan">{this.state.account}</span>
      </p>
    ) : undefined;
    const balanceInfo = this.state.balance ? (
      <p>
        <span className="highlightSpan">{this.state.balance}</span> BTL_ETH available
      </p>
    ) : undefined;
    const dailyLimitInfo =
      this.state.dailyLimit !== -1 ? (
        <p>
          <span className="highlightSpan">{this.state.dailyLimit}</span> BTL_ETH daily limit per address
        </p>
      ) : undefined;
    const blockNumberInfo =
      this.state.blockNumber !== -1 ? (
        <p>
          Currently at block <span className="highlightSpan">{this.state.blockNumber}</span>
        </p>
      ) : undefined;

    return (
      <div>
        <h1>Faucet stats</h1>
        {balanceInfo}
        {accountInfo}
        {dailyLimitInfo}
        {blockNumberInfo}
        <LastSend />
      </div>
    );
  }
}

export { FaucetStats };
