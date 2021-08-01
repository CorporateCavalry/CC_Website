AWS.config.update(getCredentials());
var docClient = new AWS.DynamoDB.DocumentClient();

var PROF_TABLE_NAME = "Professors";

var cachedEmail = "";
var cachedPassword = "";

function getProfKey(email) {
    return { TableName: PROF_TABLE_NAME, Key: { "Email": email } };
}

function consolePrinter(msg) {
    console.log(msg);
}

function onError(err, printer) {
    printer("Error: " + JSON.stringify(err, undefined, 2));
}

function isNullOrEmpty(str) { return !str || str === ""; }

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

function validateLogin(onValid, onInvalid, printer) {
    if (isNullOrEmpty(cachedEmail) || isNullOrEmpty(cachedPassword)) {
        onInvalid();
        return;
    }

    docClient.get(getProfKey(cachedEmail), getCallback(
        function(data) {
            if (data["Password"] === cachedPassword) {
                onValid();
            } else {
                onInvalid();
            }
        },
        onInvalid,
        printer
    ));
}

function createProfAccount(email, password, printer) {
    var putParams = {
        TableName: PROF_TABLE_NAME,
        Item: {
            "Email": email,
            "Password": password
        }
    };

    var onCreateSuccess = function() { printer("Account created!"); };
    var onAccountTaken = function(data) { printer("This email is already taken!"); };
    var onAccountOpen = function() { docClient.put(putParams, putCallback(onCreateSuccess, printer)); }

    docClient.get(getProfKey(email), getCallback(onAccountTaken, onAccountOpen, printer));
}

function logoutProfAccount() {
    cachedEmail = "";
    cachedPassword = "";
}

function loginProfAccount(email, password, printer) {
    if (isNullOrEmpty(email) || isNullOrEmpty(password)) {
        printer("All fields must be filled out!");
        return;
    }

    docClient.get(getProfKey(email), getCallback(
        function(data) {
            if (data["Password"] === password) {
                cachedEmail = email;
                cachedPassword = password;
                printer("Successfully logged in!");
            } else {
                printer("Password is incorrect.");
            }
        },
        function() {
            printer("No account was found for this email.");
        },
        printer
    ));
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

// loginProfAccount("somethingtrass@gmail.co", "yape", consolePrinter)

// createProfAccount("somethingtrass@gmail.com", "yape");

// function onInvalid() { console.log("Invalid credentials!"); }
// function onValid() { console.log("Credentials valid!"); }
// validateLogin(onValid, onInvalid);
