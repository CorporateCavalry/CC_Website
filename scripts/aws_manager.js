AWS.config.update(getCredentials());
var docClient = new AWS.DynamoDB.DocumentClient();

function getCallback(onFound, onNotFound, printer) {
    return function(err, data) {
        if (err) {
            onError(err, printer);
        } else {
            if (data.hasOwnProperty("Item")) {
                onFound(data["Item"]);
            } else {
                onNotFound();
            }
        }
    }
}

function putCallback(onSuccess, printer) {
    return function(err, data) {
        if (err) {
            onError(err, printer);
        } else {
            onSuccess();
        }
    }
}
