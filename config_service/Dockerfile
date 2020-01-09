FROM node:stretch

COPY package*.json .

RUN yarn install

COPY . .

EXPOSE 3000

ENTRYPOINT [ "yarn", "start" ]
