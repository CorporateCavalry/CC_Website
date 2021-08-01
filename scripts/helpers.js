function consolePrinter(msg) {
    console.log(msg);
}

function onError(err, printer) {
    printer("Error: " + JSON.stringify(err, undefined, 2));
}

function isNullOrEmpty(str) { return !str || str === ""; }
