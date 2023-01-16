import React from 'react';
import './faucet-panel.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class FaucetPanel extends React.Component<{}, { inputAddress: string }> {
  state = { inputAddress: '' };

  handleOnClick = async () => {
    const payload = { address: this.state.inputAddress };

    const response = await fetch('/faucet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      toast.error('Testnet ETH request fail. Please try again!', {
        position: 'bottom-center',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
      return;
    }

    const result = await response.json();

    if (result.status) {
      toast.success(result.message, {
        position: 'bottom-center',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } else {
      toast.error(result.message, {
        position: 'bottom-center',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }
  };

  handleInputOnChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    this.setState({ inputAddress: value });
  };

  render(): JSX.Element {
    return (
      <div className="faucetPanel">
        <h1>Testnet Faucet</h1>

        <div style={{ marginBottom: '30px' }}>
          <input
            className="formControl"
            type="text"
            onChange={this.handleInputOnChange}
            placeholder="Your testnet address"></input>
        </div>

        <div className="panelButton" onClick={this.handleOnClick}>
          Give me testnet ETH!
        </div>

        <p>Please enter valid Ethereum address to get free Testnet ETH.</p>
        <ToastContainer />
      </div>
    );
  }
}

export { FaucetPanel };
