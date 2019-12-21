FROM node:stretch

COPY . .

RUN yarn install --dev

# RUN yarn build

EXPOSE 8000

ENTRYPOINT [ "yarn", "dev" ]