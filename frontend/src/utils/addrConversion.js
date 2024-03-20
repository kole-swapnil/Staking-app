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