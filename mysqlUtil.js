/**
 * Created by admin on 4/22/17.
 */
module.exports = {
    insert: function (dbPool, tableName, cols, recordArr, callbackSuccess, callbackFail) {
        if (recordArr.length > 0) {
            dbPool.getConnection(function (err, connection) {
                if (err) {
                    console.log("insert: Connect db server fail " + err);
                    callbackFail(err);
                } else {
                    connection.query("INSERT INTO " + "`" + tableName + "` (" + cols + ") VALUES ?", [recordArr], function (error, results, fields) {
                        // And done with the connection.
                        connection.release();

                        if (error) {
                            callbackFail(error);
                            console.log("insert: " + error);
                        } else {
                            callbackSuccess(results);
                            console.log("insert: Successfully.");
                        }
                    });
                }
            });

        }
    },

    query: function(dbPool, queryText, args, callbackSuccess, callbackFail) {
        dbPool.getConnection(function (err, connection) {
            if (err) {
                console.log("query: Connect db server fail " + err);
                callbackFail(err);
            } else {
                let query = connection.query(queryText, args, function (error, results, fields) {
                    // And done with the connection.
                    connection.release();

                    if (error) {
                        callbackFail(error);
                        console.log("query: " + error);
                    } else {
                        callbackSuccess(results);
                        console.log("query: Successfully.");
                    }
                });

                //console.log(query);
            }
        });
    }
};