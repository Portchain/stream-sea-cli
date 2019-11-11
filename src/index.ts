
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

const errorHandler = (err:Error) => {
  console.log(err.message)
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
  .command('define', '(re)define a stream data schema', 
    (yargs) => {
      yargs.option('stream', {
        alias: 's',
        type: 'string',
        describe: 'the name of the stream'
      }).demandOption(['description'])
    }, (args:any) => {
      streamSea.defineStream(args).catch(errorHandler)
    }
  )
  .command('publish', 'Publish messages to a stream', 
    (yargs) => {
      yargs.option('stream', {
        alias: 's',
        type: 'string',
        describe: 'the name of the stream'
      }).demandOption(['stream'])
    }, 
    (args:any) => {
      let data = ''
      if(args.data) {
        data = args.data
        streamSea.publish(args).then(() => {
          console.log('Data has been published to the remote server')
        }).catch(errorHandler)
        return;
      }
      postponeTimeout()
      process.stdin.on('data', (buff:Buffer) => {
        postponeTimeout()
        data += buff.toString('utf8')
      })
      process.stdin.on('end', (buff:Buffer) => {
        clearRunningTimeout()
        args.payload = JSON.parse(data)
        streamSea.publish(args).then(() => {
          console.log('Data has been published to the remote server')
        }).catch(errorHandler)
      })
      process.stdin.on('error', errorHandler)
    }
  )
  .command('subscribe', 'Subscribe to a stream and print outputs to stdout', 
    (yargs) => {
      yargs.option('stream', {
        alias: 's',
        type: 'string',
        describe: 'the name of the stream'
      }).demandOption(['stream'])
    }, streamSea.subscribe
  )
  .command('create-client', 'Create a new client', (yargs) => {
      yargs
        .option('description', {
          alias: 'd',
          type: 'string',
          describe: 'the name or description of the client'
        })
        .demandOption(['description'])
    }, (args:any) => {
      streamSea.createClient(args)
        .then((client) => {
          console.log('APP Identifier:', client.id)
          console.log('APP Secret:', client.secret)
        })
        .catch(errorHandler)
    }
  )
  .command('delete-client', 'Delete an existing', (yargs) => {
      yargs
        .option('clientId', {
          alias: 'c',
          type: 'string',
          describe: 'the id of the client to delete'
        })
        .demandOption(['clientId'])
    }, (args:any) => {
      streamSea.deleteClient(args)
        .then(deletedClient => {
          if(deletedClient) {
            console.log(`Client ${deletedClient.id} deleted`)
          } else {
            console.log(`ERROR: could not find client with id ${args.clientId}`)
          }
        })
        .catch(errorHandler)
    }
  )
  .command('rotate-client-secret', 'Rotate a client\'s secret', (yargs) => {
      yargs
        .option('clientId', {
          alias: 'c',
          type: 'string',
          describe: 'the id of the client to delete'
        })
        .demandOption(['clientId'])
    }, async (args:any) => {
      streamSea.rotateClientSecret(args)
        .then((client) => {
          console.log('APP Identifier:', client.id)
          console.log('APP Secret:', client.secret)
        })
        .catch(errorHandler)
    }
  )
  .demandOption(['appId', 'appSecret', 'remoteServerHost'])
  .argv