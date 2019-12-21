FROM node:stretch

COPY . .

RUN yarn install --dev

EXPOSE 8000

ENTRYPOINT [ "yarn", "dev" ]