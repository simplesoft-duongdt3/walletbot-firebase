'use strict';
const adminFirebase = require("firebase-admin");
const serviceAccount = require("./config/serviceAccountKey.json");
const config = require('config');
const configAuth = config.get('messenger_bot.auth');

const BootBot = require('bootbot');

adminFirebase.initializeApp({
  credential: adminFirebase.credential.cert(serviceAccount),
  databaseURL: "https://tiny-wallet-bot.firebaseio.com"
});

let firebaseDb = adminFirebase.database();

//insert
/*// Generate a reference to a new location and add some data using push()
var newUser = userRef.push();

// Get the unique key generated by push()
var newId = newUser.key;
newUser.set({
    date_of_birth: "June 23, 1919",
    full_name: "Alan Turing"
}, error =>  {
    if (error) {
        console.log("Data alanisawesome could not be saved." + error);
    } else {
        console.log("Data alanisawesome saved successfully.");
    }
});*/

//query
/*userRef.orderByChild("full_name").equalTo("Alan Turing").on("child_added", function(snapshot) {
    console.log(snapshot);
});*/

const bot = new BootBot({
    accessToken: configAuth.accessToken,
    verifyToken: configAuth.verifyToken,
    appSecret: configAuth.appSecret
});

function checkKeyword(text, keywordArray) {
    if (!text || !keywordArray) {
        return false;
    }

    let keywords = Array.isArray(keywordArray) ? keywordArray : [keywordArray];

    let countTrue = 0;
    keywords.forEach(key => {
        if (typeof key === 'string' && key.toLowerCase() === text.toLowerCase()) {
            countTrue++;
        } else if (key instanceof RegExp) {
            if (!text.match(key)){
                countTrue++;
            }
        }
    });

    return countTrue > 0;
}

function onUserNeedHelp(payload, chat) {
    chat.say({
        text: 'What do you need help with?',
        buttons: [
            { type: 'postback', title: 'Settings', payload: 'HELP_SETTINGS' },
            { type: 'postback', title: 'FAQ', payload: 'HELP_FAQ' },
            { type: 'postback', title: 'Talk to a human', payload: 'HELP_HUMAN' }
        ]
    });
}

function onUserHello(payload, chat) {
    // Send a text message with quick replies
    chat.say({
        text: 'What do you want to eat today?',
        quickReplies: ['Mexican', 'Italian', 'American', 'Argentine']
    });
}

function createRecord(recordsRef, record) {
    let newRecord = recordsRef.push();
    newRecord.set({
        name: record.name,
        value: record.value
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
    if (checkKeyword(text, ["help"])) {
        onUserNeedHelp(payload, chat);
    } else if (checkKeyword(text, ['hi', 'hello'])) {
        onUserHello(payload, chat);
    } else {
        let record = getRecordFromText(text);
        if (record) {
            let recordsRef = firebaseDb.ref("records_" + userId);
            createRecord(recordsRef, record, userId);
            chat.say("Created a new record: " + record.name + " value: " + record.value);
        } else {
            console.log("The user said: " + text);
            chat.say("You said: " + text);
        }

    }


}

bot.on('message', onUserSendMessage);
bot.start();

function getAmountInTextWithRegex(text, regexPattern) {
    let amount = 0;
    let result = text.trim().match(regexPattern);
    if (result) {
        let str = result[0].replace(new RegExp(',', 'gi'), '').trim();
        amount = parseFloat(str);
    }
    return amount;
}

function getAmountInTextSimple(text) {
    let regex = /(\s)(\d+(\,*))*(\d+(\.*))\d*$/igm;
    return getAmountInTextWithRegex(text, regex);
}

function getAmountInTextK(text) {
    let regex = /(\s)(\d+(\,*))*(\d+(\.*))\d*K{1}$/igm;
    return getAmountInTextWithRegex(text, regex) * 1000;
}

function getAmountInTextM(text) {
    let regex = /(\s)(\d+(\,*))*(\d+(\.*))\d*M{1}$/igm;
    return getAmountInTextWithRegex(text, regex) * 1000000;
}

function getRecordFromText(text) {
    let amount = 0;
    let name = "";
    if (text) {
        amount = getAmountInTextM(text);
        if (amount === 0) {
            amount = getAmountInTextK(text);
        }
        if (amount === 0) {
            amount = getAmountInTextSimple(text);
        }

        if (amount > 0) {
            name = text.substring(0, text.lastIndexOf(" "));
        }
    }
    return amount > 0 ? { name : name, value: amount } : null;
}

/*console.log(getAmountInText("An sang 90k"))
console.log(getAmountInText("An sang 90,000"))
console.log(getAmountInText("An sang 90.09"))
console.log(getAmountInText("An sang 90,000k"))
console.log(getAmountInText("An sang 9m"))*/