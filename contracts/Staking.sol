
pragma solidity >=0.7.2 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Staking is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    uint public REWARD_RATE=1e11; //1 token/100 sec 274e12 //10%/annum
    uint public totalStakedTokens;
    uint private rewardPerTokenStored;
    uint private contractStartTime;

    mapping (address => uint) public stakedBalance;
    mapping (address => uint) public rewards;
    mapping (address => uint) public userRewardPerTokenPaid;
    mapping (address => uint) public vestedTokens;
    mapping (address => uint) public unlockedRate;
    mapping (address => uint) public lockedTime;
    mapping (address => bool) public isUnLocked;
    mapping (address => uint) public lastTimeUnlocked;
    mapping (address => uint) public lastUpdatedTime;

    event Staked(address indexed user, uint256 indexed amount);
    event Withdrawn(address indexed user, uint256 indexed amount);
    event RewardsClaimed(address indexed user, uint256 indexed amount);
    event UpdateReward(uint _newRate);

    constructor
    (address initialOwner) Ownable(initialOwner)
    {
        contractStartTime = block.timestamp;
    }

    modifier updateUnlocked() {
        updateUnlockedNew();
        _;
    }

    function updateUnlockedNew() public {
        if (lastTimeUnlocked[msg.sender] == 0) {
            lastTimeUnlocked[msg.sender] = contractStartTime;
        }
        uint timeDiff = block.timestamp.sub(lastTimeUnlocked[msg.sender]);
        if (timeDiff > lockedTime[msg.sender] && !isUnLocked[msg.sender]) {
            timeDiff -= lockedTime[msg.sender];
            isUnLocked[msg.sender] = true;
        }
        if (isUnLocked[msg.sender]) {
            lastTimeUnlocked[msg.sender] = block.timestamp;
            uint unlocked = unlockedRate[msg.sender].mul(timeDiff);
            vestedTokens[msg.sender] += unlocked;
        }
    }
    
    function updateREWARD_RATE(uint _rate) public onlyOwner(){
        REWARD_RATE = _rate;
        emit UpdateReward(_rate);
    }

    function giveUserInitialBalance(address[] memory _buyers, uint[] memory _amount, uint[] memory _vestTime, uint[] memory _lockedTime) public onlyOwner(){
        for(uint8 i=0;i < _buyers.length; i++){
            stakedBalance[_buyers[i]] += _amount[i];
            totalStakedTokens+=_amount[i];
            lockedTime[_buyers[i]] = _lockedTime[i];
            unlockedRate[_buyers[i]] = (_amount[i]).div(_vestTime[i]);
            emit Staked(msg.sender, _amount[i]);
        }
    }

    function rewardPerToken() private view returns(uint) {
        if (totalStakedTokens == 0) {
            return rewardPerTokenStored;
        }
        uint totalTime = block.timestamp.sub(lastUpdatedTime[msg.sender]);
        uint totalRewards = REWARD_RATE.mul(totalTime);
        return rewardPerTokenStored.add(totalRewards.mul(1e18).div(totalStakedTokens));
    }
    
    function earned(address _account) private view returns(uint) {
        return(((stakedBalance[_account])*(rewardPerToken()))-userRewardPerTokenPaid[_account]).div(1e18);
    }

    modifier updateReward() {
        updateRewardFunc();
        _;
    }
    function updateRewardFunc() public {
        if (lastUpdatedTime[msg.sender] == 0) {
            lastUpdatedTime[msg.sender] = contractStartTime;
        }
        rewardPerTokenStored = rewardPerToken();
        lastUpdatedTime[msg.sender] = block.timestamp;
        rewards[msg.sender] = earned(msg.sender);
        userRewardPerTokenPaid[msg.sender] = rewardPerTokenStored;
    }

    function stake() external payable nonReentrant updateReward() updateUnlocked(){
        require(msg.value>0, "Amount must be greater than zero");
        totalStakedTokens+=msg.value;
        stakedBalance[msg.sender]+=msg.value;
        vestedTokens[msg.sender]+=msg.value;
        emit Staked(msg.sender, msg.value);
    }

    function withdraw(uint amount) external nonReentrant updateReward() updateUnlocked(){
        require(amount>0 && amount<=stakedBalance[msg.sender], "Amount must be greater than zero");
        totalStakedTokens-=amount;
        stakedBalance[msg.sender]-=amount;
        vestedTokens[msg.sender]-=amount;
        emit Withdrawn(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer Failed");    
    }

    function getReward() external nonReentrant updateReward() {
        uint reward = rewards[msg.sender];
        require(reward>0, "No rewards to claim");
        rewards[msg.sender] = 0;
        emit RewardsClaimed(msg.sender, reward);
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Transfer Failed");
    }

    function withdrawBalance(uint balance) public payable nonReentrant onlyOwner() returns(bool) {
        require(balance <= address(this).balance);
        (bool success, ) = _msgSender().call{value: balance}("");
        return success;
    }
    
    fallback() external payable {
        // This function is executed on a call to the contract if none of the other
        // functions match the given function signature, or if no data is supplied at all
    }
}