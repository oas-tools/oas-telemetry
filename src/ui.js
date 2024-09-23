export default function ui() {
    return {
        main: `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OAS - Telemetry</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }

        .header {
            background-color: #333;
            color: #fff;
            padding: 20px;
            text-align: left;
            display: flex;
            justify-content: space-between;
        }

        .header h1 {
            display: inline-block;
            margin: 0;
            font-size: 24px;
        }

        .header .links {
            display: flex;
            align-items: center;
        }
        .links a {
            color: #fff;
            text-decoration: none;
            margin-left: 30px;
        }

        .page {
            margin: 0;
            padding: 0;
        }

        .panel-conainer {
            min-width: 60%;
            width: fit-content;
            margin: 20px auto;
        }
        .panel {
            background-color: #fff;
            border: 1px solid #ddd;
            margin: 10px;
            border-radius: 4px;
        }

        .panel-header {
            background-color: #f1f1f1;
            padding: 10px;
            font-weight: bold;
            cursor: pointer;
        }

        .panel-content {
            display: none;
            padding: 15px;
            
            /* items margin */
            >* {
                margin: 5px 0;
            }
            
        }
        
        .panel.open .panel-content {
            display: flex;
            flex-direction: column;
            padding: 15px;
            justify-content: center;
            align-items: center;

        }


        button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 15px;
            cursor: pointer;
            border-radius: 4px;
        }

        button:hover {
            background-color: #0056b3;
        }

        table {
            width: fit-content;
            border-collapse: collapse;
            margin: 100%;
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



        .spaced-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
        }

        .row {
            display: flex;
            align-items: center;
        }
    </style>
    <style>
        .toggle-container {
            display: flex;
            flex: none;
            width: max-content;
            align-items: center;
            margin: 10px 0;
        }

        .toggle {
            display: flex;
            align-items: center;
            min-width: 40px;
            min-height: 20px;
            border-radius: 12px;
            background-color: gray;
            position: relative;
            cursor: pointer;
            transition: background-color 0.3s;
            margin: 0 10px;
        }

        .toggle.circle {
            border-radius: 50%;
        }

        .toggle.active {
            background-color: green;
        }

        .circle-indicator {
            width: 16px;
            height: 16px;
            margin: 0px 2px;
            background-color: white;
            border-radius: 50%;
            transition: transform 0.3s;
        }

        .toggle.active .circle-indicator {
            transform: translateX(20px);
            /* Move the circle to the right when active */
        }

        .option-text {
            transition: color 0.3s;
            margin: 0 5px;
        }
    </style>
</head>

<body>

    <div class="header">
        <h1>OAS-Telemetry</h1>
        <div class="links">
            <a target="_blank" href="https://github.com/oas-tools/oas-telemetry">Documentation</a>
            <a target="_blank" href="https://www.npmjs.com/package/@oas-tools/oas-telemetry">NPM</a>
            <a target="_blank" href="https://github.com/oas-tools/oas-telemetry">GitHub</a>
        </div>
    </div>
    <div class="page">
        <div class="panel-conainer">
            <!-- Panel 1 -->
            <div class="panel open" id="panel1">
                <div class="panel-header" onclick="togglePanel('panel1')">Telemetry Management</div>
                <div class="panel-content">
                    <div class="spaced-row">
                        <div id="toggleTelemetry"></div>
                        <button onclick="fetch('/telemetry/reset');fetchTelemetryStatus();">Reset Telemetry
                            Data</button>
                    </div>
                </div>
            </div>

            <!-- Panel 2 -->
            <div class="panel open" id="panel2">
                <div class="panel-header" onclick="togglePanel('panel2')">Heap Stats</div>
                <div class="panel-content">
                    <div class="spaced-row">
                        <div id="heapAutoUpdate"></div>
                        <button onclick="populateHeapStats()">Update</button>
                    </div>
                    <table id="heapStatsTable">
                        <thead>
                            <tr>
                                <th>Stat Name</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>

                </div>
            </div>

            <!-- Panel 3 -->
            <div class="panel no-user-select open" id="panel3">
                <div class="panel-header" onclick="togglePanel('panel3')">Telemetry Endpoints</div>
                <div class="panel-content">
                    <div class="spaced-row">
                        <div id="autoUpdateApiTable"></div>
                    </div>

                    <table id="apiTable">
                        <thead>
                            <tr>
                                <th onclick="sortTable(0)">Path</th>
                                <th onclick="sortTable(1)">Method</th>
                                <th onclick="sortTable(2)">Status</th>
                                <th onclick="sortTable(3)">Description</th>
                                <th onclick="sortTable(4)" style="text-align: center;">Request Count</th>
                                <th onclick="sortTable(5)" style="text-align: center;">Average response time (sec)
                                </th>
                                <th style="text-align: center;">Options</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <!-- Scripts -->
    <script>
        // Open Close Panel
        function togglePanel(panelId) {
            const panel = document.getElementById(panelId);
            panel.classList.toggle('open');
        }
        /**
         * Create a toggle component
         * @param {string} title - Title of the toggle
         * @param {string} falseText - Text to display when false
         * @param {string} falseColor - Color of the text when false
         * @param {string} trueText - Text to display when true
         * @param {string} trueColor - Color of the text when true
         * @param {function} handler - Function to call when the toggle is clicked
         * @param {boolean} defaultValue - Default value of the toggle
         * @returns {HTMLDivElement} - The toggle component
         */
        function createToggle(title, falseText, falseColor, trueText, trueColor, handler, defaultValue = false) {
            const container = document.createElement('div');
            container.className = 'toggle-container';

            const label = document.createElement('span');
            label.textContent = title + ':';
            label.style.marginRight = '10px';

            const falseTextSpan = document.createElement('span');
            falseTextSpan.className = 'option-text';
            falseTextSpan.textContent = falseText;
            falseTextSpan.style.color = defaultValue ? 'gray' : falseColor;

            const toggle = document.createElement('div');
            toggle.className = 'toggle';
            const circleIndicator = document.createElement('div');
            circleIndicator.className = 'circle-indicator';
            toggle.appendChild(circleIndicator);

            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
                const isActive = toggle.classList.contains('active');

                // Update colors. Not selected option to default color, selected option to active color
                falseTextSpan.style.color = isActive ? 'gray' : falseColor;
                trueTextSpan.style.color = isActive ? trueColor : 'gray';

                handler(isActive);
            });
            toggle.classList.toggle('active', defaultValue);

            const trueTextSpan = document.createElement('span');
            trueTextSpan.className = 'option-text';
            trueTextSpan.textContent = trueText; // Always display trueText
            trueTextSpan.style.color = defaultValue ? trueColor : 'gray';

            container.appendChild(label);
            container.appendChild(falseTextSpan);
            container.appendChild(toggle);
            container.appendChild(trueTextSpan);

            return container;
        }

        const localStorageManager = {
            get: (key) => {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : null;
            },
            set: (key, value) => {
                localStorage.setItem(key, JSON.stringify(value));
            }
        };

    </script>
    <script>
        let LOG = true;


        let intervalTimer = {
            disabled: true,
            period: 2000,
            subscribers: [],
            start: function () {
                this.disabled = false;
                this.interval = setInterval(() => this.tick(), this.period);
                log("interval started with period: " + this.period);
            },
            stop: function () {
                this.disabled = true;
                clearInterval(this.interval);
                log("interval stopped");
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

        async function fetchTelemetryStatus() {
            const response = await fetch("/telemetry/status");
            if (!response.ok) {
                throw new Error("ERROR getting the Status");
                return false;
            }
            tStatus = await response.json();

            log("tStatus: " + JSON.stringify(tStatus, null, 2));
            return tStatus.active;
        }

        function getPathRegEx(path) {
            let pathComponents = path.split("/");
            let pathRegExpStr = "^"

            pathComponents.forEach(c => {
                if (c != "") {
                    pathRegExpStr += "/";
                    if (c.charAt(0) == "{" && c.charAt(c.length - 1) == "}") {
                        // Ensure it matches at least one character (.+)
                        pathRegExpStr += "(.+)";
                    } else {
                        pathRegExpStr += c;
                    }
                }
            });

            // Allow an optional trailing slash
            pathRegExpStr += "/?\$";

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

        }

        async function populateApiTable() {
            const apiSpec = await fetchSpec()
            const tableBody = document.getElementById('apiTable').getElementsByTagName('tbody')[0];
            tableBody.innerHTML = "";
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
                            const cellOptions = row.insertCell(6);


                            // Create a button for updating the endpoint spaced row but centered
                            const updateButton = document.createElement('button');
                            updateButton.textContent = "Update";
                            updateButton.onclick = () => loadStats(path, method, responseType, cellRequestCount, cellAverageResponseTime);
                            cellOptions.appendChild(updateButton);
                            cellOptions.style.display = "flex";
                            cellOptions.style.justifyContent = "center";
                            loadStats(path, method, responseType, cellRequestCount, cellAverageResponseTime);

                        }
                    });
                });
            });
        }

        function populateHeapStats() {
            // heapstats at /telemetry/heapstats
            const tableBody = document.getElementById('heapStatsTable').getElementsByTagName('tbody')[0];
            fetch('/telemetry/heapstats').then(response => response.json()).then(heapStats => {
                tableBody.innerHTML = "";
                Object.keys(heapStats).forEach(statName => {
                    const row = tableBody.insertRow();
                    const cellStatName = row.insertCell(0);
                    const cellValue = row.insertCell(1);
                    cellStatName.textContent = statName;
                    //format always to 3 decimals (if number)
                    const formattedValue = typeof heapStats[statName] === 'number' ? heapStats[statName].toFixed(3) : heapStats[statName];
                    cellValue.textContent = heapStats[statName];
                    cellValue.style.textAlign = "right";
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

        document.getElementById('toggleTelemetry').appendChild(createToggle(
            'Telemetry status',
            'Stopped', 'red', // false state
            'Active', 'green', // true state
            async (status) => {
                const response = await fetch('/telemetry/' + (status ? 'start' : 'stop'));
                if (!response.ok) {
                    throw new Error("ERROR setting the Telemetry status");
                }
            }
        ));

        document.getElementById('autoUpdateApiTable').appendChild(createToggle(
            'Auto Update',
            'Manual', 'orange', // false state
            'Auto', 'green', // true state
            (status) => {
                const callback = () => { populateApiTable(); };
                if (status) {
                    intervalTimer.subscribe(callback);
                } else {
                    intervalTimer.unsubscribe(callback);
                }
            }
        ));

        document.getElementById('heapAutoUpdate').appendChild(createToggle(
            'Auto Update',
            'Manual', 'orange', // false state
            'Auto', 'green', // true state
            (status) => {
                if (status) {
                    intervalTimer.subscribe(populateHeapStats);
                } else {
                    intervalTimer.unsubscribe(populateHeapStats);
                }
            }
        ));

        window.onload = async function () {
            document.getElementById('autoUpdateApiTable').querySelector('.toggle').classList.toggle('active', localStorageManager.get('autoUpdateApiTable'));
            const activeTelemetry = await fetchTelemetryStatus();
            document.getElementById('toggleTelemetry').querySelector('.toggle').classList.toggle('active', activeTelemetry);
            populateApiTable();
            populateHeapStats();
            intervalTimer.start();
        };
    </script>
</body>

</html>`,
        detail: `<!DOCTYPE html>
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
                        // Ensure it matches at least one character (.+)
                        pathRegExpStr += "(.+)";
                    } else {
                        pathRegExpStr += c;
                    }
                }
            });

            // Allow an optional trailing slash
            pathRegExpStr += "/?\$";

            return pathRegExpStr;
        }

        async function fetchTracesByParsing(path, method, status) {
            try {
                log(\`Fetchig traces for <\${path}> - \${method} - \${status},.. \`);

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

                if (traces.length != traceCount) {
                    loadTraces(traces);
                    traceCount = traces.length;
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
