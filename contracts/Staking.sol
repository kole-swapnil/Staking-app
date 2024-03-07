
pragma solidity >=0.7.2 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Staking is ReentrancyGuard {
    using SafeMath for uint256;

    uint public constant REWARD_RATE=274e12; //1 token/10 sec 274e12 //10%/annum
    uint public totalStakedTokens;
    uint public rewardPerTokenStored;
    uint public lastUpdatedTime;
    uint public lastTimeUnlocked;

    mapping (address => uint) public stakedBalance;
    mapping (address => uint) public rewards;
    mapping (address => uint) public userRewardPerTokenPaid;
    mapping (address => uint) public unlockedTokens;
    mapping (address => uint) public unlockedRate;

    event Staked(address indexed user, uint256 indexed amount);
    event Withdrawn(address indexed user, uint256 indexed amount);
    event RewardsClaimed(address indexed user, uint256 indexed amount);

    constructor() {
        lastTimeUnlocked = block.timestamp;
        lastUpdatedTime = block.timestamp;
    }

    modifier updateUnlocked() {
        uint timeDiff = block.timestamp.sub(lastTimeUnlocked);
        lastTimeUnlocked = block.timestamp;
        //check rate
        uint unlocked = stakedBalance[msg.sender].mul(timeDiff.div(60));
        unlockedTokens[msg.sender] += unlocked;
        _;
    }

    function updateUnlockedNew() public {
        uint timeDiff = block.timestamp.sub(lastTimeUnlocked);
        lastTimeUnlocked = block.timestamp;
        uint unlocked = ((unlockedRate[msg.sender]).mul(timeDiff)).div(60);
        unlockedTokens[msg.sender] += unlocked;
    }
    
    function giveUserInitialBalance(address[] memory _buyers, uint[] memory _amount, uint[] memory _vestTime) public {
        for(uint8 i=0;i < _buyers.length; i++){
            stakedBalance[_buyers[i]] += _amount[i];
            totalStakedTokens+=_amount[i];
            unlockedRate[_buyers[i]] = (_amount[i]).div(_vestTime[i]);
            updateRewardFunc(_buyers[i]);
            emit Staked(msg.sender, _amount[i]);
        }
    }

    function rewardPerToken() public view returns(uint) {
        if (totalStakedTokens == 0) {
            return rewardPerTokenStored;
        }
        uint totalTime = block.timestamp.sub(lastUpdatedTime);
        uint totalRewards = REWARD_RATE.mul(totalTime);
        return rewardPerTokenStored.add(totalRewards.mul(1e18).div(totalStakedTokens));
    }
    
    function earned(address _account) public view returns(uint) {
        return(((stakedBalance[_account])*(rewardPerToken()))-userRewardPerTokenPaid[_account]).div(1e18);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdatedTime = block.timestamp;
        rewards[account] = earned(account);
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
        _;
    }
    function updateRewardFunc(address account) public {
        rewardPerTokenStored = rewardPerToken();
        lastUpdatedTime = block.timestamp;
        rewards[account] = earned(account);
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }

    function stake() external payable nonReentrant updateReward(msg.sender) updateUnlocked(){
        // require(amount<unlockedTokens[msg.sender], "Max Unlocked reached");
        require(msg.value>0, "Amount must be greater than zero");
        totalStakedTokens+=msg.value;
        stakedBalance[msg.sender]+=msg.value;
        // unlockedTokens[msg.sender]-=amount;
        emit Staked(msg.sender, msg.value);
    }

    function withdraw(uint amount) external nonReentrant updateReward(msg.sender) updateUnlocked(){
        require(amount>0 && amount<=stakedBalance[msg.sender], "Amount must be greater than zero");
        totalStakedTokens-=amount;
        stakedBalance[msg.sender]-=amount;
        unlockedTokens[msg.sender]-=amount;
        emit Withdrawn(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer Failed");    
    }

    function getReward() external nonReentrant updateReward(msg.sender) {
        uint reward = rewards[msg.sender];
        require(reward>0 && reward < rewards[msg.sender], "No rewards to claim");
        rewards[msg.sender] = 0;
        emit RewardsClaimed(msg.sender, reward);
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Transfer Failed");
    }
    fallback() external payable {
        // This function is executed on a call to the contract if none of the other
        // functions match the given function signature, or if no data is supplied at all
    }
}