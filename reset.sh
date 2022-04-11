#!/bin/sh

PROJECT_ROOT=$(git rev-parse --show-toplevel)
if [ $# -eq 1 ] && [ -e $PROJECT_ROOT/cypress/integration/$1_spec.js ]; then
	docker exec e2e touch /e2e/cypress/integration/$1_spec.js
else
	docker exec e2e touch /e2e/cypress.json
fi
