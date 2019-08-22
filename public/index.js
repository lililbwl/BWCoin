var CB;
var socket;
$(function () {
    socket = io();
    // Initialize variables
    var $window = $(window);
    var clientWidth = document.documentElement.clientWidth;
    console.log(clientWidth);
    if (clientWidth < 1000) {
        alert("请在电脑端使用！");
    }
    var $usernameInput = $('.usernameInput'); // Input for username
    var $messages = $('.messages'); // Messages area
    var $inputMessage = $('.inputMessage'); // Input message input box
    var $loginPage = $('#login'); // The login page
    $(".chatBox").height($(document.body).height());
    var name = localStorage.getItem('username');
    var addr = localStorage.getItem('addr');
    // document.getElementById('msg').innerText = "消息列表！(当前用户：" + name + ")";
    if (name) {
        $loginPage.fadeOut();
        document.getElementById('msge').innerText = "消息列表！(当前用户：" + name + ")";
    } else {

    }
    if (addr) {
        document.getElementById('addr').value = addr;
        document.getElementById('addAddr').value = addr;
    } else {

    }
    $('form').submit(function (e) {
        e.preventDefault(); // prevents page reloading
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });
    socket.on('chat message', function (msg) {
        $('#messages').append($('<li>').text(msg));
    });
    socket.on('block mine', function (msg) {
        alert(msg.data);
    });
    socket.on('login', (data) => {
        connected = true;
        // Display the welcome message
        var message = "Welcome to BWCoin~ Chat – ";
        alert(message + data.currentName);
    });
    socket.on('user joined', (data) => {
        alert("Welcome " + data.username + 'join!');
    });
    var setUsername = function () {
        username = $usernameInput.val().trim();

        console.log(username);
        localStorage.setItem('username', username);
        document.getElementById('msge').innerText = "消息列表！(" + username + ')';
        $loginPage.fadeOut();
        if (username) {
            socket.emit('add user', username);
        }
    }

    $window.keydown(function (event) {
        var name = localStorage.getItem('username');
        if (event.which === 13) {
            if (name) {
                // console.log("当前名字为" + localStorage.getItem('username'));
                // localStorage.setItem('username',name);
                document.getElementById('msge').innerText = "消息列表！(" + name + ')';
            } else {
                setUsername();
            }
        }
    });
    var xhr = new XMLHttpRequest();
    xhr.open("get", "/getNewestData", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                var newestData = JSON.parse(xhr.responseText);
                var n = JSON.parse(newestData);
                CB = new BlockChain();
                CB.chain = n.data;
                localStorage.setItem('data', JSON.stringify(CB.chain));
                CB.pendingTransactions = n.trans;
                localStorage.setItem('trans', JSON.stringify(CB.pendingTransactions));
                if (addr) {
                    document.getElementById('coinCount').innerText = "当前钱包地址BWCoin数为：" + CB.getBalanceOfAddress(addr);
                } else {
                    document.getElementById('coinCount').innerText = "当前钱包地址BWCoin数为：0";
                }

            }
        }
    }
    xhr.send();

});

function startMind() {
    var addr;
    var localAddr = localStorage.getItem('addr');
    if (localAddr) {
        addr = localAddr;
    } else {
        addr = document.getElementById('addr').value;
    }
    if (addr.length < 16) {
        alert("地址输入不合法！");
        return;
    }
    alert("即将开始记账！");
    CB.minePendingTransactions(addr);
    localStorage.setItem('data', JSON.stringify(CB.chain));
    localStorage.setItem('trans', JSON.stringify(CB.pendingTransactions));
    var postData = {};
    postData.data = CB.chain;
    postData.trans = CB.pendingTransactions;
    var xhr = new XMLHttpRequest();
    xhr.open("post", "/currentData", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                // document.getElementById('loader').style.display = "none";
                localStorage.setItem('addr', addr);
                if (xhr.responseText == "mine success!") {
                    socket.emit('chat message', 'System: 当前区块被'+localStorage.getItem("username")+'成功挖出，请刷新浏览器获取最新账本！');
                    alert("当前区块被挖出!");
                }else if(xhr.responseText == "please update chain"){
                    alert("当前链不是最长链！请刷新浏览器获取！");
                }else{
                    alert("操作有误！");
                }

            }
        }
    }
    xhr.send(JSON.stringify(postData));
}
function checkIliggle() {
    if (CB.isChainValid()) {
        alert("数据未被篡改！");
    } else {
        alert("数据异常！请刷新浏览器重新拉取区块链！");
    }
}
function release() {
    var trans = localStorage.getItem('trans');
    console.log(trans);
    var addr = localStorage.getItem('addr');
    var formAddr;
    if (addr) {
        formAddr = addr;
    } else {
        formAddr = document.getElementById('addAddr').value;
    }
    var postAddr = document.getElementById("postAddr").value;
    var coinCount = document.getElementById("coinC").value;
    var userCoin = CB.getBalanceOfAddress(formAddr);
    if (formAddr.length > 15 && postAddr.length > 15 && parseInt(coinCount)<= parseInt(userCoin)) {
        var obj = {};
        obj.fromAddress = formAddr;
        obj.toAddress = postAddr;
        obj.amount = parseInt(coinCount);
        var nowTrans = "["+trans.substring(1,trans.length-1)+","+ JSON.stringify(obj)+"]";
        console.log(nowTrans);
        localStorage.setItem('trans', nowTrans);
        var postData = {};
        postData.data = localStorage.getItem('data');
        postData.trans = nowTrans;

        var xhr = new XMLHttpRequest();
        xhr.open("post", "/addTransData", true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    socket.emit('chat message', 'System: '+localStorage.getItem("username")+'发布了新账单！请刷新浏览器获取最新账本！');
                        alert(xhr.responseText);

                }
            }
        }
        xhr.send(JSON.stringify(postData));

    } else {
        alert("数据格式错误！");
    }
}