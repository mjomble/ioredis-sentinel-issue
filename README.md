## Initial setup
* In `node` dir: `npm install`
* In root dir: `docker-compose build`

## Starting/stopping the cluster
* Start: `docker-compose up -d --scale replica=2 --scale sentinel=3`
* Stop: `docker-compose down`

## Executing the test
* The cluster must be running
* In one terminal, start the client script: `docker-compose run --rm nodejs node node/client.js`
* Note the IP of the current master that SentinelConnector resolves
  * Alternatively, get it via `docker-compose exec sentinel redis-cli -p 26379 sentinel get-master-addr-by-name mymaster`
* Wait for it to make a few requests
* In another terminal, initiate failover: `docker-compose exec redis-cli redis-cli -h <ip of current master> debug sleep 30`
  * Be sure to replace the IP parameter
* The client script should detect the failover in 6-8 seconds and reconnect
* Stop the client script
* Comment out the `await listenForMasterSwitch(sentinels, client)` line (in `node/client.js`)
* Restart the client script
* Initiate failover again, but with the new master IP
* The client script should lose connection for 30 seconds, send a few requests to the old master and then reconnect to the new one
  * If a larger number than 30 is used in the failover command, the connection will be lost for longer
  * But with `listenForMasterSwitch`, the delay seems related only to the sentinel's `down-after-milliseconds` setting, which in this repo is 5000
