#!/bin/sh

aws lambda update-function-code --function-name Salus --zip-file fileb://package.zip --profile salus
