studentCommands = function() {
    const ACCT_TABLE_NAME = "Accounts";
    const CLASS_TABLE_NAME = "Classes";
    const CACHED_LOGIN_KEY = "student_login";

    let cachedLogin = laodStringFromStorage();

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

    function createAccount(accountID, username, password, onLogIn, onComplete) {
        if (isProcessing) return;
        isProcessing = true;

        const resultPrinter = function(msg) {
            completeProcessing();
            onComplete(msg);
        }

        awsManager.get(
            getAccountKey(accountID),
            function(data) { // account taken
                resultPrinter("An account for this ID already exists!");
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
                        onLogIn();
                        resultPrinter("Account created!");
                    },
                    resultPrinter
                );
            },
            resultPrinter
        );
    }

    function joinClass(classCode) {

    }

    function completeProcessing() {
        isProcessing = false;
    }

    function getIsProcessing() {
        return isProcessing;
    }

    return {
        getAccount:getAccount
    }
}();
