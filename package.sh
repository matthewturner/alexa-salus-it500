#!/bin/sh

rm package-previous.zip
mv package.zip package-previous.zip
npm install
7z a -r package.zip package.json index.js helpers.js SalusClient.js node_modules
