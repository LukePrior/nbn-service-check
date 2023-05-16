var request = require('request');
var isbot = require('isbot')
const app = require('express')()

// Try to get a locID from address string via NBN
function nbnAutoComplete(address, callback) {
    var url = "https://places.nbnco.net.au/places/v1/autocomplete?query=" + encodeURIComponent(address);

    var result = {};

    request(url, {headers: {"Referer": "https://www.nbnco.com.au/when-do-i-get-it/rollout-map.html"}}, function (error, response, body) { 
        if (error) {
            callback(result, false);
            return;
        }
        try {
            body = JSON.parse(body);
        } catch (e) {
            callback(result, false);
            return;
        }
        if (body.suggestions.length != 0) {
            if (body.suggestions[0].id.startsWith("LOC")) {
                result.label = body.suggestions[0].formattedAddress;
                result.locid = body.suggestions[0].id;
                callback(result, true);
                return;
            }
        }
        callback(result, false);
        return;
    });
}

// Try to get premesise information from locID via Launtel
function launtelLookup(locID, callback) {
    var url = "https://launtel.net.au/scripts/dmxConnect/api/online_signup/loc_sq.php?locid=" + encodeURIComponent(locID);

    var result = {};

    request(url, function (error, response, body) {
        if (error) {
            callback(result, false);
            return;
        }
        try {
            body = JSON.parse(body);
        } catch (e) {
            callback(result, false);
            return;
        }
        result = body;
        callback(result, true);
        return;
    });
}

function checkBot(req, callback) {
    if (isbot(req.get('user-agent'))) {
        callback(true);
        return;
    } else {
        callback(false);
        return;
    }
}

app.get('/check', (req, res) => {
    checkBot(req, function(bot) {
        if (bot) {
            res.status(403);
            res.send('Sorry no bots please host your own version: https://github.com/LukePrior/nbn-service-check');
        } else {
            processRequest();
        }
    });

    function processRequest() {
        res.setHeader('Access-Control-Allow-Origin', '*');
        var address = req.query.address;
        var result = {}

        nbnAutoComplete(address, function(data, success) {
            if (success) {
                result = data;
                launtelLookup(result.locid, function(data, success) {
                    if (success && data.ServiceClass != "0" && data.ServiceClass != "4" && data.ServiceClass != "10" && data.ServiceClass != "30") {
                        result.body = {};
                        result.body.provider = "NBN";
                        result.body.primaryAccessTechnology = data.loc_details['primary-access-technology']
                        if (data.loc_details['co-existence'] != "No") {
                            result.body.networkCoexistence = "Yes"
                        }
                        if (data.loc_details.newdevcharge != "") {
                            result.body.NewDevelopmentCharge = data.loc_details.newdevcharge
                        }
                        console.log(result);
                        res.send(result);
                        return;
                    } else {
                        res.send(result);
                        return;
                    }
                });
            } else {
                res.send(result);
                return;
            }

        });
    }
});

app.listen(5000, () => {
    console.log("Running on port 5000.");
});

module.exports = app;