# stream-sea-cli
The `stream-sea-cli` tool, also aliased as `ssc`, provides commands for interacting
with the stream-sea API. It also provides some auxiliary commands for common tasks
related to stream-sea.

## API commands
### ssc define
(Re)define a stream data schema

```
Options:
  --clientId, -i          your client id to authenticate on the remote
                                                             [string] [required]
  --clientSecret, -q      your client secret to authenticate on the remote
                                                             [string] [required]
  --remoteServerHost, -h  the hostname or IP address of the remote server
                                                             [string] [required]
  --remoteServerPort, -p  the remote server port (defaults to 443)      [string]
  --secure, -t            Use TLS                                      [boolean]
  --stream, -s            the name of the stream             [string] [required]
  --schema, -m            the definition of the schema. This should be a path to
                          a JSON file or a JSON string.      [string] [required]
```

### ssc describe

Fetch the latest data schema for a stream

```
Options:
  --clientId, -i          your client id to authenticate on the remote
                                                             [string] [required]
  --clientSecret, -q      your client secret to authenticate on the remote
                                                             [string] [required]
  --remoteServerHost, -h  the hostname or IP address of the remote server
                                                             [string] [required]
  --remoteServerPort, -p  the remote server port (defaults to 443)      [string]
  --secure, -t            Use TLS                                      [boolean]
  --stream, -s            the name of the stream             [string] [required]
```

### ssc publish

Publish messages to a stream

```
Options:
  --clientId, -i          your client id to authenticate on the remote
                                                             [string] [required]
  --clientSecret, -q      your client secret to authenticate on the remote
                                                             [string] [required]
  --remoteServerHost, -h  the hostname or IP address of the remote server
                                                             [string] [required]
  --remoteServerPort, -p  the remote server port (defaults to 443)      [string]
  --secure, -t            Use TLS                                      [boolean]
  --stream, -s            the name of the stream             [string] [required]
  --data, -d              the path to a JSON file or the JSON payload to
                          publish. You can also omit this parameter and send
                          pipe data to the command through stdin
                                                             [string] [required]
```

### ssc subscribe

Subscribe to a stream and print outputs to stdout

```
Options:
  --clientId, -i          your client id to authenticate on the remote
                                                             [string] [required]
  --clientSecret, -q      your client secret to authenticate on the remote
                                                             [string] [required]
  --remoteServerHost, -h  the hostname or IP address of the remote server
                                                             [string] [required]
  --remoteServerPort, -p  the remote server port (defaults to 443)      [string]
  --secure, -t            Use TLS                                      [boolean]
  --stream, -s            the name of the stream             [string] [required]
  --fanout, -f            Fanout mode                                  [boolean]
```

### ssc create-jail

Create a new jail

```
Options:
  --clientId, -i          your client id to authenticate on the remote
                                                             [string] [required]
  --clientSecret, -q      your client secret to authenticate on the remote
                                                             [string] [required]
  --remoteServerHost, -h  the hostname or IP address of the remote server
                                                             [string] [required]
  --remoteServerPort, -p  the remote server port (defaults to 443)      [string]
  --secure, -t            Use TLS                                      [boolean]
  --id, -j                the ID of the new jail             [string] [required]
  --name, -n              the name of the new jail           [string] [required]
  --client, -c            the ID of the client to create within the new jail
                                                             [string] [required]
```

### ssc delete-jail

Delete an existing jail

```
Options:
  --clientId, -i          your client id to authenticate on the remote
                                                             [string] [required]
  --clientSecret, -q      your client secret to authenticate on the remote
                                                             [string] [required]
  --remoteServerHost, -h  the hostname or IP address of the remote server
                                                             [string] [required]
  --remoteServerPort, -p  the remote server port (defaults to 443)      [string]
  --secure, -t            Use TLS                                      [boolean]
  --id, -j                the ID of the jail to delete       [string] [required]
```

### ssc create-client

Create a new client

```
Options:
  --clientId, -i                 your client id to authenticate on the remote
                                                             [string] [required]
  --clientSecret, -q             your client secret to authenticate on the
                                 remote                      [string] [required]
  --remoteServerHost, -h         the hostname or IP address of the remote server
                                                             [string] [required]
  --remoteServerPort, -p         the remote server port (defaults to 443)
                                                                        [string]
  --secure, -t                   Use TLS                               [boolean]
  --targetClientId, -c           the id of the client to delete
                                                             [string] [required]
  --targetClientDescription, -d  the name or description of the client
                                                             [string] [required]
```

### ssc delete-client

Delete an existing client

```
Options:
  --clientId, -i          your client id to authenticate on the remote
                                                             [string] [required]
  --clientSecret, -q      your client secret to authenticate on the remote
                                                             [string] [required]
  --remoteServerHost, -h  the hostname or IP address of the remote server
                                                             [string] [required]
  --remoteServerPort, -p  the remote server port (defaults to 443)      [string]
  --secure, -t            Use TLS                                      [boolean]
  --targetClientId, -c    the id of the client to delete     [string] [required]
```

### ssc rotate-client-secret

Rotate a client's secret

```
Options:
  --clientId, -i          your client id to authenticate on the remote
                                                             [string] [required]
  --clientSecret, -q      your client secret to authenticate on the remote
                                                             [string] [required]
  --remoteServerHost, -h  the hostname or IP address of the remote server
                                                             [string] [required]
  --remoteServerPort, -p  the remote server port (defaults to 443)      [string]
  --secure, -t            Use TLS                                      [boolean]
  --targetClientId, -c    the id of the client to delete     [string] [required]
```

### ssc rotate-jwt

Rotate a client's JWT public key

```
Options:
  --clientId, -i          your client id to authenticate on the remote
                                                             [string] [required]
  --clientSecret, -q      your client secret to authenticate on the remote
                                                             [string] [required]
  --remoteServerHost, -h  the hostname or IP address of the remote server
                                                             [string] [required]
  --remoteServerPort, -p  the remote server port (defaults to 443)      [string]
  --secure, -t            Use TLS                                      [boolean]
  --targetClientId, -c    the id of the client to delete     [string] [required]
  --jwtPublicKey, -k      the JWT public key. Pass "null" to remove the JWT
                          public key                         [string] [required]
```

### ssc svv

Get a schema version vector

```
Options:
  --clientId, -i          your client id to authenticate on the remote
                                                             [string] [required]
  --clientSecret, -q      your client secret to authenticate on the remote
                                                             [string] [required]
  --remoteServerHost, -h  the hostname or IP address of the remote server
                                                             [string] [required]
  --remoteServerPort, -p  the remote server port (defaults to 443)      [string]
  --secure, -t            Use TLS                                      [boolean]
  --schemas, -s           the name of the schemas, delimited by colons  [string]
```

## Auxiliary commands
### ssc sign-jwt
Sign a JWT

```
Options:
  --jwtSecret, -s      JWT secret                                       [string]
  --jwtPrivateKey, -k  JWT private key                                  [string]
  --payload, -p        payload                                          [string]
```

### ssc generate-keypair
Generate a keypair
```
Options:
  --filePrefix, -o  Prefix for output file names                        [string]
```
