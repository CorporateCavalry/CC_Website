profCommands = function() {
    const PROF_TABLE_NAME = "Professors";
    const CLASS_TABLE_NAME = "Classes";
    const CACHED_EMAIL_KEY = "prof_email";
    const CACHED_PASSWORD_KEY = "prof_password";
    const MAX_CREATE_ATTEMPTS = 5;
    const CLASS_CODE_SIZE = 4;

    let cachedEmail = loadStringFromStorage(CACHED_EMAIL_KEY);
    let cachedPassword = loadStringFromStorage(CACHED_PASSWORD_KEY);
    let isProcessing = false;

    function getProfKey(email) {
        return { TableName: PROF_TABLE_NAME, Key: { "Email": email } };
    }

    function getClassKey(classCode) {
        return { TableName: CLASS_TABLE_NAME, Key: { "ClassCode": classCode } };
    }

    function validateLogin(onValid, onInvalid, printer) {
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

    function cacheLogin(email, password) {
        cachedEmail = email;
        localStorage.setItem(CACHED_EMAIL_KEY, email);

        cachedPassword = password;
        localStorage.setItem(CACHED_PASSWORD_KEY, password);
    }

    function createAccount(email, password, onComplete) {
        if (isProcessing) return;
        isProcessing = true;

        let putParams = {
            TableName: PROF_TABLE_NAME,
            Item: {
                "Email": email,
                "Password": password
            }
        };

        let resultPrinter = function(msg) {
            completeProcessing();
            onComplete(msg);
        }

        let onCreateSuccess = function() { resultPrinter("Account created!"); };
        let onAccountTaken = function(data) { resultPrinter("This email is already taken!"); };
        let onAccountOpen = function() { awsManager.put(putParams, onCreateSuccess, resultPrinter); }

        awsManager.get(getProfKey(email), onAccountTaken, onAccountOpen, resultPrinter);
    }

    function login(email, password, onLogIn, onComplete) {
        if (isProcessing) return;
        isProcessing = true;

        let resultPrinter = function(msg) {
            completeProcessing();
            onComplete(msg);
        }

        awsManager.get(
            getProfKey(email),
            function(data) { // email found
                if (data["Password"] === password) {
                    cacheLogin(email, password);
                    resultPrinter("Successfully logged in!");
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

    function logout(onComplete) {
        if (isProcessing) return;

        cacheLogin("", "");
        onComplete();
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

        let resultPrinter = function(msg) {
            completeProcessing();
            onComplete(msg);
        }

        let onInvalid = function() { resultPrinter("Login credentials invalid."); };

        let numAttempts = 0;
        let classCode;

        let onClassCodeAvailable = function() {
            let putParams = {
                TableName: CLASS_TABLE_NAME,
                Item: {
                    "ClassCode": classCode,
                    "StartDate": startDate,
                    "EndDate": endDate,
                    "GroupCount": 0,
                    "Owner": cachedEmail
                }
            };

            let onClassCreated = function() {
                let updateParams = {
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

        let testClassCode = function() {
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

    function isLoggedIn() {
        return !isNullOrEmpty(cachedEmail);
    }

    function getCurrentUser() {
        return cachedEmail;
    }

    function completeProcessing() {
        isProcessing = false;
    }

    function getIsProcessing() {
        return isProcessing;
    }

    return {
        getIsProcessing:getIsProcessing,
        login:login,
        logout:logout,
        isLoggedIn:isLoggedIn,
        getCurrentUser:getCurrentUser,
        createClass:createClass
    }
}();
