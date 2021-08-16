const profCommands = function() {
    const PROF_TABLE_NAME = "Professors";

    let isProcessing = false;

    function getProfKey(email, attributes) {
        return { TableName: PROF_TABLE_NAME, Key: { "Email": email }, AttributesToGet: attributes };
    }

    function printBusy(printer) {
        printer("Professor database busy!");
    }

    function validateLogin(attributes, onValid, onInvalid, printer) {
        if (!loginManager.isProfessor()) {
            onInvalid();
            return;
        }

        if (!loginManager.hasProperty("Email") || !loginManager.hasProperty("Password")) {
            onInvalid();
            return;
        }

        let cachedEmail = loginManager.getProperty("Email");
        let cachedPassword = loginManager.getProperty("Password");

        if (isNullOrEmpty(cachedEmail) || isNullOrEmpty(cachedPassword)) {
            onInvalid();
            return;
        }

        awsManager.get(
            getProfKey(cachedEmail, attributes.concat("Email", "Password")),
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

    function createAccount(email, password, name, onSuccess, failPrinter) {
        if (!isString(email) || !isString(password) || !isString(name)) {
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
            getProfKey(email, ["Email"]),
            function(data) { // account taken
                onFail("This email is already taken!");
            },
            function() { // account available
                const data = {
                    "Email": email,
                    "Password": password,
                    "Name": name
                }
                const putParams = {
                    TableName: PROF_TABLE_NAME,
                    Item: data
                };

                awsManager.put(
                    putParams,
                    function() { // success
                        loginManager.loginAsProfessor(data);
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
        if (!isString(email) || !isString(password)) {
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
            getProfKey(email, loginManager.getProfCachedAttributes()),
            function(data) { // email found
                if (data["Password"] === password) {
                    loginManager.loginAsProfessor(data);
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

    function createClass(className, startDate, endDate, onSuccess, failPrinter) {
        if (!isString(className) || !isString(startDate) || !isString(endDate)) {
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

        validateLogin(
            [],
            function(profData) {
                classCommands.createClass(
                    loginManager.getProperty("Name"),
                    className,
                    startDate,
                    endDate,
                    function(classCode) {
                        awsManager.update(
                            {
                                TableName: PROF_TABLE_NAME,
                                Key: { "Email": profData["Email"] },
                                UpdateExpression: "SET Classes = list_append(if_not_exists(Classes, :emptyList), :newClass)",
                                ExpressionAttributeValues: { ":emptyList": [], ":newClass": [ classCode ] }
                            },
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

    function getClassList(attributes, onSuccess, failPrinter) {
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
            ["Classes"],
            function(profData) { // login credentials valid
                if (profData.hasOwnProperty("Classes")) {
                    classCommands.getClassList(
                        profData["Classes"],
                        attributes,
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

    function getOwnedClassCodes(onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        };

        if (!loginManager.isProfessor()) {
            onFail("Not logged in as a professor!");
            return;
        }

        validateLogin(
            ["Classes"],
            function(profData) { // login credentials valid
                completeProcessing();
                if (profData.hasOwnProperty("Classes")) {
                    onSuccess(profData["Classes"])
                } else {
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
        getClassList:getClassList,
        getOwnedClassCodes:getOwnedClassCodes
    }
}();
