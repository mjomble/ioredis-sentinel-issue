process.env.DEBUG = 'ioredis:SentinelConnector'

const dns = require('dns')

const Redis = require('ioredis')

// Avoid hanging on Ctrl-C when running via docker-compose
process.on('SIGINT', () => process.exit())

const run = async () => {
  const ips = await getIps()
  printIps(ips)

  const sentinels = [
    { host: ips.sentinel_1, port: 26379 },
    { host: ips.sentinel_2, port: 26379 },
    { host: ips.sentinel_3, port: 26379 },
  ]

  const client = initClient(sentinels)

  // Comment this out during the test
  await listenForMasterSwitch(sentinels, client)

  startRequests(client)
}

const getIps = async () => {
  const ips = {
    'redis-main': '',
    replica_1: '',
    replica_2: '',
    sentinel_1: '',
    sentinel_2: '',
    sentinel_3: '',
  }

  await Promise.all(Object.keys(ips).map(async (hostname) => {
    const result = await dns.promises.lookup(hostname)
    ips[hostname] = result.address
  }))

  return ips
}

const printIps = (ips) => {
  for (const [hostname, ip] of Object.entries(ips)) {
    console.log((hostname + ':').padStart(12), ip)
  }
}

const initClient = (sentinels) => {
  const client = new Redis({ sentinels, name: 'mymaster' })

  client.on('ready', () => console.log(time(), 'ready'))
  client.on('reconnecting', () => console.log(time(), 'reconnecting'))
  client.on('close', () => console.log(time(), 'close'))
  client.on('error', () => console.log(time(), 'error'))

  return client
}

const listenForMasterSwitch = async (sentinels, client) => {
  let lastMasterIp = ''
  let lastMasterPort = ''

  for (const { host, port } of sentinels) {
    const sentinelClient = new Redis({ host, port })
    await sentinelClient.subscribe('+switch-master')

    sentinelClient.on('message', (_channel, message) => {
      // message example: 'mymaster 172.26.0.4 6379 172.26.0.3 6379'
      const [masterName, oldIp, oldPort, newIp, newPort] = message.split(' ')

      // We get the same message from multiple sentinels.
      // Make sure we only disconnect once per failover.
      if (newIp !== lastMasterIp || newPort !== lastMasterPort) {
        lastMasterIp = newIp
        lastMasterPort = newPort

        // This would call stream.end() which wouldn't trigger a reconnection
        // redis.disconnect(true)

        console.log(time(), 'Got switch-master message from sentinel, disconnecting client')

        // Internal and undocumented fields and methods.
        // Not safe to use from outside ioredis.
        client.connector.stream.destroy()
      }
    })
  }
}

const startRequests = (client) => {
  let i = 0

  setInterval(async () => {
    i += 1
    const reqId = i

    console.log(time(), 'request', reqId)
    const value = await client.incr('foo')
    console.log(time(), 'response', reqId + ':', value)
  }, 5000)
}

const time = () => new Date().toISOString()

run().catch(console.error)
