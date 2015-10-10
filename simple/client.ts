/// <reference path="../interfaces/api.d.ts" />
/// <reference path="../common/json_rpc.ts" />

class SimpleService implements IService {
    ws: WebSocket = null;
    rpc: WebSocketJsonRpc = null;
    ws_url: string;

    constructor(ws_url: string) {
        this.ws_url = ws_url;
    }

    join(): Promise<IServiceInfo> {
        return new Promise<IServiceInfo>((resolve, reject) => {
            this.ws = new WebSocket(this.ws_url);
            this.ws.onerror = (e) => {
                reject(e);
            };
            this.ws.onopen = () => {
                this.ws.onerror = (e) => {
                    console.log('onerror', e);
                };
                this.ws.onclose = (e) => {
                    console.log('onclose', e);
                };
                this.ws.send(JSON.stringify({
                    'jsonrpc': '2.0',
                    'method': 'init',
                    'id': '1',
                }));
            };
            this.ws.onmessage = (ev) => {
                console.log(ev.data);
            };
        });
    }

    close() {
    }

    createGroup(cap: GroupCapability): Promise<IGroup> {
        return new Promise<IServiceInfo>((resolve, reject) => {
            reject('not implemented');
        });
    }
    joinGroup(id: string): Promise<IGroup> {
        return new Promise<IServiceInfo>((resolve, reject) => {
            reject('not implemented');
        });
    }
}
