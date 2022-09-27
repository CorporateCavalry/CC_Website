// printers are used to display information
function getConsolePrinter() { return function(msg) { console.log(msg); } }
function getHtmlPrinter(elementId) { return function(msg) { $("#" + elementId).html(getHtmlSafeText(msg)); } }

function getAlertPrinter(id) {
    return function(msg) {
        if (!isNullOrEmpty(msg)) {
            $("#" + id + "_alert").css("display", "");
            $("#" + id + "_alert_message").text(msg);
        } else {
            $("#" + id + "_alert").css("display", "none");
        }
    }
}

function clearAlertPrinter(id) {
    getAlertPrinter(id)("");
}

function getPageRedirector(path) { return function() { window.location.href = path; } }
function goToPageSafe(path) {
    if (profCommands.getIsProcessing()) return;
    if (studentCommands.getIsProcessing()) return;

    window.location.href = path;
}
function urlReplaceSafe(path) {
    if (profCommands.getIsProcessing()) return;
    if (studentCommands.getIsProcessing()) return;

    window.location.replace(path);
}

function getURLParam(key) {
    return new URLSearchParams(window.location.search).get(key);
}

function getURLClassCode() {
    return getURLParam('code');
}

function printUnexpected(printer) {
    printer("Unexpected error: See console for details.");
}

function logError(err, printer) {
    printUnexpected(printer);
    console.log("Error: " + JSON.stringify(err, undefined, 2));
}

function isNullOrEmpty(str) { return !str || str.length == 0; }
function isString(obj) { return typeof obj === 'string' || obj instanceof String; }
function isInt(obj) { return obj === parseInt(obj, 10); }

function getHtmlSafeText(text) {
    return $('<span>').text(text).html();
}

function isValidStudentID(str, id) {
    return !isNaN(id) && (new String(id) == str) && id >= 0;
}

// date formatting
const dateHelpers = function() {
    function getCurrentDate() {
        return new Date();
    }

    function getPaddedNumStr(num, digits) {
        return new String(num).padStart(digits, '0');
    }

    function parseSlidersDateString(datestring) {
        // format is "yyyy MM/dd HH:mm:ss", where the time is in UTC
        return new Date(Date.UTC(
            parseInt(datestring.substring(0, 4)), //year
            parseInt(datestring.substring(5, 7)) - 1, //month
            parseInt(datestring.substring(8, 10)), // date
            parseInt(datestring.substring(11, 13)), // hour
            parseInt(datestring.substring(14, 16)), // minute
            parseInt(datestring.substring(17, 19)) // seconds
        ));
    }

    function getSlidersFormattedDateString(timestamp) {
        // format is "yyyy MM/dd HH:mm:ss", where the time is in UTC
        return timestamp.getUTCFullYear() + " " +
            getPaddedNumStr(timestamp.getUTCMonth() + 1, 2) + "/" + // months are 0-indexed
            getPaddedNumStr(timestamp.getUTCDate(), 2) + " " +
            getPaddedNumStr(timestamp.getUTCHours(), 2) + ":" +
            getPaddedNumStr(timestamp.getUTCMinutes(), 2) + ":" +
            getPaddedNumStr(timestamp.getUTCSeconds(), 2);
    }

    function getWebFormattedDateString(timestamp) {
        // format is "yyyy-MM-dd"
        return timestamp.getFullYear() + "-" +
            getPaddedNumStr(timestamp.getMonth() + 1, 2) + "-" + // months are 0-indexed
            getPaddedNumStr(timestamp.getDate(), 2);
    }

    function getShortFormattedDateString(date) {
        return new String(date.getMonth() + 1) + "/" + new String(date.getDate());
    }

    return {
        getCurrentDate:getCurrentDate,
        parseSlidersDateString:parseSlidersDateString,
        getSlidersFormattedDateString:getSlidersFormattedDateString,
        getWebFormattedDateString:getWebFormattedDateString,
        getShortFormattedDateString:getShortFormattedDateString
    }
}();

// login caching
const loginManager = function() {
    const CACHED_LOGIN_KEY = "login_data";
    const LOGIN_TYPE_KEY = "LoginType";

    function loadStringFromStorage(key) {
        const val = localStorage.getItem(key);
        if (isString(val)) {
            return val;
        }

        return "";
    }

    function loadJSONFromStorage(key) {
        const val = loadStringFromStorage(key);
        if (!isNullOrEmpty(val)) {
            try {
                return JSON.parse(val);
            } catch (e) {
                // invalid JSON
                return {};
            }
        }

        return {};
    }

    let cachedLoginData = loadJSONFromStorage(CACHED_LOGIN_KEY);

    const PROF_LOGIN_KEY_TYPE = "p";
    const STUDENT_LOGIN_KEY_TYPE = "s";

    function loginAsProfessor(profData) {
        cacheLogin(
            profData,
            ["Email", "Password", "Name"],
            PROF_LOGIN_KEY_TYPE
        );
    }

    function loginAsStudent(studentData) {
        cacheLogin(
            studentData,
            ["Email", "Password", "Name", "ClassCode"],
            STUDENT_LOGIN_KEY_TYPE
        );
    }

    function cacheLogin(data, attributes, type) {
        cachedLoginData = {};
        const length = attributes.length;
        let attribute;
        for (let i = 0; i < length; i++) {
            attribute = attributes[i];
            if (data.hasOwnProperty(attribute)) {
                cachedLoginData[attribute] = data[attribute];
            }
        }

        cachedLoginData[LOGIN_TYPE_KEY] = type;
        localStorage.setItem(CACHED_LOGIN_KEY, JSON.stringify(cachedLoginData));
    }

    function logout(onComplete) {
        if (profCommands.getIsProcessing()) return;
        if (studentCommands.getIsProcessing()) return;

        cachedLoginData = {};
        localStorage.setItem(CACHED_LOGIN_KEY, "");
        onComplete();
    }

    function isProfessor() {
        return cachedLoginData.hasOwnProperty(LOGIN_TYPE_KEY) && cachedLoginData[LOGIN_TYPE_KEY] === PROF_LOGIN_KEY_TYPE;
    }

    function isStudent() {
        return cachedLoginData.hasOwnProperty(LOGIN_TYPE_KEY) && cachedLoginData[LOGIN_TYPE_KEY] === STUDENT_LOGIN_KEY_TYPE;
    }

    function hasProperty(key) {
        return cachedLoginData.hasOwnProperty(key);
    }

    function isPropertyNonEmpty(key) {
        return cachedLoginData.hasOwnProperty(key) && !isNullOrEmpty(cachedLoginData[key]);
    }

    function getProperty(key) {
        return cachedLoginData[key];
    }

    return {
        loginAsProfessor:loginAsProfessor,
        loginAsStudent:loginAsStudent,
        logout:logout,
        isProfessor:isProfessor,
        isStudent:isStudent,
        hasProperty:hasProperty,
        getProperty:getProperty,
        isPropertyNonEmpty:isPropertyNonEmpty
    }
}();

// loading
function onBeginLoading() {
  $(".loadable").css("display", "none");
  $(".loading").css("display", "");
}

function onEndLoading() {
  $(".loadable").css("display", "");
  $(".loading").css("display", "none");
}
