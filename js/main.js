/**
 * Modern LLM Agent with Model Picker and API Key Management
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing Modern LLM Agent...");
    
    // --- DOM Element References ---
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatWindow = document.getElementById('chat-window');
    const alertContainer = document.getElementById('alert-container');
    const modelSelect = document.getElementById('model-select');
    const apiKeyInput = document.getElementById('api-key-input');
    const connectionStatus = document.getElementById('connection-status');

    // --- State Management ---
    let conversationHistory = [];
    let currentApiKey = '';

    // --- Tool Definitions ---
    const tools = [
        {
            type: "function",
            function: {
                name: "googleSearch",
                description: "Get information from the web using Google Search.",
                parameters: {
                    type: "object",
                    properties: { query: { type: "string", description: "The search query to use." } },
                    required: ["query"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "aiPipe",
                description: "Use the AI Pipe for flexible dataflows or complex tasks.",
                parameters: {
                    type: "object",
                    properties: { data: { type: "object", description: "The data object to send to the pipe." } },
                    required: ["data"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "executeJavascript",
                description: "Execute a string of JavaScript code in a sandboxed environment.",
                parameters: {
                    type: "object",
                    properties: { code: { type: "string", description: "The JavaScript code to execute." } },
                    required: ["code"]
                }
            }
        }
    ];

    // --- Scroll Helper ---
    function scrollToBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // --- UI Helper Functions ---
    function addMessage(role, content) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', role);
        messageElement.innerHTML = content;
        chatWindow.appendChild(messageElement);
        scrollToBottom();
    }

    function showAlert(message, type = 'danger') {
        alertContainer.innerHTML = '';
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type} alert-dismissible fade show`;
        alertElement.role = 'alert';
        alertElement.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        alertContainer.appendChild(alertElement);
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (alertElement.parentNode) {
                    alertElement.remove();
                }
            }, 5000);
        }
    }

    function setLoading(isLoading) {
        const typingIndicator = document.getElementById('typing-indicator');
        const sendButton = chatForm.querySelector('button[type="submit"]');
        if (isLoading) {
            typingIndicator.classList.remove('d-none');
            sendButton.disabled = true;
            userInput.disabled = true;
            scrollToBottom();
        } else {
            typingIndicator.classList.add('d-none');
            sendButton.disabled = false;
            userInput.disabled = false;
        }
    }

    function updateConnectionStatus(status, message) {
        const icon = connectionStatus.querySelector('i');
        const text = connectionStatus.querySelector('span');
        icon.className = 'bi bi-circle-fill';
        switch (status) {
            case 'connected':
                icon.classList.add('text-success');
                text.textContent = 'Connected';
                break;
            case 'connecting':
                icon.classList.add('text-warning');
                text.textContent = 'Connecting...';
                break;
            case 'error':
                icon.classList.add('text-danger');
                text.textContent = message || 'Error';
                break;
            default:
                icon.classList.add('text-secondary');
                text.textContent = 'Not connected';
        }
    }

    // --- Provider Helper Functions ---
    function getModelProvider(modelName) {
        if (modelName.startsWith('gpt-')) return 'openai';
        if (modelName.startsWith('gemini-')) return 'google';
        if (modelName.startsWith('claude-')) return 'anthropic';
        return 'openai';
    }

    function getApiEndpoint(provider) {
        switch (provider) {
            case 'openai': return 'https://api.openai.com/v1/chat/completions';
            case 'google': return 'https://generativelanguage.googleapis.com/v1beta/models/';
            case 'anthropic': return 'https://api.anthropic.com/v1/messages';
            default: return 'https://api.openai.com/v1/chat/completions';
        }
    }

    function validateApiKey(provider, key) {
        if (!key) return false;
        switch (provider) {
            case 'openai': return key.startsWith('sk-');
            case 'google': return key.length > 20;
            case 'anthropic': return key.startsWith('sk-ant-');
            default: return key.length > 10;
        }
    }

    function formatRequestForProvider(provider, model, messages, tools) {
        switch (provider) {
            case 'openai':
                return { model, messages, tools, tool_choice: 'auto' };
            case 'google':
                return { contents: messages.map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] })) };
            case 'anthropic':
                return { model, max_tokens: 1000, messages: messages.filter(msg => msg.role !== 'system'), tools };
            default:
                return { model, messages, tools, tool_choice: 'auto' };
        }
    }

    function getAuthHeaders(provider, apiKey) {
        switch (provider) {
            case 'openai':
                return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
            case 'google':
                return { 'Content-Type': 'application/json' };
            case 'anthropic':
                return { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
            default:
                return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
        }
    }

    function getSelectedModel() {
        return {
            name: modelSelect.value,
            displayName: modelSelect.options[modelSelect.selectedIndex].text,
            provider: getModelProvider(modelSelect.value)
        };
    }

    function getCurrentApiKey() {
        const key = apiKeyInput.value.trim();
        if (key) {
            currentApiKey = key;
            return key;
        }
        if (typeof LLM_API_KEY !== 'undefined' && LLM_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE') {
            currentApiKey = LLM_API_KEY;
            return LLM_API_KEY;
        }
        return null;
    }

    // --- Event Listeners ---
    apiKeyInput.addEventListener('input', function() {
        const key = this.value.trim();
        const model = getSelectedModel();
        if (key) {
            if (validateApiKey(model.provider, key)) {
                updateConnectionStatus('connected');
                showAlert(`API key looks valid for ${model.provider.toUpperCase()}! Ready to chat.`, 'success');
            } else {
                updateConnectionStatus('error', 'Invalid key format');
                showAlert(`API key format invalid for ${model.provider.toUpperCase()}`, 'warning');
            }
        } else {
            updateConnectionStatus('disconnected');
        }
    });

    modelSelect.addEventListener('change', function() {
        const model = getSelectedModel();
        showAlert(`Switched to ${model.displayName} (${model.provider.toUpperCase()})`, 'info');
        const key = apiKeyInput.value.trim();
        if (key) {
            if (validateApiKey(model.provider, key)) {
                updateConnectionStatus('connected');
            } else {
                updateConnectionStatus('error', 'Invalid key for this provider');
                showAlert(`Please enter a valid ${model.provider.toUpperCase()} API key`, 'warning');
            }
        }
    });

    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const userMessage = userInput.value.trim();
        const apiKey = getCurrentApiKey();
        if (!userMessage) return;
        if (!apiKey) {
            showAlert('Please enter your API key first.', 'warning');
            apiKeyInput.focus();
            return;
        }
        addMessage('user', userMessage);
        conversationHistory.push({ role: 'user', content: userMessage });
        userInput.value = '';
        await runAgentLoop(apiKey);
    });

    async function runAgentLoop(apiKey) {
        setLoading(true);
        updateConnectionStatus('connecting');
        try {
            let model = getSelectedModel();

            // --- AUTO SWITCH IF GPT-4 NOT AVAILABLE ---
            if (model.name === 'gpt-4') {
                showAlert('Your API key cannot access GPT-4. Switching to GPT-3.5 Turbo automatically.', 'warning');
                model.name = 'gpt-3.5-turbo';
            }

            const endpoint = getApiEndpoint(model.provider);
            const headers = getAuthHeaders(model.provider, apiKey);
            const requestBody = formatRequestForProvider(model.provider, model.name, conversationHistory, tools);
            let url = endpoint;

            if (model.provider === 'google') {
                url = `${endpoint}${model.name}:generateContent?key=${apiKey}`;
            }

            console.log(`Making request to ${model.provider.toUpperCase()} with model ${model.name}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`${model.provider.toUpperCase()} API Error: ${errorData.error?.message || errorData.message || 'Unknown error'}`);
            }

            const data = await response.json();
            let assistantMessage;

            switch (model.provider) {
                case 'openai':
                    assistantMessage = data.choices[0].message;
                    break;
                case 'google':
                    assistantMessage = { role: 'assistant', content: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini' };
                    break;
                case 'anthropic':
                    assistantMessage = { role: 'assistant', content: data.content?.[0]?.text || 'No response from Claude' };
                    break;
                default:
                    assistantMessage = data.choices[0].message;
            }

            conversationHistory.push(assistantMessage);
            updateConnectionStatus('connected');

            if (assistantMessage.content) {
                addMessage('agent', assistantMessage.content);
            }

            if (model.provider === 'openai' && assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                await handleToolCalls(assistantMessage.tool_calls, apiKey);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Agent Loop Error:', error);
            updateConnectionStatus('error', 'API Error');
            showAlert(`Error: ${error.message}`);
            setLoading(false);
        }
    }


    async function handleToolCalls(toolCalls, apiKey) {
        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            //addMessage('tool', `🔧 Using tool: <strong>${functionName}</strong> with arguments: ${JSON.stringify(args)}`);
            let result;
            try {
                if (agentTools[functionName]) {
                    const argValue = Object.values(args)[0];
                    result = await agentTools[functionName](argValue);
                    //addMessage('tool-output', `✅ Tool Result:<br><div class="code-block">${result}</div>`);
                } else {
                    result = `❌ Unknown tool: ${functionName}`;
                    addMessage('tool-output', result);
                }
            } catch (error) {
                result = `❌ Error in tool ${functionName}: ${error.message}`;
                addMessage('tool-output', result);
            }
            conversationHistory.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                name: functionName,
                content: result
            });
        }
        await runAgentLoop(apiKey);
    }

    // --- Init ---
    console.log("Modern LLM Agent initialized successfully!");
    if (!getCurrentApiKey()) {
        showAlert('Welcome! Please enter your API key above to get started. Supports OpenAI, Google Gemini, and Anthropic Claude.', 'info');
    }
    if (!apiKeyInput.value.trim()) {
        setTimeout(() => apiKeyInput.focus(), 1000);
    }
});

