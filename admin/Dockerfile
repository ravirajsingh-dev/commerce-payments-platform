FROM node:lts-alpine

WORKDIR /rr-admin

# install app dependencies
COPY ./package*.json ./

RUN npm install

CMD [ "npm", "run", "dev" ]
