
//#!/usr/bin/env node

import yargs from 'yargs'
import * as streamSea from './streamSea'


const INACTIVITY_TIMEOUT = 5000
let timeout:any = null;
const postponeTimeout = () => {
  clearRunningTimeout()
  timeout = setTimeout(() => {
    console.error(`ERROR: timeout expired. No activity for more than ${INACTIVITY_TIMEOUT}ms`)
    process.exit(1)
  }, INACTIVITY_TIMEOUT)
}

const clearRunningTimeout = () => {
  if(timeout) {
    clearTimeout(timeout)
    timeout = null
  }
}

yargs.scriptName("stream-sea")
  .usage('$0 <cmd> [args]')
  .option('appId', {
    type: 'string',
    describe: 'your app id to authenticate on the remote'
  })
  .option('appSecret', {
    type: 'string',
    describe: 'your app secret to authenticate on the remote'
  })
  .option('remoteServerHost', {
    alias: 'h',
    type: 'string',
    describe: 'the hostname or IP address of the remote server'
  })
  .option('remoteServerPort', {
    alias: 'p',
    type: 'string',
    default: 443,
    describe: 'the remote server port (defaults to 443)'
  })
  .option('stream', {
    alias: 's',
    type: 'string',
    describe: 'the name of the stream'
  })
  .command('define', '(re)define a stream data schema', (yargs) => {
      
    }, async (args:any) => {
      return await streamSea.defineStream(args)
    }
  )
  .command('publish', 'Publish messages to a stream', 
    (yargs) => {
    }, 
    async (args:any) => {
      await new Promise((resolve, reject) => {
        let data = ''
        postponeTimeout()
        process.stdin.on('data', (buff:Buffer) => {
          postponeTimeout()
          data += buff.toString('utf8')
        })
        process.stdin.on('end', (buff:Buffer) => {
          clearRunningTimeout()
          args.payload = JSON.parse(data)
          streamSea.publish(args).then(resolve).catch(reject)
        })
        process.stdin.on('error', reject)
      })
      console.log('Data has been published to the remote server')
    }
  )
  .command('subscribe', 'Subscribe to a stream and print outputs to stdout', (yargs) => {
    }, streamSea.subscribe
  )
  .demandOption(['appId', 'appSecret', 'remoteServerHost', 'stream'])
  .help()
  .argv