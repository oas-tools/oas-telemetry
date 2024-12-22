# Use node:20 instead of node20:alpine
# Alpine version will make nedb to slow the system by 20ms per request (8h of tedious debugging)
FROM node:20 

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

WORKDIR /app/test/performance/ks-api
COPY test/performance/ks-api/package.json test/performance/ks-api/package-lock.json ./
RUN npm install
COPY ./test/performance/ks-api .

WORKDIR /app
COPY ./dist ./dist


ENV OASTLM_MODULE_DISABLED=false
ENV INDEX_SELECTOR=
ENV DOCKER_ENV=true


WORKDIR /app/test/performance/ks-api
CMD ["node", "indexSelector.js"]