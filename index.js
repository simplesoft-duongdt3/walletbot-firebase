'use strict';
const adminFirebase = require("firebase-admin");
const serviceAccount = require("./config/serviceAccountKey.json");
const config = require('config');
const tools = require('./tools');
const payloads = require('./botpayload');
const configAuth = config.get('messenger_bot.auth');
const BootBot = require('bootbot');
const moment = require('moment');
const numeral = require('numeral');

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
bot.setPersistentMenu([
    // {title: "Settings", type: "postback", payload: payloads.SETTING},
    {title: "Help", type: "postback", payload: payloads.HELP}
], false);

bot.on('message', onUserSendMessage);
bot.on('postback', onUserSendPostback);
bot.start();


//---------------FUNCTIONS for bot----------------\\
function onUserNeedHelp(payload, chat) {
    chat.say({
        text: 'FAQ',
        buttons: [
            {type: 'postback', title: 'Input format', payload: payloads.HELP_INPUT_FORMAT},
            {type: 'postback', title: 'Report', payload: payloads.HELP_REPORT},
            // { type: 'postback', title: 'Transaction', payload: payloads.HELP_TRANSACTION }
        ]
    });
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
    let timeNow = moment().valueOf();
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
        let fromTime = moment().add(7, 'h').format("DD/MM/YYYY");
        report(payload, chat, fromTime, fromTime);
    } else {
        let arrayOfLines = text.match(/[^\r\n]+/g);
        let textCreateRecord = "";
        let textUserSaid = "";

        if (arrayOfLines) {
            arrayOfLines.forEach(line => {
                let record = tools.getRecordFromText(line);
                if (record) {
                    let recordsRef = firebaseDb.ref("transactions_" + userId);
                    createTransaction(recordsRef, record, userId);
                    textCreateRecord += "Created a new record: " + record.name + " value: " + record.value + "\n";
                } else {
                    textUserSaid += "You said: " + text;
                }
            });

            chat.say(textCreateRecord + textUserSaid);

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

function onUserNeedHelpInputFormat(payload, chat) {
    chat.say('Input format:\n' +
        'Eat something 1000 -> value: 1,000\n' +
        'Buy something 2,000.05 -> value: 2,000.05\n' +
        'Give someone 5k -> value: 5,000\n' +
        'Buy something 1m -> value: 1,000,000\n' +
        '\n' + 'Good luck! Have a good time!'
    );
}

function onUserNeedHelpReport(payload, chat) {
    chat.say(
        'Report: \n' +
        'report -> report today\n' +
        'report today -> today report\n' +
        'report week -> report week\n' +
        'report month -> report month\n' +
        'report 7d -> report 7 day\n' +
        'report yesterday -> yesterday report' +
        'report 17/2 -> report 17/02/[current year]\n' +
        'report 17/2/2017 -> report 17/02/2017\n' +
        '\n' + 'Good luck! Have a good time!'
    );
}

function onUserNeedHelpTransactions(payload, chat) {
    chat.say(
        'Transactions list: \n' +
        'transaction -> transactions today\n' +
        'transactions yesterday -> transactions yesterday\n' +
        'transactions week -> transactions week\n' +
        'transactions month -> transactions month\n' +
        'transactions 7d -> transactions 7 day\n' +
        'transactions 17/2 -> transactions 17/02/[current year]\n' +
        'transactions 17/2/2017 -> transactions 17/02/2017' +
        '\n\n' + 'Good luck! Have a good time!'
    );
}

function onUserSendPostback(payload, chat) {
    //console.log(payload);
    const text = payload.postback.payload;
    const userId = payload.sender.id;
    if (payloads.GET_STARTED === text) {
        onUserNeedPostbackGetStarted(payload, chat);
    } else if (payloads.HELP === text) {
        onUserNeedPostbackHelp(payload, chat);
    } else if (payloads.SETTING === text) {
        onUserNeedPostbackSetting(payload, chat);
    } else if (payloads.HELP_INPUT_FORMAT === text) {
        onUserNeedHelpInputFormat(payload, chat);
    } else if (payloads.HELP_REPORT === text) {
        onUserNeedHelpReport(payload, chat);
    } else if (payloads.HELP_TRANSACTION === text) {
        onUserNeedHelpTransactions(payload, chat);
    }
}

function report(payload, chat, fromTimeDDMMYY, toTimeDDMMYY) {
    const text = payload.message.text;
    const userId = payload.sender.id;
    let recordsRef = firebaseDb.ref("transactions_" + userId);

    let momentFrom = moment(fromTimeDDMMYY, "DD/MM/YYYY").subtract(7, 'h');
    let dateTimeFrom = momentFrom.valueOf();
    let momentTo = moment(toTimeDDMMYY, "DD/MM/YYYY").add(1, 'd').subtract(1, 's').subtract(7, 'h');
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

        console.log();
        let reportText = "Report from " + fromTimeDDMMYY + " to " + toTimeDDMMYY +
            "\n" +
            "   Sum: " + numeral(sum).format('0,0.[00]') +
            "\n" +
            "   Avg: " + numeral(avg).format('0,0.[00]') + "/day" +
            "\n" +
            "   Min: " + numeral(min).format('0,0.[00]') + "/transaction" +
            "\n" +
            "   Max: " + numeral(max).format('0,0.[00]') + "/transaction";

        chat.say(reportText);
    };

    recordsRef
        .orderByChild('timeCreated')
        .startAt(dateTimeFrom)
        .endAt(dateTimeTo)
        .once('value', successCallback);
}

function transactions(payload, chat, fromTimeDDMMYY, toTimeDDMMYY) {
    const text = payload.message.text;
    const userId = payload.sender.id;
    let recordsRef = firebaseDb.ref("transactions_" + userId);

    dateTimeFrom.format("DD/MM/YYYY")
    dateTimeTo.format("DD/MM/YYYY")
    let dateTimeFrom = moment(fromTimeDDMMYY, "DD/MM/YYYY");
    let dateTimeTo = moment(toTimeDDMMYY, "DD/MM/YYYY");

    let successCallback = function (snapshot) {
        let sum = 0.0;

        snapshot.forEach(function (childSnapshot) {
            let item = childSnapshot.val();
            sum += item.value;
        });
        console.log();
        let reportText = "Report from " + fromTimeDDMMYY + " to " + +
                "\n" +
            "   Sum: " + numeral(sum).format('0,0.[0000]');

        chat.say(reportText);
    };

    let fromTimeQuery = moment(fromTime).subtract(7, 'h').valueOf();
    let toTimeQuery = moment(toTime).subtract(7, 'h').valueOf();

    recordsRef
        .orderByChild('timeCreated')
        .startAt(fromTimeQuery)
        .endAt(toTimeQuery)
        .once('value', successCallback);
}