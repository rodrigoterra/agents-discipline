FROM node:22.10-bookworm-slim

WORKDIR /workspace/voice-radio-poc

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/schema/package.json packages/schema/package.json
COPY packages/script-composer/package.json packages/script-composer/package.json
COPY packages/tts/package.json packages/tts/package.json
COPY packages/audio-fx/package.json packages/audio-fx/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY . .

EXPOSE 3001 5173
CMD ["npm", "run", "dev"]
