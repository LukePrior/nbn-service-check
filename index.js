var express = require('express');
var request = require('request');
var app = express();

// Try to get a locID from address string via NBN
function nbnAutoComplete(address, callback) {
    var url = "https://places.nbnco.net.au/places/v1/autocomplete?query=" + address;

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
            result.label = body.suggestions[0].formattedAddress;
            result.locid = body.suggestions[0].id;
        }
        callback(result, true);
        return;
    });
}

// Try to get premesise information from locID via MyRepublic
function myRepublicLookup(locID, callback) {
    var url = "https://order.au.myrepublic.net/address/info?address=" + locID;

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
    var url = "https://service-qualification.unitiwireless.com/api/v1/autocomplete?address=" + address;

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

app.get("/check", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    var address = req.query.address;
    var result = {}

    nbnAutoComplete(address, function(data, success) {
        if (success) {
            result = data;
            myRepublicLookup(result.locid, function(data, success) {
                if (success) {
                    result.body = data;
                    res.send(result);
                } else { // NBN not available at address
                    unitiWirelessLookup(address, function(data, success) {
                        if (success) {
                            result.unitiid = data.id;
                            result.body = {};
                            if (data.carrier == "OC") {
                                result.body.provider = "Private Network";
                                result.body.primaryAccessTechnology = "Fibre";
                                result.body.lowerSpeed = 100;
                                result.body.upperSpeed = 1000;
                                result.body.networkCoexistence = "";
                            }
                            res.send(result);
                        } else {
                            res.status(400);
                            res.send('Could not find match');
                        }
                    })
                }
            });
        } else { // NBN could not match address
            res.status(400);
            res.send('Could not find match');
        }      
    });
});

app.listen(3000);