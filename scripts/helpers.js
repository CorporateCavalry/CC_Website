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
