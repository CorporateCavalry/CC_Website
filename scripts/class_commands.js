classCommands = function() {
    const CLASS_TABLE_NAME = "Classes";
    const MAX_CREATE_ATTEMPTS = 5;
    const CLASS_CODE_SIZE = 4;

    let isProcessing = false;

    function getClassKey(classCode, attributes) {
        return { TableName: CLASS_TABLE_NAME, Key: { "ClassCode": classCode }, AttributesToGet: attributes };
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

    function createClass(owner, startDate, endDate, onSuccess, failPrinter) {
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
                    "Owner": owner
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
            function(msg) {// not found
                onFail("No data found for class " + classCode);
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

    return {
        getIsProcessing:getIsProcessing,
        createClass:createClass,
        getClassList:getClassList,
        fetchClassData:fetchClassData
    }
}();
