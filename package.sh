#!/bin/sh

rm package.zip
npm install
zip -r package.zip package.json index.js node_modules
