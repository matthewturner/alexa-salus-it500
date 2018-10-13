#!/bin/sh

# copy this file as test.sh and add the values
# to test the command:
#    "Turn on"

export DEFAULT_ON_TEMP=
export DEFAULT_OFF_TEMP=
export USERNAME=
export PASSWORD=
export TARGET_TEMPERATURE=
export THERMOSTAT_TYPE=

# add these extra ones to test the command:
#    "Turn on for 1 hour"
export STEP_FUNCTION_ARN=
export ALEXA_OFF_VALUE_ID=
export ALEXA_USER_ID=
export ALEXA_AUTHORITY=
export ALEXA_DEVICE=
export ALEXA_REQUEST_ID=
export AWS_PROFILE=
export AWS_REGION=
export DURATION=PT1H
export HOLD_STRATEGY=aws
export THERMOSTAT_REPOSITORY=aws

node ./core/test.js