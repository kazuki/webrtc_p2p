all: test.js

clean:
	rm -f test.js

test.js: test.ts ../interfaces/api.ts ../common/json_rpc.ts ../simple/client.ts
	tsc --out test.js test.ts
