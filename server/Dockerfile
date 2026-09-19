FROM node:lts-slim

WORKDIR /rr-server

COPY ./package*.json ./

RUN npm install

CMD ["npm", "run", "server"]
