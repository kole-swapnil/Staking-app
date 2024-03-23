import React from "react";
import { ethers } from "ethers";
import contractArtifact from "../contracts/Staking.json";
import contractAddress from "../contracts/contract-address.json";
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { StakingForm } from "./StakingForm";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";

const BCX_NETWORK_ID = '100';
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;
const milliEtherConv = ethers.BigNumber.from('1000000000000000');

export class Dapp extends React.Component {
  constructor(props) {
    super(props);
    this.initialState = {
      contractData: undefined,
      selectedAddress: undefined,
      balance: undefined,
      stakedBalance: undefined,
      rewardBalance: undefined,
      vestedBalance: undefined,
      txBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
      contractStaked: undefined,
    };
    this.state = this.initialState;
    this._getReward = this._getReward.bind(this);
    this._getVested = this._getVested.bind(this);
    this._claimReward = this._claimReward.bind(this);
  }

  render() {
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }
    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet 
          connectWallet={() => this._connectWallet()} 
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    if (!this.state.balance) {
      return <Loading />;
    }

    return (
      <div className="container p-4">
        <br/>
        <hr/>
        <div className="row">
          <div className="col-12">
            <h1>
              Staking App
            </h1>
            <p><b>Total Staked Balance: {isNaN(this.state.totalStakedTokens)? '' : this.state.totalStakedTokens/1000} BCX <br/> Reward Rate: 15% p.a.</b></p>
            <p>
              Welcome <b>{this.state.selectedAddress}</b> <br/> you have{" "}
              <b>
                {isNaN(this.state.stakedBalance/1000)? '': this.state.stakedBalance/1000}
              </b>
              {" "} BCX Staked Balance
            </p>
            <p>
            <button onClick={this._getReward}>Check Reward</button>  
            {" "}You have{" "}
              <b>
                {isNaN(this.state.rewardBalance/1000) ? '' : this.state.rewardBalance/1000}
              </b>
              {" "}BCX Reward Balance{"  "}
              <button onClick={this._claimReward}>Claim Reward</button>
            </p>
            <p>
            <button onClick={this._getVested}>Check Vested Tokens</button>  
            <br/>
            <br/>
            {" "}You have{" "}
              <b>
                {isNaN(this.state.vestedBalance/1000) ? '' : this.state.vestedBalance/1000}
              </b>
              {" "}total unlocked and vested BCX that can be withdrawn{"  "}
            </p> 
          </div>
        </div>

        <hr />

        <div className="row">
          <div className="col-12">
            {/* 
              Sending a transaction isn't an immediate action. You have to wait
              for it to be mined.
              If we are waiting for one, we show a message here.
            */}
            {this.state.txBeingSent && (
              <WaitingForTransactionMessage txHash={this.state.txBeingSent} />
            )}
            {/* 
              Sending a transaction can fail in multiple ways. 
              If that happened, we show a message here.
            */}
            {this.state.transactionError && (
              <TransactionErrorMessage
                message={this._getRpcErrorMessage(this.state.transactionError)}
                dismiss={() => this._dismissTransactionError()}
              />
            )
            }
          </div>
        </div>

        <div className="row">
          <div className="col-12">

            {/*
              This component displays a form that the user can use to send a 
              transaction and transfer some tokens.
              The component doesn't have logic, it just calls the transferTokens
              callback.
            */}
            {this.state.balance.gt(0) && (
              <StakingForm
                stakeTokens={(amount) =>
                  this._stake(amount)
                }
                withDraw = {(amount) => {this._withDraw(amount)}}
                tokenSymbol='BCX'
              />
            )}
          </div>
        </div>
      </div>
      
    );
  }

  componentWillUnmount() { 
    // We poll the user's balance, so we have to stop doing that when Dapp
    // gets unmounted
    this._stopPollingData();
  }

  async _connectWallet() {
    // This method is run when the user clicks the Connect. It connects the
    // dapp to the user's wallet, and initializes it.

    // To connect to the user's wallet, we have to run this method.
    // It returns a promise that will resolve to the user's address.
    const [selectedAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });

    // Once we have the address, we can initialize the application.

    // First we check the network
    //this._checkNetwork();

    this._initialize(selectedAddress);

    // We reinitialize it whenever the user changes their account.
    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this._stopPollingData();
      // `accountsChanged` event can be triggered with an undefined newAddress.
      // This happens when the user removes the Dapp from the "Connected
      // list of sites allowed access to your addresses" (Metamask > Settings > Connections)
      // To avoid errors, we reset the dapp state 
      if (newAddress === undefined) {
        return this._resetState();
      }
      setTimeout(function(){
        console.log("Executed after 1 second");
        this._initialize(newAddress);
    }, 1000);
      
    });
  }

  async _initialize(userAddress) {
    // This method initializes the dapp

    // We first store the user's address in the component's state
    this.setState({
      selectedAddress: userAddress,
    });

    await this._initializeEthers();
    await this._getContractData(); 
    await this._startPollingData();
  }

  async _initializeEthers() { 
    // We first initialize ethers by creating a provider using window.ethereum
    this._provider = new ethers.providers.Web3Provider(window.ethereum);
    this._contractStaked = new ethers.Contract(
      contractAddress.Staking,
      contractArtifact.abi,
      this._provider.getSigner(0)
    );
    this.setState({ contractStaked: this._contractStaked})
  }

  _startPollingData() {
    this._pollDataInterval = setInterval(() => this._updateBalance(), 1000);
    this._pollDataInterval = setInterval(() => this._updateStakeBalance(), 3000);
    this._pollDataInterval = setInterval(() => this._updateReward(), 3000);
    this._pollDataInterval = setInterval(() => this._updateVested(), 3000);

    // We run it once immediately so we don't have to wait for it
    this._updateBalance();
    this._updateStakeBalance();
    this._updateReward();
    this._updateVested();
  }

  _stopPollingData() { 
    clearInterval(this._pollDataInterval);
    this._pollDataInterval = undefined;
  }

  async _getContractData() { 
    const rewardRate = await this._contractStaked.REWARD_RATE();
    const totalStakedTokens = await this._contractStaked.totalStakedTokens();
    const stakedBalance = await this._contractStaked.stakedBalance(this.state.selectedAddress);
    this.setState({ contractData: { rewardRate:parseInt(rewardRate.toString())/(milliEtherConv), totalStakedTokens: parseInt(totalStakedTokens.div(milliEtherConv)._hex), stakedBalance: parseInt(stakedBalance.div(milliEtherConv)._hex)}});
  }  
  async _updateBalance() { 
    const balance = await this._provider.getBalance(this.state.selectedAddress);
    this.setState({ balance });
  }
  async _updateStakeBalance() {
    const stakedBalance = await this._contractStaked.stakedBalance(this.state.selectedAddress);
    const totalStakedTokens = await this._contractStaked.totalStakedTokens();
    this.setState({ stakedBalance: parseInt(stakedBalance.div(milliEtherConv)._hex), totalStakedTokens: parseInt(totalStakedTokens.div(milliEtherConv)._hex)});
  }

  async _getReward() {
    await this._contractStaked.updateRewardFunc({ gasLimit: 500000 });
    this._updateReward();
  }

  async _getVested() {
    await this._contractStaked.updateUnlockedNew({ gasLimit: 500000 });
    this._updateVested();
  }

  async _updateReward() {
    const rewardBalance = await this._contractStaked.rewards(this.state.selectedAddress, { gasLimit: 500000 });
    this.setState({ rewardBalance: parseInt(rewardBalance.div(milliEtherConv)._hex)});
  }

  async _updateVested() {
    const vestedBalance = await this._contractStaked.vestedTokens(this.state.selectedAddress, { gasLimit: 500000 });
    console.log('???<<', parseInt(vestedBalance.toString())/milliEtherConv);
    this.setState({ vestedBalance: parseInt(vestedBalance.toString())/milliEtherConv});
  }

  async _claimReward() {
    const rewardTransfer = await this._contractStaked.getReward({ gasLimit: 500000 });
    console.log('rewards', rewardTransfer);
    this._updateReward();
  }

  async _withDraw (amount) {
    try {
      this._dismissTransactionError();
      const tx = await this._contractStaked.withdraw(ethers.utils.parseEther(amount), { gasLimit: 500000 });
      this.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
      await this._updateStakeBalance();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      this.setState({ txBeingSent: undefined });
    }
  }
  async _stake(amount) { 
    try {
      this._dismissTransactionError();
      const tx = await this._contractStaked.stake({ value: ethers.utils.parseEther(amount), gasLimit: 500000 });
      this.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
      await this._updateStakeBalance();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      this.setState({ txBeingSent: undefined });
    }
  }

  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }

  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  _getRpcErrorMessage(error) {
    if (error.data) {
      return error.data.message;
    }
    return error.message;
  }

  _resetState() {
    this.setState(this.initialState);
  }

  async _switchChain() {
    const chainIdHex = `0x${BCX_NETWORK_ID.toString(16)}`
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    await this._initialize(this.state.selectedAddress);
  }

  _checkNetwork() {
    if (window.ethereum.net_version !== BCX_NETWORK_ID) {
      this._switchChain();
    }
  }
}
