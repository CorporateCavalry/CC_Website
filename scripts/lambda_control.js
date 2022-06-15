// lambda controls
const lambdaManager = function() {
    const API_PATH = "https://3oesfmcnh2.execute-api.us-west-1.amazonaws.com/Prod/";

    function parseError(xhr, errorTranslator, failPrinter) {
        if (xhr.responseText == null) {
            printUnexpected(failPrinter);
            return;
        }

        const json = JSON.parse(xhr.responseText);
        if (json.hasOwnProperty("err_type")) {
            type = json["err_type"];
            if (errorTranslator.hasOwnProperty(type)) {
                failPrinter(errorTranslator[type]);
                return;
            }
        }
        printUnexpected(failPrinter);
        console.log("Error: " + json["message"]);
    }

    function get(path, params, onSuccess, errorTranslator, failPrinter) {
        onBeginLoading();
        $.ajax({
            url: API_PATH + path,
            async: true,
            success: function(response) {
                onEndLoading();
                onSuccess(JSON.parse(response));
            },
            error: function(xhr, ajaxOptions, thrownError) {
                onEndLoading();
                parseError(xhr, errorTranslator, failPrinter);
            },
            method: "GET",
            data: {
                "q": btoa(JSON.stringify(params))
            }
        });
    }

    function post(path, params, onSuccess, errorTranslator, failPrinter) {
        onBeginLoading();
        $.ajax({
            url: API_PATH + path,
            async: true,
            success: function(response) {
                onEndLoading();
                onSuccess(JSON.parse(response));
            },
            error: function(xhr, ajaxOptions, thrownError) {
                onEndLoading();
                parseError(xhr, errorTranslator, failPrinter);
            },
            method: "POST",
            data: JSON.stringify(params)
        });
    }

    return {
        get:get,
        post:post
    };
}();
