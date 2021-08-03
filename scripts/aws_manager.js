awsManager = function() {
    AWS.config.update(getCredentials());
    let docClient = new AWS.DynamoDB.DocumentClient();

    function get(params, onFound, onNotFound, printer) {
        docClient.get(params, function(err, data) {
            if (err) {
                onError(err, printer);
            } else {
                if (data.hasOwnProperty("Item")) {
                    onFound(data["Item"]);
                } else {
                    onNotFound();
                }
            }
        });
    }

    function put(params, onSuccess, printer) {
        docClient.put(params, function(err, data) {
            if (err) {
                onError(err, printer);
            } else {
                onSuccess();
            }
        });
    }

    function update(params, onSuccess, printer) {
        docClient.update(params, function(err, data) {
            if (err) {
                onError(err, printer);
            } else {
                onSuccess();
            }
        });
    }

    return {
        get:get,
        put:put,
        update:update
    }
}();
