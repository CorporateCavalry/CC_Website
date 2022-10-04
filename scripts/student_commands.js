const studentCommands = function() {
    const MSG_INVALID_EMAIL = "Email is not valid";
    const MSG_ACCOUNT_NOT_FOUND = "No account found with this email";
    const MSG_INCORRECT_PASSWORD = "Password is incorrect";
    const MSG_INVALID_CREDENTIALS = "Credentials are invalid";
    const MSG_CLASS_NOT_FOUND = "Class could not be found";
    const MSG_ALREADY_IN_CLASS = "You are already in a class";
    const MSG_NOT_IN_CLASS = "You are not in a class";
    const MSG_INVALID_PASSWORD = "Please enter a 4-digit PIN";
    const MSG_NOT_MANUALLY_ASSIGNED = "You are not registered to be in this class";

    let isProcessing = false;

    function getEmail() {
        return loginManager.getProperty("Email");
    }

    function getPassword() {
        return loginManager.getProperty("Password");
    }

    function printBusy(printer) {
        printer("Student database busy!");
    }

    function onFail(failPrinter) {
        return function(msg) {
            completeProcessing();
            failPrinter(msg);
        }
    }

    function createAccount(email, username, password, classCode, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }

        if (!password.match(/^\d{4}$/)){
            failPrinter("PIN must be 4 digits");
            return;
        }

        isProcessing = true;
        studentData = {"Email": email, "Password": password, "Name": username, "ClassCode": classCode};

        lambdaManager.post(
            "student/createAccount",
            studentData,
            function(json) { // on success
                // we are not yet in a class, so don't include that
                studentData["ClassCode"] = null;
                loginManager.loginAsStudent(studentData);
                completeProcessing();
                onSuccess();
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_TAKEN": "An account with this email already exists",
                "INVALID_PASSWORD": MSG_INVALID_PASSWORD,
                "CLASS_NOT_FOUND": MSG_CLASS_NOT_FOUND,
                "NOT_MANUALLY_ASSIGNED": MSG_NOT_MANUALLY_ASSIGNED
            },
            onFail(failPrinter)
        );
    }

    function login(email, password, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        lambdaManager.post(
            "student/login",
            {"Email": email, "Password": password},
            function(json) { // on success
                let studentData = json["data"];
                studentData["Email"] = email;
                studentData["Password"] = password;

                loginManager.loginAsStudent(studentData);
                completeProcessing();
                onSuccess();
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_NOT_FOUND": MSG_ACCOUNT_NOT_FOUND,
                "INCORRECT_PASSWORD": MSG_INCORRECT_PASSWORD,
                "INVALID_PASSWORD": MSG_INVALID_PASSWORD
            },
            onFail(failPrinter)
        );
    }

    function getMyClassData(onSuccess, onNoClass, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }

        // we shouldn't be in a class
        if (!loginManager.isPropertyNonEmpty("ClassCode")) {
            onNoClass();
            return;
        }

        isProcessing = true;

        lambdaManager.get(
            "student/getMyClassData",
            {"Email": getEmail(), "Password": getPassword()},
            function(json) { // on success
                completeProcessing();

                if (json.hasOwnProperty("data")) {
                    onSuccess(json["data"]);
                } else {
                    onNoClass();
                }
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_NOT_FOUND": MSG_ACCOUNT_NOT_FOUND,
                "INCORRECT_PASSWORD": MSG_INVALID_CREDENTIALS,
                "CLASS_NOT_FOUND": MSG_CLASS_NOT_FOUND
            },
            onFail(failPrinter)
        );
    }

    function joinClass(classCode, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }

        // we are already in a class
        if (loginManager.isPropertyNonEmpty("ClassCode")) {
            failPrinter(MSG_ALREADY_IN_CLASS);
            return;
        }

        isProcessing = true;

        const email = getEmail();
        const password = getPassword();

        lambdaManager.post(
            "student/joinClass",
            {"Email": email, "Password": password, "ClassCode": classCode},
            function(json) { // on success
                let studentData = {
                    "Email": email,
                    "Password": password,
                    "ClassCode": classCode
                };

                loginManager.loginAsStudent(studentData);
                completeProcessing();
                onSuccess();
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_NOT_FOUND": MSG_ACCOUNT_NOT_FOUND,
                "INCORRECT_PASSWORD": MSG_INVALID_CREDENTIALS,
                "ALREADY_IN_CLASS": MSG_ALREADY_IN_CLASS,
                "CLASS_NOT_FOUND": MSG_CLASS_NOT_FOUND,
                "NOT_MANUALLY_ASSIGNED": MSG_NOT_MANUALLY_ASSIGNED
            },
            onFail(failPrinter)
        );
    }

    function leaveClass(onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }

        // we are not even in a class
        if (!loginManager.isPropertyNonEmpty("ClassCode")) {
            failPrinter(MSG_NOT_IN_CLASS);
            return;
        }

        isProcessing = true;

        const email = getEmail();
        const password = getPassword();

        lambdaManager.post(
            "student/leaveClass",
            {"Email": email, "Password": password},
            function(json) { // on success
                let studentData = {
                    "Email": email,
                    "Password": password,
                    "ClassCode": ""
                };

                loginManager.loginAsStudent(studentData);
                completeProcessing();
                onSuccess();
            },
            { // error translation
                "MSG_INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_NOT_FOUND": MSG_ACCOUNT_NOT_FOUND,
                "INCORRECT_PASSWORD": MSG_INVALID_CREDENTIALS,
                "NOT_IN_CLASS": MSG_NOT_IN_CLASS,
                "NOT_IN_GROUP": "You are not in a group",
                "CLASS_NOT_FOUND": MSG_CLASS_NOT_FOUND,
                "CLASS_IS_STARTED": "You cannot leave a class after it has started",
                "GROUP_NOT_FOUND": "Could not find your group",
                "NOT_FOUND_IN_GROUP": "Your account could not be found in your group"
            },
            onFail(failPrinter)
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
        getMyClassData:getMyClassData,
        joinClass:joinClass,
        leaveClass:leaveClass
    }
}();
