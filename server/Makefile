TARGETS:=index.js

all: $(TARGETS)
clean:
	rm -rf $(TARGETS)

index.js: index.ts ../simple/server.ts ../common/json_rpc.ts
	tsc -m commonjs $<
