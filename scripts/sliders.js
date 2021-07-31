AWS.config.update(getCredentials());
var docClient = new AWS.DynamoDB.DocumentClient();

var PROF_TABLE_NAME = "Professors";
var cachedEmail = "";
var cachedPassword = "";

function getProfAcct(email) {
    return { TableName: PROF_TABLE_NAME, Key: { "Email": email } };
}

function getCallback(onFound, onNotFound, onErr) {
    return function(err, data) {
        if (err) {
            onErr(err);
        } else {
            if (data.hasOwnProperty("Item")) {
                onFound(data);
            } else {
                onNotFound();
            }
        }
    }
}

function putCallback(onSuccess, onErr) {
    return function(err, data) {
        if (err) {
            onErr(err);
        } else {
            onSuccess();
        }
    }
}

function createProfAccount(email, password) {
    var putParams = {
        TableName: PROF_TABLE_NAME,
        Item: {
            "Email": email,
            "Password": password
        }
    };

    var onCreateFail = function(err) { console.log("Create account failed: " + JSON.stringify(err, undefined, 2)); }

    var onCreateSuccess = function() { console.log("Account created!"); };
    var onAccountTaken = function(data) { console.log("This email is already taken!"); };
    var onAccountOpen = function() { docClient.put(putParams, putCallback(onCreateSuccess, onCreateFail)); }

    docClient.get(getProfAcct(email), getCallback(onAccountTaken, onAccountOpen, onCreateFail));
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

createProfAccount("somethingtrass@gmail.com", "yape");
