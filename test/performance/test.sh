echo "Preparing test environment"
# Original file name
original_file="template.csv"

# New file name
new_file="output.csv"

# Copy the original file to the new filename
cp "$original_file" "$new_file"
# Kill all node processes before starting the tests
kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`

cd ks-api && npm i && cd .. 


concurrentUsers=1
requests=200
# divide by 3 to simulate the time it takes to stop the telemetry
requestsForStop=$((requests / 3))
requestDelay=100 # 100ms independent of the problem size

# Problem size of ks-api. The bigger the problem size, the longer the response time
problemSizeA_ONES=13
problemSizeA_TENS=6000
problemSizeA_HUNDREDS=88000

problemSizeB_ONES=$problemSizeA_ONES
problemSizeB_TENS=$problemSizeA_TENS
problemSizeB_HUNDREDS=$problemSizeA_HUNDREDS


-----------------------------------------------------------------------------------------------
echo "NO TELEMETRY (control group) tests starting..." 

echo "----------- 1 (ONES of ms in response)---------"
for i in {1..5}
do
    node ks-api/index.js &  
    curl http://localhost:8080/ ## Wait for the server to start
    node test "NO_TLM ONES $i" $concurrentUsers $requests $requestDelay $problemSizeA_ONES $problemSizeB_ONES && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`
done

echo "----------- 2 (TENS of ms in response)---------"

for i in {1..5}
do
    node ks-api/index.js & 
    curl http://localhost:8080/ ## Wait for the server to start
    node test "NO_TLM TENS $i" $concurrentUsers $requests $requestDelay $problemSizeA_TENS $problemSizeB_TENS && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`
done


echo "----------- 3 (HUNDREDS of ms in response)---------"
for i in {1..5}
do
    node ks-api/index.js &  
    curl http://localhost:8080/ ## Wait for the server to start
    node test "NO_TLM HUNDREDS $i" $concurrentUsers $requests $requestDelay $problemSizeA_HUNDREDS $problemSizeB_HUNDREDS && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`
done


#-----------------------------------------------------------------------------------------------
echo "TELEMETRY ACTIVATED tests starting..."

echo "----------- 1 (ONES of ms in response)---------"
for i in {1..5}
do
    node ks-api/indexTelemetry.js &
    curl http://localhost:8080/ ## Wait for the server to start
    node test "TLM ONES $i" $concurrentUsers $requests $requestDelay $problemSizeA_ONES $problemSizeB_ONES && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`
done

echo "----------- 2 (TENS of ms in response)---------"
for i in {1..5}
do
    node ks-api/indexTelemetry.js &  
        curl http://localhost:8080/ ## Wait for the server to start
    node test "TLM TENS $i" $concurrentUsers $requests $requestDelay $problemSizeA_TENS $problemSizeB_TENS && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`
done

echo "----------- 3 (HUNDREDS of ms in response)---------"
for i in {1..5}
do
    node ks-api/indexTelemetry.js &  
    curl http://localhost:8080/ ## Wait for the server to start
    node test "TLM HUNDREDS $i" $concurrentUsers $requests $requestDelay $problemSizeA_HUNDREDS $problemSizeB_HUNDREDS && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`
done

#-----------------------------------------------------------------------------------------------
echo "TELEMETRY ACTIVATED but stopped tests starting..."

echo "----------- 1 (ONES of ms in response)---------"
for i in {1..5}
do
  node ks-api/indexTelemetry.js & 
    curl http://localhost:8080/ ## Wait for the server to start
    node test "TLM_STOPPED BEFORE_STOP ONES $i" $concurrentUsers $requestsForStop $requestDelay $problemSizeA_ONES $problemSizeB_ONES 

    curl http://localhost:8080/telemetry/stop
    node test "TLM_STOPPED WHILE_STOP ONES $i" $concurrentUsers $requestsForStop $requestDelay $problemSizeA_ONES $problemSizeB_ONES 
    
    curl http://localhost:8080/telemetry/start
    node test "TLM_STOPPED AFTER_STOP ONES $i" $concurrentUsers $requestsForStop $requestDelay $problemSizeA_ONES $problemSizeB_ONES && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`
done

echo "----------- 2 (TENS of ms in response)---------"
for i in {1..5}
do
    node ks-api/indexTelemetry.js & 
    curl http://localhost:8080/ ## Wait for the server to start
    node test "TLM_STOPPED BEFORE_STOP TENS $i" $concurrentUsers $requestsForStop $requestDelay $problemSizeA_TENS $problemSizeB_TENS 

    curl http://localhost:8080/telemetry/stop
    node test "TLM_STOPPED WHILE_STOP TENS $i" $concurrentUsers $requestsForStop $requestDelay $problemSizeA_TENS $problemSizeB_TENS 
    
    curl http://localhost:8080/telemetry/start
    node test "TLM_STOPPED AFTER_STOP TENS $i" $concurrentUsers $requestsForStop $requestDelay $problemSizeA_TENS $problemSizeB_TENS && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`
done

echo "----------- 3 (HUNDREDS of ms in response)---------"
for i in {1..5}
do
    node ks-api/indexTelemetry.js & 
    curl http://localhost:8080/ ## Wait for the server to start
    node test "TLM_STOPPED BEFORE_STOP HUNDREDS $i" $concurrentUsers $requestsForStop $requestDelay $problemSizeA_HUNDREDS $problemSizeB_HUNDREDS 

    curl http://localhost:8080/telemetry/stop
    node test "TLM_STOPPED WHILE_STOP HUNDREDS $i" $concurrentUsers $requestsForStop $requestDelay $problemSizeA_HUNDREDS $problemSizeB_HUNDREDS 
    
    curl http://localhost:8080/telemetry/start
    node test "TLM_STOPPED AFTER_STOP HUNDREDS $i" $concurrentUsers $requestsForStop $requestDelay $problemSizeA_HUNDREDS $problemSizeB_HUNDREDS && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`
done
#-----------------------------------------------------------------------------------------------
echo "LONG DURATION TESTS (30min) WITHOUT TELEMETRY (control group) tests starting..."
# Total test time 30 minutes, divided in 10 tests of 3 minutes each. 100ms per request. 3 minutes = 180s = 180000ms =  100ms * 1800 requests
requests=1800
echo "----------- 1 (ONES of ms in response)---------"
node ks-api/index.js & #Starts only once, but a new line is created in the csv file for each test (10 tests)
curl http://localhost:8080/ ## Wait for the server to start
for i in {1..9}
do
    node test "NO_TLM LONG_30m ONES $i" $concurrentUsers $requests $requestDelay $problemSizeA_ONES $problemSizeB_ONES 
done # ONLY the last test should kill the process when it finishes
node test "NO_TLM LONG_30m ONES $i" $concurrentUsers $requests $requestDelay $problemSizeA_ONES $problemSizeB_ONES  && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`

echo "----------- 2 (TENS of ms in response)---------"
node ks-api/index.js & #Starts only once, but a new line is created in the csv file for each test (10 tests)
curl http://localhost:8080/ ## Wait for the server to start
for i in {1..9}
do
    node test "NO_TLM LONG_30m TENS $i" $concurrentUsers $requests $requestDelay $problemSizeA_TENS $problemSizeB_TENS 
done
node test "NO_TLM LONG_30m TENS $i" $concurrentUsers $requests $requestDelay $problemSizeA_TENS $problemSizeB_TENS  && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`

echo "----------- 3 (HUNDREDS of ms in response)---------"
node ks-api/index.js & #Starts only once, but a new line is created in the csv file for each test (10 tests)
curl http://localhost:8080/ ## Wait for the server to start
for i in {1..9}
do
    node test "NO_TLM LONG_30m HUNDREDS $i" $concurrentUsers $requests $requestDelay $problemSizeA_HUNDREDS $problemSizeB_HUNDREDS 
done
node test "NO_TLM LONG_30m HUNDREDS $i" $concurrentUsers $requests $requestDelay $problemSizeA_HUNDREDS $problemSizeB_HUNDREDS  && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`


#-----------------------------------------------------------------------------------------------
echo "LONG DURATION TESTS (30min) WITH TELEMETRY ACTIVATED (MEMORY OVERHEAD) tests starting..."
# Total test time 30 minutes, divided in 10 tests of 3 minutes each. 100ms per request. 3 minutes = 180s = 180000ms =  100ms * 1800 requests
requests=1800
echo "----------- 1 (ONES of ms in response)---------"

node ks-api/indexTelemetry.js & #Starts only once, but a new line is created in the csv file for each test (10 tests)
curl http://localhost:8080/ ## Wait for the server to start  
for i in {1..9}
do
    node test "TLM LONG_30m ONES $i" $concurrentUsers $requests $requestDelay $problemSizeA_ONES $problemSizeB_ONES 
done # ONLY the last test should kill the process when it finishes
node test "TLM LONG_30m ONES $i" $concurrentUsers $requests $requestDelay $problemSizeA_ONES $problemSizeB_ONES  && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`

echo "----------- 2 (TENS of ms in response)---------"
node ks-api/indexTelemetry.js & #Starts only once, but a new line is created in the csv file for each test (10 tests)
curl http://localhost:8080/ ## Wait for the server to start
for i in {1..9}
do
    node test "TLM LONG_30m TENS $i" $concurrentUsers $requests $requestDelay $problemSizeA_TENS $problemSizeB_TENS 
done
node test "TLM LONG_30m TENS A" $concurrentUsers $requests $requestDelay $problemSizeA_TENS $problemSizeB_TENS  && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`

echo "----------- 3 (HUNDREDS of ms in response)---------"
node ks-api/indexTelemetry.js & #Starts only once, but a new line is created in the csv file for each test (10 tests)
curl http://localhost:8080/ ## Wait for the server to start
for i in {1..9}
do
    node test "TLM LONG_30m HUNDREDS $i" $concurrentUsers $requests $requestDelay $problemSizeA_HUNDREDS $problemSizeB_HUNDREDS 
done
node test "TLM LONG_30m HUNDREDS A" $concurrentUsers $requests $requestDelay $problemSizeA_HUNDREDS $problemSizeB_HUNDREDS  && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`





echo "Tests finished"