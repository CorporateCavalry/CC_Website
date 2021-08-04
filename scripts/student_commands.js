studentCommands = function() {
    const ACCT_TABLE_NAME = "Accounts";
    const CLASS_TABLE_NAME = "Classes";
    const CACHED_LOGIN_KEY = "student_login";

    let cachedLogin = loadStringFromStorage(CACHED_LOGIN_KEY);

    function getAccountKey(id) {
        return { TableName: ACCT_TABLE_NAME, Key: { "AccountID": id } };
    }

    function getClassKey(classCode) {
        return { TableName: CLASS_TABLE_NAME, Key: { "ClassCode": classCode } };
    }

    let isProcessing = false;

    function getAccount(accountID) {
        let returnStr = "Error";
        let params = {
            TableName: "Accounts",
            Key: { "AccountID": accountID }
        };

        // awsManager.get(params, function (err, data) {
        //     if (err) {
        //         returnStr = "Error:" + JSON.stringify(err, undefined, 2);
        //         console.log(returnStr)
        //     } else {
        //         console.log(data["Item"]["Name"])
        //         returnStr = "Data Found:" + JSON.stringify(data, undefined, 2);
        //         console.log(returnStr)
        //     }
        // });
    }

    function createAccount(accountID, username, password, onSuccess, failPrinter) {
        if (isProcessing) return;
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        }

        awsManager.get(
            getAccountKey(accountID),
            function(data) { // account taken
                onFail("An account for this ID already exists!");
            },
            function() { // account available
                const putParams = {
                    TableName: ACCT_TABLE_NAME,
                    Item: {
                        "AccountID": accountID,
                        "Name": username,
                        "Password": password,
                        "GroupID": -1
                    }
                };

                awsManager.put(
                    putParams,
                    function() { // on success
                        loginManager.loginAsStudent(accountID, password);
                        completeProcessing();
                        onSuccess();
                    },
                    onFail
                );
            },
            onFail
        );
    }

    function joinClass(classCode) {

    }

    function login(accountID, password, onSuccess, failPrinter) {
        if (isProcessing) return;
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        }

        awsManager.get(
            getAccountKey(accountID),
            function(data) { // email found
                if (data.hasOwnProperty("Password") && data["Password"] === password) {
                    loginManager.loginAsStudent(accountID, password);
                    completeProcessing();
                    onSuccess();
                } else {
                    onFail("Password is incorrect.");
                }
            },
            function() { // email not found
                onFail("No account was found with this student ID.");
            },
            onFail
        );
    }

    function completeProcessing() {
        isProcessing = false;
    }

    function getIsProcessing() {
        return isProcessing;
    }

    return {
        getIsProcessing:getIsProcessing,
        createAccount:createAccount,
        login:login,
        getAccount:getAccount
    }
}();
