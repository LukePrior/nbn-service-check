var express = require("express");
var request = require('request');
var cheerio = require('cheerio');
var app = express();

app.get("/check", (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    var address = req.query.address;
    var result = {}
    var url0 = "https://places.nbnco.net.au/places/v1/autocomplete?query=" + address;
    request(url0, {headers: {"Referer": "https://www.nbnco.com.au/when-do-i-get-it/rollout-map.html"}}, function (error, response, body0) {
        body0 = JSON.parse(body0);
        result.label = body0.suggestions[0].formattedAddress;
        result.locid = body0.suggestions[0].id;
        var url1 = "https://order.au.myrepublic.net/address/info?address=" + result.locid;
        request(url1, function (error, response, body1) {
            body1 = JSON.parse(body1);
            result.body = body1;
            res.send(result);
        });
    })
});

app.listen(3000);