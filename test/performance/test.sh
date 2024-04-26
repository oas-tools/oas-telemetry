echo "----------- 1 ---------"
node ks-api/index.js &  
echo "----------- 1b ---------"
node test "test 1" 1 5 100 1000 1000 && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`
echo "----------- 2 ---------"
node ks-api/index.js &  
echo "----------- 2b ---------"
node test "test 2" 1 5 100 1000 1000 && kill -9 `ps ax | grep node | grep -v grep | awk '{print $1}'`
