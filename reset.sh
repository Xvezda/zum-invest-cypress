#!/bin/sh

if [ $# -eq 1 ]; then
	[ -e /e2e/cypress/integration/$1_spec.js ] && \
		docker exec e2e touch /e2e/cypress/integration/$1_spec.js
else
	docker exec e2e touch /e2e/cypress.json
fi
