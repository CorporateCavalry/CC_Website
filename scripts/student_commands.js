studentCommands = function(){
    function getAccount(accountID) {
        let returnStr = "Error";
        let params = {
            TableName: "Accounts",
            Key: { "AccountID": accountID }
        };

        // awsManager.get(params, function (err, data) {
        //     if (err) {
        //         returnStr = "Error:" + JSON.stringify(err, undefined, 2);
        //         console.log(returnStr)
        //     } else {
        //         console.log(data["Item"]["Name"])
        //         returnStr = "Data Found:" + JSON.stringify(data, undefined, 2);
        //         console.log(returnStr)
        //     }
        // });
    }

    return {
        getAccount:getAccount
    }
}();
