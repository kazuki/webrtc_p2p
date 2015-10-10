# webrtc_p2p
General-Purpose P2P Communitation Framework based on WebRTC DataChannel

2013年4月に作った[WebRTC ALM](https://github.com/kazuki/webrtc_alm)では，
配信木を用いた配信のみが可能だったが，
ここでは配信の他にも双方向通信等にも対応する，
P2PネットワークをWebRTC DataChannelを使って実現する．

## API

[interfaces/api.d.ts](./interfaces/api.d.ts)を参照

## ディレクトリ構造

* interfaces: インタフェース定義ファイルが入る
* simple: シンプル実装関係のファイルが入る
* server: サーバのサンプル
* frontend: フロントエンドのサンプル
* typings: TypeScriptの定義ファイル入れ

## 実装

### シンプル

最も単純な実装．以下のような特徴を持つ．

* グループの参加者とはフルメッシュで接続する
* NAT等の理由でフルメッシュ接続出来ないノードが居る場合の挙動は未定義
* サーバと常にWebSocket接続を維持する

#### RPC (client->server)

##### init(): string

* 引数: なし
* 戻り値: ユーザID
* 説明: サービスに参加する．戻り値としてエフェメラルなユーザIDが返却される

##### create(): string

* 引数: なし
* 戻り値: グループID
* 説明: 新しくグループを作る

##### join(group_id: string)

* 引数: グループID
* 戻り値: なし
* 説明: 指定したグループに参加する

##### leave(group_id: string)

* 引数: グループID
* 戻り値: なし
* 説明: 指定したグループから離脱する

##### get_members(group_id: string): Array<string>

* 引数: グループID
* 戻り値: 参加者のID一覧 (自身も含まれる)
* 説明: グループに参加しているメンバ一覧を取得

##### relay(group_id: string, user_id: string, data: any): any;

* 引数: グループID, ユーザID, メッセージ
* 戻り値: メッセージ
* 説明: 指定したユーザにメッセージを転送し，応答をもらう

#### RPC (server->client)

##### relay(group_id: string, user_id: string, data: any): any;

* 引数: グループID, ユーザID, メッセージ
* 戻り値: メッセージ
* 説明: 引数のユーザから転送されてきたメッセージを受信し，応答を返す

#### グループ作成〜加入の流れ

```
[UA0]          [Server]           [UA1]
  |                |                |
  |<-----[WS]----->|                |
  |                |<-----[WS]----->|
  |<----[init]---->|                |
  |<---[create]--->|                |
  |                |<----[init]---->|
  |                |<----[join]---->|
  |                |<-[getmembers]->|
  |                |<-[relay:offer]-|
  |<-[relay:offer]-|                |
  |--[relay:ans]-->|                |
  |                |--[relay:ans]-->|
  |                |<--[relay:ice]--|
  |<--[relay:ice]--|                |
  |--[relay:ice]-->|                |
  |                |--[relay:ice]-->|
  |                |                |              [UA2]
  |<-[PeerConnection  Established]->|                |
  |                |                |                |
  |                |<-------------[WS]-------------->|
  |                |<------------[init]------------->|
  |                |<------------[join]------------->|
  |                |<---------[get_members]--------->|
  |                |<---------[relay0:offer]---------|
  |                |<---------[relay1:offer]---------|
  |<[relay0:offer]-|                |                |
  |                |-[relay1:offer]>|                |
  |--[relay1:ans]->|<-[relay1:ans]--|                |
  |                |----------[relay0:answer]------->|
  |                |----------[relay1:answer]------->|
  |                |<----------[relay0:ice]----------|
  |                |<----------[relay1:ice]----------|
  |<-[relay0:ice]--|                |                |
  |                |--[relay1:ice]->|                |
  |--[relay1:ice]->|<-[relay1:ice]--|                |
  |                |-----------[relay0:ice]--------->|
  |                |-----------[relay1:ice]--------->|
  |                |                |                |
  |<----------[PeerConnection Established]---------->|
  |                |                |<-[PConn Est.]->|
```
