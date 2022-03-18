FROM cypress/browsers:node16.14.0-slim-chrome99-ff97

WORKDIR /app
COPY ./package.json ./package.json
COPY ./cypress.json ./cypress.json
COPY ./cypress ./cypress
RUN yarn install
CMD yarn test
