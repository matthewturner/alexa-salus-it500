#!/bin/sh

rm ./scripts/package-previous.zip
mv ./scripts/package.zip ./scripts/package-previous.zip
npm install --only prod
7z a -r ./scripts/package.zip package.json node_modules
cd src
7z a -r ../scripts/package.zip aws/*.js aws/handlers/*.js google/*.js core/*.js thermostats/*.js
