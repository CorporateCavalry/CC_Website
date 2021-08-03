profCommands = function() {
    const PROF_TABLE_NAME = "Professors";
    const CLASS_TABLE_NAME = "Classes";
    const CACHED_EMAIL_KEY = "prof_email";
    const CACHED_PASSWORD_KEY = "prof_password";
    const MAX_CREATE_ATTEMPTS = 5;
    const CLASS_CODE_SIZE = 4;

    let cachedEmail = loadStringFromStorage(CACHED_EMAIL_KEY);
    let cachedPassword = loadStringFromStorage(CACHED_PASSWORD_KEY);

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

        awsManager.get(getProfKey(cachedEmail),
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

    function createAccount(email, password, printer) {
        let putParams = {
            TableName: PROF_TABLE_NAME,
            Item: {
                "Email": email,
                "Password": password
            }
        };

        let onCreateSuccess = function() { printer("Account created!"); };
        let onAccountTaken = function(data) { printer("This email is already taken!"); };
        let onAccountOpen = function() { awsManager.put(putParams, onCreateSuccess, printer); }

        awsManager.get(getProfKey(email), onAccountTaken, onAccountOpen, printer);
    }

    function login(email, password, printer, onLogIn) {
        awsManager.get(getProfKey(email),
            function(data) {
                if (data["Password"] === password) {
                    cacheLogin(email, password);
                    printer("Successfully logged in!");
                    onLogIn();
                } else {
                    printer("Password is incorrect.");
                }
            },
            function() {
                printer("No account was found for this email.");
            },
            printer
        );
    }

    function logout() {
        cacheLogin("", "");
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

    function createClass(startDate, endDate, printer) {
        let numAttempts = 0;
        let onInvalid = function() { printer("Login credentials invalid."); };
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
                    function() {
                        printer("New class created: " + classCode);
                    },
                    printer
                );
            }

            awsManager.put(putParams, onClassCreated, printer);
        };

        let testClassCode = function() {
            if (numAttempts === MAX_CREATE_ATTEMPTS) {
                onInvalid();
                return;
            }

            numAttempts++;

            classCode = getRandomClassName();
            awsManager.get(getClassKey(classCode), testClassCode, onClassCodeAvailable, printer);
        };

        validateLogin(
            testClassCode,
            onInvalid,
            printer
        );
    }

    function isLoggedIn() {
        return !isNullOrEmpty(cachedEmail);
    }

    function getCurrentUser() {
        return cachedEmail;
    }

    return {
        login:login,
        logout:logout,
        isLoggedIn:isLoggedIn,
        getCurrentUser:getCurrentUser,
        createClass:createClass
    }
}();
