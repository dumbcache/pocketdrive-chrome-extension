FROM node:16-alpine
WORKDIR /pocketdrive
COPY . .
RUN npm install
RUN npm run build
CMD npm run build:serve
EXPOSE 5001