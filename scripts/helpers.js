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

function getURLClassCode() {
    return new URLSearchParams(window.location.search).get('code');
}

function printError(err, printer) {
    printer("Unexpected error: See console for details.");
    console.log("Error: " + JSON.stringify(err, undefined, 2));
}

function isNullOrEmpty(str) { return !str || str === ""; }
function isString(obj) { return typeof obj === 'string' || obj instanceof String; }
function isInt(obj) { return obj === parseInt(obj, 10); }

function getHtmlSafeText(text) {
    return $('<span>').text(text).html();
}

// date formatting
function getPaddedNumStr(num, digits) {
    return new String(num).padStart(digits, '0');
}

function parseSlidersDateString(datestring) {
    let parsedDate = new Date(Date.parse(datestring));
    return new Date(Date.UTC(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
        parsedDate.getHours(),
        parsedDate.getMinutes(),
        parsedDate.getSeconds()
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

// login caching
loginManager = function() {
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

    function getProfCachedAttributes() {
        return ["Email", "Password", "Name"];
    }

    function getStudentCachedAttributes() {
        return ["AccountID", "Password", "Name", "ClassCode"];
    }

    function loginAsProfessor(profData) {
        cacheLogin(
            profData,
            getProfCachedAttributes(),
            PROF_LOGIN_KEY_TYPE
        );
    }

    function loginAsStudent(studentData) {
        cacheLogin(
            studentData,
            getStudentCachedAttributes(),
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
        getProfCachedAttributes:getProfCachedAttributes,
        getStudentCachedAttributes:getStudentCachedAttributes
    }
}();
