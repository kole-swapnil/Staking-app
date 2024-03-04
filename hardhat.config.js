require("@nomicfoundation/hardhat-toolbox");

// The next line is part of the sample project, you don't need it in your
// project. It imports a Hardhat task definition, that can be used for
// testing the frontend.
require("./tasks/faucet");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    development: {
      url: "http://127.0.0.1:8545/",
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
      gas: 8500000,           // Gas sent with each transaction (default: ~6700000)
      gasPrice: 20000000000, 
     },
    atlantis: {
      url: "https://atlantis-web3.blockxnet.com",
      accounts: ['e3b2a6fb7734caaebbd10e7ec25725c5b152cf3b54f85a8a402900849f5a5f97'],
      network_id: 190,
      gas: 8500000,           // Gas sent with each transaction (default: ~6700000)
      gasPrice: 20000000000, 
    }
  }
};
