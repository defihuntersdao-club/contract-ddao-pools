require('solidity-coverage');
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-waffle");

const path = require('path');
const envPath = path.join(__dirname, './.env');
require('dotenv').config({ path: envPath });

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: "0.8.0",
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_KEY_RINKEBY}`,
        blockNumber: 10000000,
      },
    },
    rinkeby: {
        url: `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_KEY_RINKEBY}`,
        accounts: [process.env.PRIVATE_KEY],
    },
    ropsten: {
        url: `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_KEY_ROPSTEN}`,
        accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY_RINKEBY,
  }
};