const crypto = require("crypto");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const axios = require("axios");
const mysql = require("mysql");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//YOUR KEYS FROM P24
const P24_ID = "YOUR_P24_ID";
const P24_CRC_KEY = "YOUR_P24_CRC_KEY";
const P24_API_KEY = "YOUR_P24_API_KEY";


app.post("/endpoints", function (req, res) {

  //------------------------------------- 1. Waiting for data and then stringify  - Function for stringify request JSON---------------------------------------//

  const customStringify = function (v) {
    const cache = new Set();
    return JSON.stringify(v, function (key, value) {
      if (typeof value === "object" && value !== null) {
        if (cache.has(value)) {
          try {
            return JSON.parse(JSON.stringify(value));
          } catch (err) {
            return;
          }
        }
        cache.add(value);
      }
      return value;
    });
  };

  //-------------------------------------- 2. Fetching from array all data ----------------------------//

  let stringifiedData = customStringify(req);
  let fullData = JSON.parse(stringifiedData).body;

  const P24_merchantID = fullData.merchantId;
  const P24_sessionID = fullData.sessionId;
  const P24_amount = fullData.amount;
  const P24_originAmount = fullData.originAmount;
  const P24_currency = fullData.currency; ``
  const P24_orderID = fullData.orderId;
  const P24_methodID = fullData.methodId;
  const P24_statement = fullData.statement;
  const P24_sign = fullData.sign;

  //-------------------------------------- 3. Verify transaction - changing status from "Untapped" to "Complete"----------------------------------------------//

  const hashIndex = `{"sessionId":"${P24_sessionID}","orderId":${P24_orderID},"amount":${P24_amount},"currency":"${P24_currency}","crc":"${P24_CRC_KEY}"}`;

  let preHash = crypto.createHash("sha384");
  hash = preHash.update(hashIndex);
  finalSign = hash.digest("hex");

  var bodyToRequest = {
    "merchantId": P24_merchantID,
    "posId": P24_merchantID,
    "sessionId": `${P24_sessionID}`,
    "amount": P24_amount,
    "currency": `${P24_currency}`,
    "orderId": P24_orderID,
    "sign": `${finalSign}`,
  };

  axios.put("https://secure.przelewy24.pl/api/v1/transaction/verify", bodyToRequest, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(P24_merchantID + ":" + P24_API_KEY)
    }
  }).then((res) => console.log(res));

  //-------------------------------------- 4. Database Connection ------------------------------------------------------------------//

  var conn = mysql.createConnection({
    host: "localhost", //Host to Database
    user: "user_to_your_database", //User to your database
    password: "password_to_your_database", //Password for your database
    database: "your_database_on_server", //Chosing database on your server
  });

  //-------------------------------------- 5. Query to database ----------------------------------------------------------------------------//

  conn.connect(function (err) {
    if (err) throw err;
    conn.query(`INSERT INTO notifications (merchantId,sessionId,amount,originAmount,currency,orderId,methodId,statement,sign) VALUES (${P24_merchantID}, "${P24_sessionID}",${P24_amount},${P24_originAmount},"${P24_currency}",${P24_orderID},${P24_methodID},"${P24_statement}","${P24_sign}")`,
      function (err, result, fields) { if (err) throw err; }
    );
  });

  res.send("Notification receive correctly!"); //Przelewy24 will see that in logs back
});

var server = app.listen(7770, function (req) {
  console.log("Server listening on port 7770");
});