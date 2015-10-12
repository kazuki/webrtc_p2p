/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/ws.d.ts" />

import WS = require('ws');
import JsonRpc = require('../common/json_rpc.external');

import Simple = require('../simple/server');
var Handler = Simple.SimpleService;

var global_state = new Object();
var wss = new WS.Server({
    port: 3001,
    clientTracking: true
});
wss.on('connection', (ws) => {
    var handler = new Handler(global_state);
    ws.onclose = (e) => {
        handler._close();

        // これってws側でメンテナンスしてくれないのかな？
        var idx = wss.clients.indexOf(ws);
        if (idx >= 0)
            wss.clients.splice(idx, 1);
    };
    new JsonRpc.WebSocketJsonRpc(<any>ws, handler);
});
