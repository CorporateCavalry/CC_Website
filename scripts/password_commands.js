const passwordCommands = function() {
    let isProcessing = false;

    function printBusy(printer) {
        printer("Password resetting busy!");
    }

    function onFail(failPrinter) {
        return function(msg) {
            completeProcessing();
            failPrinter(msg);
        }
    }

    function requestResetPassword(email, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        lambdaManager.post(
            "general/requestResetPassword",
            {"Email": email, "RootWebpage": window.location.origin},
            function(json) { // on success
                completeProcessing();
                onSuccess(json["data"]);
            },
            { // error translation
                "INVALID_EMAIL": "Email address is not valid",
                "ACCOUNT_NOT_FOUND": "No account found with this email"
            },
            onFail(failPrinter)
        );
    }

    function applyResetPassword(accountType, email, newPassword, token, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        lambdaManager.post(
            "general/applyResetPassword",
            {"Email": email, "NewPassword": newPassword, "AccountType": accountType, "Token": token },
            function(json) { // on success
                completeProcessing();
                onSuccess();
            },
            { // error translation
                "INVALID_EMAIL": "Email address is not valid",
                "INVALID_PASSWORD": "Please enter a 4-digit PIN",
                "ACCOUNT_NOT_FOUND": "No account found with this email",
                "INVALID_RESET": "Token is expired or invalid",
                "EXPIRED_RESET": "Token is expired or invalid"
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
        requestResetPassword:requestResetPassword,
        applyResetPassword:applyResetPassword
    }
}();
