var crypto = require('crypto');//利用crypto实现SHA256加密
// 创建一个block类
function Block(timestamp, transactions, previousHash = ''){
	var bObj = new Object();
	bObj.timestamp = timestamp;
	bObj.transactions = transactions;
	bObj.previousHash = previousHash;
	bObj.nonce = 0;
	bObj.createHashData = function(){
		var structStr = this.previousHash + this.timestamp + JSON.stringify(this.transactions)+this.nonce;
		return crypto.createHash('sha256').update(structStr).digest('hex');
	}
	bObj.hashData = bObj.createHashData();
	bObj.mineBlock = function(difficulty) {
    	while (this.hashData.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
        	bObj.nonce++;
        	bObj.hashData = bObj.createHashData();
        	// console.log("NOW HASHDATA"+bObj.hashData);
    	}
    	console.log("BLOCK MINED: " + bObj.hashData);
}
	return bObj;
}
//创建一个交易类
function Transaction(fromAddress, toAddress, amount){
	var tObj = {};
	tObj.fromAddress = fromAddress;
    tObj.toAddress = toAddress;
    tObj.amount = amount;
    return tObj;
}
// 创建一个blockchain类
function BlockChain(){
	var blockchainObj = {};
	blockchainObj.createGenesisBlock = function(){
    	return Block(0, "01/01/2017", "Genesis block", "0");
  	}
  	blockchainObj.chain = [blockchainObj.createGenesisBlock()];
  	blockchainObj.difficulty = 5;
  	// 在区块产生之间存储交易的地方
    blockchainObj.pendingTransactions = [];
    // 挖矿回报
    blockchainObj.miningReward = 100;
  	blockchainObj.getLatestBlock = function(){
    	return blockchainObj.chain[blockchainObj.chain.length - 1];
  	}
  	blockchainObj.addBlock = function(newBlock) {
    	newBlock.previousHash = blockchainObj.getLatestBlock().hashData;
    	// newBlock.hashData = newBlock.createHashData();
    	newBlock.mineBlock(this.difficulty);
    	blockchainObj.chain.push(newBlock);
  	}
  	blockchainObj.createTransaction = function(transaction) {
  		// 这里应该有一些校验!

  		// 推入待处理交易数组
  		blockchainObj.pendingTransactions.push(transaction);
	}
	blockchainObj.minePendingTransactions = function(miningRewardAddress) {
  		// 用所有待交易来创建新的区块并且开挖..
  		let block = Block(Date.now(), this.pendingTransactions,blockchainObj.chain[blockchainObj.chain.length-1].hashData);
  		block.mineBlock(this.difficulty);

  		// 将新挖的看矿加入到链上
  		this.chain.push(block);

  		// 重置待处理交易列表并且发送奖励
  		this.pendingTransactions = [
      		Transaction(null, miningRewardAddress, this.miningReward)
  		];
	}
	blockchainObj.getBalanceOfAddress = function(address){
  		let balance = 0; // you start at zero!

  		// 遍历每个区块以及每个区块内的交易
  		for(var i=0;i<this.chain.length;i++){
    		for(var j=0;j<this.chain[i].transactions.length;j++){

      			// 如果地址是发起方 -> 减少余额
      			if(this.chain[i].transactions[j].fromAddress === address){
        			balance -= parseInt(this.chain[i].transactions[j].amount);
      			}

      			// 如果地址是接收方 -> 增加余额
      			if(this.chain[i].transactions[j].toAddress === address){
        			balance += parseInt(this.chain[i].transactions[j].amount);
      			}
    		}
  		}
		return balance;
	}
  	blockchainObj.isChainValid = function(){
    	for (let i = 1; i < blockchainObj.chain.length; i++){
      		const currentBlock = blockchainObj.chain[i];
      		const previousBlock = blockchainObj.chain[i - 1];

      		if (currentBlock.hashData !== currentBlock.createHashData()) {
        		return false;
      		}

      		if (currentBlock.previousHash !== previousBlock.hashData) {
        		return false;
      		}
    	}
    	return true;
  	}
  	return blockchainObj;
}

module.exports=objDic={
    Block,
    BlockChain,
    Transaction
}