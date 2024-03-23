const axios = require('axios');

// Function to fetch data from API
async function fetchData() {
    try {
        //Make a GET request to the API
        const response = await axios.get('https://script.google.com/macros/s/AKfycbxVdHSNIQFoZ_QI9LLPgnjBipX0rmDyo0CSqhw91u9MGzO9axZNFSiQbIkHxuZMNe5D/exec');

        // Display the data in the console
        console.log('Data from API:');
        let clippedData = response.data.slice(0,20);
        let onlyAddreses = getAddresses(clippedData);
        console.log(JSON.stringify(onlyAddreses))
        let onlyAmt = getAmt(clippedData);
        console.log(onlyAmt);
        let onlyVestTime = getVestTime(clippedData);
        console.log(onlyVestTime);
    } catch (error) {
        // If there's an error, display it in the console
        console.error('Error fetching data:', error.message);
    }
}

function getAddresses(data) {
    // Use map to extract Addresses from each object
    return data.map(obj => obj.Addresses.replace(/'/g, '"'));
  }
function getAmt(data) {
    // Use map to extract Addresses from each object
    return data.map(obj => obj.Amount*1e18);
  }
  function getVestTime(data) {
    // Use map to extract Addresses from each object
    return data.map(obj => obj.Days*86400);
  }
// Call the fetchData function
fetchData();






["0xd52d72c78d747a46bacab66cde1e70eadc87d6a0","0x94a0eb2c7c0a48a50704112d792b75259ca60d11","0x94a0eb2c7c0a48a50704112d792b75259ca60d11","0xd52d72c78d747a46bacab66cde1e70eadc87d6a0","0xd52d72c78d747a46bacab66cde1e70eadc87d6a0","0x4271AC6Bb565D120e2Ac1C3fb855aE5Dad6aE8ff","0xd52d72c78d747a46bacab66cde1e70eadc87d6a0","0xd52d72c78d747a46bacab66cde1e70eadc87d6a0","0xd52d72c78d747a46bacab66cde1e70eadc87d6a0","0x4271AC6Bb565D120e2Ac1C3fb855aE5Dad6aE8ff","0xd52d72c78d747a46bacab66cde1e70eadc87d6a0","0xd52d72c78d747a46bacab66cde1e70eadc87d6a0","0xd52d72c78d747a46bacab66cde1e70eadc87d6a0","0xeA3e926716ecA0C71722db6952048fE80970FE57","0x0aD8A99fb3Bf469D644613c846E9Ea170BAA4051","0xeA3e926716ecA0C71722db6952048fE80970FE57","0x0aD8A99fb3Bf469D644613c846E9Ea170BAA4051","0xeA3e926716ecA0C71722db6952048fE80970FE57","0x94a0eb2c7c0a48a50704112d792b75259ca60d11","0xd52d72c78d747a46bacab66cde1e70eadc87d6a0"]

[
  1000000000000000, 1000000000000000,
  1000000000000000, 1000000000000000,
  2000000000000000, 20000000000000000,
  1000000000000000, 1000000000000000,
  3000000000000000, 10000000000000000,
  1000000000000000, 5000000000000000,
  5000000000000000, 1000000000000000,
  1000000000000000, 1000000000000000,
  2000000000000000, 1000000000000000,
  1000000000000000, 1000000000000000
]

[
  1728000, 1728000, 864000,
  1728000, 1728000, 864000,
  432000, 1728000, 432000,
  864000, 864000, 1728000,
  864000, 1728000, 1728000,
  1728000, 864000, 1728000,
  1728000, 432000
]



[
  1000, 1000, 1000,
  100, 100, 100,
  1000, 1000, 1000,
  100, 1000, 100,
  1000, 100, 1000,
  100, 100, 1000,
  100, 100
]


