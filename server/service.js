'use strict';

const express = require('express');
const service = express();
const request = require('superagent');
const conf = require('../config.json');
var _ = require('lodash');

service.get('/service/:tokenno/:channel', (req, res, next) => {
    const tokenno = req.params.tokenno;
    request.get(conf[0].url + '/patients', (err, response) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        var data = response.body;
        var result = null;
        var input = _.filter(data, function (e) { return e.patient.tokenNumber == tokenno });
        console.log(input);
        if (!input[0]) {
            result = {
                "channel": `${req.params.channel}`,
                "username": "KG Bot",
                "text": "Patient Not found"
            }
            dataParser(res, result);
            return;
        }

        if (input[0].patient.isComplete) {
            result = {
                "channel": `${req.params.channel}`,
                "username": "KG Bot",
                "attachments":
                [
                    {
                        "title": `token No ${input[0].patient.tokenNumber} is ${input[0].patient.patientName}`,
                        "text": `Tests are Completed `
                    }
                ]
            };
            dataParser(res, result);
            return;
        }

        var currentQueue = (input[0].testDetails.currentQueue === null || input[0].testDetails.currentQueue === " ") ? "Empty" : input[0].testDetails.currentQueue;
        result = {
            "channel": `${req.params.channel}`,
            "username": "KG Bot",
            "attachments":
            [
                {
                    "title": `token No ${input[0].patient.tokenNumber} is ${input[0].patient.patientName}`,
                    "text": `current Queue is ${currentQueue}`,
                    "fields":
                    [
                        {
                            "title": "Total Tests",
                            "value": `${input[0].testDetails.totalTests}`,
                            "short": true
                        },
                        {
                            "title": "Completed Tests",
                            "value": `${input[0].testDetails.completedTests}`,
                            "short": true
                        },
                        {
                            "title": "Package",
                            "value": `${input[0].patient.packageCode}`,
                            "short": true
                        },
                        {
                            "title": "Guide",
                            "value": `${input[0].patient.guide}`,
                            "short": true
                        }
                    ],
                    "image_url": `${input[0].patient.photoUrl}`
                }
            ]
        };
        dataParser(res, result);
        return;
    });
});

service.get('/service/lab/:station/:channel', (req, res, next) => {
    const station = req.params.station;
    request.get(conf[0].url + '/stations', (err, response) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        console.log(station);
        var data = response.body;
        var result = null;
        var input = _.filter(data, function (e) { return e.code === station });
        //console.log(input);

        if (!input[0]) {
            result = {
                "channel": `${req.params.channel}`,
                "username": "KG Bot",
                "text": "Station Not found"
            }

            dataParser(res, result);
            return;
        }


        var stationStatus = input[0].isEnabled ? "Open" : "Closed";

        if (!input[0].isEnabled) {
            result = {
                "channel": `${req.params.channel}`,
                "username": "KG Bot",
                "attachments":
                [
                    {
                        "title": `Station ${station} is ${stationStatus}`
                    }
                ]
            };
            dataParser(res, result);
            return;
        }

        var patientCount = (input[0].patients.length == 0) ? "Empty" : input[0].patients.length;

        var queueTokens = "";
        var servingTokens = "";
        var waitingTokens = "";

        if (patientCount != 'Empty') {
            input[0].patients.map((patient) => {
                queueTokens += patient.tokenNumber + ",";
                var patientStation = _.filter(patient.stations, function (e) { return e.code === station })
                if (!patientStation[0].checkin && !patientStation[0].checkout) {
                    waitingTokens += patient.tokenNumber + ",";
                } else if (patientStation[0].checkin && !patientStation[0].checkout) {
                    servingTokens += patient.tokenNumber + ",";
                }
            });

            queueTokens = lastCharRemover(queueTokens);
            waitingTokens = (waitingTokens == "") ? "Empty" : lastCharRemover(waitingTokens);
            servingTokens = (servingTokens == "") ? "Empty" : lastCharRemover(servingTokens);

            result = {
                "channel": `${req.params.channel}`,
                "username": "KG Bot",
                "attachments":
                [
                    {
                        "title": `Station ${station} is ${stationStatus}`,
                        "text": `Patient count is ${patientCount}`,
                        "fields":
                        [
                            {
                                "title": "Tokens in the Queue ",
                                "value": `${queueTokens}`,
                                "short": false
                            },
                            {
                                "title": "Serving Tokens ",
                                "value": `${servingTokens}`,
                                "short": true
                            },
                            {
                                "title": "Waiting Tokens ",
                                "value": `${waitingTokens}`,
                                "short": true
                            },
                        ],
                    }
                ]
            };
            dataParser(res, result);
            return;
        }
        result = {
            "channel": `${req.params.channel}`,
            "username": "KG Bot",
            "attachments":
            [
                {
                    "title": `Station ${station} is ${stationStatus}`,
                    "text": `The Queue is Empty`,
                }
            ]
        };
        dataParser(res, result);
        return;
    });
    //console.log(tokenno);
});

service.get('/service/guide/:guide/:channel', (req, res, next) => {
    const guide = req.params.guide;
    request.get(conf[0].url + '/patients', (err, response) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        //console.log(input);
        var data = response.body;
        var result = null;
        var input = _.filter(data, function (e) { return e.patient.guide.toLowerCase() === guide.toLowerCase() });
        //console.log(input);

        if (!input[0]) {
            result = {
                "channel": `${req.params.channel}`,
                "username": "KG Bot",
                "text": "Guide Not found"
            }
            dataParser(res, result);
            return;
        }

         if (input.length === 0) {
            result = {
                "channel": `${req.params.channel}`,
                "username": "KG Bot",
                "text": "No Patients under the Guide ${req.params.guide}"
            }
            dataParser(res, result);
            return;
        }

        var patientCount = input.length;
        var waitingPatients = "";
        var waitingPatientsCount = 0;
        var completedPatients = "";
        var completedPatientsCount = 0;
        var tokenNumbers = "";

        input.map((e) => {
            tokenNumbers += e.patient.tokenNumber + ",";
            if (e.patient.isComplete) {
                completedPatients += e.patient.tokenNumber + ",";
                completedPatientsCount++;
                return;
            }
            waitingPatients += e.patient.tokenNumber + ",";
            waitingPatientsCount++;
            return;
        });

        result = {
            "channel": `${req.params.channel}`,
            "username": "KG Bot",
            "attachments":
            [
                {
                    "title": `Guide ${guide}'s Details `,
                    "text": `Patient count is ${patientCount === 0 ? "Empty": patientCount}`,
                    "fields":
                    [
                        {
                            "title": "Waiting Token Count",
                            "value": `${waitingPatientsCount === 0 ? "Empty": waitingPatientsCount }`,
                            "short": true
                        },
                        {
                            "title": "Completed Token Count ",
                            "value": `${completedPatientsCount === 0 ? "Empty" : completedPatientsCount }`,
                            "short": true
                        },
                        {
                            "title": "Waiting Tokens are",
                            "value": `${waitingPatients === "" ? "Empty" : lastCharRemover(waitingPatients) }`,
                            "short": true
                        },
                        {
                            "title": "Completed Tokens are",
                            "value": `${completedPatients === "" ? "Empty" : lastCharRemover(completedPatients)}`,
                            "short": true
                        }
                    ],
                }
            ]
        };

        dataParser(res, result);
        return;
    });
    //console.log(tokenno);
});

function dataParser(res, result) {
    console.log(JSON.stringify(result));
    res.json(JSON.stringify(result));
}

function lastCharRemover(string){
    return string.substring(0, string.length - 1)
}
module.exports = service;