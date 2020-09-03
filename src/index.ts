
//#!/usr/bin/env node

import yargs from 'yargs'
import * as streamSea from 'stream-sea-client'
import { loadInlinePayload, formatLongJSONSchema } from './payload-util';

const errorHandler = (err:Error) => {
  console.error(err.message)
}

// This represents the data structure we get from yargs
type ScriptArgs = {
  clientId: string,
  clientSecret: string,
  remoteServerHost: string,
  remoteServerPort?: string,
  secure?: boolean,
}

type NormalizedScriptArgs = {
  clientId: string,
  clientSecret: string,
  remoteServerHost: string,
  remoteServerPort: string,
  secure: boolean,
}

const normalizeScriptArgs = (args: ScriptArgs): NormalizedScriptArgs => ({
  clientId: args.clientId,
  clientSecret: args.clientSecret,
  remoteServerHost: args.remoteServerHost,
  remoteServerPort: args.remoteServerPort || '443',
  secure: !!args.secure,
})

yargs.scriptName("stream-sea")
  .usage('$0 <cmd> [args]')
  .option('clientId', {
    alias: 'i',
    type: 'string',
    describe: 'your client id to authenticate on the remote'
  })
  .option('clientSecret', {
    alias: 'j',
    type: 'string',
    describe: 'your client secret to authenticate on the remote',
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
  .demandOption(['clientId', 'clientSecret', 'remoteServerHost'])
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
    }, (commandArgs: ScriptArgs & { stream: string, schema: string }) => {
      const args = {
        ...normalizeScriptArgs(commandArgs),
        stream: commandArgs.stream,
      }
      const schema = formatLongJSONSchema(commandArgs.stream, loadInlinePayload(commandArgs.schema))
      streamSea.defineStream({...args, ...schema})
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
    }, (commandArgs: ScriptArgs & { stream: string }) => {
      const args = {
        ...normalizeScriptArgs(commandArgs),
        stream: commandArgs.stream
      }
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
      }).demandOption(['stream', 'data'])
    }, 
    (commandArgs: ScriptArgs & {stream: string, data: string}) => {
      const payload = loadInlinePayload(commandArgs.data)
      const args = {
        ...normalizeScriptArgs(commandArgs),
        stream: commandArgs.stream,
        payload,
      }
      streamSea.publish(args).then(() => {
        console.log('Data has been published to the remote server')
      }).catch(errorHandler)
    }
  )
  .command('subscribe', 'Subscribe to a stream and print outputs to stdout', 
    (yargs) => {
      yargs.option('stream', {
        alias: 's',
        type: 'string',
        describe: 'the name of the stream'
      })
      .option('fanout', {
        alias: 'f',
        type: 'boolean',
        description: 'Fanout mode',
      })
      .demandOption(['stream'])
    }, async (commandArgs: ScriptArgs & { stream: string, fanout?: boolean}) => {
      const args = {
        ...normalizeScriptArgs(commandArgs),
        stream: commandArgs.stream,
        fanout: commandArgs.fanout,
      }
      const subscription = await streamSea.subscribe(args)
      subscription.on('message', (msg: any) => {
        console.log(JSON.stringify(msg))
      })
      subscription.on('error', (err: any) => console.error(err))
      subscription.on('close', () => console.log('Connection closed'))
    }
  )
  .command('create-client', 'Create a new client', (yargs) => {
    yargs
      .option('targetClientId', {
        alias: 'c',
        type: 'string',
        describe: 'the id of the client to delete'
      })
      .option('targetClientDescription', {
        alias: 'd',
        type: 'string',
        describe: 'the name or description of the client'
      })
      .demandOption(['targetClientId', 'targetClientDescription'])
    }, (commandArgs: ScriptArgs & { targetClientId: string, targetClientDescription: string}) => {
      const args = {
        ...normalizeScriptArgs(commandArgs),
        targetClientId: commandArgs.targetClientId,
        targetClientDescription: commandArgs.targetClientDescription,
      }
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
        .option('targetClientId', {
          alias: 'c',
          type: 'string',
          describe: 'the id of the client to delete'
        })
        .demandOption(['targetClientId'])
    }, (commandArgs: ScriptArgs & { targetClientId: string}) => {
      const args = {
        ...normalizeScriptArgs(commandArgs),
        targetClientId: commandArgs.targetClientId,
      }
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
        .option('targetClientId', {
          alias: 'c',
          type: 'string',
          describe: 'the id of the client to delete'
        })
        .demandOption(['targetClientId'])
    }, async (commandArgs: ScriptArgs & { targetClientId: string }) => {
      const args = {
        ...normalizeScriptArgs(commandArgs),
        targetClientId: commandArgs.targetClientId,
      }
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
        .option('targetClientId', {
          alias: 'c',
          type: 'string',
          describe: 'the id of the client to delete'
        })
        .option('jwtPublicKey', {
          alias: 'k',
          type: 'string',
          describe: 'the JWT public key. Pass "null" to remove the JWT public key'
        })
        .demandOption(['targetClientId', 'jwtPublicKey'])
    }, async (commandArgs: ScriptArgs & { targetClientId: string, jwtPublicKey: string }) => {
      const args = {
        ...normalizeScriptArgs(commandArgs),
        jwtPublicKey: commandArgs.jwtPublicKey === 'null' ? null : commandArgs.jwtPublicKey,
      }
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
    }, async (commandArgs: ScriptArgs & {schemas: string}) => {
      const args = {
        ...normalizeScriptArgs(commandArgs),
        schemaNames: commandArgs.schemas.split(':'),
      }
      const svv = await streamSea.getSchemaVersionsVector(args)
      console.log(svv.map((x: number | null) => `${x}`).join(':'))
    })
  .argv

