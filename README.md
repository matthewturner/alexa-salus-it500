# alexa-salus-it500

An Alexa App (skill) to control a Salus IT500 internet thermostat. Please note that this is really ugly because Salus don't provide any kind of API. This skill logs onto their web app using your username and password and sets the temperature as you would in their mobile (web) app. For that reason, you need to embed your login details into web app and host this skill yourself! Do not offer this skill in the Alexa store for other people because it's not secure to collect other people's usernames and passwords.

Until Salus provide their own Alexa skill or a federated authentication method then this is the only option, unfortunately.

## Summary

This app is a Node.js module, written using the excellent [alexa-app](https://www.npmjs.com/package/alexa-app) module framework by Matt Kruse [github](https://github.com/matt-kruse/alexa-app-server/blob/master/README.md)

This skill has 5 intents :-

* Alexa, ask boiler the temperature
* Alexa, ask boiler to set higher
* Alexa, ask boiler to set lower
* Alexa, ask boiler to set to x degrees
* Alexa, ask boiler to turn [on/off] [for x hours]

## Auto-switch off/Hold time

Some thermostats have a hold time which keeps the thermostat on for the specified time and automatically switches it off when the hold time has elapsed.

The last intent can take an optional duration which can be any valid time statement (eg 20 minutes or 3 hours).

* You will need to prevent Salus from overriding this by setting the off times to a late time (eg 10pm)
* It is optional and requires a hosted lambda, step function and dynamodb table
* Cancellation of the hold-time is not yet supported; the boiler will switch off

## Setting Up

1. Setup an [alexa-app-server](https://github.com/matt-kruse/alexa-app-server)

1. Check out this project

1. Add this module to alexa-app-server

1. Launch server with your personal credentials as environment variables (eg USERNAME=xyz PASSWORD=abc)

1. Test on <http://localhost:8080/alexa/boiler>

1. Create a new skill in <https://developer.amazon.com>

1. Declare your username/password and the default temperatures for on/off using environment variables

1. Point to your SSL'd external URL or host in AWS Lambda

1. Optionally create the step function and dynamodb table for hold times/auto-switch off