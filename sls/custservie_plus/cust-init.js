/**
 * 任务式模块
 * 提供任务式数据服务
 * Created by Ethan on 2015/1/26.
 */
angular.module('CS_Task_Module', ['webDBModule'])
    .factory('TaskService', ['$q', '$log', 'WebDBSer', function ($q, $log, WebDBSer) {
        var dbName = 'slsDatabase';
        /**
         * 处理任务式数据为如下格式：
         * 数据格式如下：相同分组的数据组成一个对象, TYPE_NAME为其分组名称, ACTIVITY_ARRAY数组包含了相同分组的数据项
         * [
             {
                TYPE_NAME: '',
                ACTIVITY_ARRAY: [...]
             }
           ]
         * By Ethan 15-1-26
         */
        var processResults = function (results) {
            // 返回对象 dataList
            var dataList = [];
            var oneMap = {
                TYPE_NAME: '',
                ACTIVITY_ARRAY: []
            };
            var rows = results.rows,
                rowLength = rows.length,
                temp_type,
                row;
            for (var i = 0; i < rowLength; i++) {
                row = rows.item(i);
                // Group by POLICY_TYPE
                var policy_type = row.POLICY_TYPE;
                // Initialize
                if (i === 0) temp_type = policy_type;
                // Override the TYPE_NAME in oneMap
                // Push items with same policy_type in one array
                if (temp_type === policy_type) {
                    oneMap.TYPE_NAME = row.TYPE_NAME;
                    oneMap.ACTIVITY_ARRAY.push(row);
                } else {    // Another POLICY_TYPE group
                    temp_type = policy_type;
                    // One Group finished
                    dataList.push(oneMap);
                    // Clear oneMap object
                    oneMap = {
                        TYPE_NAME: '',
                        ACTIVITY_ARRAY: []
                    };
                    oneMap.TYPE_NAME = row.TYPE_NAME;
                    oneMap.ACTIVITY_ARRAY.push(row);
                }
            }
            dataList.push(oneMap);
            return dataList;
        };
        /**
         * 客户服务页面任务式初始化---通用
         * 从本地表M_CUST_ACTICITY，M_CUST_POLICY中取数据
         * 提供任务式数据
         * By Ethan 15-1-26
         */
        var getTaskData = function () {
            var deferred = $q.defer();
            // 查询当前零售户接受的任务,按照分组、完成状态、组内任务顺序来排序
            var exeSQL = "SELECT A.ACTIVITY_ID,B.POLICY_ID,B.POLICY_NAME,A.CRT_DATE,A.STATUS,B.POLICY_TYPE,"
                + " B.TYPE_NAME,B.URL,B.DIRCT,B.SEQ FROM M_CUST_ACTICITY A,M_CUST_POLICY B"
                + " WHERE A.ACTIVITY_TYPE = B.POLICY_ID AND A.CUST_ID = '" + cust_id + "' AND A.ISNEW <> '1'"
                + " ORDER BY B.GROUP_SEQ,A.STATUS,B.SEQ";
            $log.debug("getTaskData---exeSQL--->" + exeSQL);
            // 查询临时服务项---非接受任务
            // 临时任务属于，也不属于M_CUST_POLICY表中的任何一个分组；存在于M_CUST_POLICY.ISNEW = '1' 以及数据库CRM_ACT_EXC.IS_TEMP = '1'
            var TTYPE = 'TEMP',// 暂定
                TNAME = '临时任务',
                tempSQL = "SELECT A.ACTIVITY_ID,B.POLICY_ID,B.POLICY_NAME,A.CRT_DATE,A.STATUS,"
                    + "'" + TTYPE + "' POLICY_TYPE,'" + TNAME + "' TYPE_NAME,B.URL,B.DIRCT,B.SEQ"
                    + " FROM M_CUST_ACTICITY A,M_CUST_POLICY B"
                    + " WHERE A.ACTIVITY_TYPE = B.POLICY_ID AND A.CUST_ID = '" + cust_id + "' AND A.ISNEW = '1'"
                    + " ORDER BY A.STATUS";
            $log.debug("getTaskData---tempSQL--->" + tempSQL);
            // 返回对象 dataList
            var dataList = [];
            // 开始拼接接受服务项
            WebDBSer.getResultsBySql(exeSQL, dbName).then(function (results) {
                if (results.rows.length > 0) {
                    dataList = processResults(results);
                } else {
                    MJShowToastMsg("对当前零售户没有计划任务项!");
                }
                // 开始拼接临时服务项
                WebDBSer.getResultsBySql(tempSQL, dbName).then(function (results) {
                    if (results.rows.length > 0) {
                        processResults(results).forEach(function (item) {
                            dataList.push(item);
                        });
                    } else {
                        $log.debug("不存在临时任务!");
                    }
                    deferred.resolve(dataList);
                });
            });
            return deferred.promise;
        };
        /**
         * 客户服务页面任务式初始化---江西特殊需求
         * 从本地表M_CUST_ACTICITY，M_CUST_POLICY中取数据
         * 提供江西任务式任务数据
         * By Ethan 15-1-26
         */
        var getJXTaskData = function () {
            var deferred = $q.defer();
            // 取A.ACTIVITY_NAME 因为PC推送的同一个活动可能有多条记录
            var exeSQL = "SELECT A.ACTIVITY_ID,B.POLICY_ID,A.ACTIVITY_NAME POLICY_NAME,A.CRT_DATE,A.STATUS,"
                + " B.POLICY_TYPE,B.TYPE_NAME,B.URL,B.DIRCT,B.SEQ"
                + " FROM M_CUST_ACTICITY A,M_CUST_POLICY B"
                + " WHERE A.ACTIVITY_TYPE = B.POLICY_ID AND A.CUST_ID = '" + cust_id + "'"
                + " ORDER BY B.POLICY_TYPE DESC,A.STATUS,B.SEQ";
            $log.debug("getJXTaskData---exeSQL--->" + exeSQL);
            WebDBSer.getResultsBySql(exeSQL, dbName).then(function (results) {
                if (results.rows.length > 0) {
                    deferred.resolve(processResults(results));
                } else {
                    MJShowToastMsg("当前未设置服务项!");
                    deferred.reject(null);
                }
            });
            return deferred.promise;
        };
        /**
         * 提供主动任务或者临时任务的服务
         * By Ethan 15-1-26
         */
        var getTempService = function () {
            var deferred = $q.defer();
            var resObj = {},
                policyUse = MJGetItem("policyUse"),
                exeSQL,
                array,
                arr = "",
                topic_name,
                errMsg;
            if (policyUse === '2') {  // 江西
                exeSQL = "SELECT POLICY_ID,POLICY_NAME,URL,DIRCT FROM M_CUST_POLICY WHERE TYPE_NAME = '主动服务' ORDER BY SEQ";
                topic_name = "请选择主动服务项";
                errMsg = "未配置主动服务项!";
            } else { // 通用
                exeSQL = "SELECT POLICY_ID,POLICY_NAME,URL,DIRCT FROM M_CUST_POLICY WHERE POLICY_ID NOT IN ("
                + "SELECT ACTIVITY_TYPE FROM M_CUST_ACTICITY WHERE CUST_ID = '" + cust_id + "')";
                topic_name = "请选择临时任务项";
                errMsg = "不存在临时任务项!";
            }
            $log.debug("toTempService---exeSQL--->" + exeSQL);
            WebDBSer.getResultsBySql(exeSQL, dbName).then(function (results) {
                var rows = results.rows,
                    rowLength = rows.length,
                    row;
                if (rowLength > 0) {
                    for (var i = 0; i < rowLength; i++) {
                        row = rows.item(i);
                        arr += "{'name':'" + row.POLICY_NAME + "','code':'" + row.URL + "#" + row.POLICY_ID + "','isSelected':'0'}";
                        if (i !== rowLength - 1)  arr += ",";
                    }
                    array = "{'callBack':'singleChoiceShowCallback','list':[" + arr + "]}";
                    resObj.array = array;
                    resObj.topic_name = topic_name;
                    deferred.resolve(resObj);
                } else {
                    deferred.reject(errMsg);
                }
            });
            return deferred.promise;
        };
        return {
            getTaskData: getTaskData,
            getJXTaskData: getJXTaskData,
            getTempService: getTempService
        };
    }]);
/**
 * 客服页面初始化模块
 * Created by Ethan on 2015/1/26.
 */
angular.module('custServiceModule', ['ngRoute', 'fsCordova', 'dateToolModule', 'webDBModule', 'pubToolModule', 'CS_Task_Module'])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when("/", {
            controller: 'GeneralCtrl',
            templateUrl: 'custservie_plus/route/general.html'
        }).when('/task', {
            controller: 'TaskCtrl',
            templateUrl: 'custservie_plus/route/task.html'
        }).otherwise({
            redirectTo: '/'
        });
    }]).factory('CustService', ['$q', '$log', 'DateTool', 'WebDBSer',
        function ($q, $log, DateTool, WebDBSer) {
            var dbName = 'slsDatabase',
                currDay = DateTool.getDate(),
                currTime = DateTool.getTime();
            /**
             * 获取当前拜访客户信息
             * 1.可进入客服页面意味着本地M_PARM中存在一个客户SLS_G_CUST_ID
             * 2.该客户存在两种状态:
                 一、当前客户在拜访列表中;
                 二、当前客户不在拜访列表,隶属临时拜访,从今日拜访或者客户管理进入;
             * By Ethan 15-1-26
             */
            var getCurrVisit = function () {
                var deferred = $q.defer();
                WebDBSer.getStrBySql("SELECT PARMS FROM M_PARM WHERE ID='SLS_G_CUST_ID'", 'PARMS', dbName).then(function (cid) {
                    cust_id = cid;
                    var exeSQL = "SELECT vCustId CUST_ID,xCustCode CUST_CODE,vCustName CUST_SHORT_NAME,busiAddr BUSI_ADDR,"
                        + "gpsaddress,isSignIn,isSignOut,orderTel,isMarketCust IS_MARKET_CUST,date,visitType,nvisitReason"
                        + " FROM VISITTABLE WHERE vCustId='" + cust_id + "' and date='" + currDay + "'";
                    // First: Get customer information from VISITTABLE.
                    WebDBSer.getResultsBySql(exeSQL, dbName).then(function (results) {
                        if (results.rows.length > 0) {
                            $log.debug("initCurrVisit---current cust in visitable");
                            deferred.resolve(results.rows.item(0));
                        } else {
                            // Then: Get customer information from M_CUST, which is temporary visit.
                            exeSQL = "SELECT CUST_ID,NATION_CUST_CODE CUST_CODE,CUST_NAME CUST_SHORT_NAME,BUSI_ADDR," +
                            "ORDER_TEL orderTel,IS_MARKET_CUST,CARD_ID FROM M_CUST where CUST_ID='" + cust_id + "'";
                            WebDBSer.getResultsBySql(exeSQL, dbName).then(function (results) {
                                if (results.rows.length > 0) {
                                    custJson = results.rows.item(0);
                                    deferred.resolve(custJson);
                                } else {
                                    alert("无效零售户");
                                    deferred.reject('Customer not exist!');
                                }
                            });
                        }
                    }, function (msg) {
                        alert("getCurrVisit: " + msg);
                    });
                }, function (msg) {
                    alert("getCurrVisit: " + msg);
                });
                return deferred.promise;
            };
            // 切换电话拜访
            var phoneVisit = function () {
                var deferred = $q.defer();
                if (angular.isDefined(custJson) && angular.isObject(custJson)) {
                    WebDBSer.getStrBySql("select count(*) NUM from VISITTABLE where date ='" + currDay + "'", 'NUM', dbName).then(function (str) {
                        WebDBSer.executeBatchUpdate("insert into VISITTABLE (orderId,vCustId,xCustCode,vCustName,busiAddr,visitType,isMarketCust," +
                            "isSignIn,isSignOut,state,status,visitDesc,date,xComId,vComId,xSlsmanId,isupdate,isNew,signType)VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                            [[str, cust_id, custJson.CUST_CODE, custJson.CUST_SHORT_NAME, custJson.BUSI_ADDR, '1', custJson.IS_MARKET_CUST, 'no', 'no', '1', '01', '未拜访', currDay, MJGetItem("xComId"),
                                MJGetItem("vComId"), MJGetItem("xSlsmanId"), '0', '1', '1']], dbName).then(function (b) {
                                if (b) {
                                    WebDBSer.executeUpdate("update FRONTPAGENUM set tvNum=tvNum+1,taNum=taNum+1,wvNum=wvNum+1,waNum=waNum+1,mvNum=mvNum+1,maNum=maNum+1 where date='" + currDay + "'", dbName)
                                        .then(function (b) {
                                        	custJson = undefined;
                                            deferred.resolve(b);
                                        }, function (msg) {
                                            deferred.reject(msg);
                                        }
                                    );
                                }
                            }, function (msg) {
                                deferred.reject(msg);
                            }
                        );
                    });
                } else {
                    WebDBSer.executeUpdate("UPDATE VISITTABLE SET visitType = '1',signType='1' WHERE vCustId = '" + cust_id + "' and isSignIn='no' and isSignOut='no' and date='" + currDay + "'", dbName)
                        .then(function (b) {
                            deferred.resolve(b);
                        }, function (msg) {
                            deferred.reject(msg);
                        }
                    );
                }
                return deferred.promise;
            };
            // 切换为实地拜访
            var actualVisit = function () {
                var deferred = $q.defer();
                WebDBSer.executeUpdate("UPDATE VISITTABLE SET visitType = '0' WHERE vCustId = '" + cust_id + "' and isSignIn='no' and isSignOut='no' and date='" + currDay + "'", dbName)
                    .then(function (b) {
                        deferred.resolve(b);
                    }, function (msg) {
                        deferred.reject(msg);
                    }
                );
                return deferred.promise;
            };
            // 切换为异常拜访, 并根据原因执行签到签退
            var excepVisit = function (resStr) {
                var deferred = $q.defer();
                var latAndLan = JSON.parse(MJGetLocationJson()),
                    latitude = latAndLan.latitude,
                    longitude = latAndLan.longitude;
                if (angular.isDefined(custJson) && angular.isObject(custJson)) {
                    WebDBSer.executeUpdate("DELETE FROM VISITTABLE WHERE date = '" + currDay + "' AND vCustId = '" + cust_id + "'", dbName).then(function (b) {
                        if (b) {
                            WebDBSer.getStrBySql("select count(*) NUM from VISITTABLE where date ='" + currDay + "'", 'NUM', dbName).then(function (str) {
                                WebDBSer.executeBatchUpdate("insert into VISITTABLE (orderId,vCustId,xCustCode,vCustName,busiAddr,visitType,isMarketCust,isSignIn,isSignOut,state,status,visitDesc,date,xComId," +
                                    "vComId,xSlsmanId,isupdate,inTime,outTime,lngin,latin,isNew,lngout,latout,nvisitReason,signType,signOutType)VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                                    [[str, cust_id, custJson.CUST_CODE, custJson.CUST_SHORT_NAME, custJson.BUSI_ADDR, '0', custJson.IS_MARKET_CUST, 'yes', 'yes', '2', '03', '已拜访', currDay, MJGetItem("xComId"),
                                        MJGetItem("vComId"), MJGetItem("xSlsmanId"), '0', currTime, currTime, longitude, latitude, '1', longitude, latitude, resStr, '1', '1']], dbName).then(function () {
                                        WebDBSer.executeUpdate("update FRONTPAGENUM set tvNum=tvNum+1,taNum=taNum+1,wvNum=wvNum+1,waNum=waNum+1,mvNum=mvNum+1,maNum=maNum+1 where date='" + currDay + "'", dbName)
                                            .then(function (b) {
                                                if (b) {
                                                	custJson = undefined;
                                                    deferred.resolve(b);
                                                }
                                            }, function (msg) {
                                                deferred.reject(msg);
                                            }
                                        );
                                    }, function (msg) {
                                        deferred.reject(msg);
                                    }
                                );
                            });
                        }
                    });
                } else {
                    WebDBSer.executeUpdate("UPDATE VISITTABLE SET signType='1',signOutType='1',inTime = '" + currTime + "',lngin='" + longitude + "',latin='" + latitude
                    + "',lngout='" + longitude + "',latout='" + latitude + "',isSignIn='yes',outTime = '" + currTime + "',isSignOut='yes',state='2',status='03',"
                    + "nvisitReason='" + resStr + "',visitType='0',visitDesc='已拜访' WHERE vCustId = '" + cust_id + "' and date='" + currDay + "'", dbName)
                        .then(function (b) {
                            if (b) {
                                WebDBSer.executeUpdate("update FRONTPAGENUM set tvNum =tvNum-1,wvNum = wvNum-1,mvNum = mvNum-1 where date='" + currDay + "'", dbName)
                                    .then(function (b) {
                                        if (b) {
                                            deferred.resolve(b);
                                        }
                                    }
                                );
                            }
                        }, function (msg) {
                            deferred.reject(msg);
                        }
                    );
                }
                return deferred.promise;
            };
            return {
                dbName: dbName,
                getCurrVisit: getCurrVisit,
                phoneVisit: phoneVisit,
                actualVisit: actualVisit,
                excepVisit: excepVisit
            };
        }
    ]).controller('CustServiceCtrl', ['$scope', '$log', '$rootScope', 'CustService', 'CordovaService', 'WebDBSer', 'DateTool', 'PubTool',
        function ($scope, $log, $rootScope, CustService, CordovaService, WebDBSer, DateTool, PubTool) {
	    	var pathRref = "resources/css/mobile/";
	    	$scope.picObj = {
    			head_back: pathRref + "head_back.png",
    			scan: pathRref + "scan.png",
    			phone: pathRref + "phone.png",
    			backimg: pathRref + "backimg.png"
	    	};
            CordovaService.ready.then(function () {
                MJOpenDB();
                // Initialize camera parameters
                pictureSource = navigator.camera.PictureSourceType;
                destinationType = navigator.camera.DestinationType;
                // Header name
                $scope.header = MJGetItem("csName") == 'null' ? '拜访' : MJGetItem("csName");
                // Back to home page
                $scope.back = back;
                // 二维码
                $scope.QRScan = MJGetItem("codeSignin") == '1';
                // Initialize picture path
                // 清除NFC刷卡控制标志位, 用于防止当前刷卡逻辑未走完而产生页面跳转,而当前标志位未清除.
                WebDBSer.executeUpdate("DELETE FROM M_PARM WHERE ID='SLS_CARD_NUM'", CustService.dbName).then(function (b) {
                    if (b) {
                        $log.debug('Clear SLS_CARD_NUM success!');
                    }
                });
                // Initialize customer information
                CustService.getCurrVisit().then(function (cusObj) {
                    // Initialize current visit information
                    vCustName = cusObj.CUST_SHORT_NAME;
                    isMarketCust = cusObj.IS_MARKET_CUST;
                    xCustCode = cusObj.CUST_CODE;
                    orderTel = cusObj.orderTel;
                    gpsaddress = cusObj.gpsaddress || '';
                    // 客户信息初始化
                    $scope.cusObj = cusObj;
                    // 展示当前客户类型信息
                    $scope.CType = {
                        show: false,
                        CoTypeArr: []
                    };
                    var custInfo = MJGetItem("CRM_M_CSINFO");
                    if (custInfo && custInfo != 'null' && custInfo != '') {
                        WebDBSer.getResultsBySql("SELECT " + custInfo + " FROM M_CUST WHERE CUST_ID = '" + cust_id + "'", CustService.dbName)
                            .then(function (res1) {
                                if (res1.rows.length > 0) {
                                    var arrType = [],
                                        row = res1.rows.item(0);
                                    var custInfoArr = custInfo.split(",");
                                    custInfoArr.forEach(function (CN) {
                                        arrType.push(row[CN]);
                                    });
                                    $scope.CType.show = true;
                                    $scope.CType.CoTypeArr = arrType;
                                }
                            }
                        );
                    }
                    // 拜访类型
                    var getvisitType = cusObj.visitType;
                    if (getvisitType && getvisitType != "") visitType = getvisitType;
                    // 是否签到
                    var isSignIn = cusObj.isSignIn;
                    if (isSignIn == 'yes') {
                        isSignSinal = '1';
                    }
                    // 是否签退
                    var isSignOut = cusObj.isSignOut;
                    if (isSignOut == 'yes') {
                        isSignSinal = '2';
                    }
                    // 是否异常拜访
                    var nvisitReason = cusObj.nvisitReason;
                    if (nvisitReason && nvisitReason != '') visitType = '2';
                    $log.debug("visitType is initialized as: " + visitType);
                    // 初始化右上角拜访类型
                    var visitTyNa;
                    switch (visitType) {
                        case '0':
                            visitTyNa = '实地';
                            break;
                        case '1':
                            visitTyNa = '电话';
                            break;
                        case '2':
                            visitTyNa = '异常';
                            break;
                        default:
                            visitTyNa = '实地';
                            break;
                    }
                    $scope.visitTyNa = visitTyNa;
                    // 若当前客户已经签到，不允许切换模式
                    $scope.toggleMenu = function () {
                        if (isSignIn === 'yes') {
                            MJShowToastMsg("当前客户已拜访，无法切换拜访方式！");
                        } else {
                            $scope.showMenu = !$scope.showMenu;
                        }
                    };
                    // Initialize sign status, 控制签到签退状态显示
                    var task_check = {
                        check: "check_in",//初始状态  未签到：check_in  待签退：check_out  已签退：check_leave
                        checkStatus: 0, // 用于记录签到状态
                        right: "100%",
                        left: 0,
                        right_w: 0,
                        left_w: 0,
                        showCloud: false,
                        cloud: "cloud_init",
                        showWatting: true,
                        showWatting2: true,
                        title: '点我签到吧',
                        checkIn: function () {
                            this.checkStatus = 1;
                            this.right = 0;
                            this.left = 0;
                            this.check = "check_out";
                            this.cloud = "cloud";
                            this.showCloud = true;
                            this.showWatting2 = true;
                            this.showWatting = false;
                            this.title = "记得签退哦";
                        },
                        checkOut: function () {
                            this.checkStatus = 1;
                            this.right = 0;
                            this.left = "66.7%";
                            this.showWatting = false;
                            this.showWatting2 = false;
                            this.check = "check_leave";
                            this.title = "任务完成！";
                        }
                    };
                    if (isSignIn === 'yes') task_check.checkIn();
                    if (cusObj.isSignOut === 'yes') task_check.checkOut();
                    $scope.task_check = task_check;
                    // Initialize mode
                    var visitException = MJGetItem("visitException");
                    var reason = visitException == 'null' ? [] : JSON.parse(visitException).list;
                    reason = reason || [];
                    reason.forEach(function (ele) {
                        ele.checked = false;
                        if (visitType == '2' && ele.VALUE == nvisitReason) {
                            ele.checked = true;
                        }
                    });
                    $scope.mode = {
                        actual: {
                            name: '实地拜访',
                            visitType: '0',
                            checked: visitType == '0'
                        },
                        phone: {
                            name: '电话拜访',
                            visitType: '1',
                            checked: visitType == '1'
                        },
                        exception: {
                            name: '异常拜访',
                            visitType: '2',
                            reason: reason
                        },
                        changeMode: function (visTy) {
                            $log.debug("changeMode---visitType = " + visitType + ";visTy = " + visTy);
                            switch (visitType) {
                                case '0':// 当前为实地拜访，且未签到
                                    switch (visTy) {
                                        case '0':
                                            break;
                                        case '1':
                                            CustService.phoneVisit().then(function (b) {
                                                if (b) {
                                                    $scope.visitTyNa = '电话';
                                                    visitType = '1';
                                                    MJShowToastMsg("已切换为电话拜访，请签到!");
                                                }
                                            });
                                            break;
                                        default:
                                            break;
                                    }
                                    break;
                                case '1':// 当前为电话拜访
                                    switch (visTy) {
                                        case '0':
                                            CustService.actualVisit().then(function (b) {
                                                if (b) {
                                                    visitType = '0';
                                                    $scope.visitTyNa = '实地';
                                                    MJShowToastMsg("已切换为实地拜访，请签到!");
                                                }
                                            });
                                            break;
                                        case '1':
                                            break;
                                        default:
                                            break;
                                    }
                                    break;
                                default:
                                    break;
                            }
                        },
                        excepVisit: function (chObj) {
                            if (confirm("确定选择：" + chObj.VALUE + "，执行异常拜访？")) {
                                CustService.excepVisit(chObj.VALUE).then(function (b) {
                                    if (b) {
                                        MJShowToastMsg("当前客户异常拜访结束!");
                                        $scope.visitTyNa = '异常';
                                        visitType = '2';// 切换当前状态为异常, 用来控制不能切换模式
                                        $scope.showMenu = !$scope.showMenu;// 隐藏弹出框
                                        isSignIn = 'yes';// 禁止点击弹出框
                                        task_check.checkOut();
                                        isSignSinal = '2';// 签退状态
                                        // 调用/crm_m/$war/html/sls/autoUpload.html下的本地数据上传
                                        MJJsCall('tab1','autoUpdate()');
                                    }
                                });
                            }
                        }
                    };
                    // Initialize functionality
                    var policyUse = MJGetItem("policyUse");
                    if (policyUse === '2' || policyUse === '3') {
                        location.href = "#task";
                    } else { // 非任务式
                        location.href = "#/";
                    }
                    // To customer detail
                    $scope.toCustDetial = function () {
                        var arrJSON = "{\"backUrl\":\"../custService.html\"" + ",\"cust_id\":\"" + cust_id + "\"" + "}";
                        WebDBSer.executeUpdate("DELETE FROM M_PARM WHERE ID = 'sls_custInfo'", CustService.dbName).then(function (b) {
                            if (b) {
                                WebDBSer.executeUpdate("INSERT INTO M_PARM(ID,PARMS) VALUES('sls_custInfo','" + arrJSON + "')", CustService.dbName)
                                    .then(function (b) {
                                        if (b) {
                                            window.location.href = "custInfo/custInfo.html";
                                        }
                                    }
                                );
                            }
                        });
                    };
                    // 签到成功后刷新页面状态, 绑定到全局函数
                    signInStageFour = function () {
                        $scope.$apply(task_check.checkIn());
                        isSignSinal = '1';
                        isSignIn = 'yes';// 禁止切换模式
                    };
                    // 签退成功后刷新页面状态, 绑定到全局函数
                    signOutAction = function () {
                        $scope.$apply(task_check.checkOut());
                        isSignSinal = '2';
                        // 调用/crm_m/$war/html/sls/autoUpload.html下的本地数据上传
                        MJJsCall('tab1','autoUpdate()');
                        if (MJGetItem("CRM_M_CS_BACK") == "1") {
                            window.location.href = "dayVisits.html";
                        } else {
                            window.location.href = "frontPage.html";
                        }
                    };
                    /**
                     * 执行功能跳转，统一事件方法
                     * 注释：1.对于本地和离线缓存页面,直接跳转页面;2.对于未缓存的在线页面,根据进入页面时的网络状态来判断是否能跳转
                     * 若网络可用,首先将当前客户置入session当中,再跳转当前页面.
                     * By Ethan 15-2-1
                     */
                    $scope.toDirect = function (item) {
                        $log.debug("toDirect - item = " + JSON.stringify(item) + ";isMarketCust = " + isMarketCust);
                        var link,
                            link_type;
                        if (policyUse === '2' || policyUse === '3') {
                        	link = item.URL;
                            link_type = item.DIRCT;
                        } else { 
                        	link = item.LINK;
                            link_type = item.isSc;
                        }
                        MJSLSOnEvent(link, 'custService', '1');// 百度统计
                        switch (link_type) {
                            case 'offline': // HTML5离线缓存功能
                                if (link.indexOf("cotrack/coTrackOffline.htm") > 0) {	// 销售跟踪离线版
                                    var backJson = '{\'custID\':\'' + cust_id + '\'' + ',\'backUrl\':\'../custService.html\'' + '}';
                                    WebDBSer.executeUpdate("DELETE FROM M_PARM WHERE ID='sls_coTrackOffline'", CustService.dbName)
                                        .then(function (b) {
                                            if (b) {
                                                WebDBSer.executeUpdate("INSERT INTO M_PARM(ID,PARMS) VALUES(?,?)", CustService.dbName, ['sls_coTrackOffline',backJson])
                                                    .then(function (b) {
                                                        if (b) {
                                                            window.location.href = link;
                                                        }
                                                    }
                                                );
                                            }
                                        }
                                    );
                                } else if (link.indexOf("wapvisitrecord/wapVisitRecordOffline.htm") > 0) {	// 拜访记录-吉林
                                    WebDBSer.getStrBySql("SELECT PARMS FROM M_PARM WHERE ID='SLS_VISIT_CONTENT' AND NOTE = '" + DateTool.getDate() + "'", 'PARMS', CustService.dbName)
                                        .then(function (res) {
                                            if (res) {
                                                if (res == '1') {
                                                    window.location.href = link;
                                                } else {
                                                    MJShowToastMsg("未做拜访计划");
                                                }
                                            } else {
                                                MJShowToastMsg("请下载拜访内容的数据");
                                            }
                                        }
                                    );
                                } else if (link.indexOf("wapvisitcontent/wapVisitContentOffline.htm") > 0) {	// 拜访内容-吉林
                                    window.location.href = link;
                                }
                                break;
                            case 'local': // 本地页面
                                if ((link.indexOf("marketWhseInput.html") > 0) && (isMarketCust == "no" || isMarketCust == "0")) { // 信息采集
                                    MJShowToastMsg("此零售户不是采样零售户!");
                                } else if (link.indexOf("coTrack") > 0) {
                                	var backJson = '{\'custID\':\'' + cust_id + '\'' + ',\'backUrl\':\'../custService.html\'' + '}';
                                    WebDBSer.executeUpdate("DELETE FROM M_PARM WHERE ID='sls_coTrackOffline'", CustService.dbName)
                                        .then(function (b) {
                                            if (b) {
                                                WebDBSer.executeUpdate("INSERT INTO M_PARM(ID,PARMS) VALUES(?,?)", CustService.dbName, ['sls_coTrackOffline',backJson])
                                                    .then(function (b) {
                                                        if (b) {
                                                            window.location.href = link;
                                                        }
                                                    }
                                                );
                                            }
                                        }
                                    );
                                } else {
                                	// 向本地化页面传递客户ID
                                	link = link + "?vCustId="+cust_id;
                                	// 用于任务式获取ACTIVITY_ID, 来完成任务状态
                                	var activityId = item.ACTIVITY_ID;
                                	if(activityId){
                                		link = link + "&activity_Id=" + activityId;
                                	}
                                    window.location.href = link;
                                }
                                break;
                            case 'js': // 以JS执行
                                eval("(" + link + ")");
                                break;
                            case 'yes': // 跳转SC
                                if (PubTool.isConn()) {
                                    var topName = vCustName,
                                        parm;
                                    topName = encodeURI(topName);	// 中文参数需要编码2次
                                    topName = encodeURI(topName);
                                    parm = "userId=" + xCustCode + "&comId=" + MJGetItem("xComId") + "&custCode=" + xCustCode + "&custName=" + topName
                                    + "&userAgent=" + MJGetItem("userAgent") + "&url=localCustService";
                                    if (link.indexOf("quest/questHisJoinList.htm") > 0) {	// 宣传促销
                                        var xmlhttp;
                                        if (window.XMLHttpRequest) {
                                            xmlhttp = new XMLHttpRequest();
                                        } else {
                                            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
                                        }
                                        xmlhttp.onreadystatechange = function () {
                                            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                                                window.location.href = link + "?" + parm + "&questList=" + encodeURI(encodeURI(xmlhttp.responseText));
                                            }
                                        };
                                        var url = MJGetItem("prefixUrl") + "sp/quest/questHisJoinList.do?method=getQuestList&custId=" + cust_id + "&xCustCode=" + xCustCode;
                                        xmlhttp.open("GET", url, "true");
                                        xmlhttp.send();
                                    } else {
                                        window.location.href = link + "?" + parm;
                                    }
                                } else {
                                    MJShowToastMsg("请在有网络下访问该功能！");
                                }
                                break;
                            case 'mwap': // 吉林个性化
                                if (PubTool.isConn()) {
                                    parm = "?method=query&CUST_MGR_CODE=" + MJGetItem("xSlsmanId") + "&VISIT_DATE=" + getDate() + "&NATION_CUST_CODE=" + xCustCode
                                    + "&xComId=" + MJGetItem("xComId") + "&vCustId=" + cust_id + "&url=custService.html";
                                    window.location.href = link + "?" + parm;
                                } else {
                                    MJShowToastMsg("请在有网络下访问该功能！");
                                }
                                break;
                            default:
                                if (PubTool.isConn()) {
                                    var parm = "&vCustId=" + cust_id + "&xCustCode=" + xCustCode + "&isMarketCust=" + isMarketCust;
                                    var activityId = item.ACTIVITY_ID,
                                        fuc_title;// 功能名称
                                    if (activityId) { // 计划任务式所需参数
                                        fuc_title = item.POLICY_NAME;
                                        parm += "&activity_Id=" + activityId + "&activity_status=" + item.STATUS + "&crt_date=" + item.CRT_DATE + "&policy_id=" + item.POLICY_ID;
                                    } else { // 九宫格模式
                                        fuc_title = item.TITLE;
                                    }
                                    fuc_title = encodeURI(fuc_title);// 中文参数需要编码2次
                                    fuc_title = encodeURI(fuc_title);
                                    parm += "&fuc_title=" + fuc_title;
                                    $log.debug('Online function parm = ' + parm);
                                    window.location.href = link + "?backUrl=custService.html" + parm;
                                } else {
                                    MJShowToastMsg("请在有网络下访问该功能！");
                                }
                                break;
                        }
                    };
                });
            });
        }
    ]).controller('GeneralCtrl', ['$scope', 'CustService', function ($scope, CustService) {
        var custService = MJGetItem("custService");
        if (custService && custService !== 'null' && custService != '') {
            // 获取当前客户是否为信息采集户
            CustService.getCurrVisit().then(function (cusObj) {
                var isMarketCust = cusObj.IS_MARKET_CUST;
                var funcList = JSON.parse(custService),
                    arrLength = funcList.length,
                    oneEle;
                for (var i = 0; i < arrLength; i++) {
                    oneEle = funcList[i];
                    if ((oneEle.LINK.indexOf("marketWhseInput.html") > 0) && (isMarketCust == "no" || isMarketCust == "0")) {
                        oneEle.PICTURE = oneEle.PICTURE.split('marketwhseinput.png')[0] + 'marketwhseinput1.png';
                        break;
                    }
                }
                $scope.funcList = funcList;
            });
        }
    }
    ]).controller('TaskCtrl', ['$scope', 'TaskService', function ($scope, TaskService) {
        $scope.taskOri = {
            taskList: [],
            tempTitle: "临时任务"
        };
        if (MJGetItem("policyUse") === '2') { // 江西
            TaskService.getJXTaskData().then(function (obj) {
                $scope.taskOri.taskList = obj;
                $scope.taskOri.tempTitle = "主动服务";
            });
        } else { // 通用
            TaskService.getTaskData().then(function (obj) {
                $scope.taskOri.taskList = obj;
            });
        }
        // 临时任务
        $scope.toTempService = function () {
            TaskService.getTempService().then(function (obj) {
                MJShowSingleChoiceDialogJson(obj.array, obj.topic_name);
            }, function (errMsg) {
                MJShowToastMsg(errMsg);
            });
        };
    }
    ]);