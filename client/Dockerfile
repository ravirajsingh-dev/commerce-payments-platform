FROM node:lts-alpine

WORKDIR /rr-client

# install app dependencies
COPY ./package*.json ./

RUN npm install

CMD [ "npm", "run", "dev"]
