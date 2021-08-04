profCommands = function() {
    const PROF_TABLE_NAME = "Professors";

    let isProcessing = false;

    function getProfKey(email, attributes) {
        return { TableName: PROF_TABLE_NAME, Key: { "Email": email }, AttributesToGet: attributes };
    }

    function getProfKeyAll(email) {
        return { TableName: PROF_TABLE_NAME, Key: { "Email": email } };
    }

    function printBusy(printer) {
        printer("Professor database busy!");
    }

    function validateLogin(getAll, onValid, onInvalid, printer) {
        let cachedEmail = loginManager.getCachedEmail();
        let cachedPassword = loginManager.getCachedPassword();

        if (isNullOrEmpty(cachedEmail) || isNullOrEmpty(cachedPassword)) {
            onInvalid();
            return;
        }

        let params = getAll ? getProfKeyAll(cachedEmail) : getProfKey(cachedEmail, ["Email", "Password"]);

        awsManager.get(
            params,
            function(data) {
                if (data["Password"] === cachedPassword) {
                    onValid(data);
                } else {
                    onInvalid();
                }
            },
            onInvalid,
            printer
        );
    }

    function createAccount(email, password, onSuccess, failPrinter) {
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
            getProfKey(email, ["Email"]),
            function(data) { // account taken
                onFail("This email is already taken!");
            },
            function() { // account available
                const putParams = {
                    TableName: PROF_TABLE_NAME,
                    Item: {
                        "Email": email,
                        "Password": password
                    }
                };

                awsManager.put(
                    putParams,
                    function() { // success
                        loginManager.loginAsProfessor(email, password);
                        completeProcessing();
                        onSuccess();
                    },
                    onFail
                );
            },
            onFail
        );
    }

    function login(email, password, onSuccess, failPrinter) {
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
            getProfKey(email, ["Password"]),
            function(data) { // email found
                if (data["Password"] === password) {
                    loginManager.loginAsProfessor(email, password);
                    completeProcessing();
                    onSuccess();
                } else {
                    onFail("Password is incorrect.");
                }
            },
            function() { // email not found
                onFail("No account was found for this email.");
            },
            onFail
        );
    }

    function createClass(startDate, endDate, onSuccess, failPrinter) {
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
            false,
            function(profData) {
                let email = profData["Email"];

                classCommands.createClass(
                    email,
                    startDate,
                    endDate,
                    function(classCode) {
                        const updateParams = {
                            TableName: PROF_TABLE_NAME,
                            Key: { "Email": email },
                            UpdateExpression: "set Classes = list_append(if_not_exists(Classes, :emptyList), :newClass)",
                            ExpressionAttributeValues: { ":emptyList": [], ":newClass": [ classCode ] }
                        }

                        awsManager.update(
                            updateParams,
                            function() {
                                completeProcessing();
                                onSuccess(classCode);
                            },
                            onFail
                        );
                    },
                    onFail
                );
            },
            function() {
                onFail("Login credentials invalid.");
            },
            onFail
        );
    }

    function getClassList(onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        };

        validateLogin(
            true,
            function(profData) { // login credentials valid
                if (profData.hasOwnProperty("Classes")) {
                    classCommands.getClassList(
                        profData["Classes"],
                        [ "ClassCode", "StartDate", "EndDate" ],
                        function(list) {
                            completeProcessing();
                            onSuccess(list);
                        },
                        onFail
                    );
                } else {
                    completeProcessing();
                    onSuccess([]);
                }
            },
            function() {
                onFail("Invalid login credentials.");
            },
            onFail
        );
    }

    function getCurrentUser() {
        return loginManager.getCachedEmail();
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
        getCurrentUser:getCurrentUser,
        createClass:createClass,
        getClassList:getClassList
    }
}();
