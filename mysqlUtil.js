/**
 * Created by admin on 4/22/17.
 */
module.exports = {
    insert: function (dbPool, tableName, recordArr, callbackSuccess, callbackFail) {
        let sql = "";
        recordArr.forEach((value, index) => {
            if (index !== 0) {
                sql += ";\n";
            }
            sql += "INSERT INTO " + "`" + tableName + "`" + " SET ?";
        });

        if (sql.length > 0) {
            let query = dbPool.getConnection(function (err, connection) {
                if (err) {
                    console.log("insert: Connect db server fail " + err);
                    callbackFail(err);
                } else {
                    let query = connection.query(sql, recordArr, function (error, results, fields) {
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

            console.log(query);
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
            }
        });
    }
};