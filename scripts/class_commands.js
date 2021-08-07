classCommands = function() {
    const CLASS_TABLE_NAME = "Classes";
    const GROUP_TABLE_NAME = "Groups";

    const MAX_CREATE_ATTEMPTS = 5;
    const CLASS_CODE_SIZE = 4;
    const PLAYERS_IN_GROUP = 4;

    let isProcessing = false;

    function getClassKey(classCode, attributes) {
        return { TableName: CLASS_TABLE_NAME, Key: { "ClassCode": classCode }, AttributesToGet: attributes };
    }

    function generateGroupKey(classCode, groupID) {
        return classCode + "-" + new String(groupID);
    }

    function printBusy(printer) {
        printer("Class database busy!");
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

    function createClass(owner, className, startDate, endDate, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        }

        let numAttempts = 0;
        let classCode;

        const onClassCodeAvailable = function() {
            const putParams = {
                TableName: CLASS_TABLE_NAME,
                Item: {
                    "ClassCode": classCode,
                    "StartDate": startDate,
                    "EndDate": endDate,
                    "GroupCount": 0,
                    "Owner": owner,
                    "Name": className
                }
            };

            const onClassCreated = function() {
                completeProcessing();
                onSuccess(classCode);
            };

            awsManager.put(putParams, onClassCreated, onFail);
        };

        const testClassCode = function() {
            if (numAttempts === MAX_CREATE_ATTEMPTS) {
                onFail("Could not create class: max number of attempts reached.");
                return;
            }

            numAttempts++;

            classCode = getRandomClassName();
            awsManager.get(getClassKey(classCode, ["ClassCode"]), testClassCode, onClassCodeAvailable, onFail);
        };

        testClassCode();
    }

    function getClassList(classList, attributes, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        };

        let keyList = [];
        let len = classList.length;
        if (len === 0) {
            completeProcessing();
            onSuccess([]);
            return;
        }

        for (let i = 0; i < len; i++) {
            keyList.push({ "ClassCode": classList[i] });
        }

        const params = {
            RequestItems: {
                [CLASS_TABLE_NAME]: {
                    Keys: keyList,
                    AttributesToGet: attributes
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
    }

    function fetchClassData(classCode, attributes, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        }

        awsManager.get(
            getClassKey(classCode, attributes),
            function(data) { // found
                completeProcessing();
                onSuccess(data);
            },
            function() { // not found
                onFail("No data found for class " + classCode);
            },
            onFail
        );
    }

    function addAccountToClass(classCode, accountID, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        };

        awsManager.get(
            getClassKey(classCode, ["ClassCode", "GroupCount", "StartDate"]),
            function(classData) { // found
                const groupKey = function(groupID) { return generateGroupKey(classCode, groupID); }

                const onAddSuccess = function(groupID) {
                    awsManager.update( // update the class with our group as the last one, and add ourselves to the student count
                        {
                            TableName: CLASS_TABLE_NAME,
                            Key: { "ClassCode": classCode },
                            UpdateExpression: "SET GroupCount = :groupCount, StudentCount = StudentCount + :one",
                            ExpressionAttributeValues: { ":groupCount": (groupID + 1), ":one": 1 }
                        },
                        function() { // we updated the class, so pass back which group we are in
                            completeProcessing();
                            onSuccess(groupID);
                        },
                        onFail
                    );
                };

                const getGroupData = function(groupID) {
                    awsManager.get(
                        { TableName: GROUP_TABLE_NAME, Key: { "GroupKey": groupKey(groupID) }, AttributesToGet: ["GroupID", "AccountIDs"] },
                        function(groupData) { // we got the group data
                            if (groupData["AccountIDs"].length >= PLAYERS_IN_GROUP) {
                                createNewGroup(groupID + 1); // current group is full, so make a new one
                            } else {
                                awsManager.update( // append this account to the group
                                    {
                                        TableName: GROUP_TABLE_NAME,
                                        Key: { "GroupKey": groupKey(groupID) },
                                        UpdateExpression: "SET AccountIDs = list_append(if_not_exists(AccountIDs, :emptyList), :newAccount)",
                                        ExpressionAttributeValues: { ":emptyList": [], ":newAccount": [ accountID ] }
                                    },
                                    function() { onAddSuccess(groupID) }, // we successfully updated the group data
                                    onFail
                                );
                            }
                        },
                        function(msg) { createNewGroup(groupID); }, // we did not find the group, so create it
                        onFail
                    );
                };

                const createNewGroup = function(groupID) {
                    const groupData = {
                        "GroupKey": groupKey(groupID),
                        "CreationDate": classData["StartDate"],
                        "AccountIDs": [ accountID ]
                    }
                    awsManager.put(
                        { TableName: GROUP_TABLE_NAME, Item: groupData },
                        function() { onAddSuccess(groupID); }, // successfully added account to group
                        onFail
                    );
                };

                if (classData["GroupCount"] == 0) {
                    createNewGroup(0); // this class has no groups, so create one
                } else {
                    getGroupData(classData["GroupCount"] - 1); // get the last group
                }
            },
            function() { // not found
                onFail("Could not find class " + classCode);
            },
            onFail
        );
    }

    function removeAccountFromClass(classCode, rmGroupID, rmAccountID, onSuccess, failPrinter) {
        if (isProcessing) {
            printBusy(failPrinter);
            return;
        }
        isProcessing = true;

        const onFail = function(msg) {
            completeProcessing();
            failPrinter(msg);
        };

        awsManager.get(
            getClassKey(classCode, ["ClassCode", "StartDate"]),
            function(classData) { // found
                const today = new Date();
                if (parseSlidersDateString(classData["StartDate"]) < today) {
                    onFail("Cannot leave a class that is already started!");
                    return;
                }

                awsManager.get(
                    { TableName: GROUP_TABLE_NAME, Key: { "GroupKey": generateGroupKey(classCode, rmGroupID) }, AttributesToGet: ["GroupKey", "AccountIDs"] },
                    function(groupData) { // we got the group data
                        let playerID = -1;
                        const playerCount = groupData["AccountIDs"].length;
                        for (let i = 0; i < playerCount; i++) {
                            if (groupData["AccountIDs"][i] == rmAccountID) {
                                playerID = i;
                                break;
                            }
                        }

                        if (playerID < 0) { // account is not in this group
                            onFail("Account " + rmAccountID + " was not in group " + rmGroupID);
                            return;
                        }

                        // remove the player from the group data
                        awsManager.update(
                            {
                                TableName: GROUP_TABLE_NAME,
                                Key: { "GroupKey": groupData["GroupKey"] },
                                UpdateExpression: "REMOVE AccountIDs[" + playerID + "]",
                            },
                            function() { // successfully updated group, now remove an account from the class
                                awsManager.update(
                                    {
                                        TableName: CLASS_TABLE_NAME,
                                        Key: { "ClassCode": classCode },
                                        UpdateExpression: "SET StudentCount = StudentCount - :one",
                                        ExpressionAttributeValues: { ":one": 1 }
                                    },
                                    function() {
                                        completeProcessing();
                                        onSuccess();
                                    },
                                    onFail
                                )
                            },
                            onFail
                        );
                    },
                    function() { onFail("Could not find group: " + rmGroupID); }, // we did not find the group
                    onFail
                );
            },
            function() { // not found
                onFail("Could not find class " + classCode);
            },
            onFail
        );
    }

    function completeProcessing() {
        isProcessing = false;
    }

    function getIsProcessing() {
        return isProcessing;
    }

    // helpers for class data parsing
    function classInfoAttributes() {
        return ["Owner", "Name", "ClassCode", "StartDate", "EndDate", "StudentCount"];
    }

    function getClassStatus(classData) {
        const today = new Date();

        let startDate = parseSlidersDateString(classData["StartDate"]);
        if (today < startDate) {
            return {
                "Status": "unstarted",
                "Message": "Unstarted: Starts " + getShortFormattedDateString(startDate)
            };
        } else {
            let endDate = parseSlidersDateString(classData["EndDate"]);
            if (today < endDate) {
                return {
                    "Status": "started",
                    "Message": "Started: Ends " + getShortFormattedDateString(endDate)
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
            getShortFormattedDateString(parseSlidersDateString(classData["StartDate"])) +
            " - " +
            getShortFormattedDateString(parseSlidersDateString(classData["EndDate"]))
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
        createClass:createClass,
        getClassList:getClassList,
        fetchClassData:fetchClassData,
        addAccountToClass:addAccountToClass,
        removeAccountFromClass:removeAccountFromClass,
        getClassStatus:getClassStatus,
        classInfoAttributes:classInfoAttributes,
        initializeClassInfo:initializeClassInfo,
        hideClassInfo:hideClassInfo
    }
}();
