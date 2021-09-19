FROM node:10.21-alpine

RUN apk -U --no-cache \
    --allow-untrusted add \
    chromium \
    python \
    git \
    && apk add --no-cache --virtual build-dependencies \
    py-pip \
    build-base \
    python-dev \
    openssl-dev \
    libffi-dev \
    && python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install --upgrade pyopenssl \
    && pip install awscli boto boto3 fabric==1.14 \
    && apk del --purge --force build-dependencies \
    && apk del --purge --force libc-utils \
    && rm -rf /var/lib/apt/lists/* \
    /var/cache/apk/* \
    /usr/share/man \
    /tmp/* \
    /usr/lib/node_modules/npm/man \
    /usr/lib/node_modules/npm/doc \
    /usr/lib/node_modules/npm/html \
    /usr/lib/node_modules/npm/scripts

ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH

COPY package.json package-lock.json /app/
RUN npm ci

ENV NODE_OPTIONS="--max_old_space_size=4096"

COPY . /app

CMD ["npm", "run", "serve"]
