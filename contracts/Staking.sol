
pragma solidity >=0.7.2 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/math/SafeMath.sol";

contract Staking is ReentrancyGuard {
    using SafeMath for uint256;
    IERC20 public s_stakingToken;

    uint public constant REWARD_RATE=1e17; //1 token/10sec        //(11574*1e9);    //1 token/day
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

    constructor(address _stakingToken){
        s_stakingToken = IERC20(_stakingToken);
        lastTimeUnlocked = block.timestamp;
    }

    modifier updateUnlocked() {
        uint timeDiff = block.timestamp.sub(lastTimeUnlocked);
        lastTimeUnlocked = block.timestamp;
        uint unlocked = ((unlockedRate[msg.sender]).mul(timeDiff)).div(60);
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
            updateReward(_buyers[i]);
            emit Staked(msg.sender, _amount[i]);
        }
    }

    function rewardPerToken() public view returns(uint) {
        if (totalStakedTokens == 0) {
            return rewardPerTokenStored;
        }
        uint totalTime = block.timestamp.sub(lastUpdatedTime);
        uint totalRewards = REWARD_RATE.mul(totalTime);
        return rewardPerTokenStored.add(totalRewards.div(totalStakedTokens));
    }
    
    function earned(address _account) public view returns(uint) {
        return((stakedBalance[_account])*(rewardPerToken()-userRewardPerTokenPaid[_account]));
    }

    function updateReward(address account) public {
        rewardPerTokenStored = rewardPerToken();
        lastUpdatedTime = block.timestamp;
        rewards[account] = earned(account);
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
    }

    function stake(uint amount) external nonReentrant updateUnlocked(){
        require(amount>0, "Amount must be greater than zero");
        updateReward(msg.sender);
        totalStakedTokens+=amount;
        stakedBalance[msg.sender]+=amount;
        emit Staked(msg.sender, amount);

        bool success = s_stakingToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer Failed");
    }
    
    function withdraw(uint amount) external nonReentrant updateUnlocked(){
        require(amount<unlockedTokens[msg.sender], "Max Unlocked reached");
        require(amount>0, "Amount must be greater than zero");
        updateReward(msg.sender);
        totalStakedTokens-=amount;
        stakedBalance[msg.sender]-=amount;
        unlockedTokens[msg.sender]-=amount;
        emit Withdrawn(msg.sender, amount);

        bool success = s_stakingToken.transfer(msg.sender, amount); 
        require(success, "Transfer Failed");    
    }

    function getReward() external nonReentrant {
        updateReward(msg.sender);
        uint reward = rewards[msg.sender];
        require(reward>0, "No rewards to claim");
        rewards[msg.sender] = 0;
        emit RewardsClaimed(msg.sender, reward);

        bool success = s_stakingToken.transfer(msg.sender, reward);
        require(success, "Transfer Failed");
    }
}