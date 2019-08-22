var express = require('express');
var app = express();
var path = require('path');
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var crypto = require('crypto');//利用crypto实现SHA256加密
var port = process.env.PORT || 7080;
var numUsers = 0;
var currentSocket;
//区块代码
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
        			balance -= this.chain[i].transactions[j].amount;
      			}

      			// 如果地址是接收方 -> 增加余额
      			if(this.chain[i].transactions[j].toAddress === address){
        			balance += this.chain[i].transactions[j].amount;
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
//设置所有请求允许跨域


app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("X-Powered-By",' 3.2.1')
  if(req.method=="OPTIONS") res.send(200);/*让options请求快速返回*/
  else  next();
});
//创建区块链
var BWCoin;
var coinCon = fs.readFileSync('CB.json','utf-8');
if(coinCon != ""){
    BWCoin = coinCon; 
}else{
    BWCoin = BlockChain();
    BWCoin.createTransaction(Transaction('address1', 'address2', 100));
    BWCoin.createTransaction(Transaction('address2', 'address1', 50));
    BWCoin.minePendingTransactions("liubowen_god");
    var dataObj = {};
    dataObj.data = BWCoin.chain;
    dataObj.trans = BWCoin.pendingTransactions;
    fs.writeFileSync('CB.json',JSON.stringify(dataObj));
}
server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
    
  res.sendFile(__dirname + '/index.html');
});
app.post('/currentData',function(req,res){
    var data;
    req.on('data',function(chunk){
        data+=chunk;
    });
    req.on('end',function(){
        var dat = data.substring(9,data.length) ;
        // console.log(dat);
        var serverChain = JSON.parse(fs.readFileSync('CB.json','utf-8')).data;
        var testChian = BlockChain();
        testChian.chain = JSON.parse(dat);
        if(testChian.isChainValid()){
          if(testChian.chain.length < serverChain.length){
            res.end("please update chain");
          }else{
            fs.writeFileSync('CB.json',dat);
        // currentSocket.broadcast.emit('block mine', {
        //     data: "System: 当前交易记录已被"+currentSocket.username+"成功记账(挖矿)，请刷新浏览器重新拉取最新账本!"
        // });
        delete testChian;
        res.end("mine success!");
          }
          
        }else{
          res.end("your data is not Valid!please Check!");
        }
        
    })
});
//addTransData
app.post('/addTransData',function(req,res){
    var dataa;
    req.on('data',function(chunk){
        dataa+=chunk;
    });
    req.on('end',function(){
        var dat = dataa.substring(9,dataa.length);
        var reg = /\\/g;
        dat = dat.replace(reg,"");
        var left = /"\[/g;
        dat = dat.replace(left,"[");
        var right = /\]"/g;
        dat = dat.replace(right,"]");
        // console.log(dat);
        var testChian = BlockChain();
        testChian.chain = JSON.parse(dat).data;
        var serverChain = JSON.parse(fs.readFileSync('CB.json','utf-8')).data;
        // if(testChian.isChainValid()){
          if(testChian.chain.length < serverChain.length){
            res.end("当前链不是最新，请拉取最新链！");
          }else{
            fs.writeFileSync('CB.json',dat);
        // currentSocket.on('chat message', function(msg){
        //   io.emit('chat message', msg);
        // });
        delete testChian;
        res.end("记账成功！");

          }
        // }else{
        //   res.end("您的当前链数据不正确！请重新拉取最新链！");
        // }
        
    })
});
app.get('/getNewestData',function(req,res){
    var coinCon = fs.readFileSync('CB.json','utf-8');
    res.end(JSON.stringify(coinCon));
})

io.on('connection', function(socket){
    currentSocket = socket;
//   console.log('a user connected');
  socket.on('disconnect', function(){
    // console.log('user disconnected');
  });
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
  socket.on('add user', (username) => {
    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    var nameData = fs.readFileSync('name.txt','utf-8');
    nameData = nameData+username+",";
    fs.writeFileSync('name.txt',nameData);
    socket.emit('login', {
      numUsers: numUsers,
      currentName:username
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });
});






