all: index.js

clean:
	rm -rf index.js

index.js: *.ts
	tsc -m commonjs index.ts
