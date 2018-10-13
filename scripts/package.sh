#!/bin/sh

rm ./scripts/package-previous.zip
mv ./scripts/package.zip ./scripts/package-previous.zip
npm install --only prod
7z a -r ./scripts/package.zip package.json aws/*.js core/*.js thermostats/*.js node_modules
