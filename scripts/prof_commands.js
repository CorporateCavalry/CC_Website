profCommands = function() {
    const PROF_TABLE_NAME = "Professors";
    const CLASS_TABLE_NAME = "Classes";
    const MAX_CREATE_ATTEMPTS = 5;
    const CLASS_CODE_SIZE = 4;

    let isProcessing = false;

    function getProfKey(email, attributes) {
        return { TableName: PROF_TABLE_NAME, Key: { "Email": email }, AttributesToGet: attributes };
    }

    function getProfKeyAll(email) {
        return { TableName: PROF_TABLE_NAME, Key: { "Email": email } };
    }

    function getClassKey(classCode) {
        return { TableName: CLASS_TABLE_NAME, Key: { "ClassCode": classCode } };
    }

    function validateLogin(getAll, onValid, onInvalid, printer) {
        let cachedEmail = loginManager.getCachedEmail();
        let cachedPassword = loginManager.getCachedPassword();

        if (isNullOrEmpty(cachedEmail) || isNullOrEmpty(cachedPassword)) {
            onInvalid();
            return;
        }

        let params = getAll ? getProfKeyAll(cachedEmail) : getProfKey(cachedEmail, ["Password"]);

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
        if (isProcessing) return;
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
        if (isProcessing) return;
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

    function createClass(startDate, endDate, onSuccess, failPrinter) {
        if (isProcessing) return;
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        }

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

                awsManager.update(
                    updateParams,
                    function() {
                        completeProcessing();
                        onSuccess(classCode);
                    },
                    onFail
                );
            }

            awsManager.put(putParams, onClassCreated, onFail);
        };

        const testClassCode = function(profData) {
            if (numAttempts === MAX_CREATE_ATTEMPTS) {
                onFail("Could not create class: max number of attempts reached.");
                return;
            }

            numAttempts++;

            classCode = getRandomClassName();
            awsManager.get(getClassKey(classCode), testClassCode, onClassCodeAvailable, onFail);
        };

        validateLogin(
            false,
            testClassCode,
            function() {
                onFail("Login credentials invalid.");
            },
            onFail
        );
    }

    function getClassList(onSuccess, failPrinter) {
        if (isProcessing) return;
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        };

        validateLogin(
            true,
            function(profData) {
                const onNoClasses = function() {
                    completeProcessing();
                    onSuccess([]);
                }

                if (profData.hasOwnProperty("Classes")) {
                    let keyList = [];
                    let allClasses = profData["Classes"];

                    let len = allClasses.length;
                    if (len === 0) {
                        onNoClasses();
                        return;
                    }

                    for (let i = 0; i < len; i++) {
                        keyList.push({ "ClassCode": allClasses[i] });
                    }

                    const params = {
                        RequestItems: {
                            [CLASS_TABLE_NAME]: {
                                Keys: keyList,
                                AttributesToGet: [
                                    "ClassCode",
                                    "StartDate",
                                    "EndDate"
                                ]
                            }
                        }
                    };

                    awsManager.getBatch(params,
                        function(data) {
                            completeProcessing();
                            onSuccess(data[CLASS_TABLE_NAME]);
                        },
                        onFail
                    );
                } else {
                    onNoClasses();
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
