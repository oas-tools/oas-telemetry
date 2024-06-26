export default function ui(){
    /*
        Sources: 
            ui/detail.html
            ui/main.html

        Parsing:
            ` --> \`
            $ --> \$
    */

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
            th, td {
                border: 1px solid #dddddd;
                padding: 8px;
                text-align: left;
                cursor: pointer;
            }
            th {
                background-color: #f2f2f2;
            }
            #telemetryStatusSpan {
                color:rgb(0, 123, 6);
                font-size: x-small;
            }
        </style>
        </head>
        <body>
        <h1>Telemetry <span id="telemetryStatusSpan"></span></h1>
        <table id="apiTable">
            <thead>
                <tr>
                    <th onclick="sortTable(0)">Path</th>
                    <th onclick="sortTable(1)">Method</th>
                    <th onclick="sortTable(2)">Status</th>
                    <th onclick="sortTable(3)">Description</th>
                    <th onclick="sortTable(4)" style="text-align: center;">Request <br>Count</th>
                    <th onclick="sortTable(5)" style="text-align: center;">Average response time<br> (sec)</th>
                    
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table>
        <br/>
        <button onclick="fetch('/telemetry/start');loadTelemetryStatus();">Start</button>
        <button onclick="fetch('/telemetry/stop');loadTelemetryStatus();">Stop</button>
        <button onclick="fetch('/telemetry/reset');loadTelemetryStatus();">Reset</button>
        <script>
        
        let LOG=false;
        
        function log(s){
            if(LOG)
                console.log(s);
        }
        
        async function fetchSpec() {
          try {
            const response = await fetch("/telemetry/spec");
            if (!response.ok) {
              throw new Error("ERROR getting the Spec");
            }
            apiSpec = await response.json();
            loadAPISpec(apiSpec); 
            loadTelemetryStatus();
          } catch (error) {
            console.error("ERROR getting the Spec :", error);
          }
        }
        
        async function loadTelemetryStatus(){
            log("TEST");
            const tss = document.getElementById("telemetryStatusSpan");
            const response = await fetch("/telemetry/status");
            if (!response.ok) {
              throw new Error("ERROR getting the Status");
              return;
            }
            tStatus = await response.json();
        
            log(tStatus);
            if(tStatus.active){
                tss.textContent = "active";
                tss.style.color = "#009900";
            }
            else{
                tss.textContent = "stoped";
                tss.style.color = "#666666";
            }
        
        }
        
        
        
        function getPathRegEx(path){
            let pathComponents = path.split("/");
            let pathRegExpStr = "^"
        
            pathComponents.forEach(c =>{
                if(c != "") {
                    pathRegExpStr += "/";
                    if(c.charAt(0) == "{" && c.charAt(c.length-1) == "}"){
                        pathRegExpStr += "(.*)";
                    }else{
                        pathRegExpStr += c;
                    }
                }
            });
            
            pathRegExpStr += "\$";
        
            return new RegExp(pathRegExpStr);
        }
        
        
        async function fetchTracesByParsing(path,method,status) {
            try {
                log(\`Fetchig traces for <\${path}> - \${method} - \${status},.. \`);
        
                const response = await fetch("/telemetry/list");
        
                if (!response.ok) {
                throw new Error("ERROR getting the Traces.");
                }
        
                const responseJSON = await response.json();
                const traces = responseJSON.spans;
        
                log(\`Feched \${traces.length} traces.\`);
                //log(\`First trace: \${JSON.stringify(traces[0],null,2)}\`);
                
                return traces.filter((t)=>{
                    return (
                        (getPathRegEx(path).test(t.attributes.http_dot_target)) &&
                        (t.attributes.http_dot_method.toUpperCase().includes(method.toUpperCase())) &&
                        (t.attributes.http_dot_status_code == status) 
                    );
                });
        
            } catch (error) {
                console.error("ERROR getting the Traces :", error);
            }
        }
        function calculateTiming(startSecInput,startNanoSecInput,endSecInput,endNanoSecInput,precision = 3){
            // Default precision 3 = miliseconds
        
            let startSec= parseFloat(startSecInput)
            let startNanoSec= parseFloat(startNanoSecInput)
            let endSec= parseFloat(endSecInput)
            let endNanoSec= parseFloat(endNanoSecInput)
        
            let startNanoSecParsed = parseFloat("0."+startNanoSec);
            let endNanoSecParsed = parseFloat("0."+endNanoSec);
        
            let preciseStart = parseFloat(startSec + startNanoSecParsed);
            let preciseEnd = parseFloat(endSec + endNanoSecParsed);
            let preciseDuration = parseFloat(preciseEnd-preciseStart);
        
            let startDate = new Date(preciseStart.toFixed(precision)*1000);
            let startTS = startDate.toISOString();
        
            let endDate = new Date(preciseEnd.toFixed(precision)*1000);
            let endTS = endDate.toISOString();
        
            return {
                preciseStart: preciseStart,
                preciseEnd : preciseEnd,
                preciseDuration : preciseDuration,
                start : parseFloat(preciseStart.toFixed(precision)),
                end: parseFloat(preciseEnd.toFixed(precision)),
                duration : parseFloat(preciseDuration.toFixed(precision)),
                startDate: startDate,
                endDate: endDate,
                startTS :startTS,
                endTS: endTS
            };
        
        }
        
        function parseTraceInfo(t){
            const ep = t.attributes.http_dot_target;
            const method = t.attributes.http_dot_method.toLowerCase();
            const status = t.attributes.http_dot_status_code;
           
            const timing = calculateTiming(t.startTime[0],t.startTime[1],t.endTime[0],t.endTime[1]);
        
            log(\`\${timing.startTS} - \${timing.endTS} - \${t._spanContext.traceId} - \${t.name} - \${ep} - \${status} - \${timing.duration}\`);
            return {
                ts : timing.startTS,
                ep: ep,
                method: method,
                status: status,
                duration: timing.duration
            };
        }
        
        async function loadStats(path,method,status,cellRequestCount,cellAverageResponseTime){
            let traces = await fetchTracesByParsing(path,method,status);
            let requestCount = traces.length;
            let averageResponseTime = 0;
            
            traces.forEach(trace=>{
                t = parseTraceInfo(trace);
                log(JSON.stringify(t,null,2));
                averageResponseTime += parseFloat(t.duration);
                log(\`averageResponseTime += t.duration --> \${averageResponseTime} += \${ t.duration }\`);
            });
        
        
            averageResponseTime = averageResponseTime / requestCount;
        
            log(\`averageResponseTime = averageResponseTime / requestCount --> \${averageResponseTime} = \${averageResponseTime} / \${requestCount}\`);
        
            cellRequestCount.textContent = requestCount;
            cellAverageResponseTime.textContent = requestCount? averageResponseTime.toFixed(3):"--";
        
            setTimeout(loadStats,2000,path,method,status,cellRequestCount,cellAverageResponseTime);
                            
        }
        
        function loadAPISpec(apiSpec) {
        
            const tableBody = document.getElementById('apiTable').getElementsByTagName('tbody')[0];
            Object.keys(apiSpec.paths).forEach(path => {
                Object.keys(apiSpec.paths[path]).forEach(method => {
                    Object.keys(apiSpec.paths[path][method].responses).forEach(responseType => {
                        if(!Number.isNaN(parseInt(responseType))){
                            const row = tableBody.insertRow();
                            const cellPath = row.insertCell(0);
                            const cellMethod = row.insertCell(1);
                            const cellStatus = row.insertCell(2);
                            const cellDescription = row.insertCell(3);
                            const cellRequestCount = row.insertCell(4);
                            cellRequestCount.style="text-align: center;"
                            const cellAverageResponseTime = row.insertCell(5);
                            cellAverageResponseTime.style.textAlign = "center";
                            
                            cellPath.textContent = path;
                            cellMethod.textContent = method.toUpperCase();
                            cellStatus.textContent = responseType;
                            cellDescription.textContent =   apiSpec.paths[path][method].summary 
                                                        + " - " 
                                                        + apiSpec.paths[path][method].responses[responseType].description;
        
        
                            loadStats(path,method.toLowerCase(),responseType,cellRequestCount,cellAverageResponseTime);
                            setTimeout(loadStats,1000,path,method.toLowerCase(),responseType,cellRequestCount,cellAverageResponseTime);
                            
                            
                            row.detailPath = \`/telemetry/detail/\${responseType}/\${method.toLowerCase()}\${path}\`;
                            row.onclick = function(){
                                window.location.href = this.detailPath;
                            };
                        }
                    });
                });
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
        
        window.onload = fetchSpec();
        </script>
        </body>
        </html>        
        `,
        detail:`

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
            th, td {
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
                background: rgba(255,255,255,0.2);
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
        
        let traceCount=-1;
        let LOG=false;
        
        function log(s){
            if(LOG)
                console.log(s);
        }
        
        function parsePath() {
        
            let detailPath = window.location.pathname.split("/");
        
            if(detailPath.length < 6 || detailPath[5] == ""){
                alert("Wrong invocation params");
                return;
            }
            
            let status = parseInt(detailPath[3]);
            
            if(Number.isNaN(status))
                status = -1;
        
            const method = detailPath[4];
            
        
            const path = decodeURI("/"+ detailPath
                                        .splice(5,detailPath.length-5)
                                        .filter(c=>(c != ""))
                                        .join("/"));
        
            headingObj = document.getElementById('heading');
            headingObj.textContent = \`Telemetry for \${path} - \${method} - \${status} \`;
            fetchTracesByParsing(path,method,status);
        }
        
        function getSearchQuery(path,method,status){
            let pathComponents = path.split("/");
            let pathRegex = "^"
        
            pathComponents.forEach(c =>{
                if(c != "") {
                    pathRegex += "/";
                    if(c.charAt(0) == "{" && c.charAt(c.length-1) == "}"){
                        pathRegex += "(.*)";
                    }else{
                        pathRegex += c;
                    }
                }
            });
            
            pathRegex += "\$";
        
            return {
                "attributes.http_dot_target" : { \$regex: new RegExp(pathRegex)},
                "name" : method.toUpperCase(),
                "attributes.http_dot_status_code" : status    
            };
        }
        
        async function fetchTracesByFinding(path,method,status) {
            try {
                const response = await fetch("/telemetry/find",{
                method: 'POST',
                headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({a: 1, b: 'Textual content'})
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
        
        function getPathRegEx(path){
            let pathComponents = path.split("/");
            let pathRegExpStr = "^"
        
            pathComponents.forEach(c =>{
                if(c != "") {
                    pathRegExpStr += "/";
                    if(c.charAt(0) == "{" && c.charAt(c.length-1) == "}"){
                        pathRegExpStr += "(.*)";
                    }else{
                        pathRegExpStr += c;
                    }
                }
            });
            
            pathRegExpStr += "\$";
        
            return new RegExp(pathRegExpStr);
        }
        
        async function fetchTracesByParsing(path,method,status) {
            try {
                log(\`Fetchig traces for <\${path}> - \${method} - \${status},.. \`);
        
                const response = await fetch("/telemetry/list");
        
                if (!response.ok) {
                throw new Error("ERROR getting the Traces.");
                }
        
                const responseJSON = await response.json();
                const traces = responseJSON.spans;
        
                log(\`Feched \${traces.length} traces.\`);
                //log(\`First trace: \${JSON.stringify(traces[0],null,2)}\`);
                let filteredTraces = traces.filter((t)=>{
                        return (
                            (getPathRegEx(path).test(t.attributes.http_dot_target)) &&
                            (t.attributes.http_dot_method.toUpperCase().includes(method.toUpperCase())) &&
                            (t.attributes.http_dot_status_code == status) 
                        );
                })
                
                if(filteredTraces.length != traceCount){
                    loadTraces(filteredTraces);
                    traceCount = filteredTraces.length;
                }
        
                setTimeout(fetchTracesByParsing,1000,path,method,status);
        
            } catch (error) {
                console.error("ERROR getting the Traces :", error);
            }
        }
        
        function calculateTiming(startSecInput,startNanoSecInput,endSecInput,endNanoSecInput,precision = 3){
            // Default precision 3 = miliseconds
        
            let startSec= parseFloat(startSecInput)
            let startNanoSec= parseFloat(startNanoSecInput)
            let endSec= parseFloat(endSecInput)
            let endNanoSec= parseFloat(endNanoSecInput)
        
            let startNanoSecParsed = parseFloat("0."+startNanoSec);
            let endNanoSecParsed = parseFloat("0."+endNanoSec);
        
            let preciseStart = parseFloat(startSec + startNanoSecParsed);
            let preciseEnd = parseFloat(endSec + endNanoSecParsed);
            let preciseDuration = parseFloat(preciseEnd-preciseStart);
        
            let startDate = new Date(preciseStart.toFixed(precision)*1000);
            let startTS = startDate.toISOString();
        
            let endDate = new Date(preciseEnd.toFixed(precision)*1000);
            let endTS = endDate.toISOString();
        
            return {
                preciseStart: preciseStart,
                preciseEnd : preciseEnd,
                preciseDuration : preciseDuration,
                start : parseFloat(preciseStart.toFixed(precision)),
                end: parseFloat(preciseEnd.toFixed(precision)),
                duration : parseFloat(preciseDuration.toFixed(precision)),
                startDate: startDate,
                endDate: endDate,
                startTS :startTS,
                endTS: endTS
            };
        
        }
        
        function parseTraceInfo(t){
            const ep = t.attributes.http_dot_target;
            const method = t.attributes.http_dot_method.toLowerCase();
            const status = t.attributes.http_dot_status_code;
           
            const timing = calculateTiming(t.startTime[0],t.startTime[1],t.endTime[0],t.endTime[1]);
        
            log(\`\${timing.startTS} - \${timing.endTS} - \${t._spanContext.traceId} - \${t.name} - \${ep} - \${status} - \${timing.duration}\`);
            return {
                ts : timing.startTS,
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
                row.onclick = function() { 
                    const popup = document.getElementById("tracePopup");
                    popup.firstChild.nodeValue = JSON.stringify(this.trace,null,2);
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
        
        function hidePopup(){
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
            "http_dot_url": "http://localhost:3000/api/v1/test/unknown",
            "http_dot_host": "localhost:3000",
            "net_dot_host_dot_name": "localhost",
            "http_dot_method": "GET",
            "http_dot_scheme": "http",
            "http_dot_target": "/api/v1/test/unknown",
            "http_dot_user_agent": "curl/7.68.0",
            "http_dot_flavor": "1.1",
            "net_dot_transport": "ip_tcp",
            "net_dot_host_dot_ip": "::ffff:127.0.0.1",
            "net_dot_host_dot_port": 3000,
            "net_dot_peer_dot_ip": "::ffff:127.0.0.1",
            "net_dot_peer_dot_port": 37718,
            "http_dot_status_code": 404,
            "http_dot_status_text": "NOT FOUND"
        },
        "links": [],
        "events": [],
        "_droppedAttributesCount": 0,
        "_droppedEventsCount": 0,
        "_droppedLinksCount": 0,
        "status": {
            "code": 0
        },
        "endTime": [
            1714196017,
            860657322
        ],
        "_ended": true,
        "_duration": [
            0,
            1657322
        ],
        "name": "GET",
        "_spanContext": {
            "traceId": "7963907d7be515617050ece544ab5c9e",
            "spanId": "f5cec976b23725c5",
            "traceFlags": 1
        },
        "kind": 1,
        "_performanceStartTime": 211662.4864029996,
        "_performanceOffset": -0.596435546875,
        "_startTimeProvided": false,
        "startTime": [
            1714196017,
            859000000
        ],
        "resource": {
            "_attributes": {
                "service_dot_name": "unknown_service:/home/pafmon/.nvm/versions/node/v18.0.0/bin/node",
                "telemetry_dot_sdk_dot_language": "nodejs",
                "telemetry_dot_sdk_dot_name": "opentelemetry",
                "telemetry_dot_sdk_dot_version": "1.22.0",
                "process_dot_pid": 12568,
                "process_dot_executable_dot_name": "/home/pafmon/.nvm/versions/node/v18.0.0/bin/node",
                "process_dot_executable_dot_path": "/home/pafmon/.nvm/versions/node/v18.0.0/bin/node",
                "process_dot_command_args": [
                    "/home/pafmon/.nvm/versions/node/v18.0.0/bin/node",
                    "/home/pafmon/devel/github/ot-ui-poc/index.js"
                ],
                "process_dot_runtime_dot_version": "18.0.0",
                "process_dot_runtime_dot_name": "nodejs",
                "process_dot_runtime_dot_description": "Node.js",
                "process_dot_command": "/home/pafmon/devel/github/ot-ui-poc/index.js",
                "process_dot_owner": "pafmon"
            },
            "asyncAttributesPending": false,
            "_syncAttributes": {
                "service_dot_name": "unknown_service:/home/pafmon/.nvm/versions/node/v18.0.0/bin/node",
                "telemetry_dot_sdk_dot_language": "nodejs",
                "telemetry_dot_sdk_dot_name": "opentelemetry",
                "telemetry_dot_sdk_dot_version": "1.22.0"
            },
            "_asyncAttributesPromise": {}
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
        "_id": "3qYjJV2KdMa6zJw7"
                </pre>
                <a class="close" href="#" onclick="hidePopup()">&times;</a>
            </div>
        </div>
        
        </body>
        </html>                
        `
    }
}