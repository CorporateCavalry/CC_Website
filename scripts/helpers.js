// printers are used to display information
function consolePrinter() { return function(msg) { console.log(msg); } }
function htmlPrinter(elementId) { return function(msg) { $("#" + elementId).html(msg); } }

function onError(err, printer) { printer("Error: " + JSON.stringify(err, undefined, 2)); }

function isNullOrEmpty(str) { return !str || str === ""; }

function isString(obj) { return typeof obj === 'string' || obj instanceof String; }

function loadStringFromStorage(key) {
    var val = localStorage.getItem(key);
    if (isString(val)) {
        return val;
    }

    return "";
}

function getPaddedNumStr(num, digits) {
    return new String(num).padStart(digits, '0');
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
