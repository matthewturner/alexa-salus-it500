#!/bin/sh

aws lambda update-function-code --function-name Salus --zip-file fileb://scripts/package.zip --profile salus
