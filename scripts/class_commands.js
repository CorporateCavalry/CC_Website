const classCommands = function() {
    let isProcessing = false;

    function printBusy(printer) {
        printer("Class database busy!");
    }

    function onFail(failPrinter) {
        return function(msg) {
            completeProcessing();
            failPrinter(msg);
        }
    }

    function fetchClassInfo(classCode, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        lambdaManager.get(
            "general/getClassInfo",
            {"ClassCode": classCode},
            function(json) { // on success
                completeProcessing();
                onSuccess(json["data"]);
            },
            { // error translation
                "CLASS_NOT_FOUND": "No class was found with this code"
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

    // helpers for class data parsing
    function getClassStatus(classData) {
        const today = dateHelpers.getCurrentDate();

        let startDate = dateHelpers.parseSlidersDateString(classData["StartDate"]);
        if (today < startDate) {
            return {
                "Status": "unstarted",
                "Message": "Unstarted: Starts " + dateHelpers.getShortFormattedDateString(startDate)
            };
        } else {
            let endDate = dateHelpers.parseSlidersDateString(classData["EndDate"]);
            if (today < endDate) {
                return {
                    "Status": "started",
                    "Message": "Started: Ends " + dateHelpers.getShortFormattedDateString(endDate)
                };
            } else {
                return {
                    "Status": "completed",
                    "Message": "Completed"
                };
            }
        }
    }

    function initializeClassInfo(classData) {
        $(".class-info").css("display", "");

        let title = classData["Owner"];
        title += (title.toLowerCase().charAt(title.length - 1) !== 's') ? "'s " : "' "
        title += classData["Name"] + " Class (" + classData["ClassCode"] + ")";
        $(".class-title-text").text(title);
        $(".student-count-text").text(classData["StudentCount"]);
        $(".class-date-range").text(
            dateHelpers.getShortFormattedDateString(dateHelpers.parseSlidersDateString(classData["StartDate"])) +
            " - " +
            dateHelpers.getShortFormattedDateString(dateHelpers.parseSlidersDateString(classData["EndDate"]))
        );

        const statusData = getClassStatus(classData);
        const statusMessageElement = $(".status-message");
        statusMessageElement.addClass("status-message-" + statusData["Status"]);
        statusMessageElement.removeClass("status-message");
        statusMessageElement.text(statusData["Message"]);
        $(".status-icon").attr("src", "/assets/statusIcon-" + statusData["Status"] + ".png");
    }

    function hideClassInfo() {
        $(".class-info").css("display", "none");
    }

    return {
        getIsProcessing:getIsProcessing,
        fetchClassInfo:fetchClassInfo,
        getClassStatus:getClassStatus,
        initializeClassInfo:initializeClassInfo,
        hideClassInfo:hideClassInfo
    }
}();
