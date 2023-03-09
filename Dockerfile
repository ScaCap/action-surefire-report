FROM node:16-bullseye-slim

COPY dist /dist

ENTRYPOINT ["node", "/dist/index.js"]
