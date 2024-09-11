export default function ui(){


    return {
        main :`
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OAS - Telemetry</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            border: 1px solid #dddddd;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
        }

        #telemetryStatusSpan {
            color: rgb(0, 123, 6);
            font-size: x-small;
        }
    </style>
</head>

<body>
    <h1>Telemetry <span id="telemetryStatusSpan"></span></h1>

    <label><input type="checkbox" id="toggleTelemetry"> Allow Server Telemetry</label>
    <br><br>
    <button onclick="fetch('/telemetry/reset');showTelemetryStatus();">Reset Telemetry Data</button>
    <br><br>
    <label><input type="checkbox" id="autoUpdate"> Allow Client Auto Update</label>
    <br><br>
    <table id="apiTable">
        <thead>
            <tr>
                <th onclick="sortTable(0)">Path</th>
                <th onclick="sortTable(1)">Method</th>
                <th onclick="sortTable(2)">Status</th>
                <th onclick="sortTable(3)">Description</th>
                <th onclick="sortTable(4)" style="text-align: center;">Request <br> Count</th>
                <th onclick="sortTable(5)" style="text-align: center;">Average response time<br> (sec)</th>
                <th style="text-align: center;">Auto<br>Update</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>

    <script>
        let LOG = false;


        let intervalTimer = {
            disabled: true,
            period: 2000,
            subscribers: [],
            start: function () {
                this.interval = setInterval(() => this.tick(), this.period);
            },
            tick: function () {
                if (this.disabled) return;
                log("tick");
                this.subscribers.forEach(callback => callback());//execute all the callbacks
            },
            subscribe: function (callback) {
                this.subscribers.push(callback);
            },
            unsubscribe: function (callback) {
                this.subscribers.pop(callback)
            }
        }





        function log(s) {
            if (LOG) console.log(s);
        }

        async function fetchSpec() {
            try {
                const response = await fetch("/telemetry/spec");
                if (!response.ok) {
                    throw new Error("ERROR getting the Spec");
                }
                apiSpec = await response.json();
                return apiSpec;

            } catch (error) {
                console.error("ERROR getting the Spec :", error);
                return null;
            }
        }


        function getPathRegEx(path) {
            let pathComponents = path.split("/");
            let pathRegExpStr = "^"

            pathComponents.forEach(c => {
                if (c != "") {
                    pathRegExpStr += "/";
                    if (c.charAt(0) == "{" && c.charAt(c.length - 1) == "}") {
                        pathRegExpStr += "(.*)";
                    } else {
                        pathRegExpStr += c;
                    }
                }
            });

            pathRegExpStr += "\$";

            return pathRegExpStr;
        }

        async function fetchTracesByFind(path, method, status) {
            try {
                log(\`Fetching traces for <\${path}> - \${method} - \${status} \`);
                const body = {
                    "flags": { "containsRegex": true },
                    "config": { "regexIds": ["attributes.http.target"] },
                    "search": {
                        "attributes.http.target": getPathRegEx(path),
                        "attributes.http.method": method.toUpperCase(),
                        "attributes.http.status_code": parseInt(status)
                    }
                };
                log("body: " + JSON.stringify(body, null, 2));
                //response is to the post at /telemetry/find
                const response = await fetch("/telemetry/find", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    throw new Error("ERROR getting the Traces.");
                }

                const responseJSON = await response.json();
                const traces = responseJSON.spans;

                log(\`Fetched \${traces.length} traces.\`);
                return traces;

            } catch (error) {
                console.error("ERROR getting the Traces :", error);
            }
        }

        function calculateTiming(startSecInput, startNanoSecInput, endSecInput, endNanoSecInput, precision = 3) {
            let startSec = parseFloat(startSecInput);
            let startNanoSec = parseFloat(startNanoSecInput);
            let endSec = parseFloat(endSecInput);
            let endNanoSec = parseFloat(endNanoSecInput);

            let startNanoSecParsed = parseFloat("0." + startNanoSec);
            let endNanoSecParsed = parseFloat("0." + endNanoSec);

            let preciseStart = parseFloat(startSec + startNanoSecParsed);
            let preciseEnd = parseFloat(endSec + endNanoSecParsed);
            let preciseDuration = parseFloat(preciseEnd - preciseStart);

            let startDate = new Date(preciseStart.toFixed(precision) * 1000);
            let startTS = startDate.toISOString();

            let endDate = new Date(preciseEnd.toFixed(precision) * 1000);
            let endTS = endDate.toISOString();

            return {
                preciseStart: preciseStart,
                preciseEnd: preciseEnd,
                preciseDuration: preciseDuration,
                start: parseFloat(preciseStart.toFixed(precision)),
                end: parseFloat(preciseEnd.toFixed(precision)),
                duration: parseFloat(preciseDuration.toFixed(precision)),
                startDate: startDate,
                endDate: endDate,
                startTS: startTS,
                endTS: endTS
            };
        }

        function parseTraceInfo(t) {
            const ep = t.attributes.http.target;
            const method = t.attributes.http.method.toLowerCase();
            const status = t.attributes.http.status_code;

            const timing = calculateTiming(t.startTime[0], t.startTime[1], t.endTime[0], t.endTime[1]);

            log(\`\${timing.startTS} - \${timing.endTS} - \${t._spanContext.traceId} - \${t.name} - \${ep} - \${status} - \${timing.duration}\`);
            return {
                ts: timing.startTS,
                ep: ep,
                method: method,
                status: status,
                duration: timing.duration
            };
        }

        async function loadStats(path, method, status, cellRequestCount, cellAverageResponseTime) {
            log(\`loadStats(\${path}, \${method}, \${status}, \${cellRequestCount}, \${cellAverageResponseTime})\`);
            let traces = await fetchTracesByFind(path, method, status);
            let requestCount = traces.length;
            let averageResponseTime = 0;

            traces.forEach(trace => {
                t = parseTraceInfo(trace);
                log(JSON.stringify(t, null, 2));
                averageResponseTime += parseFloat(t.duration);
                log(\`averageResponseTime += t.duration --> \${averageResponseTime} += \${t.duration}\`);
            });

            averageResponseTime = averageResponseTime / requestCount;

            log(\`averageResponseTime = averageResponseTime / requestCount --> \${averageResponseTime} = \${averageResponseTime} / \${requestCount}\`);

            cellRequestCount.textContent = requestCount;
            cellAverageResponseTime.textContent = requestCount ? averageResponseTime.toFixed(3) : "--";

            // setTimeout(() => loadStats(path, method, status, cellRequestCount, cellAverageResponseTime), 2000);
        }

        function populateOASTable(apiSpec) {
            const tableBody = document.getElementById('apiTable').getElementsByTagName('tbody')[0];
            Object.keys(apiSpec.paths).forEach(path => {
                Object.keys(apiSpec.paths[path]).forEach(method => {
                    Object.keys(apiSpec.paths[path][method].responses).forEach(responseType => {
                        if (!Number.isNaN(parseInt(responseType))) {
                            const row = tableBody.insertRow();
                            const cellPath = row.insertCell(0);
                            const cellMethod = row.insertCell(1);
                            const cellStatus = row.insertCell(2);
                            const cellDescription = row.insertCell(3);
                            const cellRequestCount = row.insertCell(4);
                            cellRequestCount.style = "text-align: center;";
                            cellRequestCount.textContent = "--";
                            const cellAverageResponseTime = row.insertCell(5);
                            cellAverageResponseTime.style.textAlign = "center";
                            cellAverageResponseTime.textContent = "--";

                            const basePath = apiSpec.basePath ? apiSpec.basePath : "";
                            const fullPath = basePath + path;
                            cellPath.textContent = path;
                            cellPath.style.cursor = 'pointer';
                            cellPath.onclick = function () {
                                window.location.href = row.detailPath;
                            };
                            cellMethod.textContent = method.toUpperCase();
                            cellStatus.textContent = responseType;
                            cellDescription.textContent = apiSpec.paths[path][method].summary
                                + " - "
                                + apiSpec.paths[path][method].responses[responseType].description;

                            row.detailPath = \`/telemetry/detail/\${responseType}/\${method.toLowerCase()}\${fullPath}\`;
                            const cellCheckbox = row.insertCell(6);

                            // Create and insert checkbox
                            const checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            cellCheckbox.appendChild(checkbox);
                            cellCheckbox.style.textAlign = 'center';
                            // class to search for the checkboxes
                            checkbox.className = 'autoUpdateCheckbox';
                            checkbox.disabled = intervalTimer.disabled;

                            // Add event listener to handle checkbox auto-update
                            checkbox.addEventListener('change', function () {
                                if (this.checked)
                                    intervalTimer.subscribe(() =>
                                        loadStats(fullPath, method.toLowerCase(), responseType, cellRequestCount, cellAverageResponseTime)
                                    );
                                else
                                    intervalTimer.unsubscribe(() =>
                                        loadStats(fullPath, method.toLowerCase(), responseType, cellRequestCount, cellAverageResponseTime)
                                    );
                            });

                        }
                    });
                });
            });
        }

        function sortTable(column) {
            const table = document.getElementById('apiTable');
            let rows, switching, i, x, y, shouldSwitch;
            switching = true;
            while (switching) {
                switching = false;
                rows = table.rows;
                for (i = 1; i < (rows.length - 1); i++) {
                    shouldSwitch = false;
                    x = rows[i].getElementsByTagName("TD")[column];
                    y = rows[i + 1].getElementsByTagName("TD")[column];
                    if (x.textContent.toLowerCase() > y.textContent.toLowerCase()) {
                        shouldSwitch = true;
                        break;
                    }
                }
                if (shouldSwitch) {
                    rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                    switching = true;
                }
            }
        }

        document.getElementById('autoUpdate').addEventListener('change', function () {
            const autoUpdateDisabled = !this.checked;
            intervalTimer.disabled = autoUpdateDisabled;
            // Disable/Enable all the checkboxes
            const checkboxes = document.getElementsByClassName('autoUpdateCheckbox');
            for (let i = 0; i < checkboxes.length; i++) {
                checkboxes[i].disabled = autoUpdateDisabled;
            }
        });

        async function showTelemetryStatus() {
            const tss = document.getElementById("telemetryStatusSpan");
            const response = await fetch("/telemetry/status");
            if (!response.ok) {
                throw new Error("ERROR getting the Status");
                return false;
            }
            tStatus = await response.json();

            log(tStatus);
            if (tStatus.active) {
                tss.textContent = "active";
                tss.style.color = "#009900";
            } else {
                tss.textContent = "stopped";
                tss.style.color = "#666666";
            }
            return tStatus.active;
        }

        document.getElementById('toggleTelemetry').addEventListener('change', function () {
            if (this.checked) {
                fetch('/telemetry/start').then(showTelemetryStatus());
            } else {
                fetch('/telemetry/stop').then(showTelemetryStatus());
            }
        });

        window.onload = async function () {
            document.getElementById('autoUpdate').checked = !intervalTimer.disabled; // Default to false
            const activeTelemetry = await showTelemetryStatus();
            document.getElementById('toggleTelemetry').checked = activeTelemetry; // Default to not toggled
            const apiSpec = await fetchSpec()
            populateOASTable(apiSpec);
            intervalTimer.start();
        };
    </script>
</body>

</html>`,
        detail :`
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OAS - Telemetry</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            border: 1px solid #dddddd;
            padding: 8px;
            text-align: left;
            cursor: pointer;
        }

        th {
            background-color: #f2f2f2;
        }

        .box {
            width: 100%;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.2);
            padding: 35px;
            border: 2px solid #fff;
            border-radius: 20px/50px;
            background-clip: padding-box;
            text-align: center;
        }

        .overlay {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.7);
            transition: opacity 500ms;
            visibility: hidden;
            opacity: 0;
            overflow: scroll;
        }

        .overlay:target {
            visibility: visible;
            opacity: 1;
        }

        .popup {
            margin: 70px auto;
            padding: 20px;
            background: #fff;
            border-radius: 5px;
            width: 70%;
            position: relative;
            transition: all 5s ease-in-out;
            font-size: small;
            overflow: scroll;
        }

        .popup .close {
            position: absolute;
            top: 20px;
            right: 30px;
            transition: all 200ms;
            font-size: 30px;
            font-weight: bold;
            text-decoration: none;
            color: #333;
        }
    </style>
</head>

<body>
    <h1><span id="heading">Telemetry for...</span></h1>
    <a href="/telemetry/">Back</a><br><br>
    <table id="apiTable">
        <thead>
            <tr>
                <th onclick="sortTable(0)">TimeStamp</th>
                <th onclick="sortTable(1)">End point</th>
                <th onclick="sortTable(2)">Method</th>
                <th onclick="sortTable(3)">Status</th>
                <th onclick="sortTable(4)" style="text-align: center;">Response time<br> (sec)</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>
    <script>

        let traceCount = -1;
        let LOG = true;

        function log(s) {
            if (LOG)
                console.log(s);
        }

        function parsePath() {

            let detailPath = window.location.pathname.split("/");

            if (detailPath.length < 6 || detailPath[5] == "") {
                alert("Wrong invocation params");
                return;
            }

            let status = parseInt(detailPath[3]);

            if (Number.isNaN(status))
                status = -1;

            const method = detailPath[4];


            const path = decodeURI("/" + detailPath
                .splice(5, detailPath.length - 5)
                .filter(c => (c != ""))
                .join("/"));

            headingObj = document.getElementById('heading');
            headingObj.textContent = \`Telemetry for \${path} - \${method} - \${status} \`;
            fetchTracesByParsing(path, method, status);
        }

        function getSearchQuery(path, method, status) {
            let pathComponents = path.split("/");
            let pathRegex = "^"

            pathComponents.forEach(c => {
                if (c != "") {
                    pathRegex += "/";
                    if (c.charAt(0) == "{" && c.charAt(c.length - 1) == "}") {
                        pathRegex += "(.*)";
                    } else {
                        pathRegex += c;
                    }
                }
            });

            pathRegex += "\$";

            return {
                "attributes.http.target": { \$regex: new RegExp(pathRegex) },
                "name": method.toUpperCase(),
                "attributes.http.status_code": status
            };
        }

        async function fetchTracesByFinding(path, method, status) {
            try {
                log(\`Fetching traces for <\${path}> - \${method} - \${status} \`);
                const body = {
                    "flags": { "containsRegex": true },
                    "config": { "regexIds": ["attributes.http.target"] },
                    "search": {
                        "attributes.http.target": getPathRegEx(path),
                        "attributes.http.method": method.toUpperCase(),
                        "attributes.http.status_code": parseInt(status)
                    }
                };
                log("body: " + JSON.stringify(body, null, 2));
                //response is to the post at /telemetry/find
                const response = await fetch("/telemetry/find", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    throw new Error("ERROR getting the Traces.");
                }

                const traces = await response.json();
                loadTraces(traces);

            } catch (error) {
                console.error("ERROR getting the Traces :", error);
            }
        }

        function getPathRegEx(path) {
            let pathComponents = path.split("/");
            let pathRegExpStr = "^"

            pathComponents.forEach(c => {
                if (c != "") {
                    pathRegExpStr += "/";
                    if (c.charAt(0) == "{" && c.charAt(c.length - 1) == "}") {
                        pathRegExpStr += "(.*)";
                    } else {
                        pathRegExpStr += c;
                    }
                }
            });

            pathRegExpStr += "\$";

            return pathRegExpStr;
        }

        async function fetchTracesByParsing(path, method, status) {
            try {
                log(\`Fetchig traces for <\${path}> - \${method} - \${status},.. \`);

                const response = await fetch("/telemetry/list");

                if (!response.ok) {
                    throw new Error("ERROR getting the Traces.");
                }

                const responseJSON = await response.json();
                const traces = responseJSON.spans;
                const filteredTraces = traces; //filter made in server side
                log(\`Feched \${traces.length} traces.\`);
                //log(\`First trace: \${JSON.stringify(traces[0],null,2)}\`);

                if (filteredTraces.length != traceCount) {
                    loadTraces(filteredTraces);
                    traceCount = filteredTraces.length;
                }

                setTimeout(fetchTracesByParsing, 1000, path, method, status);

            } catch (error) {
                console.error("ERROR getting the Traces :", error);
            }
        }

        function calculateTiming(startSecInput, startNanoSecInput, endSecInput, endNanoSecInput, precision = 3) {
            // Default precision 3 = miliseconds

            let startSec = parseFloat(startSecInput)
            let startNanoSec = parseFloat(startNanoSecInput)
            let endSec = parseFloat(endSecInput)
            let endNanoSec = parseFloat(endNanoSecInput)

            let startNanoSecParsed = parseFloat("0." + startNanoSec);
            let endNanoSecParsed = parseFloat("0." + endNanoSec);

            let preciseStart = parseFloat(startSec + startNanoSecParsed);
            let preciseEnd = parseFloat(endSec + endNanoSecParsed);
            let preciseDuration = parseFloat(preciseEnd - preciseStart);

            let startDate = new Date(preciseStart.toFixed(precision) * 1000);
            let startTS = startDate.toISOString();

            let endDate = new Date(preciseEnd.toFixed(precision) * 1000);
            let endTS = endDate.toISOString();

            return {
                preciseStart: preciseStart,
                preciseEnd: preciseEnd,
                preciseDuration: preciseDuration,
                start: parseFloat(preciseStart.toFixed(precision)),
                end: parseFloat(preciseEnd.toFixed(precision)),
                duration: parseFloat(preciseDuration.toFixed(precision)),
                startDate: startDate,
                endDate: endDate,
                startTS: startTS,
                endTS: endTS
            };

        }

        function parseTraceInfo(t) {
            const ep = t.attributes.http.target;
            const method = t.attributes.http.method.toLowerCase();
            const status = t.attributes.http.status_code;

            const timing = calculateTiming(t.startTime[0], t.startTime[1], t.endTime[0], t.endTime[1]);

            log(\`\${timing.startTS} - \${timing.endTS} - \${t._spanContext.traceId} - \${t.name} - \${ep} - \${status} - \${timing.duration}\`);
            return {
                ts: timing.startTS,
                ep: ep,
                method: method,
                status: status,
                duration: timing.duration
            };
        }

        function loadTraces(traces) {

            const tableBody = document.getElementById('apiTable').getElementsByTagName('tbody')[0];
            while (tableBody.hasChildNodes()) {
                tableBody.removeChild(tableBody.lastChild);
            }

            traces.forEach(trace => {
                const row = tableBody.insertRow();
                const cellTS = row.insertCell(0);
                const cellEP = row.insertCell(1);
                const cellMethod = row.insertCell(2);
                cellMethod.style.textAlign = "center";
                const cellStatus = row.insertCell(3);
                cellStatus.style.textAlign = "center";
                const cellDuration = row.insertCell(4);
                cellDuration.style.textAlign = "center";

                let t = parseTraceInfo(trace);

                cellTS.textContent = t.ts;
                cellEP.textContent = t.ep;
                cellMethod.textContent = t.method;
                cellStatus.textContent = t.status;
                cellDuration.textContent = t.duration.toFixed(3);

                row.trace = trace;
                row.onclick = function () {
                    const popup = document.getElementById("tracePopup");
                    popup.firstChild.nodeValue = JSON.stringify(this.trace, null, 2);
                    const popupOverlay = document.getElementById("popupOverlay");
                    popupOverlay.style.visibility = "visible";
                    popupOverlay.style.opacity = 1;
                };
            });
        }

        function sortTable(column) {
            const table = document.getElementById('apiTable');
            let rows, switching, i, x, y, shouldSwitch;
            switching = true;
            // Loop until no switching has been done:
            while (switching) {
                switching = false;
                rows = table.rows;
                // Loop through all table rows (except the first, which contains table headers):
                for (i = 1; i < (rows.length - 1); i++) {
                    shouldSwitch = false;
                    // Get the two elements you want to compare, one from current row and one from the next:
                    x = rows[i].getElementsByTagName("TD")[column];
                    y = rows[i + 1].getElementsByTagName("TD")[column];
                    // Check if the two rows should switch place:
                    if (x.textContent.toLowerCase() > y.textContent.toLowerCase()) {
                        shouldSwitch = true;
                        break;
                    }
                }
                if (shouldSwitch) {
                    // If a switch has been marked, make the switch and mark that a switch has been done:
                    rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                    switching = true;
                }
            }
        }

        function hidePopup() {
            const popupOverlay = document.getElementById("popupOverlay");
            popupOverlay.style.visibility = "hidden";
            popupOverlay.style.opacity = 0;
        }

        window.onload = parsePath();
    </script>



    <div id="popupOverlay" class="overlay">
        <div class="popup">
            <pre id="tracePopup">
            "attributes": {
                "http": {
                  "url": "http://localhost:3000/api/v1/test",
                  "host": "localhost:3000",
                  "method": "GET",
                  "scheme": "http",
                  "target": "/api/v1/test",
                  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
                  "flavor": "1.1",
                  "status_code": 304,
                  "status_text": "NOT MODIFIED"
                },
                "net": {
                  "host": {
                    "name": "localhost",
                    "ip": "::1",
                    "port": 3000
                  },
                  "transport": "ip_tcp",
                  "peer": {
                    "ip": "::1",
                    "port": 58101
                  }
                }
              },
              "links": {
                
              },
              "events": {
                
              },
              "_droppedAttributesCount": 0,
              "_droppedEventsCount": 0,
              "_droppedLinksCount": 0,
              "status": {
                "code": 0
              },
              "endTime": {
                "0": 1724019619,
                "1": 414126300
              },
              "_ended": true,
              "_duration": {
                "0": 0,
                "1": 2126300
              },
              "name": "GET",
              "_spanContext": {
                "traceId": "ee70c9a937bbf95940a8971dc96077b3",
                "spanId": "4fe34ee075253ecb",
                "traceFlags": 1
              },
              "kind": 1,
              "_performanceStartTime": 40561.097599983215,
              "_performanceOffset": -8.425537109375,
              "_startTimeProvided": false,
              "startTime": {
                "0": 1724019619,
                "1": 412000000
              },
              "resource": {
                "_attributes": {
                  "service": {
                    "name": "unknown_service:node"
                  },
                  "telemetry": {
                    "sdk": {
                      "language": "nodejs",
                      "name": "opentelemetry",
                      "version": "1.22.0"
                    }
                  },
                  "process": {
                    "pid": 23128,
                    "executable": {
                      "name": "npm",
                      "path": "C:\\Program Files\\nodejs\\node.exe"
                    },
                    "command_args": {
                      "0": "C:\\Program Files\\nodejs\\node.exe",
                      "1": "C:\\Personal\\ISA\\telemetry\\ot-ui-poc\\index"
                    },
                    "runtime": {
                      "version": "14.21.3",
                      "name": "nodejs",
                      "description": "Node.js"
                    },
                    "command": "C:\\Personal\\ISA\\telemetry\\ot-ui-poc\\index",
                    "owner": "manol"
                  }
                },
                "asyncAttributesPending": false,
                "_syncAttributes": {
                  "service": {
                    "name": "unknown_service:node"
                  },
                  "telemetry": {
                    "sdk": {
                      "language": "nodejs",
                      "name": "opentelemetry",
                      "version": "1.22.0"
                    }
                  }
                },
                "_asyncAttributesPromise": {
                  
                }
              },
              "instrumentationLibrary": {
                "name": "@opentelemetry/instrumentation-http",
                "version": "0.51.0"
              },
              "_spanLimits": {
                "attributeValueLengthLimit": null,
                "attributeCountLimit": 128,
                "linkCountLimit": 128,
                "eventCountLimit": 128,
                "attributePerEventCountLimit": 128,
                "attributePerLinkCountLimit": 128
              },
              "_attributeValueLengthLimit": null,
              "_spanProcessor": "oas-telemetry skips this field to avoid circular reference",
              "_id": "f2989F2IDm3uSfml"
        </pre>
            <a class="close" href="#" onclick="hidePopup()">&times;</a>
        </div>
    </div>

</body>

</html>`
    };
}
