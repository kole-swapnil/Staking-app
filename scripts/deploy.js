const hre = require("hardhat");

async function main() {

  const lock = await hre.ethers.deployContract("Token");

  await lock.waitForDeployment();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});