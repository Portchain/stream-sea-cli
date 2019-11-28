
/* tslint:disable */
import request from 'request-promise-native'
import { Stream, Remote, SchemaDefinition } from './types';
import {EventEmitter} from 'events'

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

  constructor(args:WSClientArgs) {
    super()
    this.ws = new WebSocket(`ws://${args.remoteServerHost}:${args.remoteServerPort}/api/v1/streams`);
    this.ws.on('open', () => {
      console.log('socket opened');
      const authResponse = this.authenticate(args.appId, args.appSecret)
      console.log('authResponse', authResponse)
    });
    this.ws.on('message', (msgStr:string) => {
      // TODO: catch parse error
      try {
        const msg = JSON.parse(msgStr)
        console.log('RCVD', msg)
        if(!msg.id) {
          const errMessage = `Server sends a message without an id ${JSON.stringify(msg)}`
          this.emit('error', errMessage)
        } else if(this.messagesCallbacks.has(msg.id) && this.messagesCallbacks.get(msg.id) === null) {
          const errMessage = `Server sent multiple response for a single request. Message: ${JSON.stringify(msg)}`
          this.emit('error', errMessage)
        } else if(this.messagesCallbacks.get(msg.id)) {
          if(msg.success) {
            this.messagesCallbacks.get(msg.id)!.resolve(msg.response)
          } else {
            this.messagesCallbacks.get(msg.id)!.reject(msg.error)
          }
          this.messagesCallbacks.set(msg.id, null)
        } else {
          const errMessage = `Server sent a response but the message id could not be resolved to a request. Message: ${JSON.stringify(msg)}`
          this.emit('error', errMessage)
        }

      } catch(err) {
        console.error(err)
        this.emit('error', err)
      }
    })
  }

  private generateNextMessageId() {
    return ++this.msgCnt
  }

  public async send(action:string, payload:any) {
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
    const response = await this.send('authenticate', {
      username, 
      password
    })
    console.log('Auth response', response)
  }

  public subscribe (streamName:string) {
    const eventEmitter = new EventEmitter()
    return eventEmitter
  }
}


export const subscribe = (args:Remote & Stream & {schema: SchemaDefinition}) => {
  const eventEmitter = new EventEmitter()
  
  let client = new WSClient(args)
  client.subscribe(args.stream)
  
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