const profCommands = function() {
    const MSG_INVALID_EMAIL = "Email address is not valid";
    const MSG_ACCOUNT_NOT_FOUND = "No account found with this email";
    const MSG_INCORRECT_PASSWORD = "Password is incorrect";
    const MSG_INVALID_CREDENTIALS = "Credentials are invalid";

    let isProcessing = false;

    function getEmail() {
        return loginManager.getProperty("Email");
    }

    function getPassword() {
        return loginManager.getProperty("Password");
    }

    function printBusy(printer) {
        printer("Professor database busy!");
    }

    function onFail(failPrinter) {
        return function(msg) {
            completeProcessing();
            failPrinter(msg);
        }
    }

    function createAccount(email, password, name, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;
        profData = {"Email": email, "Password": password, "Name": name};

        lambdaManager.post(
            "professor/createAccount",
            profData,
            function(json) { // on success
                loginManager.loginAsProfessor(profData);
                completeProcessing();
                onSuccess();
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_TAKEN": "An account with this email address already exists"
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
            "professor/login",
            {"Email": email, "Password": password},
            function(json) { // on success
                let profData = json["data"];
                profData["Email"] = email;
                profData["Password"] = password;

                loginManager.loginAsProfessor(profData);
                completeProcessing();
                onSuccess();
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_NOT_FOUND": MSG_ACCOUNT_NOT_FOUND,
                "INCORRECT_PASSWORD": MSG_INCORRECT_PASSWORD
            },
            onFail(failPrinter)
        );
    }

    function createClass(className, startDate, endDate, manualAssignData, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        let inputData = {"Email": getEmail(), "Password": getPassword(), "StartDate": startDate, "EndDate": endDate, "ClassName": className};
        if (manualAssignData != null && manualAssignData != "") {
            inputData["ManualAssign"] = manualAssignData;
        }

        lambdaManager.post(
            "professor/createClass",
            inputData,
            function(json) { // on success
                completeProcessing();
                onSuccess(json["data"]["ClassCode"]);
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "INVALID_START_DATE": "Start date is not valid",
                "INVALID_END_DATE": "End date is not valid",
                "START_DATE_EARLY": "Start date must be after today",
                "END_DATE_EARLY": "End date must be after start date",
                "ACCOUNT_NOT_FOUND": MSG_ACCOUNT_NOT_FOUND,
                "INCORRECT_PASSWORD": MSG_INVALID_CREDENTIALS,
                "CREATE_ATTEMPTS_EXCEEDED": "Could not add class at this time",
                "INVALID_MANUAL_ASSIGN": null
            },
            onFail(failPrinter)
        );
    }

    function getClassList(onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        lambdaManager.get(
            "professor/getClassList",
            {"Email": getEmail(), "Password": getPassword()},
            function(json) { // on success
                completeProcessing();
                onSuccess(json["data"]);
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_NOT_FOUND": MSG_ACCOUNT_NOT_FOUND,
                "INCORRECT_PASSWORD": MSG_INVALID_CREDENTIALS
            },
            onFail(failPrinter)
        );
    }

    function isClassOwner(classCode, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        lambdaManager.get(
            "professor/isClassOwner",
            {"Email": getEmail(), "Password": getPassword(), "ClassCode": classCode},
            function(json) { // on success
                completeProcessing();
                onSuccess(json["data"]["value"]);
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_NOT_FOUND": MSG_ACCOUNT_NOT_FOUND,
                "INCORRECT_PASSWORD": MSG_INVALID_CREDENTIALS
            },
            onFail(failPrinter)
        );
    }

    function getClassProgress(classCode, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        lambdaManager.get(
            "professor/getClassProgress",
            {"Email": getEmail(), "Password": getPassword(), "ClassCode": classCode},
            function(json) { // on success
                completeProcessing();
                onSuccess(json["data"]["value"]);
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_NOT_FOUND": MSG_ACCOUNT_NOT_FOUND,
                "INCORRECT_PASSWORD": MSG_INVALID_CREDENTIALS,
                "CLASS_NOT_FOUND": "Class not found."
            },
            onFail(failPrinter)
        );
    }

    function getClassData(classCode, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        lambdaManager.get(
            "professor/getProfessorClassData",
            {"Email": getEmail(), "Password": getPassword(), "ClassCode": classCode},
            function(json) { // on success
                completeProcessing();
                onSuccess(json["data"]);
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_NOT_FOUND": MSG_ACCOUNT_NOT_FOUND,
                "INCORRECT_PASSWORD": MSG_INVALID_CREDENTIALS,
                "CLASS_NOT_FOUND": "Class not found."
            },
            onFail(failPrinter)
        );
    }

    function getProgressReport(classCode, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        lambdaManager.get(
            "professor/getProgressReport",
            {"Email": getEmail(), "Password": getPassword(), "ClassCode": classCode},
            function(json) { // on success
                completeProcessing();
                onSuccess(json["data"]["value"]);
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_NOT_FOUND": MSG_ACCOUNT_NOT_FOUND,
                "INCORRECT_PASSWORD": MSG_INVALID_CREDENTIALS,
                "CLASS_NOT_FOUND": "Class not found."
            },
            onFail(failPrinter)
        );
    }

    function doClean(onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        lambdaManager.post(
            "professor/clean",
            {"Email": getEmail(), "Password": getPassword()},
            function(json) { // on success
                completeProcessing();
                onSuccess(json["data"]);
            },
            { // error translation
                "INVALID_EMAIL": MSG_INVALID_EMAIL,
                "ACCOUNT_NOT_FOUND": MSG_ACCOUNT_NOT_FOUND,
                "INCORRECT_PASSWORD": MSG_INVALID_CREDENTIALS
            },
            onFail(failPrinter)
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
        createClass:createClass,
        getClassList:getClassList,
        isClassOwner:isClassOwner,
        getCurrentUser:getCurrentUser,
        getClassData:getClassData,
        getClassProgress:getClassProgress,
        getProgressReport:getProgressReport,
        doClean:doClean
    }
}();
