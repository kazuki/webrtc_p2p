import WebSocket = require('ws');
import JsonRpc = require('../common/json_rpc.external');

/*
 * global_state = {
 *     users: {
 *         'id': UserState
 *     }
 * }
 */

export class SimpleService {
    _global_state: any;
    _state: UserState = null;
    _rpc: JsonRpc.WebSocketJsonRpc = null;

    constructor(global_state: any) {
        this._global_state = global_state;
        if (!global_state.users)
            global_state.users = {};
        if (!global_state.groups)
            global_state.groups = {};
    }

    /**
     * ユニークなユーザIDを作成し返却
     */
    init(): string {
        while (true) {
            var id = this._generate_random_id();
            if (id in this._global_state.users)
                continue;
            this._state = new UserState(id, this._rpc);
            this._global_state.users[id] = this._state;
            return id;
        }
    }

    /**
     * グループを作成しユニークなグループIDを返却
     */
    create(): string {
        this._check();
        while (true) {
            var id = this._generate_random_id();
            if (id in this._global_state.groups)
                continue;
            var state = new GroupState(id, this._state.id);
            this._state.groups[id] = state;
            this._global_state.groups[id] = state;
            return id;
        }
    }

    /**
     * 指定したIDのグループに参加
     */
    join(group_id: string) {
        this._check();
        if (!(group_id in this._global_state.groups))
            throw 'not found group id';
        if (group_id in this._state.groups)
            throw 'already joined';
        var state = this._global_state.groups[group_id];
        this._state.groups[group_id] = state;
        state.members.push(this._state.id);
    }

    /**
     * 指定したグループから離脱
     */
    leave(group_id: string) {
        this._check();
        if (!(group_id in this._state.groups))
            return;

        var group_state = this._state.groups[group_id];
        if (group_state.owner_id == this._state.id) {
            group_state.members.forEach((member_id: string) => {
                delete this._global_state.users[member_id].groups[group_id];
            });
        } else {
            group_state.remove_member(this._state.id);
        }
    }

    /**
     * 指定したグループに所属するメンバのID一覧を取得する
     */
    get_members(group_id: string): Array<string> {
        this._check();
        if (!(group_id in this._state.groups))
            throw 'not joined group';
        return this._state.groups[group_id].members;
    }

    /**
     * 指定したグループに所属する指定したユーザにデータを転送し
     * そのユーザからの返信を転送します
     */
    relay(group_id: string, user_id: string, data: any): any {
        this._check();
        if (!(group_id in this._state.groups))
            throw 'not joined group';
        if (!(user_id in this._global_state.users))
            throw 'unknown user id';
        var user = this._global_state.users[user_id];
        if (!(group_id in user.groups))
            throw 'unknown user id';
        return new Promise<any>((resolve, reject) => {
            user.rpc.request('relay', [group_id, this._state.id, data]).then((res) => {
                resolve(res);
            }, (e) => {
                reject(e);
            });
        });
    }

    _check() {
        if (!this._state)
            throw 'init RPC required';
    }

    _generate_random_id(): string {
        // generate 128bit random id
        var f = () => {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        };
        return f() + f() + f() + f() + f() + f() + f() + f();
    }

    _close() {
        if (this._state) {
            for (var group_id in this._state.groups) {
                this.leave(group_id);
            }
            delete this._global_state.users[this._state.id];
        }
    }
}

class UserState {
    id: string;
    rpc: JsonRpc.WebSocketJsonRpc;
    groups: {[id:string]: GroupState;} = {};

    constructor(id: string, rpc: JsonRpc.WebSocketJsonRpc) {
        this.id = id;
        this.rpc = rpc;
    }
}

class GroupState {
    id: string;
    owner_id: string;
    members: Array<string>;

    constructor(id: string, owner_id: string) {
        this.id = id;
        this.owner_id = owner_id;
        this.members = [owner_id];
    }

    remove_member(id: string) {
        var idx = this.members.indexOf(id);
        if (idx >= 0)
            this.members.splice(idx, 1);
    }
}
