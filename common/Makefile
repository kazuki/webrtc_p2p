FILES=json_rpc.ts
TARGETS=$(FILES:.ts=.external.ts)

all: $(TARGETS)
clean:
	rm -f $(TARGETS) $(TARGETS:.ts=.js)

%.external.ts: %.ts
	cp $< $@ && echo "export = WebRTCP2P;" >> $@
