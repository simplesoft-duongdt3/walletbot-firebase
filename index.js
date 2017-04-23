'use strict';
const adminFirebase = require("firebase-admin");
const serviceAccount = require("./config/serviceAccountKey.json");
const config = require('config');
const tools = require('./tools');
const formatTool = require('./formattool');
const payloads = require('./botpayload');
const configAuth = config.get('messenger_bot.auth');
const BootBot = require('bootbot');


// '1,000'
adminFirebase.initializeApp({
    credential: adminFirebase.credential.cert(serviceAccount),
    databaseURL: "https://tiny-wallet-bot.firebaseio.com"
});

const firebaseDb = adminFirebase.database();

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

function createTransaction(recordsRef, record) {
    let newRecord = recordsRef.push();
    let timeNow = formatTool.nowMillisecond();
    newRecord.set({
        name: record.name,
        value: record.value,
        time: timeNow,
        timeCreated: timeNow
    }, error => {
        if (error) {
            console.log("Data record could not be saved." + error);
        } else {
            console.log("Data record saved successfully.");
        }
    });
}

function onUserSendMessage(payload, chat) {
    const text = payload.message.text;
    const userId = payload.sender.id;
    if (tools.checkKeyword(text, ["help"])) {
        onUserNeedHelp(payload, chat);
    } else if (tools.checkKeyword(text, ['hi', 'hello'])) {
        onUserHello(payload, chat);
    } else if (tools.checkKeyword(text, ["report"])) {
        let fromTime = formatTool.now().add(7, 'h').format("DD/MM/YYYY");
        report(payload, chat, fromTime, fromTime);
    }  else if (tools.checkKeyword(text, ["history"])) {
        let fromTime = formatTool.now().add(7, 'h').format("DD/MM/YYYY");
        history(payload, chat, fromTime, fromTime);
    } else {
        let arrayOfLines = text.match(/[^\r\n]+/g);
        let textUserSaid = "";
        if (arrayOfLines) {

            let arrayItem = [];
            arrayOfLines.forEach(line => {
                let record = tools.getRecordFromText(line);
                if (record) {
                    let recordsRef = firebaseDb.ref("transactions_" + userId);
                    createTransaction(recordsRef, record, userId);
                    let nameRecord = record.name;
                    let valueRecord = formatTool.formatNumber(record.value);
                    let sendValue = {title: valueRecord, subtitle: nameRecord};
                    arrayItem.push(sendValue);
                    //textCreateRecord += "Created a new record: " + record.name + " : " +  + "\n";
                } else {
                    textUserSaid += line + "\n";
                }
            });

            sendArrayItemToChat(arrayItem, chat);
            if (textUserSaid.length > 0) {
                chat.say("You said: \n" + textUserSaid);
            }
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

function onUserSendPostback(payload, chat) {
    const text = payload.postback.payload;
    const userId = payload.sender.id;
    if (payloads.GET_STARTED === text) {
        onUserNeedPostbackGetStarted(payload, chat);
    } else if (payloads.HELP === text) {
        onUserNeedPostbackHelp(payload, chat);
    } else if (payloads.SETTING === text) {
        onUserNeedPostbackSetting(payload, chat);
    }
}

function report(payload, chat, fromTimeDDMMYY, toTimeDDMMYY) {
    const text = payload.message.text;
    const userId = payload.sender.id;
    let recordsRef = firebaseDb.ref("transactions_" + userId);

    let momentFrom = formatTool.parseDate(fromTimeDDMMYY).subtract(7, 'h');
    let dateTimeFrom = momentFrom.valueOf();
    let momentTo = formatTool.parseDate(toTimeDDMMYY).add(1, 'd').subtract(1, 's').subtract(7, 'h');
    let dateTimeTo = momentTo.valueOf();
    let diffDay = momentTo.diff(momentFrom, 'd') + 1;

    let successCallback = function (snapshot) {
        let sum = 0.0;
        let min = 0.0;
        let max = 0.0;

        snapshot.forEach(function (childSnapshot) {
            let item = childSnapshot.val();
            let value = item.value;
            sum += value;
            if (max < value) {
                max = value;
            }

            if (min === 0 || min > value) {
                min = value;
            }
        });
        let avg = sum / diffDay;

        let reportTitle = "Report from " + fromTimeDDMMYY + " to " + toTimeDDMMYY;
        let reportText =
            "   Sum: " + formatTool.formatNumber(sum) +
            "\n" +
            "   Avg: " + formatTool.formatNumber(avg) + "/day" +
            "\n" +
            "   Min: " + formatTool.formatNumber(min) + "/transaction" +
            "\n" +
            "   Max: " + formatTool.formatNumber(max) + "/transaction";
        chat.sendGenericTemplate([{title: reportTitle, subtitle: reportText}]);
    };

    recordsRef
        .orderByChild('timeCreated')
        .startAt(dateTimeFrom)
        .endAt(dateTimeTo)
        .once('value', successCallback);
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
    let recordsRef = firebaseDb.ref("transactions_" + userId);

    let momentFrom = formatTool.parseDate(fromTimeDDMMYY).subtract(7, 'h');
    let dateTimeFrom = momentFrom.valueOf();
    let momentTo = formatTool.parseDate(toTimeDDMMYY).add(1, 'd').subtract(1, 's').subtract(7, 'h');
    let dateTimeTo = momentTo.valueOf();

    let successCallback = function (snapshot) {
        let itemArray = [];
        snapshot.forEach(function (childSnapshot) {
            let item = childSnapshot.val();
            let millisecondCreated = formatTool.parseDateFromMillisecond(item.timeCreated).add(7, 'h').valueOf();
            itemArray.push({
                title: formatTool.formatNumber(item.value),
                subtitle: item.name + "\n" + formatTool.formatDateTimeDefault(millisecondCreated)
            });
        });
        sendArrayItemToChat(itemArray, chat);
    };

    recordsRef
        .orderByChild('timeCreated')
        .startAt(dateTimeFrom)
        .endAt(dateTimeTo)
        .once('value', successCallback);
}