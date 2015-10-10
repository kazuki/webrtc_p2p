all: test.js

clean:
	rm -f test.js

test.js: *.ts ../simple/*.ts ../common/*.ts
	tsc --out test.js test.ts
