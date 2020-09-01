
//#!/usr/bin/env node

import yargs from 'yargs'
import * as streamSea from 'stream-sea-client'
import { loadInlinePayload, formatLongJSONSchema } from './payloadUtil';


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
let remoteServerClientId = process.env.STREAM_SEA_CLIENT_ID
let remoteServerClientSecret = process.env.STREAM_SEA_CLIENT_SECRET

const requiredOptions = []
if(!remoteServerClientId) {
  requiredOptions.push('clientId')
}
if(!remoteServerClientSecret) {
  requiredOptions.push('clientSecret')
}
if(!remoteServerHost) {
  requiredOptions.push('remoteServerHost')
}

const addServerConfigToArgs = (args:any) => {
  return {clientId: remoteServerClientId, clientSecret: remoteServerClientSecret, remoteServerHost, remoteServerPort, ...args}
}

yargs.scriptName("stream-sea")
  .usage('$0 <cmd> [args]')
  .option('clientId', {
    type: 'string',
    describe: 'your client id to authenticate on the remote'
  })
  .option('clientSecret', {
    type: 'string',
    describe: 'your client secret to authenticate on the remote'
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
  .option('secure', {
    alias: 't',
    type: 'boolean',
    description: 'Use TLS'
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
      const schema = formatLongJSONSchema(args.stream, loadInlinePayload(args.schema))
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
      .option('fanout', {
        alias: 'f',
        type: 'boolean',
        description: 'Fanout mode',
      })
    }, async (args:any) => {
      args = addServerConfigToArgs(args);
      console.log(args);
      const subscription = await streamSea.subscribe(args)
      subscription.on('message', (msg:any) => {
        console.log(JSON.stringify(msg))
      })
      subscription.on('error', (err:any) => console.error(err))
      subscription.on('close', () =>console.log('Connection closed'))
    }
  )
  .command('create-jail', 'Create a new jail', (yargs) => {
    yargs
      .option('id', {
        alias: 'j',
        type: 'string',
        describe: 'the ID of the new jail',
      })
      .option('client', {
        alias: 'c',
        type: 'string',
        describe: 'the ID of the client to create within the new jail',
      })
      .option('name', {
        alias: 'n',
        type: 'string',
        describe: 'the name of the new jail',
      })
      .demandOption(['id', 'name', 'client'])
  }, (programArgs: any) => {
    const args = addServerConfigToArgs({
      newJailId: programArgs.id,
      newJailName: programArgs.name,
      newClientId: programArgs.client,
    })
    streamSea.createJail(args)
      .then((jailInfo) => {
        console.log('Jail Identifier:', jailInfo.newJailId)
        console.log('Client Identifier:', jailInfo.newClientId)
        console.log('Client Secret:', jailInfo.newClientSecret)
      })
      .catch(errorHandler)
  })
  .command('delete-jail', 'Delete an existing jail', (yargs) => {
      yargs
        .option('id', {
          alias: 'j',
          type: 'string',
          describe: 'the ID of the jail to delete',
        })
        .demandOption(['id'])
    }, (programArgs: any) => {
      const args = addServerConfigToArgs({
        id: programArgs.id,
      })
      streamSea.deleteClient(args)
        .then(deletedJail => {
          console.log(`Client ${deletedJail.id} deleted`)
        })
        .catch(errorHandler)
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
          console.log('Client Identifier:', client.id)
          console.log('Client Secret:', client.secret)
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
          console.log('Client Identifier:', client.givenId)
          console.log('Client Secret:', client.secret)
        })
        .catch(errorHandler)
    }
  )
  .command('rotate-jwt', 'Rotate a client\'s JWT public key', (yargs) => {
      yargs
        .option('clientId', {
          alias: 'c',
          type: 'string',
          describe: 'the id of the client to delete'
        })
        .option('jwtPublicKey', {
          alias: 'k',
          type: 'string',
          describe: 'the JWT public key. Pass "null" to remove the JWT public key'
        })
        .demandOption(['clientId'])
        .demandOption(['jwtPublicKey'])
    }, async (args:any) => {
      if (args.jwtPublicKey == 'null'){
        args.jwtPublicKey = null
      }
      args = addServerConfigToArgs(args)
      streamSea.rotateClientJwtPublicKey(args)
        .then((response) => {
          console.log('Client Identifier:', response.givenId)
          console.log('JWT Public Key:', response.jwtPublicKey)
        })
        .catch(errorHandler)
    }
  )
  .command('svv', 'get a schema version vector', 
    (yargs) => {
      yargs.option('schemas', {
        alias: 's',
        type: 'string',
        describe: 'the name of the schemas, delimited by colons'
      })
    }, async (args: any) => {
      const svv = await streamSea.getSchemaVersionsVector({
        ...args,
        schemaNames: args.schemas.split(':'),
      })
      console.log(svv.map((x: number | null) => `${x}`).join(':'))
    })
  .demandOption(requiredOptions)
  .argv

