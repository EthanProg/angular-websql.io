/**
 * Created by Ethan on 2015/1/23.
 */
// service 1
// 本服务设置了一个Angular模块监听deviceready事件。也可以使用服务来监听
// deviceready事件，然后依赖于这个事件是否被触发来解析promise。
// 可以使用这个CordovaService来确定Cordova是否准备好了，事实上这里已经准备好了，并
// 且我们还可以依赖于这个服务是否准备就绪来设置逻辑,使用方式如下：
// angular.module('myApp', ['fsCordova'])
//    .controller('MyController', function ($scope, CordovaService) {
//    CordovaService.ready.then(function () {
//        // 此时Cordova已经准备好了
//    });
// });
angular.module('fsCordova', [])
    .service('CordovaService', ['$document', '$q',
        function ($document, $q) {
            var d = $q.defer(),
                resolved = false;
            var self = this;
            this.ready = d.promise;
            document.addEventListener('deviceready', function () {
                resolved = true;
                d.resolve(window.cordova);
            });
            // 检查一下以确保没有漏掉这个事件（以防万一）
            setTimeout(function () {
                if (!resolved) {
                    if (window.cordova) {
                        d.resolve(window.cordova);
                    }
                }
            }, 3000);
        }
    ]);

// service 2
// dateToolModule 提供了日期和时间的公用方法
// By Ethan 2015-1-23
angular.module('dateToolModule', [])
    .factory('DateTool', function () {
        // 获取当前日期
        var getDate = function () {
                var date = new Date(),
                    year = date.getFullYear(),
                    month = date.getMonth() + 1,
                    day = date.getDate(),
                    time = year.toString();
                time += ((month < 10) ? "0" : "") + month;
                time += ((day < 10) ? "0" : "") + day;
                return time;
            },
            //获取当前时间
            getTime = function () {
                var date = new Date();
                var hours = date.getHours();
                var minutes = date.getMinutes();
                var seconds = date.getSeconds();
                var time = "";
                time += ((hours < 10) ? "0" : "") + hours;
                time += ":";
                time += ((minutes < 10) ? "0" : "") + minutes;
                time += ":";
                time += ((seconds < 10) ? "0" : "") + seconds;
                return time;
            },
            // 获取当前日期的前N天
            getPreviousDate = function (n) {
                var date = new Date();
                date.setDate(date.getDate() + n);
                var year = date.getFullYear();
                var month = date.getMonth() + 1;
                var day = date.getDate();
                console.log(year + " - " + month + " - " + day);
                var time = "";
                time += year;
                time += ((month < 10) ? "0" : "") + month;
                time += ((day < 10) ? "0" : "") + day;

                return time;
            },
            // 获取当前月份
            getMonth = function () {
                var date = new Date();
                var year = date.getFullYear();
                var month = date.getMonth() + 1;
                var time = "";
                time += year;
                time += ((month < 10) ? "0" : "") + month;
                return time;
            },
            // 获取之前n个的月份
            getPriviousMonth = function (n) {
                var date = new Date();
                var year = date.getFullYear();
                var month = date.getMonth() + 1;
                var pMonth = month - n;
                if (pMonth <= 0) {
                    year -= 1;
                    month = 12 + pMonth;
                } else {
                    month = pMonth;
                }
                var time = "";
                time += year;
                time += ((month < 10) ? "0" : "") + month;
                return time;
            },
            // 获取指定月份之前的n个的月份
            getPriMonth = function (n, month) {
                var year = month.substring(0, 4);
                var month = parseInt(month.substring(4, 6), '10');
                var pMonth = month - n;
                if (pMonth <= 0) {
                    year -= 1;
                    month = 12 + pMonth;
                } else {
                    month = pMonth;
                }
                var time = "";
                time += year;
                time += ((month < 10) ? "0" : "") + month;
                return time;
            },
            // 获取指定月份之后的1个的月份
            getNextMonth = function(date) {
                var year = date.substring(0,4); //获取当前日期的年份
                var month = date.substring(4,6); //获取当前日期的月份
                var day = date.substring(6,8); //获取当前日期的日
                var days = new Date(year, month, 0);
                days = days.getDate(); //获取当前日期中的月的天数
                var year2 = year;
                var month2 = parseInt(month,'10') + 1;
                if (month2 == 13) {
                    year2 = parseInt(year2,'10') + 1;
                    month2 = 1;
                }
                var day2 = day;
                var days2 = new Date(year2, month2, 0);
                days2 = days2.getDate();
                if (day2 > days2) {
                    day2 = days2;
                }
                if (month2 < 10) {
                    month2 = '0' + month2;
                }
                return ""+year2 + month2 +  day2;;
            },
            // 获取指定日期的后n天
            getNextDay = function (n, date) {
                if (date) {
                    date = new Date(date.substring(0, 4), parseInt(date.substring(4, 6), '10') - 1, date.substring(6, 8));
                } else {
                    date = new Date();
                }
                var i_milliseconds = date.getTime();
                i_milliseconds += 1000 * 60 * 60 * 24 * n;
                var t_date = new Date();
                t_date.setTime(i_milliseconds);
                var i_year = t_date.getFullYear();
                var i_month = ("0" + (t_date.getMonth() + 1)).slice(-2);
                var i_day = ("0" + t_date.getDate()).slice(-2);
                return "" + i_year + i_month + i_day;
            },
            // 计算时间间隔计算(间隔天数),参数类型需为2015-03-24
            getDateDiff = function(startDate,endDate){  
                var startTime = new Date(Date.parse(startDate.replace(/-/g,   "/"))).getTime();     
                var endTime = new Date(Date.parse(endDate.replace(/-/g,   "/"))).getTime();     
                var dates = Math.abs((startTime - endTime))/(1000*60*60*24);     
                return  dates;    
            };
        return {
            getDate: getDate,
            getTime: getTime,
            getPreviousDate: getPreviousDate,
            getMonth: getMonth,
            getPriviousMonth: getPriviousMonth,
            getNextDay: getNextDay,
            getPriMonth: getPriMonth,
            getNextMonth: getNextMonth,
            getDateDiff: getDateDiff
        };
    });


// service 3
// pubToolModule 提供了调用的公用方法
// By Ethan 2015-1-23
angular.module('pubToolModule', [])
    .factory('PubTool', function () {
        // 计算经纬度偏移距离
        var getGreatCircleDistance = function (lat1, lng1, lat2, lng2) {
            var getRad = function (d) {
                return d * Math.PI / 180.0;
            };
            var radLat1 = getRad(lat1);
            var radLat2 = getRad(lat2);

            var a = radLat1 - radLat2;
            var b = getRad(lng1) - getRad(lng2);

            var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
            s = s * 6378137.0;
            s = Math.round(s * 10000) / 10000.0;
            return new Number(s).toFixed(2);
        };
        // 产生36位全球唯一码
        var getRandomNum = function () {
            var guid = "";
            for (var i = 1; i <= 32; i++) {
                var n = Math.floor(Math.random() * 16.0).toString(16);
                guid += n;
                if ((i == 8) || (i == 12) || (i == 16) || (i == 20))
                    guid += "-";
            }
            return guid;
        };
        // Ajax提交方式，将参数字符串中的英文单引号替换为中文单引号(因为英文单引号在组织insert SQL会有问题)，另外以替换的方式强制替换特殊字符。
        /*
         # 用来标志特定的文档位置 %23
         & 分隔不同的变量值对 %26
         + 在变量值中表示空格 %2B
         \ 表示目录路径 %2F
         = 用来连接键和值 %3D
         ? 表示查询字符串的开始 %3F
         */
        var encodeSpecChar = function (str) {
            var reg = new RegExp("'", "g");
            str = str.replace(reg, "’");
            str = encodeURI(str);
            reg = new RegExp("#", "g");
            str = str.replace(reg, '%23');
            reg = new RegExp("&", "g");
            str = str.replace(reg, '%26');
            reg = new RegExp("=", "g");
            str = str.replace(reg, '%3D');
            reg = new RegExp("\\?", "g");//在正则表达式?有特殊含义，所以前边增加\\
            str = str.replace(reg, '%3F');
            reg = new RegExp("\\+", "g"); //在正则表达式+有特殊含义，所以前边增加\\
            str = str.replace(reg, '%2B');
            str = encodeURI(str);
            return str;
        };
        // 字符串长度，字母为1 ，汉字为2
        var getStrLen = function (str) {
            var len = 0;
            for (var i = 0; i < str.length; i++) {
                var c = str.charCodeAt(i);
                //单字节加1
                if ((c >= 0x0001 && c <= 0x007e) || (0xff60 <= c && c <= 0xff9f)) {
                    len++;
                } else {
                    len += 2;
                }
            }
            return len;
        };
        // 截取url中的参数
        var getUrlArgs = function () {
            var args = {};
            var query = location.search.substring(1);
            var pairs = query.split("&");
            for (var i = 0, length = pairs.length; i < length; i++) {
                var pos = pairs[i].indexOf("=");
                if (pos == -1) continue;
                var name = pairs[i].substring(0, pos),
                    value = pairs[i].substring(pos + 1);
                value = decodeURIComponent(value);
                args[name] = value;
            }
            return args;
        };
        // 判断当前网络状态
        var isConn = function () {
            var isNetwork = false;// 当前网络状态,默认网络可用
            try {
                if (MJIsNetworkConnect() == 1) isNetwork = true;
            } catch (e) {
                throw new Error("isConn MJIsNetworkConnect Error : " + e);
            }
            return isNetwork;
        };
        return {
            getGreatCircleDistance: getGreatCircleDistance,
            getRandomNum: getRandomNum,
            encodeSpecChar: encodeSpecChar,
            getStrLen: getStrLen,
            getUrlArgs: getUrlArgs,
            isConn : isConn
        };
    });

/*--------------------------------------声明拦截器----------------------------------------*/
// Intercepting HTTP calls with AngularJS.
angular.module('mobile_app_interceptor', [])
    .config(function ($provide, $httpProvider, $logProvider) {
    	// Close debug log 
    	$logProvider.debugEnabled(false);
        // Intercept http calls.
        $provide.factory('authHttpResponseInterceptor', function ($q, $log) {
            return {
                // On request success
                request: function (config) {
                    $log.debug(config); // Contains the data about the request before it is sent.

                    // Return the config or wrap it in a promise if blank.
                    return config || $q.when(config);
                },

                // On request failure
                requestError: function (rejection) {
                    $log.error(rejection); // Contains the data about the error on the request.

                    // Return the promise rejection.
                    return $q.reject(rejection);
                },

                // On response success
                response: function (response) {
                    $log.debug(response); // Contains the data from the response.

                    // Return the response or promise.
                    return response || $q.when(response);
                },

                // On response failture
                responseError: function (rejection) {
                    $log.error(rejection); // Contains the data about the error.

                    // Return the promise rejection.
                    return $q.reject(rejection);
                }
            };
        });

        // Add the interceptor to the $httpProvider.
        $httpProvider.interceptors.push('authHttpResponseInterceptor');

    });
/*--------------------------------------声明iscm拦截器----------------------------------------*/
