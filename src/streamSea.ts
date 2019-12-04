
/* tslint:disable */
import request from 'request-promise-native'
import { Stream, Remote, SchemaDefinition } from './types';
import {EventEmitter} from 'events'
const logger = require('logacious')()

const WebSocket = require('ws');
/* tslint:enable */

// private function setDefaultHeaders($curl) {
//   curl_setopt($curl, CURLOPT_HTTPHEADER, array(
//     'Content-encoding: gzip',
//     'Content-type: application/json',
//     'Accept: application/json',
//     'Authorization: Basic ' . base64_encode($this->appId . ':' . $this->appSecret)
//   ));



interface PromiseProxy {
  reject: (err:any) => void
  resolve: (msg?:any) => void
}

interface WSClientArgs {
  remoteServerHost: string;
  remoteServerPort: string;
  appId: string;
  appSecret: string;
}

class WSClient extends EventEmitter {
  private msgCnt = 0
  private ws:any
  private messagesCallbacks:Map<number, PromiseProxy|null> = new Map<number, PromiseProxy|null>()
  private subscriptions:Map<number, EventEmitter> = new Map<number, EventEmitter>()
  private readyCb:() => void

  constructor(args:WSClientArgs, readyCb:() => void) {
    super()
    const url = `ws://${args.remoteServerHost}:${args.remoteServerPort}/api/v1/streams`
    this.readyCb = readyCb;
    this.ws = new WebSocket(url);
    
    this.ws.on('open', async () => {
      console.log('Connected to server');
      await this.authenticate(args.appId, args.appSecret)
    });

    this.ws.on('message', (msgStr:string) => {
      // TODO: catch parse error
      try {
        const msg = JSON.parse(msgStr)
        if(!msg.id) {
          const errMessage = `Server sends a message without an id ${JSON.stringify(msg)}`
          logger.error(errMessage)
          this.emit('error', errMessage)
        } else {
          if(this.messagesCallbacks.has(msg.id) && this.messagesCallbacks.get(msg.id) === null) {
            if(msg.action === 'subscription') {
              // logger.debug('Subscription related message')
              const eventEmitter = this.subscriptions.get(msg.id)
              if(eventEmitter) {
                // logger.debug('Emitting message related to subscription', msg.id)
                eventEmitter.emit('message', msg.payload)
              } else {
                const errMessage = `Could not resolve subscription related event to an existing subscription ${JSON.stringify(msg)}`
                logger.error(errMessage)
                this.emit('error', errMessage)
              }
            } else {
              const errMessage = `Server sent multiple response for a request that has already been processed. Message: ${JSON.stringify(msg)}`
              logger.error(errMessage)
              this.emit('error', errMessage)
            }
          } else if(this.messagesCallbacks.get(msg.id)) {

            const promiseProxy = this.messagesCallbacks.get(msg.id)!
            if(msg.success) {
              promiseProxy.resolve(msg.payload)
            } else {
              promiseProxy.reject(msg.error)
            }
            this.messagesCallbacks.set(msg.id, null)
          } else {
            const errMessage = `Server sent a response but the message id could not be resolved to a request. Message: ${JSON.stringify(msg)}`
            logger.error(errMessage)
            this.emit('error', errMessage)
          }
        }

      } catch(err) {
        logger.error(err)
        this.emit('error', err)
      }
    })
  }

  private generateNextMessageId() {
    return ++this.msgCnt
  }

  public async send(action:string, payload:any):Promise<any> {
    // TODO: add message timeouts
    return new Promise((resolve, reject) => {

      const msgId = this.generateNextMessageId()
      this.messagesCallbacks.set(msgId, {
        resolve,
        reject
      })
      this.ws.send(JSON.stringify({
        id: msgId,
        action, 
        payload
      }))

    })
  }
  public async authenticate (username:string, password:string) {
    const response:any = await this.send('authenticate', {
      username, 
      password
    })
    if(response && response.jailId) {
      console.info('Authentication succeeded')
      if(this.readyCb) {
        const readyCb = this.readyCb
        delete this.readyCb
        readyCb()
      }

    } else {
      console.error('Authentication failed')
    }
  }

  public async subscribe (streamName:string) {
    logger.info(`Subscribing to stream ${streamName}`)
    const eventEmitter = new EventEmitter()
    const subscriptionKey = await this.send('subscribe', streamName)
    if(subscriptionKey) {
      this.subscriptions.set(subscriptionKey, eventEmitter)
      return eventEmitter
    } else {
      throw new Error('Failed to subscribe')
    }
    
  }
}


export const subscribe = async (args:Remote & Stream & {schema: SchemaDefinition}) => {
  const eventEmitter = new EventEmitter()
  
  let client = new WSClient(args, async () => {
    //TODO: return th right event emitter instead of manually piping 2 event emitters
    const ee = await client.subscribe(args.stream)
    ee.on('message', (d) => eventEmitter.emit('message', d))
    ee.on('error', (d) => eventEmitter.emit('error', d))
    ee.on('close', (d) => eventEmitter.emit('close', d))
  })
  
  return eventEmitter;

}

export const publish = async (args:Remote & Stream & {payload: any}) => {
  return await request({
    url: `http://${args.remoteServerHost}:${args.remoteServerPort}/api/v1/streams/${args.stream}/publish`,
    headers: {
      'content-type': 'application/json',
      'authorization': 'Basic ' + Buffer.from(`${args.appId}:${args.appSecret}`).toString('base64')
    },
    method: 'POST',
    gzip: true,
    json: true,
    body: {payload: args.payload}
  })
}

export const defineStream = async(args:Remote & Stream & SchemaDefinition) => {
  return await request({
    url: `http://${args.remoteServerHost}:${args.remoteServerPort}/api/v1/streams/${args.stream}/define`,
    headers: {
      'content-type': 'application/json',
      'authorization': 'Basic ' + Buffer.from(`${args.appId}:${args.appSecret}`).toString('base64')
    },
    method: 'POST',
    gzip: true,
    json: true,
    body: {version: args.version, fields: args.fields}
  })
}

export const describeStream = async(args:Remote & Stream & SchemaDefinition) => {
  return await request({
    url: `http://${args.remoteServerHost}:${args.remoteServerPort}/api/v1/streams/${args.stream}/schema`,
    headers: {
      'content-type': 'application/json',
      'authorization': 'Basic ' + Buffer.from(`${args.appId}:${args.appSecret}`).toString('base64')
    },
    method: 'GET',
    gzip: true,
    json: true
  })
}

export const createClient = async(args:Remote & {description:string}) => {
  return await request({
    url: `http://${args.remoteServerHost}:${args.remoteServerPort}/api/v1/client`,
    headers: {
      'content-type': 'application/json',
      'authorization': 'Basic ' + Buffer.from(`${args.appId}:${args.appSecret}`).toString('base64')
    },
    method: 'POST',
    gzip: true,
    json: true,
    body: {description: args.description}
  })
}

export const deleteClient = async(args:Remote & {clientId:string}) => {
  return await request({
    url: `http://${args.remoteServerHost}:${args.remoteServerPort}/api/v1/client/${args.clientId}`,
    headers: {
      'content-type': 'application/json',
      'authorization': 'Basic ' + Buffer.from(`${args.appId}:${args.appSecret}`).toString('base64')
    },
    method: 'DELETE',
    gzip: true,
    json: true
  })
}

export const rotateClientSecret = async(args:Remote & {clientId:string}) => {
  return await request({
    url: `http://${args.remoteServerHost}:${args.remoteServerPort}/api/v1/client/${args.clientId}`,
    headers: {
      'content-type': 'application/json',
      'authorization': 'Basic ' + Buffer.from(`${args.appId}:${args.appSecret}`).toString('base64')
    },
    method: 'PUT',
    gzip: true,
    json: true
  })
}