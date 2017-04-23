/**
 * Created by admin on 4/23/17.
 */
const moment = require('moment');
const numeral = require('numeral');
/**
 * Created by admin on 4/22/17.
 */

module.exports = {
    formatNumber : function (number) {
        return numeral(number).format('0,0.[00]');
    },
    formatDateTime : function (millisecond, format) {
        return moment(millisecond, format);
    },
    formatDate : function (milisecond) {
        return moment(millisecond).format("DD/MM/YYYY");
    },
    formatTime : function (millisecond) {
        return moment(millisecond).format("hh/mm/ss");
    },
    parseDateTime : function (millisecond, format) {
        return moment(millisecond, format);
    },
    parseDate : function (millisecond) {
        return moment(millisecond, "DD/MM/YYYY");
    },
    parseTime : function (millisecond) {
        return moment(millisecond, "hh/mm/ss");
    }
};
/*console.log(getAmountInText("An sang 90k"))
 console.log(getAmountInText("An sang 90,000"))
 console.log(getAmountInText("An sang 90.09"))
 console.log(getAmountInText("An sang 90,000k"))
 console.log(getAmountInText("An sang 9m"))*/


// let date = moment().valueOf();
// console.log(date);
// let day = moment(date);
// console.log(day.format());
//
// var string = numeral("1,000,000.90").format('0,0.[0000]');
// console.log(string);

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

// ref.child('user')
//     .once('value',function(snapshot) {
//         var users=[];
//         snapshot.forEach(function(childSnapshot) {
//             var item=childSnapshot.val();
//             if (/adam/i.test(item.name)) {
//                 users.push(item.userId);
//             }
//         });
//         getInvoiceTotalForUsers(users,DoSomethingWithSum);
//     });
//
//
// function getInvoiceTotalForUsers(users,callback)
// {
//     var sum=0;
//     var count=0;
//     for (var i=0; i<users.length; i++) {
//         var id=users[i];
//         ref.child('invoice')
//             .equalTo(id,'userId')
//             .orderByChild('price')
//             .startAt(10)
//             .endAt(100)
//             .once('value',function(snapshot) {
//                 snapshot.forEach(function(childSnapshot) {
//                     var item = childSnapshot.val();
//                     sum+=item.price;
//                     count++;
//                     if (count==users.length) callback(sum);
//                 });
//             });
//     }
// }