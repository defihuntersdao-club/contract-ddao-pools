const DDAOallocV01 = artifacts.require("DDAOallocV01");

module.exports = async (deployer, network, accounts) => {    
    await deployer.deploy(DDAOallocV01);
    let ddaoAllocV01Instance = await DDAOallocV01.deployed();
  
    console.log("DDAOallocV01 - ", ddaoAllocV01Instance.address)
    console.log("__Network__ - ", network)
    console.log('accounts[0] - ', accounts[0])
  };