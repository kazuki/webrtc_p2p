/// <reference path="../typings/es6-promise.d.ts" />

// クライアントサイドのAPI定義

module WebRTCP2P {

export interface IService {
    join(): Promise<IServiceInfo>;
    close();
    info(): IServiceInfo;

    createGroup(cap: GroupCapability): Promise<IGroup>;
    joinGroup(id: string): Promise<IGroup>;
}

export enum GroupCapability {
    BroadcastOwner    = 1,
    BroadcastEveryone = 2,
    UnicastOwner      = 4,
    UnicastEveryone   = 8,
}

export interface IServiceInfo {
	id(): string;
}

export interface IGroup {
    onmessage: (user_id: string, data: ArrayBuffer|ArrayBufferView) => void;

    id(): string;
    capability(): GroupCapability;

    // グループの参加者全員にデータを送ります
    broadcast(data: ArrayBuffer|ArrayBufferView): Promise<any>;

    // 指定したIDを持つユーザにデータを送り，返信を受け取ります
    unicast(target: string, data: ArrayBuffer|ArrayBufferView): Promise<ArrayBufferView>;
}

}
