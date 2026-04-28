# Web-based coding assistant

This directory contains an empty git repository.

I would like you to write a simple web-based coding assistant, to be served by:

`python -m  http.server`

All data should be stored in browser local storage.

The front page should allow the user to enter a Google Cloud API key and the user should then be taken to the main page.

## Language

The assistant should write Javascript code so that it can be evaluated directly in the browser.

## Main Page

This should have a left-hand pane split between a view of the code being written (at the top) and commands from the user at the bottom.
The right hand pane should show a rendering of the application (evaluating the javascript in the top of the left hand pane).

## Functionality

The top left pane should allow the user to directly edit the code.
The bottom left pane should allow the user to edit the code by making requests to the hosted GLM-5 model.

## Model

Use the Google Cloud API key to access the GLM-5 model hosted on Vertex AI:

```
ENDPOINT=aiplatform.googleapis.com
REGION=global
PROJECT_ID="YOUR_PROJECT_ID"

curl \
  -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" https://${ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${REGION}/endpoints/openapi/chat/completions \
  -d '{"model":"zai-org/glm-5-maas", "stream":true, "messages":[{"role": "user", "content": "Summer travel plan to Paris"}]}'
```

## Configuration settings

You should use the following settings, but keep them in the code as manifest constants in a single `config.json` file which is read from the server so as to make them easy to change.

 * Use the `aitest-492316` project
 * Use the `global` `REGION`
