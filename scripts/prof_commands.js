profCommands = function(){
    var PROF_TABLE_NAME = "Professors";

    var cachedEmail = "";
    var cachedPassword = "";

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

    function logout() {
        cachedEmail = "";
        cachedPassword = "";
    }

    function login(email, password, printer) {
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
                    cachedEmail = email;
                    cachedPassword = password;
                    printer("Successfully logged in!");
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

    return {
        login:login
    }
}();

// loginProfAccount("somethingtrass@gmail.co", "yape", consolePrinter)

// createProfAccount("somethingtrass@gmail.com", "yape");

// function onInvalid() { console.log("Invalid credentials!"); }
// function onValid() { console.log("Credentials valid!"); }
// validateLogin(onValid, onInvalid);
