/// <reference path="../typings/es6-promise.d.ts" />

module WebRTCP2P {

export class WebSocketJsonRpc {
    ws: WebSocket;
    handler: any;
    id: number;
    waiting: { [id: string]: [any, any]; } = {};

    constructor(ws: WebSocket, handler: any) {
        this.ws = ws;
        this.handler = handler;
        this.handler._rpc = this;
        this.id = 0;
        this.ws.onmessage = (ev) => {
            this._handle(<string>ev.data);
        };
    }

    request(method: string, args?: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            var req = {
                'jsonrpc': '2.0',
                'method': method,
                'id': this.id.toString(),
            };
            if (args)
                req['params'] = args;
            this.waiting[this.id.toString()] = [resolve, reject];
            this.id += 1;
            this.ws.send(JSON.stringify(req));
        });
    }

    _handle(recv_data: string) {
        var obj = null;
        try {
            obj = JSON.parse(recv_data);
            console.log('json-rpc:', obj);
        } catch (e) {
            // パースエラーは無視する (リクエストかレスポンスかわからないので)
            return;
        }
        if (obj.result !== undefined || obj.error !== undefined) {
            // レスポンス
            try {
                this._handle_response(obj);
            } catch (e) {
                // エラーは無視する
                console.log('json-rpc(unhandled exception at _handle_response):', e);
            }
            return;
        }
        if (typeof obj.method !== 'string') {
            this._send_error(-32600, obj.id);
            return;
        }
        if (obj.method.startsWith('_') || !(obj.method in this.handler)) {
            this._send_error(-32601, obj.id);
            return;
        }
        try {
            this._handle_request(obj);
        } catch (e) {
            this._send_error(-32603, obj.id, e);
            return;
        }
    }

    _handle_request(obj: any) {
        var ret = this.handler[obj.method].apply(this.handler, obj.params);
        if (obj.id === undefined || obj.id === null || obj.id === '')
            return;
        if (ret === undefined)
            ret = null;
        if (ret instanceof Promise) {
            ret.then((res) => {
                this.ws.send(JSON.stringify({
                    'jsonrpc': '2.0',
                    'id': obj.id,
                    'result': res,
                }));
            }, (e) => {
                this._send_error(-32603, obj.id, e);
            });
        } else {
            this.ws.send(JSON.stringify({
                'jsonrpc': '2.0',
                'id': obj.id,
                'result': ret
            }));
        }
    }

    _handle_response(obj: any) {
        if (!(obj.id in this.waiting))
            return;
        var [resolve, reject] = this.waiting[obj.id];
        delete this.waiting[obj.id];
        if (obj.error === undefined) {
            resolve(obj.result);
        } else {
            reject(obj.error);
        }
    }

    _send_error(code: number, id: string, msg?: any) {
        var err = {'code': code};
        if (msg && (typeof (msg) == "string" || msg instanceof String)) {
            err['message'] = msg;
        }
        if (id === undefined) {
            id = null;
        }
        this.ws.send(JSON.stringify({
            'jsonrpc': '2.0',
            'error': err,
            'id': id,
        }));
    }
}

}
