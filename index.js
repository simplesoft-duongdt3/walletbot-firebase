const config = require('config');
const tools = require('./tools');
const formatTool = require('./formattool');
const mysqlUtil = require('./mysqlUtil');
const payloads = require('./botpayload');
const BootBot = require('bootbot');
const mysql = require('mysql');

const configAuth = config.get('messenger_bot.auth');
const configDb = config.get('messenger_bot.db');

let dbPool = mysql.createPool({
    connectionLimit: 10,
    host: configDb.host,
    user: configDb.user,
    password: configDb.pass,
    database: configDb.database
});

const bot = new BootBot({
    accessToken: configAuth.accessToken,
    verifyToken: configAuth.verifyToken,
    appSecret: configAuth.appSecret
});

bot.setGetStartedButton(payloads.GET_STARTED);
bot.setGreetingText("I'm Tiny Wallet Bot. Nice to meet you!");
/*bot.setPersistentMenu([
 // {title: "Settings", type: "postback", payload: payloads.SETTING},
 {title: "Help", type: "postback", payload: payloads.HELP}
 ], false);*/

bot.on('message', onUserSendMessage);
bot.on('postback', onUserSendPostback);
bot.start();


//---------------FUNCTIONS for bot----------------\\

function onUserNeedHelp(payload, chat) {
    let titleHelpInput = "Input";
    let subTitleHelpInput = 'Examples:\nbuy st 2,000.05, buy st 5k, buy st 1m';
    let titleHelpReport = 'Report';
    let subTitleHelpReport = 'report [time]\n' +
        'Accepted times:\ntoday, yesterday, week, month, 3d, 17/02, 17/02/2017, 17/02-18/02, 17/02/2017-18/02/2017';
    let titleHelpHistory = 'History';
    let subTitleHelpHistory = 'history [time]\n' +
        'Accepted times:\ntoday, yesterday, week, month, 3d, 17/02, 17/02/2017, 17/02-18/02, 17/02/2017-18/02/2017';
    chat.sendGenericTemplate([{title: titleHelpInput, subtitle: subTitleHelpInput},
        {title: titleHelpReport, subtitle: subTitleHelpReport},
        {title: titleHelpHistory, subtitle: subTitleHelpHistory}
    ]);

    /*chat.say({
     text: 'FAQ',
     buttons: [
     {type: 'postback', title: 'Input format', payload: payloads.HELP_INPUT_FORMAT},
     {type: 'postback', title: 'Report', payload: payloads.HELP_REPORT},
     // { type: 'postback', title: 'Transaction', payload: payloads.HELP_TRANSACTION }
     ]
     });*/
}

function onUserHello(payload, chat) {
    // Send a text message with quick replies
    chat.say({
        text: 'Nice to see you! Can i help you anything?',
        buttons: [
            // {type: 'postback', title: 'Settings', payload: payloads.SETTING},
            {type: 'postback', title: 'Help', payload: payloads.HELP},
            // {type: 'postback', title: 'FAQ', payload: payloads.FAQ},
        ]
    });
}

function createTransaction(records, userId, callbackSuccess, callbackFail) {
    let transactions = [];

    records.forEach((record) => {
        let timeNow = formatTool.nowMillisecond();
        let transaction = [userId, record.name, record.value, timeNow, timeNow];
        transactions.push(transaction);
    });

    mysqlUtil.insert(dbPool, "Transaction", "userId, name, value, timeTransaction, timeCreated", transactions, callbackSuccess, callbackFail);
}

function createTransactionAndSendFromText(text, userId, chat) {
    let arrayOfLines = text.match(/[^\r\n]+/g);
    let textUserSaid = "";
    if (arrayOfLines) {

        let arrayItem = [];
        let records = [];
        arrayOfLines.forEach(line => {
            let record = tools.getRecordFromText(line);
            if (record) {
                records.push(record);
                let nameRecord = record.name;
                let valueRecord = formatTool.formatNumber(record.value);
                let sendValue = {title: valueRecord, subtitle: nameRecord};
                arrayItem.push(sendValue);
                //textCreateRecord += "Created a new record: " + record.name + " : " +  + "\n";
            } else {
                textUserSaid += line + "\n";
            }
        });

        if (textUserSaid.length > 0) {
            chat.say("You said: \n" + textUserSaid);
        }

        createTransaction(records, userId, () => {
            sendArrayItemToChat(arrayItem, chat);
        }, () => {
            chat.sendTextMessage("Create transactions fail! Try again later!")
        });
    }
}
function onUserSendMessage(payload, chat) {
    const text = payload.message.text;
    const userId = payload.sender.id;
    if (tools.checkKeyword(text, ["help"])) {
        onUserNeedHelp(payload, chat);
    } else if (tools.checkKeyword(text, ['hi', 'hello'])) {
        onUserHello(payload, chat);
    } else if (tools.checkKeyword(text, ["report"])) {
        report(payload, chat, null, null);
    } else if (tools.checkKeyword(text, ["history"])) {
        history(payload, chat, null, null);
    } else {
        let nowWithTimeZone = formatTool.now().add(7, 'h');
        if (tools.checkWithRegExp(text, /^\s*report\s*today\s*$/i)) {
            let fromTime = nowWithTimeZone.format("DD/MM/YYYY");
            report(payload, chat, fromTime, fromTime);
        } else if (tools.checkWithRegExp(text, /^\s*report\s*yesterday\s*$/i)) {
            let fromTime = nowWithTimeZone.add(-1, 'd').format("DD/MM/YYYY");
            report(payload, chat, fromTime, fromTime);
        } else if (tools.checkWithRegExp(text, /^\s*report\s*week\s*$/i)) {
            let fromTimeDate = nowWithTimeZone.isoWeekday("Monday");
            let fromTime = fromTimeDate.format("DD/MM/YYYY");

            let toTimeDate = nowWithTimeZone.isoWeekday("Sunday");
            let toTime = toTimeDate.format("DD/MM/YYYY");
            report(payload, chat, fromTime, toTime);
        } else if (tools.checkWithRegExp(text, /^\s*report\s*month\s*$/i)) {
            let fromTimeDate = nowWithTimeZone.date(1);
            let fromTime = fromTimeDate.format("DD/MM/YYYY");

            let toTimeDate = nowWithTimeZone.date(1).add(1, 'M').add(-1, 'd');
            let toTime = toTimeDate.format("DD/MM/YYYY");
            report(payload, chat, fromTime, toTime);
        } else if (tools.checkWithRegExp(text, /^\s*history\s*today\s*$/i)) {
            let fromTime = nowWithTimeZone.format("DD/MM/YYYY");
            history(payload, chat, fromTime, fromTime);
        } else if (tools.checkWithRegExp(text, /^\s*history\s*yesterday\s*$/i)) {
            let fromTime = nowWithTimeZone.add(-1, 'd').format("DD/MM/YYYY");
            history(payload, chat, fromTime, fromTime);
        } else if (tools.checkWithRegExp(text, /^\s*history\s*week\s*$/i)) {
            let fromTimeDate = nowWithTimeZone.isoWeekday("Monday");
            let fromTime = fromTimeDate.format("DD/MM/YYYY");

            let toTimeDate = nowWithTimeZone.isoWeekday("Sunday");
            let toTime = toTimeDate.format("DD/MM/YYYY");
            history(payload, chat, fromTime, toTime);
        } else if (tools.checkWithRegExp(text, /^\s*history\s*month\s*$/i)) {
            let fromTimeDate = nowWithTimeZone.date(1);
            let fromTime = fromTimeDate.format("DD/MM/YYYY");

            let toTimeDate = nowWithTimeZone.date(1).add(1, 'M').add(-1, 'd');
            let toTime = toTimeDate.format("DD/MM/YYYY");
            history(payload, chat, fromTime, toTime);
        } else {
            createTransactionAndSendFromText(text, userId, chat);
        }
    }
}

function onUserNeedPostbackGetStarted(payload, chat) {
    chat.say("I'm Tiny Wallet Bot. Nice to meet you!\nI have some tutorial for you, let enjoy it!");
    onUserNeedHelp(payload, chat)
}

function onUserNeedPostbackHelp(payload, chat) {
    onUserNeedHelp(payload, chat);
}

function onUserNeedPostbackSetting(payload, chat) {

}

function onUserDeleteTransaction(postBackId, chat) {

}

function onUserSendPostback(payload, chat) {
    const text = payload.postback.payload;
    const userId = payload.sender.id;
    if (payloads.GET_STARTED === text) {
        onUserNeedPostbackGetStarted(payload, chat);
    } else if (payloads.HELP === text) {
        onUserNeedPostbackHelp(payload, chat);
    } else if (payloads.SETTING === text) {
        onUserNeedPostbackSetting(payload, chat);
    } else if (text.startsWith(payloads.DELETE_TRANSACTION)) {
        onUserDeleteTransaction(text, chat);
    }
}

function report(payload, chat, fromTimeDDMMYY, toTimeDDMMYY) {
    const text = payload.message.text;
    const userId = payload.sender.id;
    //let diffDay = momentTo.diff(momentFrom, 'd') + 1;

    let args = [userId];
    let query = 'SELECT COUNT(1) as numTransaction, ' +
        '   SUM(value) as totalTransaction, ' +
        '   MIN(value) as minTransaction, ' +
        '   MAX(value) as maxTransaction ' +
        '   FROM Transaction  ' +
        'WHERE userId = ? AND `delete` = 0 ';

    let reportTitle = "Report";
    if (fromTimeDDMMYY && toTimeDDMMYY) {
        let momentFrom = formatTool.parseDate(fromTimeDDMMYY).subtract(7, 'h');
        let dateTimeFrom = momentFrom.valueOf();
        let momentTo = formatTool.parseDate(toTimeDDMMYY).add(1, 'd').subtract(1, 's').subtract(7, 'h');
        let dateTimeTo = momentTo.valueOf();
        query +=  ' AND timeTransaction >= ? AND timeTransaction <= ?';
        args.push(dateTimeFrom);
        args.push(dateTimeTo);

        reportTitle = "Report from " + fromTimeDDMMYY + " to " + toTimeDDMMYY;
    }

    let callbackSuccess = (results) => {

        let item = results[0];
        let sum = item ? item.totalTransaction : 0;
        let numTransaction = item ? item.numTransaction : 0;
        let min = item ? item.minTransaction : 0;
        let max = item ? item.maxTransaction : 0;

        let reportText =
            "   Sum: " + formatTool.formatNumber(sum) +
            "\n" +
            "   No: " + formatTool.formatNumber(numTransaction) + " transactions" +
            "\n" +
            "   Min: " + formatTool.formatNumber(min) + "/transaction" +
            "\n" +
            "   Max: " + formatTool.formatNumber(max) + "/transaction";
        chat.sendGenericTemplate([{title: reportTitle, subtitle: reportText}]);
    };

    let callbackFail = (err) => {
        chat.sendTextMessage("Get report fail! Try again later!")
    };

    mysqlUtil.query(dbPool, query, args, callbackSuccess, callbackFail);
}

function sendArrayItemToChat(itemArray, chat) {
    if (itemArray.length > 0) {
        for (let i = 0; i < itemArray.length; i += 4) {
            let endIndex = Math.min(i + 4, itemArray.length);
            let subArray = itemArray.slice(i, endIndex);
            if (subArray.length === 1) {
                chat.sendGenericTemplate(subArray);
            } else {
                chat.sendListTemplate(subArray);
            }
        }
    }
}

function history(payload, chat, fromTimeDDMMYY, toTimeDDMMYY) {
    const text = payload.message.text;
    const userId = payload.sender.id;

    let args = [userId];
    let query = 'SELECT id, name, value, timeTransaction ' +
        '   FROM Transaction  ' +
        'WHERE userId = ? AND `delete` = 0 ';

    if (fromTimeDDMMYY && toTimeDDMMYY) {
        let momentFrom = formatTool.parseDate(fromTimeDDMMYY).subtract(7, 'h');
        let dateTimeFrom = momentFrom.valueOf();
        let momentTo = formatTool.parseDate(toTimeDDMMYY).add(1, 'd').subtract(1, 's').subtract(7, 'h');
        let dateTimeTo = momentTo.valueOf();
        query +=  ' AND timeTransaction >= ? AND timeTransaction <= ?';
        args.push(dateTimeFrom);
        args.push(dateTimeTo);
    }

    let callbackSuccess = (snapshot) => {
        let itemArray = [];
        snapshot.forEach(function (transaction) {
            let millisecondCreated = formatTool.parseDateFromMillisecond(transaction.timeTransaction).add(7, 'h').valueOf();
            itemArray.push({
                title: formatTool.formatNumber(transaction.value),
                subtitle: transaction.name + "\n" + formatTool.formatDateTimeDefault(millisecondCreated),
                /*buttons: [{
                    type: "postback",
                    title: "Delete",
                    payload: payloads.DELETE_TRANSACTION + transaction.id
                }]*/
            });
        });
        sendArrayItemToChat(itemArray, chat);
    };

    let callbackFail = (err) => {
        chat.sendTextMessage("Get history fail! Try again later!")
    };

    mysqlUtil.query(dbPool, query, args, callbackSuccess, callbackFail);
}