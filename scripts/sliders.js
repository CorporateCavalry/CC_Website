AWS.config.update(getCredentials());
var docClient = new AWS.DynamoDB.DocumentClient();

var PROF_TABLE_NAME = "Professors";
var cachedEmail = "";
var cachedPassword = "";

function getProfAcct(email) {
    return { TableName: PROF_TABLE_NAME, Key: { "Email": email } };
}

function onError(err) {
    console.log("Error: " + JSON.stringify(err, undefined, 2));
}

function isNullOrEmpty(str) { return !str || str === ""; }

function getCallback(onFound, onNotFound) {
    return function(err, data) {
        if (err) {
            onErr(err);
        } else {
            if (data.hasOwnProperty("Item")) {
                onFound(data["Item"]);
            } else {
                onNotFound();
            }
        }
    }
}

function putCallback(onSuccess) {
    return function(err, data) {
        if (err) {
            onErr(err);
        } else {
            onSuccess();
        }
    }
}

function validateLogin(onValid, onInvalid) {
    if (isNullOrEmpty(cachedEmail) || isNullOrEmpty(cachedPassword)) {
        onInvalid();
        return;
    }

    docClient.get(getProfAcct(cachedEmail), getCallback(
        function(data) {
            if (data["Password"] === cachedPassword) {
                onValid();
            } else {
                onInvalid();
            }
        },
        onInvalid
    ));
}

function createProfAccount(email, password) {
    var putParams = {
        TableName: PROF_TABLE_NAME,
        Item: {
            "Email": email,
            "Password": password
        }
    };

    var onCreateSuccess = function() { console.log("Account created!"); };
    var onAccountTaken = function(data) { console.log("This email is already taken!"); };
    var onAccountOpen = function() { docClient.put(putParams, putCallback(onCreateSuccess)); }

    docClient.get(getProfAcct(email), getCallback(onAccountTaken, onAccountOpen));
}

function loginProfAccount(email, password) {
    var onFail = function(err) { }
}

function getAccount(accountID) {
    var returnStr = "Error";
    var params = {
        TableName: "Accounts",
        Key: { "AccountID": accountID }
    };

    docClient.get(params, function (err, data) {
        if (err) {
            returnStr = "Error:" + JSON.stringify(err, undefined, 2);
            console.log(returnStr)
        } else {
            console.log(data["Item"]["Name"])
            returnStr = "Data Found:" + JSON.stringify(data, undefined, 2);
            console.log(returnStr)
        }
    });
}

// createProfAccount("somethingtrass@gmail.com", "yape");

// function onInvalid() { console.log("Invalid credentials!"); }
// function onValid() { console.log("Credentials valid!"); }
// validateLogin(onValid, onInvalid);
