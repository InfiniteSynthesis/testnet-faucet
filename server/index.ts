const path = require('path');
const fs = require('fs');
import { argv } from 'node:process';
const express = require('express');
import { Request, Response } from 'express';
const bodyParser = require('body-parser');
const Web3 = require('web3');
const NodeCache = require('node-cache');
const async = require('async');

// init param
const decryptKey = argv[2];
if (!decryptKey) throw new Error('Missing decrypt key!');

// init config
const configPath = path.join(__dirname, '..', 'config', 'config.json');
const config = require(configPath);
const keyPath = path.join(__dirname, '..', 'config', 'faucet_account');
const keystoreArray = JSON.parse(fs.readFileSync(keyPath));

// init express
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
const port = config.serverPort || '8000';

// init web3
const web3 = new Web3(config.rpcURL);
web3.eth.accounts.wallet.decrypt(keystoreArray, decryptKey);
const faucetAccount = web3.eth.accounts.wallet[0].address;
web3.eth.defaultAccount = faucetAccount;
const privateKey = web3.eth.accounts.wallet[0].privateKey;

// init cache
const blockList = new NodeCache();

// init queue
interface lastSendType {
  time: number;
  address: string;
  txHash: string;
}

const lastSend: lastSendType[] = [];
const sendQueue = async.queue(async (task: { address: string }, _callback: any) => {
  console.log(`donating to ${task.address}`);
  const txHash = await sendTransaction(task.address);

  if (txHash) {
    lastSend.push({ time: Date.now(), address: task.address, txHash: txHash });
    while (lastSend.length > 5) lastSend.shift();

    // waiting config.payoutFrequency sec
    await new Promise((resolve) => setTimeout(resolve, config.payoutFrequency * 1000));
  }
}, 1);

sendQueue.drain(() => {
  console.log(`Queue empty.`);
});

const getFaucetBalance = async () => {
  const balance = web3.utils.fromWei(await web3.eth.getBalance(faucetAccount), 'ether');
  return balance;
};

const sendTransaction = async (toAddress: string): Promise<string | undefined> => {
  let txHash = '';
  try {
    const signedTX = await web3.eth.accounts.signTransaction(
      {
        to: toAddress,
        value: Web3.utils.toWei(config.dailyLimit.toString(), 'ether'),
        gas: 21000,
      },
      privateKey
    );

    const createReceipt = await web3.eth.sendSignedTransaction(signedTX.rawTransaction);
    console.log(`Transaction successful with hash: ${createReceipt.transactionHash}`);
    txHash = createReceipt.transactionHash;
  } catch (err) {
    console.log(err);
    return undefined;
  }

  return txHash;
};

app.get('/stats', async (_request: Request, response: Response) => {
  response.send({
    account: faucetAccount,
    balance: await getFaucetBalance(),
    dailyLimit: config.dailyLimit,
    blockNumber: await web3.eth.getBlockNumber(),
  });
});

app.get('/queue', async (_request: Request, response: Response) => {
  response.send({ lastSend: lastSend });
});

app.post('/faucet', async (request: Request, response: Response) => {
  // Strip all spaces
  const toAddress = request.body.address.replace(' ', '');
  // check for valid Eth address
  if (!web3.utils.isAddress(toAddress))
    return response.status(200).json({
      status: false,
      message: 'Your account address is invalid. Please check your account address (it should start with 0x).',
    });

  // extract ip
  let ipAddress = request.ip || request.socket.remoteAddress;
  console.log(ipAddress);
  if (!ipAddress)
    return response.status(200).json({
      status: false,
      message: 'BTL ETH request fail. Please try again!',
    });
  ipAddress = ipAddress.replace(/\./g, '_');

  // check ip address availability
  if (blockList.has(ipAddress)) {
    const waitTime: number = blockList.getTtl(ipAddress) - Date.now();
    return response.status(200).json({
      status: false,
      message: `Your ip address has already requested BTL_ETH today :) The remaining time for next request is ${msToTime(
        waitTime
      )}`,
    });
  }

  // check tx address availability
  if (blockList.get(toAddress)) {
    const waitTime: number = blockList.getTtl(toAddress) - Date.now();
    return response.status(200).json({
      status: false,
      message: `Your wallet address has already requested BTL_ETH today :) The remaining time for next request is ${msToTime(
        waitTime
      )}.`,
    });
  }

  const prevTx = sendQueue.length();
  if (prevTx >= 5) {
    return response.status(200).json({
      status: false,
      message: 'The faucet queue is full. Please try again later.',
    });
  }

  sendQueue.push({ address: toAddress });
  blockList.set(ipAddress, true, 60 * 60);
  blockList.set(toAddress, true, 24 * 60 * 60);

  return response
    .status(200)
    .json({ status: true, message: `BTL_ETH request added to the queue (${prevTx} tasks remaining). Enjoy!` });
});

app.get('*', async (_request: Request, response: Response) => {
  response.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Started on PORT ${port}`);
});

const msToTime = (duration: number) => {
  const seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  const formattedTime = [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');

  return formattedTime;
};
