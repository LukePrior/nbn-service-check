var express = require('express');
var request = require('request');
var app = express();

// Try to get a locID from address string via NBN
function nbnAutoComplete(address, callback) {
    var url = "https://places.nbnco.net.au/places/v1/autocomplete?query=" + encodeURIComponent(address);

    var result = {};

    request(url, {headers: {"Referer": "https://www.nbnco.com.au/when-do-i-get-it/rollout-map.html"}}, function (error, response, body) { 
        if (error) {
            tpgAddressTry();
            return;
        }
        try {
            body = JSON.parse(body);
        } catch (e) {
            tpgAddressTry();
            return;
        }
        if (body.suggestions.length != 0) {
            if (body.suggestions[0].id.startsWith("LOC")) {
                result.label = body.suggestions[0].formattedAddress;
                result.locid = body.suggestions[0].id;
                callback(result, true);
                return;
            } else {
                tpgAddressTry();
                return;
            }
        } else {
            tpgAddressTry();
            return;
        }
    });

    function tpgAddressTry() {
        tpgAddressFind(address, function(data, success) {
            if (success) {
                var tpgurl = "https://places.nbnco.net.au/places/v1/autocomplete?query=" + encodeURIComponent(data.address);
                request(tpgurl, {headers: {"Referer": "https://www.nbnco.com.au/when-do-i-get-it/rollout-map.html"}}, function (error, response, body) { 
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
                        } else {
                            callback(result, false);
                            return;
                        }
                    }
                    callback(result, true);
                    return;
                });
            } else {
                callback(result, true);
                return;
            }
        });
    }
}

// Try to get premesise information from locID via MyRepublic
function myRepublicLookup(locID, callback) {
    var url = "https://order.au.myrepublic.net/address/info?address=" + encodeURIComponent(locID);

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

// Try to get premesise id via Uniti Wireless
function unitiWirelessLookup(address, callback) {
    var url = "https://service-qualification.unitiwireless.com/api/v1/autocomplete?address=" + encodeURIComponent(address);

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
        if (body.data.length != 0) {
            result = body.data[0];
        }
        callback(result, true);
        return;
    });
}

// Try to get formatted address via TPG
function tpgAddressFind(address, callback) {
    var url = "https://www.tpg.com.au/api/sq?term=" + encodeURIComponent(address);

    var result = {};

    request(url, function (error, response, body) {
        if (error) {
            callback(result, false);
            return;
        }
        try {
            body = JSON.parse(body);
            result.address = body[0].replace(/\s+/g,' ');
            callback(result, true);
            return;
        } catch (e) {
            callback(result, false);
            return;
        }
    });
}

function unitiwirelessProcess(address, callback) {
    unitiWirelessLookup(address, function(data, success) {
        var result = {};
        if (success) {
            result.unitiid = data.id;
            result.label = data.address;
            result.body = {};
            if (data.carrier == "OC") {
                result.body.provider = "Private Network";
                result.body.primaryAccessTechnology = "Fibre";
                result.body.lowerSpeed = 100;
                result.body.upperSpeed = 1000;
                result.body.networkCoexistence = "";
                callback(result, true);
                return;
            } else if (data.carrier == "NB") {
                result.body.provider = "NBN";
                result.body.primaryAccessTechnology = "Unknown";
                result.body.networkCoexistence = "";
                callback(result, true);
                return;
            } 
            callback(result, false);
            return;
        } else {
            callback(result, false);
            return;
        }
    })
}

app.get("/check", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    var address = req.query.address;
    var result = {}

    nbnAutoComplete(address, function(data, success) {
        if (success) {
            result = data;
            myRepublicLookup(result.locid, function(data, success) {
                if (success && data.class != "0" && data.class != "4" && data.class != "10" && data.class != "30") {
                    result.body = data;
                    res.send(result);
                } else { // NBN not found at address
                    unitiwirelessProcess(address, function(data, success) {
                        if (success) {
                            result = data;
                            res.send(result);
                        } else {
                            console.error("Could not find match");
                            res.status(404);
                            res.send('Could not find match');
                        }
                    });
                }
            });
        } else { // NBN not found at address
            unitiwirelessProcess(address, function(data, success) {
                if (success) {
                    result = data;
                    res.send(result);
                } else {
                    console.error("Could not find match");
                    res.status(404);
                    res.send('Could not find match');
                }
            });
        }      
    });
});

app.listen(3000);