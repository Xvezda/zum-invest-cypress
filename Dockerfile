FROM cypress/browsers:node16.14.0-slim-chrome99-ff97

WORKDIR /app
COPY ./yarn.lock ./yarn.lock
COPY ./package.json ./package.json
RUN yarn install

COPY ./cypress.json ./cypress.json
COPY ./cypress ./cypress
CMD npx cypress run
