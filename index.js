var express = require("express");
var request = require('request');
var cheerio = require('cheerio');
var app = express();

function postURL(url, data, callback) {
    request.post({
        url: url,
        form: data
    }, function(error, response, body){
        return callback(body); 
    });
}

app.get("/check", (req, res) => {
    var address = req.query.address;
    var result = {}
    var url0 = "https://residential.launtel.net.au/search_address";
    var data0 = {"term": address}
    postURL(url0, data0, function(response0) {
        response0 = JSON.parse(response0);
        result.label = response0[0].label;
        result.locid = response0[0].locid;
        var url1 = "https://order.au.myrepublic.net/address/info?address=" + result.locid;
        request(url1, function (error, response, body) {
            body = JSON.parse(body);
            result.body = body;
            res.send(result);
        });
    })
});

app.listen(3000);