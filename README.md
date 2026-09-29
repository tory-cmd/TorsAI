# TorsAI

A personal coding assistant you can run and customize. It opens a chat app in your browser and talks only to Ollama on this same computer (`127.0.0.1`). Prompts are processed by the model on your laptop; this project does not call a hosted AI service.

## Get started

1. Install [Node.js 18 or newer](https://nodejs.org/) and [Ollama](https://ollama.com/download).
2. While online, download the model once and start it:

   ```sh
   ollama run qwen2.5-coder:7b
   ```

   Wait for the model to finish downloading. After that, Ollama runs the model locally; you can exit Ollama's chat with `/bye`. The default model download is about 4.7 GB. [Ollama model details](https://ollama.com/library/qwen2.5-coder)
3. In this project folder, start your assistant. It will open the app in your browser:

   ```sh
   npm start
   ```

   Keep the terminal window open while using TorsAI. Press `Ctrl+C` there to close the app.

## Make it yours

Open `ai.js` and change `ASSISTANT_NAME` and `SYSTEM_PROMPT` to give it your name, tone, and coding rules. For example, tell it which languages you use or how detailed its explanations should be.

To use another Ollama model, set `CODING_AI_MODEL` before starting it:

```sh
CODING_AI_MODEL=qwen2.5-coder:3b npm start
```

The app suggests code and explains fixes, but it does not open or edit project files on its own. It listens only on your computer at `http://127.0.0.1:4317`.

## What "local" means

The model answers using your laptop's processor or supported graphics hardware and uses your laptop's memory and disk. You need model files: the model has already learned language and code during training, and those learned values are stored in the download. The model download needs internet once. To run without internet afterward, keep the model installed and start Ollama locally before using this app.
