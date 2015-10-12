/// <reference path="../interfaces/api.ts" />
/// <reference path="../common/json_rpc.ts" />
/// <reference path="../typings/RTCPeerConnection.d.ts" />

module WebRTCP2P.Simple {

export class Client implements IService {
    _ws_url: string;
    _rpc: WebSocketJsonRpc = null;
    _info: IServiceInfo = null;
    _groups: { [id: string]: Group; } = {};

    constructor(ws_url: string) {
        this._ws_url = ws_url;
    }

    join(): Promise<IServiceInfo> {
        return new Promise<IServiceInfo>((resolve, reject) => {
            var ws = new WebSocket(this._ws_url);
            ws.onopen = () => {
                this._rpc = new WebSocketJsonRpc(ws, new ClientRpcHandler(this));
                this._rpc.request('init').then((user_id: string) => {
                    this._info = new ServiceInfo(user_id);
                    resolve(this._info);
                }, reject);
            };
        });
    }

    close() {
    }

    info(): IServiceInfo {
        return this._info;
    }

    createGroup(cap: GroupCapability): Promise<IGroup> {
        return new Promise<IGroup>((resolve, reject) => {
            this._rpc.request('create').then((group_id: string) => {
                var group = new Group(group_id);
                this._groups[group_id] = group;
                resolve(group);
            }, reject);
        });
    }
    joinGroup(id: string): Promise<IGroup> {
        return new Promise<IGroup>((resolve, reject) => {
            this._rpc.request('join', [id]).then(() => {
                this._connect_all_members(id).then(resolve, reject);
            }, reject);
        });
    }
    _connect_all_members(group_id: string): Promise<IGroup> {
        return new Promise<IGroup>((resolve, reject) => {
            this._rpc.request('get_members', [group_id]).then((members: Array<string>) => {
                var promises = [];
                var group = new Group(group_id);
                this._groups[group_id] = group;
                members.forEach((user_id: string) => {
                    if (user_id === this._info.id())
                        return; // 自分自身はスキップ
                    promises.push(this._establish_peer_connection(group, user_id));
                });
                Promise.all(promises).then(() => {
                    resolve(group);
                }, () => {
                    group.close();
                    delete this._groups[group_id];
                    reject('failed');
                });
            }, reject);
        });
    }
    _establish_peer_connection(group: Group, user_id: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            var conn = new Connection(this, group, user_id, true);
            group.peers[user_id] = conn;
            conn.dc.onopen = () => {
                resolve();
            };
            conn.pc.createOffer().then((offer) => {
                return conn.pc.setLocalDescription(offer);
            }).then(() => {
                return this._rpc.request('relay', [group.id(), user_id, {
                    'offer': conn.pc.localDescription
                }]);
            }).then((answer) => {
                return conn.pc.setRemoteDescription(new RTCSessionDescription(answer.answer));
            }).catch((e) => {
                reject(e);
            });
        });
    }

    relay_handler(group_id: string, user_id: string, data: any): any {
        console.log('relay_handler:', group_id, user_id, data);
        if (!(group_id in this._groups))
            throw 'invalid group id';
        var group = this._groups[group_id];
        if (!(user_id in group.peers)) {
            group.peers[user_id] = new Connection(this, group, user_id, false);
        }
        var conn = group.peers[user_id];
        if ('offer' in data) {
            return new Promise((resolve, reject) => {
                conn.pc.setRemoteDescription(new RTCSessionDescription(data.offer)).then(() => {
                    return conn.pc.createAnswer();
                }).then((answer) => {
                    conn.pc.setLocalDescription(answer);
                    return resolve({
                        'answer': answer
                    });
                }).catch((e) => {
                    reject(e);
                });
            });
        } else if ('ice' in data) {
            return new Promise((resolve, reject) => {
                conn.pc.addIceCandidate(new RTCIceCandidate(data.ice)).then(() => {
                    resolve(null);
                }, (e) => {
                    reject(e);
                });
            });
        }
        throw 'invalid relay message';
    }
}

class ServiceInfo implements IServiceInfo {
    _id: string;
    constructor(id: string) {
        this._id = id;
    }

    id(): string {
        return this._id;
    }
}

class Group implements IGroup {
    _id: string;
    onmessage: (user_id: string, data: ArrayBuffer|ArrayBufferView) => void = null;
    peers: { [user_id: string]: Connection; } = {};

    constructor(id: string) {
        this._id = id;
    }

    id(): string {
        return this._id;
    }

    capability(): GroupCapability {
        return GroupCapability.BroadcastEveryone | GroupCapability.UnicastEveryone;
    }

    broadcast(data: ArrayBuffer|ArrayBufferView): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            for (var user_id in this.peers) {
                var conn = this.peers[user_id];
                try {
                    conn.dc.send(<any>data);
                } catch (e) {}
            }
            resolve();
        });
    }

    unicast(target: string, data: ArrayBuffer|ArrayBufferView): Promise<ArrayBufferView> {
        return new Promise<ArrayBufferView>((resolve, reject) => {
            reject('not implemented');
        });
    }

    close() {
        for (var user_id in this.peers) {
            var conn = this.peers[user_id];
            if (conn.dc) {
                try {
                    conn.dc.close();
                } catch (e) {}
            }
            if (conn.pc) {
                try {
                    conn.pc.close();
                } catch (e) {}
            }
        }
    }

    _recv_handler(user_id: string, data: ArrayBuffer|ArrayBufferView|Blob) {
        if (data instanceof Blob) {
            var reader = new FileReader();
            reader.onload = () => {
                this._recv_handler(user_id, reader.result);
            };
            reader.readAsArrayBuffer(<Blob>data);
            return;
        }
        if (this.onmessage) {
            try {
                this.onmessage(user_id, <ArrayBuffer|ArrayBufferView>data);
            } catch (e) {}
        }
    }
}

class Connection {
    pc: RTCPeerConnection;
    dc: RTCDataChannel;

    constructor(client: Client, group: Group, user_id: string, initiator: boolean) {
        if (client._info.id() == user_id)
            throw 'bug!';
        console.log('new connection: gid=' + group.id() + '. ' + client._info.id() + '<-->' + user_id);
        this.pc = new RTCPeerConnection();
        if (initiator) {
            this.dc = this.pc.createDataChannel('simple');
            this.dc.onmessage = (evt) => {
                group._recv_handler(user_id, evt.data);
            };
        }
        this.pc.onicecandidate = (evt) => {
            if (!evt.candidate)
                return;
            return client._rpc.request('relay', [group.id(), user_id, {
                'ice': evt.candidate
            }]);
        };
        this.pc.ondatachannel = (evt: RTCDataChannelEvent) => {
            this.dc = <RTCDataChannel>evt.channel;
            this.dc.onmessage = (evt) => {
                group._recv_handler(user_id, evt.data);
            };
        };
    }
}

class ClientRpcHandler {
    _client: Client;
    constructor(client: Client) {
        this._client = client;
    }

    relay(group_id: string, user_id: string, data: any): any {
        return this._client.relay_handler(group_id, user_id, data);
    }
}

}
