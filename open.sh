#!/bin/sh

open -a XQuartz

IP=$(ipconfig getifaddr en0)
xhost + $IP

export DISPLAY=$IP:0
docker-compose -f cy-open.yml up --exit-code-from e2e

