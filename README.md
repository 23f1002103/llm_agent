Vectra ✨ - A Browser-Based Multi-Tool LLM Agent

Vectra is a proof-of-concept (POC) for a modern, browser-based AI agent. It showcases a dynamic reasoning loop that allows a Large Language Model (LLM) to intelligently use a suite of tools to perform complex tasks, including web search, code execution, and data visualization.

This project was built to demonstrate the core capabilities required for a larger Data Analyst Agent, focusing on a polished user experience and a robust, extensible tool-use architecture.


### 🚀 Live Demo

You can access and interact with the live version of the Vectra agent here:

Netlify:https://llm-assistant.netlify.app/
GitHub Pages:https://github.com/23f1002103/llm_agent

*(Note: You will need to provide your own LLM API key in the application's UI to use the agent.)*



🚀 Key Features
Vectra is packed with advanced features that go beyond a simple chatbot, creating a powerful and user-friendly experience.

🧠 Multi-Provider LLM Support: Seamlessly switch between top models from OpenAI, Google Gemini, and Anthropic.

🛠️ Dynamic Multi-Tool Reasoning Loop: The agent can autonomously decide when to use its tools to accomplish a goal.

🌐 Live Web Search: Uses the Google Search API to get up-to-date information.

💻 JavaScript Code Execution: Securely runs JS code in a sandboxed environment to perform calculations or logic.

📊 Dynamic Chart Generation: Visualizes data on the fly by generating bar, pie, and line charts using Chart.js.

👁️ Image Understanding: Can analyze and answer questions about images when using a multimodal model like Gemini.

🔐 Secure & Persistent API Key Management:

Keys are stored securely in the browser's localStorage for convenience.

A user-friendly settings modal provides transparency and allows users to clear their saved key at any time.

API keys never leave the user's computer.

✨ Polished User Experience:

Modern, animated glassmorphism UI with a custom font.

Real-time streaming responses (like ChatGPT) for OpenAI models.

"New Chat" and "Scroll to Bottom" buttons for easy navigation.

Automatic Markdown rendering for bold text and lists.

Copy-to-clipboard button for code and tool outputs.

💻 Technology Stack
This project is built entirely on frontend technologies, making it lightweight, fast, and easy to deploy.

HTML5

CSS3 (with custom animations and Flexbox)

JavaScript (ES6+)

Bootstrap 5 for the responsive framework and icons.

Chart.js for dynamic data visualization.

⚙️ Setup and Usage
Follow these steps to run Vectra on your local machine.

1. Prerequisites
You only need a modern web browser that supports JavaScript ES6 (like Chrome, Firefox, or Edge).

2. Clone the Repository
git clone [https://github.com/23f1002103/llm_agent]

3. Configuration (For Local Testing Only)
For your convenience during local development, you can add your API keys to a local configuration file. This file is intentionally excluded from Git via .gitignore to protect your keys.

In the js/ folder, find the config.js file.

Add your secret API keys:

// js/config.js
const GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY_HERE";
const GOOGLE_CX_ID = "YOUR_GOOGLE_CX_ID_HERE";
// You can also add your OpenAI or Anthropic key here for local testing
// const LLM_API_KEY = "sk-..."; 

4. Running the Application
Because this app makes API calls, it's best to run it from a simple local server to avoid any browser security issues (CORS).

Navigate to the project's root folder in your terminal.

Start Python's built-in HTTP server:

python -m http.server

(If you have Python 2, use python -m SimpleHTTPServer)

Open your browser and go to: http://localhost:8000

5. Using the Live App
When you or your evaluators visit the live deployed URL, the config.js file will not be present. The app is designed to handle this gracefully:

The user will be prompted to select a model and enter their own API key into the UI.

The key is saved to their browser's localStorage for convenience on future visits and can be cleared using the settings modal.

🧠 Core Logic Explained
The heart of Vectra is its reasoning loop, implemented in main.js. This loop replicates the logic from the project's Python example:

User Input: The user sends a message.

LLM Call: The entire conversation history, along with a detailed list of available tools (from the tools array in main.js), is sent to the selected LLM.

Decision: The LLM decides whether to respond with text or to use one or more tools.

Action:

If it's a text response, it's streamed to the UI. The loop ends until the next user input.

If it's a tool call, the handleToolCalls function is triggered. It calls the corresponding function in tools.js (e.g., googleSearch, createChart).

Loop Continuation: The result of the tool call is added to the conversation history, and the entire history is sent back to the LLM in a new API call. This allows the agent to reason about the tool's output and decide on the next step. The loop continues until the agent has a final answer for the user.

📜 License
This project is licensed under the MIT License. See the LICENSE file for details.