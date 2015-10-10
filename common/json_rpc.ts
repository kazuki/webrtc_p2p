/// <reference path="../typings/es6-promise.d.ts" />

export class WebSocketJsonRpc {
    ws: WebSocket;
    handler: any;
    id: number;
    waiting: { [id: string]: [any, any]; } = {};

    constructor(ws: WebSocket, handler: any) {
        this.ws = ws;
        this.handler = handler;
        this.id = 0;
        this.ws.onmessage = (ev) => {
            this._handle(<string>ev.data);
        };
    }

    request(method: string, args: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            var req = {
                'jsonrpc': '2.0',
                'method': method,
                'id': this.id.toString(),
                'params': args,
            };
            this.waiting[this.id.toString()] = [resolve, reject];
            this.id += 1;
            this.ws.send(JSON.stringify(req));
        });
    }

    _handle(recv_data: string) {
        var obj = null;
        try {
            obj = JSON.parse(recv_data);
        } catch (e) {
            // パースエラーは無視する (リクエストかレスポンスかわからないので)
            return;
        }
        if (obj.result || obj.error) {
            // レスポンス
            try {
                this._handle_response(obj);
            } catch (e) {
                // エラーは無視する
            }
            return;
        }
        if (typeof obj.method !== 'string') {
            this._send_error(-32600);
            return;
        }
        if (obj.method.startsWith('_') || !(obj.method in this.handler)) {
            this._send_error(-32601);
            return;
        }
        try {
            var ret = this.handler[obj.method].apply(this.handler, obj.params);
            if (obj.id === undefined || obj.id === null || obj.id === '')
                return;
            this.ws.send(JSON.stringify({
                'jsonrpc': '2.0',
                'id': obj.id,
                'result': ret
            }));
        } catch (e) {
            this._send_error(-32603);
            return;
        }
    }

    _handle_response(obj: any) {
        if (!(obj.id in this.waiting))
            return;
        var [resolve, reject] = this.waiting[obj.id];
        delete this.waiting[obj.id];
        if (obj.result) {
            resolve(obj.result);
        } else {
            reject(obj.error);
        }
    }

    _send_error(code: number, msg?: string) {
        var err = {'code': code};
        if (msg)
            err['message'] = msg;
        this.ws.send(JSON.stringify({
            'jsonrpc': '2.0',
            'error': err,
            'id': null
        }));
    }
}
