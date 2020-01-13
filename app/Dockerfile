FROM node:stretch as build

WORKDIR /app

COPY package*.json .

RUN yarn install --dev

COPY . .

RUN yarn build

FROM httpd:2.4
COPY --from=build /app/dist /usr/local/apache2/htdocs/

EXPOSE 80
EXPOSE 8000
