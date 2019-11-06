
/* tslint:disable */
import request from 'request-promise-native'

const WebSocket = require('ws');
/* tslint:enable */

// private function setDefaultHeaders($curl) {
//   curl_setopt($curl, CURLOPT_HTTPHEADER, array(
//     'Content-encoding: gzip',
//     'Content-type: application/json',
//     'Accept: application/json',
//     'Authorization: Basic ' . base64_encode($this->appId . ':' . $this->appSecret)
//   ));


interface Remote {
  appId: string;
  appSecret: string;
  remoteServerHost: string;
  remoteServerPort: string;
}
interface Stream {
  stream: string;
}

interface SchemaFieldTypeDefinition {

}

interface SchemaFieldDefinition {
  name: string;
  type: SchemaFieldTypeDefinition
}

interface SchemaDefinition {
  version:string;
  fields: SchemaFieldDefinition[];
}

export const subscribe = (args:Remote & Stream & {schema: SchemaDefinition}) => {

  const ws = new WebSocket(`ws://${args.remoteServerHost}:${args.remoteServerPort}/api/v1/streams/${args.stream}/subscribe`);
  
  ws.on('open', function open() {
    console.log('socket opened');
  });
  
  ws.on('message', function incoming(data:any) {
    console.log(data);
  });

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