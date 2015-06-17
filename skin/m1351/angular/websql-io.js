/**
 * This module provides web sql operation interface of local database.
 * And it's based on Angular's promise which you have to import Angular.
 * Demo:
 * TABLE-CREATE TABLE IF NOT EXISTS M_PARM (ID TEXT PRIMARY KEY,PARMS TEXT,NOTE TEXT)
 * 1.getStrBySql(sql, NAME, dt)
 *   WebDBSer.getStrBySql("SELECT PARMS FROM M_PARM WHERE ID = '1'",'PARMS','slsDatabase').then(function(v){
 *       $log.debug("getStrBySql success value = " + v);
 *   });
 * 2.getResultsBySql(sql, dt)
 *   WebDBSer.getResultsBySql("SELECT * FROM M_PARM",'slsDatabase').then(function(res){
 *       for (var i = 0, length = res.rows.length; i < length; i++) {
 *          $log.debug(res.rows.item(i));
 *       }
 *   });
 * 3.executeUpdate(sql, dt)
 *   WebDBSer.executeUpdate("DELETE FROM M_PARM WHERE ID = '1'",'slsDatabase').then(function(b){
 *       if(b){
 *           $log.debug("executeUpdate delete success");
 *           WebDBSer.executeUpdate("INSERT INTO M_PARM (ID,PARMS,NOTE) VALUES ('1','2','3')",'slsDatabase').then(function(b){
 *               if(b){
 *                  $log.debug("executeUpdate insert success");
 *                  WebDBSer.executeUpdate("UPDATE M_PARM SET PARMS = '1',NOTE = '1' WHERE ID = '1'",'slsDatabase').then(function(b){
 *                     if(b){
 *                        $log.debug("executeUpdate update success");
 *                     }
 *                  });
 *               }
 *           });
 *       }
 *   });
 * 4.executeBatchUpdate(sql, dataset, dt)
 *   var arr = [[4,4,4],[5,5,5],[6,6,6]];
 *   WebDBSer.executeBatchUpdate("INSERT INTO M_PARM(ID,PARMS,NOTE) VALUES(?,?,?)",arr,'slsDatabase').then(function(b){
 *       if(b){
 *           $log.debug("executeBatchUpdate insert success");
 *       }
 *   });
 *   var arr = [[40,40,4],[50,50,5],[60,60,6]];
 *   WebDBSer.executeBatchUpdate("UPDATE M_PARM SET PARMS = ?,NOTE = ? WHERE ID = ?",arr,'slsDatabase').then(function(b){
 *       if(b){
 *           $log.debug("executeBatchUpdate update success");
 *       }
 *   });
 * Created by Ethan on 2015/1/28.
 */
angular.module('webDBModule', [])
    .config(['$logProvider', function ($logProvider) {
        $logProvider.debugEnabled(false);
    }])
    .factory('WebDBSer', ['$q', '$log', function ($q, $log) {
        var db;
        var openDB = function (d) {
            identifySQL(d);
            var os = (function () {
                if (navigator.userAgent.match(/iPhone/i)
                    || navigator.userAgent.match(/iPod/i)
                    || navigator.userAgent.match(/iPad/i)) {
                    return "ios";
                } else if (navigator.userAgent.match(/Android/i)) {
                    return "Android";
                } else if (navigator.userAgent.match(/Mac/i)
                    || navigator.userAgent.match(/Windows/i)
                    || navigator.userAgent.match(/Linux/i)) {
                    return "PC";
                } else {
                    return "PC";
                }
            })();
            try {
                if (os == 'PC') {
                    db = window.openDatabase(d, "1.0", "PhoneGap Demo", 30 * 1024 * 1024);
                } else { // Rely on client
                    db = window.sqlitePlugin.openDatabase({name: d, bgType: 1});
                }
            } catch (e) {
                throw new Error("Exception: openDB. " + e);
            }
        };
        var identifySQL = function (sql) {
            if (!sql || !angular.isString(sql)) throw new TypeError("[" + sql + "] parameter type error!");
        };
        // call back
        var errorCB = function (tx, err) {
            $log.error("Error processing SQL: " + err.message);
        };
        /**
         * 执行SQL，返回string结果
         * @param sql 执行SQL
         * @param NAME 查询字段名, 若有别名，取别名
         * @param dt 执行数据库名
         * @returns {promise|*|r.promise|x.ready.promise}
         * By Ethan 2015-1-28
         */
        var getStrBySql = function (sql, NAME, dt) {
            openDB(dt);
            identifySQL(sql);
            var deferred = $q.defer();
            db.transaction(function (tx) {
                tx.executeSql(sql, [],
                    function (tx, results) {
                        if (results.rows.length > 0) {
                            $log.debug("getStrBySql succeed!");
                            deferred.resolve(results.rows.item(0)[NAME]);
                        } else {
                            deferred.resolve(null);
                        }
                    },
                    function (tx, err) {
                        $log.error("getStrBySql sql : [" + sql + "] executed failed by " + err.message);
                        deferred.reject(err.message);
                    }
                );
            }, errorCB);
            return deferred.promise;
        };
        /**
         * 执行SQL查询，返回执行结果集
         * @param sql 执行SQL
         * @param dt 执行数据库名
         * @returns {promise|*|r.promise|x.ready.promise}
         */
        var getResultsBySql = function (sql, dt) {
            openDB(dt);
            identifySQL(sql);
            var deferred = $q.defer();
            db.transaction(function (tx) {
                tx.executeSql(sql, [],
                    function (tx, results) {
                        $log.debug("getResultsBySql succeed!");
                        deferred.resolve(results);
                    },
                    function (tx, err) {
                        $log.error("getResultsBySql sql: [" + sql + "] executed failed by " + err.message);
                        deferred.reject(err.message);
                    }
                );
            }, errorCB);
            return deferred.promise;
        };
        /**
         * 执行delete,update,insert,不支持批量; 若执行成功返回true, 失败则返回错误的原因。
         * @param sql 执行SQL
         * @param dt 执行数据库名
         * @param onedataset 参数集合
         * @returns {promise|*|r.promise|x.ready.promise}
         */
        var executeUpdate = function (sql, dt, onedataset) {
            openDB(dt);
            identifySQL(sql);
            var ds = onedataset || [];
            var deferred = $q.defer();
            db.transaction(function (tx) {
                tx.executeSql(sql, ds,
                    function () {
                        $log.debug("executeUpdate succeed!");
                        deferred.resolve(true);
                    },
                    function (tx, err) {
                        $log.error("executeUpdate sql : [" + sql + "] executed failed by " + err.message);
                        deferred.reject(err.message);
                    }
                );
            }, errorCB);
            return deferred.promise;
        };
        /**
         * 执行批量更新或者插入; 若执行成功返回true, 失败则返回错误的原因。
         * @param sql 执行SQL
         * @param dataset 数据集
         * @param dt 执行数据库名
         * @returns {promise|*|r.promise|x.ready.promise}
         */
        var executeBatchUpdate = function (sql, dataset, dt) {
            openDB(dt);
            identifySQL(sql);
            if (!angular.isArray(dataset)) throw new Error("executeBatchUpdate --- dataset is not an arrray!");
            var arrLength = dataset.length,
                insertCount = 0;
            if (arrLength <= 0) throw new Error("executeBatchUpdate --- dataset is empty!");
            var deferred = $q.defer();
            db.transaction(function (tx) {
                dataset.forEach(function (arr) {
                    tx.executeSql(sql, arr,
                        function () {
                            insertCount++;
                            if (insertCount === arrLength) {
                                $log.debug("executeBatchUpdate execute success!");
                                deferred.resolve(true);
                            }
                        },
                        function (tx, err) {
                            $log.error("executeUpdate sql : [" + sql + "] executed failed by one DATA : "
                            + JSON.stringify(arr) + "; caused by " + err.message);
                            deferred.reject(err.message);
                        }
                    );
                });
            }, errorCB);
            return deferred.promise;
        };
        return {
            getStrBySql: getStrBySql,
            getResultsBySql: getResultsBySql,
            executeUpdate: executeUpdate,
            executeBatchUpdate: executeBatchUpdate
        };
    }]);