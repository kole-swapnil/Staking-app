import React from "react";
import { ethers } from "ethers";
import TokenArtifact from "../contracts/Staking_Token.json";
import contractArtifact from "../contracts/Staking.json";
import contractAddress from "../contracts/contract-address.json";
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { Transfer } from "./Transfer";
import { StakingForm } from "./StakingForm";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";
import { TransComplete } from "./TransComplete";
import { NoTokensMessage } from "./NoTokensMessage";

const HARDHAT_NETWORK_ID = '190';
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;
const milliEtherConv = ethers.BigNumber.from('1000000000000000');

export class Dapp extends React.Component {
  constructor(props) {
    super(props);
    this.initialState = {
      tokenData: undefined,
      contractData: undefined,
      selectedAddress: undefined,
      balance: undefined,
      stakedBalance: undefined,
      rewardBalance: undefined,
      txBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
      token: undefined,
      contractStaked: undefined,
    };
    this.state = this.initialState;
    this._getReward = this._getReward.bind(this);
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
        <div className="row">
          <div className="col-12">
            <h1>
              Staking App
            </h1>
            <p>
              Welcome <b>{this.state.selectedAddress}</b>, you have{" "}
              <b>
                {(this.state.balance/milliEtherConv)/1000} BCX
              </b>
              .
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
              If the user has no tokens, we don't show the Transfer form
            */}
            {this.state.balance.eq(0) && (
              <NoTokensMessage selectedAddress={this.state.selectedAddress} />
            )}

            {this.state.balance.gt(0) && (
              <Transfer
                transferTokens={(to, amount) =>
                  this._transferTokens(to, amount)
                }
              />
            )}
          </div>
        </div>
        <br/>
        <hr/>
        <div className="row">
          <div className="col-12">
            <h1>
              Staking App
            </h1>
            <p>Total Staked Balance: {this.state.contractData.totalStakedTokens/1000} Reward Rate: {this.state.contractData.rewardRate/1000}</p>
            <p>
              Welcome <b>{this.state.selectedAddress}</b>, you have{" "}
              <b>
                {this.state.stakedBalance/1000}
              </b>
              {" "}Staked Balance
            </p>
            <p>
            <button onClick={this._getReward}>Check Reward</button>  
            {" "}You have{" "}
              <b>
                {this.state.rewardBalance ? this.state.rewardBalance/1000 : ''}
              </b>
              {" "}Reward Balance
            </p>
            <br/>
            <button onClick={this._claimReward}>Claim Reward</button>
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
              If the user has no tokens, we don't show the Transfer form
            */}
            {this.state.balance.eq(0) && (
              <NoTokensMessage selectedAddress={this.state.selectedAddress} />
            )}

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
                tokenSymbol={this.state.tokenData.symbol}
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
    this._checkNetwork();

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

  _initialize(userAddress) {
    // This method initializes the dapp

    // We first store the user's address in the component's state
    this.setState({
      selectedAddress: userAddress,
    });

    // Then, we initialize ethers, fetch the token's data, and start polling
    // for the user's balance.

    // Fetching the token data and the user's balance are specific to this
    // sample project, but you can reuse the same initialization pattern.
    this._initializeEthers();
    this._getTokenData();
    this._getContractData(); 
    this._startPollingData();
  }

  async _initializeEthers() {
    // We first initialize ethers by creating a provider using window.ethereum
    this._provider = new ethers.providers.Web3Provider(window.ethereum);

    // Then, we initialize the contract using that provider and the token's
    // artifact. You can do this same thing with your contracts.
    this._token = new ethers.Contract(
      contractAddress.Staking_Token,
      TokenArtifact.abi,
      this._provider.getSigner(0)
    );
    this._contractStaked = new ethers.Contract(
      contractAddress.Staking,
      contractArtifact.abi,
      this._provider.getSigner(0)
    );
    console.log('>>>>>>>', this._token, this._contractStaked);
    this.setState({token: this._token, contractStaked: this._contractStaked})
  }

  _startPollingData() {
    this._pollDataInterval = setInterval(() => this._updateBalance(), 1000);
    this._pollDataInterval = setInterval(() => this._updateStakeBalance(), 3000);

    // We run it once immediately so we don't have to wait for it
    this._updateBalance();
    this._updateStakeBalance();
  }

  _stopPollingData() {
    clearInterval(this._pollDataInterval);
    this._pollDataInterval = undefined;
  }

  async _getTokenData() {
    const name = await this._token.name();
    const symbol = await this._token.symbol();
    console.log('>>?>.', name, symbol);
    this.setState({ tokenData: { name, symbol } });
  }
  async _getContractData() {
    const rewardRate = await this._contractStaked.REWARD_RATE();
    const totalStakedTokens = await this._contractStaked.totalStakedTokens();
    const stakedBalance = await this._contractStaked.stakedBalance(this.state.selectedAddress);
    console.log('>>>>>>.', parseInt(rewardRate.div(milliEtherConv)._hex), parseInt(totalStakedTokens.div(milliEtherConv)._hex), parseInt(stakedBalance.div(milliEtherConv)._hex));
    this.setState({ contractData: { rewardRate:parseInt(rewardRate.div(milliEtherConv)._hex), totalStakedTokens: parseInt(totalStakedTokens.div(milliEtherConv)._hex), stakedBalance: parseInt(stakedBalance.div(milliEtherConv)._hex)}});
  }  
  async _updateBalance() {
    const balance = await this._provider.getBalance(this.state.selectedAddress);
    this.setState({ balance });
  }
  async _updateStakeBalance() {
    const stakedBalance = await this._contractStaked.stakedBalance(this.state.selectedAddress);
    this.setState({ stakedBalance: parseInt(stakedBalance.div(milliEtherConv)._hex)});
  }

  async _getReward() {
    console.log('>>>>>>>>>>>>>>>');
    const rewards = await this._contractStaked.updateRewardFunc(this.state.selectedAddress, { gasLimit: 500000 });
    console.log('>>>>>', rewards);
    const rewardBalance = await this._contractStaked.rewards(this.state.selectedAddress, { gasLimit: 500000 });
    console.log('>>>>>', rewardBalance);
    this.setState({ rewardBalance: parseInt(rewardBalance.div(milliEtherConv)._hex)});
  }

  async _claimReward() {
    const rewardTransfer = await this._contractStaked.getReward({ gasLimit: 500000 });
    console.log('rewards', rewardTransfer);
  }

  async _transferTokens(to, amount) {
    try {
      this._dismissTransactionError();
      const tx = await this._contractStaked.transfer(to, amount);
      this.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
      await this._updateBalance();
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
  async _withDraw (amount) {
    try {
      this._dismissTransactionError();
      console.log('????', ethers.utils.parseEther(amount));
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
      console.log('????', ethers.utils.parseEther(amount));
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
    const chainIdHex = `0x${HARDHAT_NETWORK_ID.toString(16)}`
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    await this._initialize(this.state.selectedAddress);
  }

  _checkNetwork() {
    if (window.ethereum.networkVersion !== HARDHAT_NETWORK_ID) {
      this._switchChain();
    }
  }
}
