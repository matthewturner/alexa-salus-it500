FROM node:8.15.1-alpine

WORKDIR /usr/app

RUN apk update && apk add bash git

COPY package.json .
RUN npm install --quiet

COPY . .