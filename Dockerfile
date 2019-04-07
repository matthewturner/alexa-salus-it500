FROM node:7.7.2-alpine

WORKDIR /usr/app

RUN apk update

COPY package.json .
RUN npm install --quiet

COPY . .