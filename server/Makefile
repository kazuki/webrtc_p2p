TARGETS:=index.js

all: $(TARGETS)
clean:
	rm -rf $(TARGETS)

%.js: %.ts
	tsc -m commonjs $<
