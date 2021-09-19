#!/usr/bin/env bash
app="g-web"
tag="dev"
docker build -t ${app}:${tag} .
docker run \
    -i \
    --rm \
    --name=${app} \
    --user=${UID} \
    --net=host \
    -e AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
    -e AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
    -v $PWD:/app \
    -v /app/node_modules/ \
    -v $HOME/.aws/credentials:/home/node/.aws/credentials:ro \
    ${app}:${tag} $@
