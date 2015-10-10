/// <reference path="../typings/es6-promise.d.ts" />

// クライアントサイドのAPI定義

interface IService {
    join(): Promise<IServiceInfo>;
    close();

    createGroup(cap: GroupCapability): Promise<IGroup>;
    joinGroup(id: string): Promise<IGroup>;
}

declare enum GroupCapability {
    BroadcastOwner    = 1,
    BroadcastEveryone = 2,
    UnicastOwner      = 4,
    UnicastEveryone   = 8,
}

interface IServiceInfo {
	id(): string;
}

interface IGroup {
    id(): string;
    capability(): GroupCapability;

    // グループの参加者全員にデータを送ります
    broadcast(data: ArrayBuffer|ArrayBufferView): Promise<any>;

    // 指定したIDを持つユーザにデータを送り，返信を受け取ります
    unicast(target: string, data: ArrayBuffer|ArrayBufferView): Promise<ArrayBufferView>;
}
