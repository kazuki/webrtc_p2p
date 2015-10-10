/// <reference path="../interfaces/api.d.ts" />
/// <reference path="../simple/client.ts" />
class Test {
    service: IService = null;

    init() {
        document.getElementById('join_service').addEventListener('click', () => {
            if (this.service) {
                alert('already joined ?');
                return;
            }
            this.service = new SimpleService('ws://127.0.0.1:3001');
            this.service.join().then((info: IServiceInfo) => {
                console.log(info);
            }, (e) => {
                console.log('join failed', e);
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    var main = new Test();
    main.init();
});
