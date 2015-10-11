FILES=json_rpc.ts
TARGETS=$(FILES:.ts=.external.ts)

all: $(TARGETS)
clean:
	rm -f $(TARGETS)

%.external.ts: %.ts
	cp $< $@ && echo "export = WebRTCP2P;" >> $@
