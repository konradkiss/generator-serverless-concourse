# generator-serverless-concourse

Yeoman Generator for serverless-concourse that creates new endpoints with tests and route registration.

## Usage

```bash
yo serverless-concourse [verb] [endpoint]
```

The command takes a _verb_ and an _endpoint name_ as parameters. Ie.: `yo serverless-concourse get users`. The plural form of users tells the generator that we are looking for a list of users as opposed to a specific user which we would refer to with `yo serverless-concourse get user`.

### Verbs

Accepted verbs are the following:

- *GET* with a *plural* endpoint name: a searchable and paginated list of items
    - `GET /items/`
- *GET* with a *singular* endpoint name: retrieves a single item identified by an Id parameter
    - `GET /items/:itemId`
- *POST* will always assume plural (no Id): creates a new item
    - `POST /items/`
- *PUT* will always assume singular (with Id): modifies an existing item
    - `PUT /items/:itemId`
- *DELETE* will always assume singular (with Id): removes an existing item
    - `DELETE /items/:itemId`

### Endpoints

It is possible to create nested endpoints by making the endpoint name a path. Here, plurality will matter for each name in the path, ie: `yo serverless-concourse get user/addresses`. Here, each generated address endpoint will be effective under a specific user - a one to many relation. If we just wanted to nest endpoints we could
use plural forms in the path, ie: `yo serverless-concourse get users/vips`.

## Examples

Let's see some specific examples of commands and their generated code:

### Plural endpoint

```bash
$ yo serverless-concourse get addresses
? API version? v1
? Function name addresses
? HTTP verb GET
? HTTP path addresses
? Handler name getAddresses
? Enable CORS? No
   create functions/v1/addresses/getAddresses.ts
   create __tests__/v1/addresses/getAddresses.spec.ts
```

YAML generated:

```yaml
    addresses_getAddresses:
        handler: functions/v1/users/getAddresses.getAddresses
        events: [{http: {method: GET, path: 'users/{userId}/users/{userId}/addresses', request: {parameters: {paths: {userId: true}}}}}]
```

### Singular endpoint with id

```bash
$ yo serverless-concourse get address
? API version? v1
? Function name addresses
? HTTP verb GET
? HTTP path addresses/{addressId}
? Handler name getAddress
? Enable CORS? No
   create functions/v1/addresses/getAddress.ts
   create __tests__/v1/addresses/getAddress.spec.ts
```

YAML generated:

```yaml
    addresses_getAddress:
        handler: functions/v1/getAddress.getAddress
        events: [{http: {method: GET, path: 'addresses/{addressId}', request: {parameters: {paths: {addressId: true}}}}}]
```

### Endpoints with predefined plurality

Ie. POST always plural, PUT and DELETE always singular with id

```bash
$ yo serverless-concourse post address
? API version? v1
? Function name addresses
? HTTP verb POST
? HTTP path addresses
? Handler name postAddress
? Enable CORS? No
   create functions/v1/addresses/postAddress.ts
   create __tests__/v1/addresses/postAddress.spec.ts
$ yo serverless-concourse put address
? API version? v1
? Function name addresses
? HTTP verb PUT
? HTTP path addresses/{addressId}
? Handler name putAddress
? Enable CORS? No
   create functions/v1/addresses/putAddress.ts
   create __tests__/v1/addresses/putAddress.spec.ts
$ yo serverless-concourse delete address
? API version? v1
? Function name addresses
? HTTP verb DELETE
? HTTP path addresses/{addressId}
? Handler name deleteAddress
? Enable CORS? No
   create functions/v1/addresses/deleteAddress.ts
   create __tests__/v1/addresses/deleteAddress.spec.ts
```

YAML generated:

```yaml
    addresses_postAddress:
        handler: functions/v1/postAddress.postAddress
        events: [{http: {method: POST, path: addresses}}]
    addresses_putAddress:
        handler: functions/v1/putAddress.putAddress
        events: [{http: {method: PUT, path: 'addresses/{addressId}', request: {parameters: {paths: {addressId: true}}}}}]
    addresses_deleteAddress:
        handler: functions/v1/deleteAddress.deleteAddress
        events: [{http: {method: DELETE, path: 'addresses/{addressId}', request: {parameters: {paths: {addressId: true}}}}}]
```

### Generate CRUD endpoints

```bash
$ yo serverless-concourse crud messages
? API version? v1
? Function name messages
? Enable CORS? No
? Generate CRUD? Yes
   create functions/v1/messages/getMessages.ts
   create __tests__/v1/messages/getMessages.spec.ts
   create functions/v1/messages/getMessage.ts
   create __tests__/v1/messages/getMessage.spec.ts
   create functions/v1/messages/postMessage.ts
   create __tests__/v1/messages/postMessage.spec.ts
   create functions/v1/messages/putMessage.ts
   create __tests__/v1/messages/putMessage.spec.ts
   create functions/v1/messages/deleteMessage.ts
   create __tests__/v1/messages/deleteMessage.spec.ts
```

YAML generated:

```yaml
    messages_getMessages:
        handler: functions/v1/getMessages.getMessages
        events: [{http: {method: GET, path: messages}}]
    messages_getMessage:
        handler: functions/v1/getMessage.getMessage
        events: [{http: {method: GET, path: 'messages/{messageId}', request: {parameters: {paths: {messageId: true}}}}}]
    messages_postMessage:
        handler: functions/v1/postMessage.postMessage
        events: [{http: {method: POST, path: messages}}]
    messages_putMessage:
        handler: functions/v1/putMessage.putMessage
        events: [{http: {method: PUT, path: 'messages/{messageId}', request: {parameters: {paths: {messageId: true}}}}}]
    messages_deleteMessage:
        handler: functions/v1/deleteMessage.deleteMessage
        events: [{http: {method: DELETE, path: 'messages/{messageId}', request: {parameters: {paths: {messageId: true}}}}}]
```

Nested endpoints

In this case let's assume we want to manage attachments to a specific message (hence the singular reference in the command to `message`).

```bash
$ yo serverless-concourse crud message/attachments
? API version? v1
? Function name attachments
? Enable CORS? No
? Generate CRUD? Yes
   create functions/v1/messages/attachments/getAttachments.ts
   create __tests__/v1/messages/attachments/getAttachments.spec.ts
   create functions/v1/messages/attachments/getAttachment.ts
   create __tests__/v1/messages/attachments/getAttachment.spec.ts
   create functions/v1/messages/attachments/postAttachment.ts
   create __tests__/v1/messages/attachments/postAttachment.spec.ts
   create functions/v1/messages/attachments/putAttachment.ts
   create __tests__/v1/messages/attachments/putAttachment.spec.ts
   create functions/v1/messages/attachments/deleteAttachment.ts
   create __tests__/v1/messages/attachments/deleteAttachment.spec.ts
```

YAML generated:

```yaml
    attachments_getAttachments:
        handler: functions/v1/messages/getAttachments.getAttachments
        events: [{http: {method: GET, path: 'messages/{messageId}/attachments', request: {parameters: {paths: {messageId: true}}}}}]
    attachments_getAttachment:
        handler: functions/v1/messages/getAttachment.getAttachment
        events: [{http: {method: GET, path: 'messages/{messageId}/attachments/{attachmentId}', request: {parameters: {paths: {messageId: true, attachmentId: true}}}}}]
    attachments_postAttachment:
        handler: functions/v1/messages/postAttachment.postAttachment
        events: [{http: {method: POST, path: 'messages/{messageId}/attachments', request: {parameters: {paths: {messageId: true}}}}}]
    attachments_putAttachment:
        handler: functions/v1/messages/putAttachment.putAttachment
        events: [{http: {method: PUT, path: 'messages/{messageId}/attachments/{attachmentId}', request: {parameters: {paths: {messageId: true, attachmentId: true}}}}}]
    attachments_deleteAttachment:
        handler: functions/v1/messages/deleteAttachment.deleteAttachment
        events: [{http: {method: DELETE, path: 'messages/{messageId}/attachments/{attachmentId}', request: {parameters: {paths: {messageId: true, attachmentId: true}}}}}]
```
