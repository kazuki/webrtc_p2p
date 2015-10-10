/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/ws.d.ts" />

import WebSocket = require('ws');

/*
 * global_state = {
 *     users: {
 *         'id': UserState
 *     }
 * }
 */

export class SimpleService {
    wss: WebSocket.Server;
    ws: WebSocket;
    global_state: any;

    constructor(wss: WebSocket.Server, ws: WebSocket, global_state: any) {
        this.wss = wss;
        this.ws = ws;
        this.global_state = global_state;
        if (!global_state.users)
            global_state.users = {};
    }

    init(): string {
        while (true) {
            var id = this._generate_random_id();
            if (id in this.global_state.users)
                continue;
            console.log('init: ' + id);
            this.global_state.users[id] = new UserState(id);
            return id;
        }
    }

    _generate_random_id(): string {
        // generate 128bit random id
        var f = () => {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        };
        return f() + f() + f() + f() + f() + f() + f() + f();
    }

    _close() {
        console.log('close');
    }
}

class UserState {
    id: string;

    constructor(id: string) {
        this.id = id;
    }
}
