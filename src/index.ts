
//#!/usr/bin/env node

import yargs from 'yargs'
import * as streamSea from './streamSea'
import { loadInlinePayload, formatJSONSchema } from './payloadUtil';


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

let remoteServerHost = process.env.STREAM_SEA_HOST
let remoteServerPort = process.env.STREAM_SEA_PORT || 443
let remoteServerAppId = process.env.STREAM_SEA_APP_ID
let remoteServerAppSecret = process.env.STREAM_SEA_APP_SECRET

const requiredOptions = []
if(!remoteServerAppId) {
  requiredOptions.push('appId')
}
if(!remoteServerAppSecret) {
  requiredOptions.push('appSecret')
}
if(!remoteServerHost) {
  requiredOptions.push('remoteServerHost')
}

const addServerConfigToArgs = (args:any) => {
  return {appId: remoteServerAppId, appSecret: remoteServerAppSecret, remoteServerHost, remoteServerPort, ...args}
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
    describe: 'the remote server port (defaults to 443)'
  })
  .command('define', '(re)define a stream data schema', 
    (yargs) => {
      yargs.option('stream', {
        alias: 's',
        type: 'string',
        describe: 'the name of the stream'
      }).option('schema', {
        alias: 'm',
        type: 'string',
        describe: 'the definition of the schema. This should be a path to a JSON file or a JSON string.'
      }).demandOption(['stream', 'schema'])
    }, (args:any) => {
      // TODO support loading a definition from a file
      args = addServerConfigToArgs(args)
      const schema = formatJSONSchema(args.stream, loadInlinePayload(args.schema))
      args = {...args, ...schema}
      streamSea.defineStream(args)
        .then((response) => {
          console.log(JSON.stringify(response, null, 2))
        })
        .catch(errorHandler)
    }
  )
  .command('describe', 'fetch the latest data schema for a stream', 
    (yargs) => {
      yargs.option('stream', {
        alias: 's',
        type: 'string',
        describe: 'the name of the stream'
      }).demandOption(['stream'])
    }, (args:any) => {
      args = addServerConfigToArgs(args)
      streamSea.describeStream(args)
        .then((schema) => {
          console.log(JSON.stringify(schema, null, 2))
        })
        .catch(errorHandler)
    }
  )
  .command('publish', 'Publish messages to a stream', 
    (yargs) => {
      yargs.option('stream', {
        alias: 's',
        type: 'string',
        describe: 'the name of the stream'
      }).option('data', {
        alias: 'd',
        type: 'string',
        describe: 'the path to a JSON file or the JSON payload to publish. You can also omit this parameter and send pipe data to the command through stdin'
      }).demandOption(['stream'])
    }, 
    (args:any) => {
      let data = ''
      if(args.data) {
        args.payload = loadInlinePayload(args.data)
        args = addServerConfigToArgs(args)
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
        args = addServerConfigToArgs(args)
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
    }, async (args:any) => {
      args = addServerConfigToArgs(args);
      console.log(args);
      (await streamSea.subscribe(args))
        .on('message', (msg:any) => console.log(msg))
        .on('error', (err:any) => console.error(err))
        .on('close', () =>console.log('Connection closed'))
    }
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
      args = addServerConfigToArgs(args)
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
      args = addServerConfigToArgs(args)
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
      args = addServerConfigToArgs(args)
      streamSea.rotateClientSecret(args)
        .then((client) => {
          console.log('APP Identifier:', client.id)
          console.log('APP Secret:', client.secret)
        })
        .catch(errorHandler)
    }
  )
  .demandOption(requiredOptions)
  .argv

