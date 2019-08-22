var express = require('express');
var app = express();
var path = require('path');
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);

var port = process.env.PORT || 7080;
var numUsers = 0;
var currentSocket;
let objDic=require('./mine')

//为桌面客户端设置允许跨域
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
    BWCoin = objDic.BlockChain();
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
        var testChian = objDic.BlockChain();
        testChian.chain = JSON.parse(dat);
        if(testChian.isChainValid()){
          if(testChian.chain.length < serverChain.length){
            res.end("please update chain");
          }else{
            fs.writeFileSync('CB.json',dat);
        delete testChian;
        res.end("mine success!");
          }
          
        }else{
          res.end("your data is not Valid!please Check!");
        }
        
    })
});
//addTransData：用户添加自己的交易
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
        var testChian = objDic.BlockChain();
        testChian.chain = JSON.parse(dat).data;
        var serverChain = JSON.parse(fs.readFileSync('CB.json','utf-8')).data;
          if(testChian.chain.length < serverChain.length){
            res.end("当前链不是最新，请拉取最新链！");
          }else{
            fs.writeFileSync('CB.json',dat);
        delete testChian;
        res.end("记账成功！");

          }
        
    })
});
//用户获取最新区块
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