import yargs from 'yargs'
import * as streamSea from 'stream-sea-client'
import { loadInlinePayload, formatLongJSONSchema } from './message-utils';
import { generateKeypair, parsePayload } from './jwt-utils';
const jwt = require('jsonwebtoken')
const fs = require('fs')

const errorHandler = (err:Error) => {
  console.error(err.message)
}

// This represents the raw args we get from yargs
type ApiArgs = {
  clientId: string,
  clientSecret: string,
  remoteServerHost: string,
  remoteServerPort?: string,
  secure?: boolean,
}

type NormalizedApiArgs = {
  clientId: string,
  clientSecret: string,
  remoteServerHost: string,
  remoteServerPort: string,
  secure: boolean,
}

const normalizeApiArgs = (args: ApiArgs): NormalizedApiArgs => ({
  clientId: args.clientId,
  clientSecret: args.clientSecret,
  remoteServerHost: args.remoteServerHost,
  remoteServerPort: args.remoteServerPort || '443',
  secure: args.secure === undefined ? false : args.secure,
})

const requireApiArgs = (y: yargs.Argv<{}>) => y.option('clientId', {
  alias: 'i',
  type: 'string',
  describe: 'your client id to authenticate on the remote'
})
.option('clientSecret', {
  alias: 'q',
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

yargs.scriptName("stream-sea-cli")
  .usage('$0 <cmd> [args]')
  // Begin auxiliary methods
  .command('sign-jwt', 'sign a JWT', yargs => {
    yargs.option('jwtSecret', {
      alias: 's',
      type: 'string',
      describe: 'JWT secret'
    })
    .option('jwtPrivateKey', {
      alias: 'k',
      type: 'string',
      describe: 'JWT private key'
    })
    .option('payload', {
      alias: 'p',
      type: 'string',
      describe: 'payload'
    })
  }, (argv: { payload?: string, jwtPrivateKey?: string, jwtSecret?: string }) => {
    const payload = parsePayload(argv.payload)
    
    let jwtSerialized
    if (argv.jwtSecret && argv.jwtPrivateKey){
      console.error('Cannot use both JWT secret and JWT private key. Choose one')
      process.exit(1)
    } else if (argv.jwtSecret){
      jwtSerialized = jwt.sign(payload, argv.jwtSecret)
    } else if (argv.jwtPrivateKey){
      jwtSerialized = jwt.sign(payload, argv.jwtPrivateKey, { algorithm: 'RS512' })
    } else {
      console.error('Must provide either JWT secret or JWT private key')
      process.exit(1)
    }

    console.log(jwtSerialized)
  })
  .command('generate-keypair', 'Generate a keypair', yargs => {
    yargs.option('filePrefix', {
      alias: 'o',
      type: 'string',
      describe: 'Prefix for output file names'
    })
  }, (argv: { filePrefix?: string}) => {
    console.log('generating...')
    const {private: privateKey, public: publicKey} = generateKeypair()
    fs.writeSync(fs.openSync(`${argv.filePrefix || ''}private.pem`, 'w'), privateKey)
    fs.writeSync(fs.openSync(`${argv.filePrefix || ''}public.pem`, 'w'), publicKey)
  })
  // Begin API methods
  .command('define', '(re)define a stream data schema', 
    (yargs) => {
      requireApiArgs(yargs)
      .option('stream', {
        alias: 's',
        type: 'string',
        describe: 'the name of the stream'
      })
      .option('schema', {
        alias: 'm',
        type: 'string',
        describe: 'the definition of the schema. This should be a path to a JSON file or a JSON string.'
      })
      .demandOption(['stream', 'schema'])
    }, (commandArgs: ApiArgs & { stream: string, schema: string }) => {
      const args = {
        ...normalizeApiArgs(commandArgs),
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
      requireApiArgs(yargs)
      .option('stream', {
        alias: 's',
        type: 'string',
        describe: 'the name of the stream'
      })
      .demandOption(['stream'])
    }, (commandArgs: ApiArgs & { stream: string }) => {
      const args = {
        ...normalizeApiArgs(commandArgs),
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
      requireApiArgs(yargs)
      .option('stream', {
        alias: 's',
        type: 'string',
        describe: 'the name of the stream'
      })
      .option('data', {
        alias: 'd',
        type: 'string',
        describe: 'the path to a JSON file or the JSON payload to publish. You can also omit this parameter and send pipe data to the command through stdin'
      })
      .demandOption(['stream', 'data'])
    }, 
    (commandArgs: ApiArgs & {stream: string, data: string}) => {
      const payload = loadInlinePayload(commandArgs.data)
      const args = {
        ...normalizeApiArgs(commandArgs),
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
      requireApiArgs(yargs)
      .option('stream', {
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
    }, async (commandArgs: ApiArgs & { stream: string, fanout?: boolean}) => {
      const args = {
        ...normalizeApiArgs(commandArgs),
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
  .command('create-jail', 'Create a new jail',
    (yargs) => {
      requireApiArgs(yargs)
      .option('id', {
        alias: 'j',
        type: 'string',
        describe: 'the ID of the new jail',
      })
      .option('name', {
        alias: 'n',
        type: 'string',
        describe: 'the name of the new jail',
      })
      .option('client', {
        alias: 'c',
        type: 'string',
        describe: 'the ID of the client to create within the new jail',
      })
      .demandOption(['id', 'name', 'client'])
    }, (commandArgs: ApiArgs & { id: string, name: string, client: string}) => {
      const args = {
        ...normalizeApiArgs(commandArgs),
        targetJailId: commandArgs.id,
        targetJailName: commandArgs.name,
        targetClientId: commandArgs.client,
      }
      streamSea.createJail(args)
        .then((jailInfo) => {
          console.log('Jail Identifier:', jailInfo.newJailId)
          console.log('Client Identifier:', jailInfo.newClientId)
          console.log('Client Secret:', jailInfo.newClientSecret)
        })
        .catch(errorHandler)
    }
  )
  .command('delete-jail', 'Delete an existing jail',
    (yargs) => {
      requireApiArgs(yargs)
      .option('id', {
        alias: 'j',
        type: 'string',
        describe: 'the ID of the jail to delete',
      })
      .demandOption(['id'])
    }, (commandArgs: ApiArgs & { id: string }) => {
      const args = {
        ...normalizeApiArgs(commandArgs),
        targetJailId: commandArgs.id,
      }
      streamSea.deleteJail(args)
        .then(deletedJail => {
          console.log(`Jail ${deletedJail.id} deleted`)
        })
        .catch(errorHandler)
    }
  )
  .command('create-client', 'Create a new client',
    (yargs) => {
      requireApiArgs(yargs)
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
    }, (commandArgs: ApiArgs & { targetClientId: string, targetClientDescription: string}) => {
      const args = {
        ...normalizeApiArgs(commandArgs),
        targetClientId: commandArgs.targetClientId,
        targetClientDescription: commandArgs.targetClientDescription,
      }
      streamSea.createClient(args)
        .then((client) => {
          console.log('Client Identifier:', client.givenId)
          console.log('Client Secret:', client.secret)
        })
        .catch(errorHandler)
    }
  )
  .command('delete-client', 'Delete an existing',
    (yargs) => {
      requireApiArgs(yargs)
      .option('targetClientId', {
        alias: 'c',
        type: 'string',
        describe: 'the id of the client to delete'
      })
      .demandOption(['targetClientId'])
    }, (commandArgs: ApiArgs & { targetClientId: string}) => {
      const args = {
        ...normalizeApiArgs(commandArgs),
        targetClientId: commandArgs.targetClientId,
      }
      streamSea.deleteClient(args)
        .then(deletedClient => {
          if(deletedClient) {
            console.log(`Client ${deletedClient.id} deleted`)
          } else {
            console.log(`Failed`)
          }
        })
        .catch(errorHandler)
    }
  )
  .command('rotate-client-secret', 'Rotate a client\'s secret',
    (yargs) => {
      requireApiArgs(yargs)
      .option('targetClientId', {
        alias: 'c',
        type: 'string',
        describe: 'the id of the client to delete'
      })
      .demandOption(['targetClientId'])
    }, async (commandArgs: ApiArgs & { targetClientId: string }) => {
      const args = {
        ...normalizeApiArgs(commandArgs),
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
  .command('rotate-jwt', 'Rotate a client\'s JWT public key',
    (yargs) => {
      requireApiArgs(yargs)
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
    }, async (commandArgs: ApiArgs & { targetClientId: string, jwtPublicKey: string }) => {
      const args = {
        ...normalizeApiArgs(commandArgs),
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
      requireApiArgs(yargs)
      .option('schemas', {
        alias: 's',
        type: 'string',
        describe: 'the name of the schemas, delimited by colons'
      })
    }, async (commandArgs: ApiArgs & {schemas: string}) => {
      const args = {
        ...normalizeApiArgs(commandArgs),
        schemaNames: commandArgs.schemas.split(':'),
      }
      const svv = await streamSea.getSchemaVersionsVector(args)
      console.log(svv.map((x: number | null) => `${x}`).join(':'))
    }
  )
  .argv
