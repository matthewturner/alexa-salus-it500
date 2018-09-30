#!/bin/sh

rm package-previous.zip
mv package.zip package-previous.zip
npm install
zip -r package.zip package.json index.js node_modules
