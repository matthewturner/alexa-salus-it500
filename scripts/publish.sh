#!/bin/sh

aws lambda update-function-code --function-name Salus --zip-file fileb://scripts/package.zip --profile salus
aws lambda update-function-code --function-name smartheat-google-assistant --zip-file fileb://scripts/package.zip --profile salus
