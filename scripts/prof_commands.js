profCommands = function(){
    var PROF_TABLE_NAME = "Professors";
    var CACHED_EMAIL_KEY = "prof_email";
    var CACHED_PASSWORD_KEY = "prof_password";

    var cachedEmail = loadStringFromStorage(CACHED_EMAIL_KEY);
    var cachedPassword = loadStringFromStorage(CACHED_EMAIL_KEY);

    function getKey(email) {
        return { TableName: PROF_TABLE_NAME, Key: { "Email": email } };
    }

    function validateLogin(onValid, onInvalid, printer) {
        if (isNullOrEmpty(cachedEmail) || isNullOrEmpty(cachedPassword)) {
            onInvalid();
            return;
        }

        docClient.get(getKey(cachedEmail), getCallback(
            function(data) {
                if (data["Password"] === cachedPassword) {
                    onValid();
                } else {
                    onInvalid();
                }
            },
            onInvalid,
            printer
        ));
    }

    function cacheLogin(email, password) {
        cachedEmail = email;
        localStorage.setItem(CACHED_EMAIL_KEY, email);

        cachedPassword = password;
        localStorage.setItem(CACHED_PASSWORD_KEY, password);
    }

    function createAccount(email, password, printer) {
        var putParams = {
            TableName: PROF_TABLE_NAME,
            Item: {
                "Email": email,
                "Password": password
            }
        };

        var onCreateSuccess = function() { printer("Account created!"); };
        var onAccountTaken = function(data) { printer("This email is already taken!"); };
        var onAccountOpen = function() { docClient.put(putParams, putCallback(onCreateSuccess, printer)); }

        docClient.get(getKey(email), getCallback(onAccountTaken, onAccountOpen, printer));
    }

    function login(email, password, printer, onLogIn) {
        if (!isString(email) || !isString(password)) {
            printer("Invalid data type.");
            return;
        }

        if (isNullOrEmpty(email) || isNullOrEmpty(password)) {
            printer("All fields must be filled out!");
            return;
        }

        docClient.get(getKey(email), getCallback(
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
        ));
    }

    function isLoggedIn() {
        return !isNullOrEmpty(cachedEmail);
    }

    function getCurrentUser() {
        return cachedEmail;
    }

    function logout() {
        cacheLogin("", "");
    }

    return {
        login:login,
        logout:logout,
        isLoggedIn:isLoggedIn,
        getCurrentUser:getCurrentUser
    }
}();
