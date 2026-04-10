const express = require("express");
const functions = require("firebase-functions");
const app = express();

//Loading the JSON Files:
const spirits = require("./data/spirits.json");
const findings = require("./data/findings.json");
const items = require("./data/items.json");
const relics = require("./data/relics.json");

//Deefining the routes:
app.get("/spirits", (req, res) => res.json(spirits));
app.get("/findings", (req, res) => res.json(findings));
app.get("/items", (req, res) => res.json(items));
app.get("/relics", (req, res) => res.json(relics));

//Exporting the API:
exports.api = functions.https.onRequest(app);
