profCommands = function() {
    const PROF_TABLE_NAME = "Professors";
    const CLASS_TABLE_NAME = "Classes";
    const MAX_CREATE_ATTEMPTS = 5;
    const CLASS_CODE_SIZE = 4;

    let isProcessing = false;

    function getProfKey(email) {
        return { TableName: PROF_TABLE_NAME, Key: { "Email": email } };
    }

    function getClassKey(classCode) {
        return { TableName: CLASS_TABLE_NAME, Key: { "ClassCode": classCode } };
    }

    function validateLogin(onValid, onInvalid, printer) {
        let cachedEmail = loginManager.getCachedEmail();
        let cachedPassword = loginManager.getCachedPassword();

        if (isNullOrEmpty(cachedEmail) || isNullOrEmpty(cachedPassword)) {
            onInvalid();
            return;
        }

        awsManager.get(
            getProfKey(cachedEmail),
            function(data) {
                if (data["Password"] === cachedPassword) {
                    onValid();
                } else {
                    onInvalid();
                }
            },
            onInvalid,
            printer
        );
    }

    function createAccount(email, password, onLogIn, onComplete) {
        if (isProcessing) return;
        isProcessing = true;

        const resultPrinter = function(msg) {
            completeProcessing();
            onComplete(msg);
        }

        awsManager.get(
            getProfKey(email),
            function(data) { // account taken
                resultPrinter("This email is already taken!");
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
                        resultPrinter("");
                        onLogIn();
                    },
                    resultPrinter);
            },
            resultPrinter
        );
    }

    function login(email, password, onLogIn, onComplete) {
        if (isProcessing) return;
        isProcessing = true;

        const resultPrinter = function(msg) {
            completeProcessing();
            onComplete(msg);
        }

        awsManager.get(
            getProfKey(email),
            function(data) { // email found
                if (data["Password"] === password) {
                    loginManager.loginAsProfessor(email, password);
                    resultPrinter("");
                    onLogIn();
                } else {
                    resultPrinter("Password is incorrect.");
                }
            },
            function() { // email not found
                resultPrinter("No account was found for this email.");
            },
            resultPrinter
        );
    }

    function getRandomChar() {
        return String.fromCharCode(65 + Math.floor(Math.random() * 26)); //65 is uppercase A
    }

    function getRandomClassName() {
        let str = "";
        for (let i = 0; i < CLASS_CODE_SIZE; i++) {
            str += getRandomChar();
        }
        return str;
    }

    function createClass(startDate, endDate, onComplete) {
        if (isProcessing) return;
        isProcessing = true;

        const resultPrinter = function(msg) {
            completeProcessing();
            onComplete(msg);
        }

        const onInvalid = function() { resultPrinter("Login credentials invalid."); };

        let numAttempts = 0;
        let classCode;

        const onClassCodeAvailable = function() {
            let cachedEmail = loginManager.getCachedEmail();

            const putParams = {
                TableName: CLASS_TABLE_NAME,
                Item: {
                    "ClassCode": classCode,
                    "StartDate": startDate,
                    "EndDate": endDate,
                    "GroupCount": 0,
                    "Owner": cachedEmail
                }
            };

            const onClassCreated = function() {
                const updateParams = {
                    TableName: PROF_TABLE_NAME,
                    Key: { "Email": cachedEmail },
                    UpdateExpression: "set Classes = list_append(if_not_exists(Classes, :emptyList), :newClass)",
                    ExpressionAttributeValues: { ":emptyList": [], ":newClass": [ classCode ] }
                }

                awsManager.update(updateParams,
                    function() { resultPrinter("New class created: " + classCode); },
                    resultPrinter
                );
            }

            awsManager.put(putParams, onClassCreated, resultPrinter);
        };

        const testClassCode = function() {
            if (numAttempts === MAX_CREATE_ATTEMPTS) {
                onInvalid();
                return;
            }

            numAttempts++;

            classCode = getRandomClassName();
            awsManager.get(getClassKey(classCode), testClassCode, onClassCodeAvailable, resultPrinter);
        };

        validateLogin(
            testClassCode,
            onInvalid,
            resultPrinter
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
        createClass:createClass
    }
}();
