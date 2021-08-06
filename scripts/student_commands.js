studentCommands = function() {
    const ACCT_TABLE_NAME = "Accounts";
    const CACHED_LOGIN_KEY = "student_login";

    let isProcessing = false;

    function getAccountKey(id, attributes) {
        return { TableName: ACCT_TABLE_NAME, Key: { "AccountID": id }, AttributesToGet: attributes };
    }

    function getAccountKeyAll(id) {
        return { TableName: ACCT_TABLE_NAME, Key: { "AccountID": id } };
    }

    function printBusy(printer) {
        printer("Professor database busy!");
    }

    function getAccount(accountID) {
    }

    function validateLogin(getAll, onValid, onInvalid, printer) {
        if (!loginManager.isStudent()) {
            onInvalid();
            return;
        }

        if (!loginManager.hasProperty("AccountID") || !loginManager.hasProperty("Password")) {
            onInvalid();
            return;
        }

        let cachedAccountID = loginManager.getProperty("AccountID");
        let cachedPassword = loginManager.getProperty("Password");

        if (!isInt(cachedAccountID) || isNullOrEmpty(cachedPassword)) {
            onInvalid();
            return;
        }

        let params = getAll ? getAccountKeyAll(cachedAccountID) : getAccountKey(cachedAccountID, ["AccountID", "Password"]);

        awsManager.get(
            params,
            function(data) {
                if (data.hasOwnProperty("Password") && data["Password"] === cachedPassword) {
                    onValid(data);
                } else {
                    onInvalid();
                }
            },
            onInvalid,
            printer
        );
    }

    function createAccount(accountID, username, password, onSuccess, failPrinter) {
        if (!isInt(accountID) || !isString(username) || !isString(password)) {
            logError("Invalid data type", failPrinter);
            return;
        }

        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        }

        awsManager.get(
            getAccountKey(accountID, ["AccountID"]),
            function(data) { // account taken
                onFail("An account for this ID already exists!");
            },
            function() { // account available
                const data = {
                    "AccountID": accountID,
                    "Name": username,
                    "Password": password,
                    "GroupID": -1
                };

                const putParams = {
                    TableName: ACCT_TABLE_NAME,
                    Item: data
                };

                awsManager.put(
                    putParams,
                    function() { // on success
                        loginManager.loginAsStudent(data);
                        completeProcessing();
                        onSuccess();
                    },
                    onFail
                );
            },
            onFail
        );
    }

    function login(accountID, password, onSuccess, failPrinter) {
        if (!isInt(accountID) || !isString(password)) {
            logError("Invalid data type", failPrinter);
            return;
        }

        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        }

        awsManager.get(
            getAccountKey(accountID, loginManager.getStudentCachedAttributes()),
            function(data) { // account found
                if (data.hasOwnProperty("Password") && data["Password"] === password) {
                    loginManager.loginAsStudent(data);
                    completeProcessing();
                    onSuccess();
                } else {
                    onFail("Password is incorrect.");
                }
            },
            function() { // account not found
                onFail("No account was found with this student ID.");
            },
            onFail
        );
    }

    function getMyClassData(attributes, onSuccess, onNoClass, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        }

        if (!loginManager.hasProperty("ClassCode")) {
            completeProcessing();
            onNoClass();
            return;
        }

        validateLogin(
            false,
            function(data) { // valid login
                classCommands.fetchClassData(
                    loginManager.getProperty("ClassCode"),
                    attributes,
                    function (data) {
                        completeProcessing();
                        onSuccess(data);
                    },
                    onFail
                );
            },
            function() { // invalid login
                onFail("Invalid login credentials");
            },
            onFail
        );
    }

    function joinClass(classCode, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        }

        validateLogin(
            true,
            function(data) { // valid login
                if (!data.hasOwnProperty("ClassCode") || isNullOrEmpty(data["ClassCode"])) {
                    classCommands.addAccountToClass(
                        classCode,
                        data["AccountID"],
                        function (newGroupID) {
                            data["GroupID"] = newGroupID;
                            data["ClassCode"] = classCode;

                            awsManager.update(
                                {
                                    TableName: ACCT_TABLE_NAME,
                                    Key: { "AccountID": data["AccountID"] },
                                    UpdateExpression: "SET GroupID = :groupID, ClassCode = :classCode",
                                    ExpressionAttributeValues: { ":groupID": newGroupID, ":classCode": classCode }
                                },
                                function() { // finished updating local account, now cache this information
                                    loginManager.loginAsStudent(data);
                                    completeProcessing();
                                    onSuccess();
                                },
                                onFail
                            );
                        },
                        onFail
                    );
                } else {
                    onFail("Student is already in a class!");
                }
            },
            function() { // invalid login
                onFail("Invalid login credentials");
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
        getAccount:getAccount,
        getMyClassData:getMyClassData,
        joinClass:joinClass
    }
}();
