/// <reference path="../typings/text-encoding.d.ts" />
/// <reference path="../interfaces/api.ts" />
/// <reference path="../common/json_rpc.ts" />
/// <reference path="../simple/client.ts" />

import IServiceInfo = WebRTCP2P.IServiceInfo;
import IGroup = WebRTCP2P.IGroup;
import GroupCapability = WebRTCP2P.GroupCapability;
import SimpleService = WebRTCP2P.Simple.Client;

class Test {
    service: WebRTCP2P.IService = null;
    encoder: TextEncoding.TextEncoder = new TextEncoder('utf-8');
    decoder: TextEncoding.TextDecoder = new TextDecoder('utf-8');

    init() {
        document.getElementById("create_group").addEventListener('click', () => {
            this._create_group();
        });
        document.getElementById("join_group").addEventListener('click', () => {
            var group_id = (<HTMLInputElement>document.getElementById('join_group_id')).value;
            this._join_group(group_id);
        });

        this.service = new SimpleService('ws://127.0.0.1:3001');
        this.service.join().then((info: IServiceInfo) => {
            document.getElementById('user_id').appendChild(document.createTextNode(info.id()));
        }, (e) => {
            console.log('join failed', e);
        });
    }

    _create_group() {
        this.service.createGroup(GroupCapability.BroadcastEveryone | GroupCapability.UnicastEveryone).then((group: IGroup) => {
            this._init_group_ui(group);
        }, (e) => {
            console.log('error(create_group):', e);
        });
    }

    _join_group(group_id: string) {
        this.service.joinGroup(group_id).then((group: IGroup) => {
            this._init_group_ui(group);
        }, (e) => {
            console.log('error(join_group):', e);
        });
    }

    _init_group_ui(group: IGroup) {
        var fieldset = document.createElement('fieldset');
        var legend = document.createElement('legend');
        var viewer = document.createElement('div');
        var post_area = document.createElement('div');
        var post_txt = <HTMLInputElement>document.createElement('input');
        var post_btn = document.createElement('button');
        legend.appendChild(document.createTextNode(group.id()));
        viewer.setAttribute('style', 'height: 30em; overflow: auto');
        post_txt.setAttribute('type', 'text');
        post_btn.appendChild(document.createTextNode('post'));
        post_area.appendChild(post_txt);
        post_area.appendChild(post_btn);
        fieldset.appendChild(legend);
        fieldset.appendChild(viewer);
        fieldset.appendChild(post_area);
        document.body.appendChild(fieldset);

        var append_log = (user_id: string, msg: string) => {
            var line = document.createElement('div');
            line.appendChild(document.createTextNode(user_id + ': ' + msg));
            viewer.appendChild(line);
        };
        var send_msg = (msg: string) => {
            var buf = this.encoder.encode(msg);
            group.broadcast(buf).then(() => {
                append_log(this.service.info().id(), msg);
            }, (e) => {
                console.log('group.broadcast failed:', e);
            });
        };
        post_btn.addEventListener('click', () => {
            send_msg(post_txt.value);
        });
        send_msg('joined');
        group.onmessage = (user_id: string, data: ArrayBuffer|ArrayBufferView) => {
            console.log('group.onmessage:', user_id, data);
            var view = <ArrayBufferView>data;
            if (!view.byteOffset)
                view = new Uint8Array(<ArrayBuffer>data, 0, data.byteLength);
            var msg = this.decoder.decode(view);
            append_log(user_id, msg);
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    var main = new Test();
    main.init();
});
