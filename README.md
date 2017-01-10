# alexa-salus-it500

An Alexa App (skill) to control a Salus IT500 internet thermostat. Please note that this is really ugly because Salus don't provide any kind of API. This skill logs onto their web app using your username and passwords and sets the temperature as you would in their mobile (web) app. For that reason, you need to embed your login details into the index.js and host this skill yourself ! Do not offer this skill in the Alexa store for other people because it's not secure to collect other people's usernames and passwords. 

Until Salus provide their own Alexa skill or a federated authentication method then this is the only option, unfortunately. 


## Summary

This app is a Node.js module, written using the excellent [alexa-app](https://www.npmjs.com/package/alexa-app) module framework by Matt Kruse [gitub](https://github.com/matt-kruse/alexa-app-server/blob/master/README.md)

This skill has 3 intents :-

alexa, ask boiler the temperature
alexa, ask boiler to set higher
alexa, ask boiler to set lower


## Setting Up

Setup an [alexa-app-server](https://github.com/matt-kruse/alexa-app-server)

Check out this project, 

Put your login email and password in index.js

Add this module to alexa-app-server

Test on http://localhost:8080/alexa/boiler

Create a new skill in https://developer.amazon.com

Point to your SSL'd external URL or host in AWS Lambda



