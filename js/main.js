/**
 * Modern LLM Agent with Chat Export and Usage Analytics
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing Modern LLM Agent...");
    
    // --- DOM Element References ---
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatWindow = document.getElementById('chat-window');
    const scrollToBottomBtn = document.getElementById('scroll-to-bottom-btn'); // <-- ADDED
    const alertContainer = document.getElementById('alert-container');
    const modelSelect = document.getElementById('model-select');
    const apiKeyInput = document.getElementById('api-key-input');
    const connectionStatus = document.getElementById('connection-status');
    const attachFileBtn = document.getElementById('attach-file-btn');
    const fileInput = document.getElementById('file-input');
    const filePreviewContainer = document.getElementById('file-preview-container');
    const previewImage = document.getElementById('preview-image');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const confirmClearApiKeyBtn = document.getElementById('confirm-clear-api-key-btn');
    const apiKeyModalEl = document.getElementById('apiKeyModal');
    const apiKeyModal = new bootstrap.Modal(apiKeyModalEl);
    
    // NEW: Export/Analytics elements
    const exportBtn = document.getElementById('export-btn');
    const analyticsBtn = document.getElementById('analytics-btn');
    const analyticsModal = new bootstrap.Modal(document.getElementById('analyticsModal'));
    const resetAnalyticsBtn = document.getElementById('reset-analytics-btn');

    // --- State Management ---
    let conversationHistory = [];
    let uploadedFile = null;
    let sessionStartTime = Date.now();

    // --- Analytics State ---
    let analytics = {
        totalMessages: 0,
        apiCalls: 0,
        toolCalls: 0,
        toolUsage: {},
        modelUsage: {},
        sessionStart: Date.now()
    };

    // --- Tool Definitions ---
    const tools = [
        { type: "function", function: { name: "googleSearch", description: "Get information from the web using Google Search.", parameters: { type: "object", properties: { query: { type: "string", description: "The search query to use." } }, required: ["query"] } } },
        { type: "function", function: { name: "aiPipe", description: "Use the AI Pipe for flexible dataflows or complex tasks.", parameters: { type: "object", properties: { data: { type: "object", description: "The data object to send to the pipe." } }, required: ["data"] } } },
        { type: "function", function: { name: "executeJavascript", description: "Execute a string of JavaScript code in a sandboxed environment.", parameters: { type: "object", properties: { code: { type: "string", description: "The JavaScript code to execute." } }, required: ["code"] } } },
        {
            type: "function",
            function: {
                name: "createChart",
                description: "Create a chart or graph visualization using Chart.js. Supports types like 'bar', 'line', 'pie', 'doughnut', and 'radar'.",
                parameters: {
                    type: "object",
                    properties: {
                        chartConfig: {
                            type: "object",
                            description: "A configuration object that follows the Chart.js structure. It must include 'type', 'data', and optionally 'options'. The 'data' object needs 'labels' (an array of strings) and 'datasets' (an array of objects, each with a 'label' and a 'data' array of numbers).",
                            properties: {
                                type: { type: "string", enum: ["bar", "line", "pie", "doughnut", "radar", "polarArea"] },
                                data: {
                                    type: "object",
                                    properties: {
                                        labels: { type: "array", items: { type: "string" } },
                                        datasets: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    label: { type: "string" },
                                                    data: { type: "array", items: { type: "number" } }
                                                },
                                                required: ["label", "data"]
                                            }
                                        }
                                    },
                                    required: ["labels", "datasets"]
                                },
                                options: { type: "object" }
                            },
                            required: ["type", "data"]
                        }
                    },
                    required: ["chartConfig"]
                }
            }
        }
    ];

    // --- Helper Functions ---
    function scrollToBottom() {
        chatWindow.scrollTo({
            top: chatWindow.scrollHeight,
            behavior: 'smooth'
        });
    }

    function markdownToHtml(text) {
        if (!text) return '';
        text = text.trim();
        let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const lines = html.split('\n');
        let inList = false;
        let processedHtml = '';
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('* ')) {
                if (!inList) {
                    processedHtml += '<ul>';
                    inList = true;
                }
                processedHtml += `<li>${trimmedLine.substring(2)}</li>`;
            } else {
                if (inList) {
                    processedHtml += '</ul>';
                    inList = false;
                }
                if (trimmedLine.length > 0) {
                    processedHtml += `<p>${line}</p>`;
                }
            }
        }
        if (inList) {
            processedHtml += '</ul>';
        }
        if (processedHtml.endsWith('<br>')) {
            processedHtml = processedHtml.slice(0, -4);
        }
        return processedHtml;
    }

    function addMessage(role, content) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', role);
        const formattedContent = (role === 'agent') ? markdownToHtml(content) : content;
        messageElement.innerHTML = formattedContent;
        chatWindow.appendChild(messageElement);

        // Update analytics
        analytics.totalMessages++;
        updateAnalyticsStorage();

        if (role === 'tool-output') {
            const codeBlock = messageElement.querySelector('.code-block');
            if (codeBlock) {
                const copyBtn = document.createElement('button');
                copyBtn.className = 'btn btn-sm btn-copy';
                copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                codeBlock.appendChild(copyBtn);
            }
        }
        scrollToBottom();
        return messageElement;
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
        } else {
            typingIndicator.classList.add('d-none');
            sendButton.disabled = false;
            userInput.disabled = false;
        }
        scrollToBottom();
    }

    function updateConnectionStatus(status, message) {
        const icon = connectionStatus.querySelector('i');
        const text = connectionStatus.querySelector('span');
        icon.className = 'bi bi-circle-fill';
        switch (status) {
            case 'connected': icon.classList.add('text-success'); text.textContent = 'Connected'; break;
            case 'connecting': icon.classList.add('text-warning'); text.textContent = 'Connecting...'; break;
            case 'error': icon.classList.add('text-danger'); text.textContent = message || 'Error'; break;
            default: icon.classList.add('text-secondary'); text.textContent = 'Not connected';
        }
    }
    
    function resetChat() {
        console.log("Resetting chat...");
        conversationHistory = [];
        chatWindow.innerHTML = '';

        const promptsContainer = document.createElement('div');
        promptsContainer.id = 'example-prompts';
        promptsContainer.className = 'marquee';
        promptsContainer.innerHTML = `
            <div class="marquee-content">
                <div class="prompt-btn" data-prompt="Latest breakthroughs in AI technology">🚀 What's new in Tech?</div>
                <div class="prompt-btn" data-prompt="Top universities for computer science">🎓 Best CS Universities</div>
                <div class="prompt-btn" data-prompt="Best places to travel in Japan">✈️ Travel to Japan</div>
                <div class="prompt-btn" data-prompt="Future of renewable energy">💡 Renewable Energy Trends</div>
                <div class="prompt-btn" data-prompt="How do online courses work?">📚 How do online courses work?</div>
                <div class="prompt-btn" data-prompt="Hidden gems in Southeast Asia">🌏 Hidden Gems in Asia</div>
                <div class="prompt-btn" data-prompt="Latest breakthroughs in AI technology">🚀 What's new in Tech?</div>
                <div class="prompt-btn" data-prompt="Top universities for computer science">🎓 Best CS Universities</div>
                <div class="prompt-btn" data-prompt="Best places to travel in Japan">✈️ Travel to Japan</div>
                <div class="prompt-btn" data-prompt="Future of renewable energy">💡 Renewable Energy Trends</div>
                <div class="prompt-btn" data-prompt="How do online courses work?">📚 How do online courses work?</div>
                <div class="prompt-btn" data-prompt="Hidden gems in Southeast Asia">🌏 Hidden Gems in Asia</div>
            </div>
        `;
        chatWindow.appendChild(promptsContainer);

        const initialAgentMessage = document.createElement('div');
        initialAgentMessage.className = 'message agent';
        initialAgentMessage.textContent = 'Hello! How can I assist you today?';
        chatWindow.appendChild(initialAgentMessage);

        const typingIndicator = document.createElement('div');
        typingIndicator.id = 'typing-indicator';
        typingIndicator.className = 'message agent d-none';
        typingIndicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        chatWindow.appendChild(typingIndicator);

        clearFileUpload();
        document.getElementById('alert-container').innerHTML = '';
        
        // Reset session start time
        sessionStartTime = Date.now();
        analytics.sessionStart = Date.now();
        updateAnalyticsStorage();
        
        showAlert('New chat started.', 'info');
    }

    // --- Analytics Functions ---
    function loadAnalytics() {
        const saved = localStorage.getItem('vectra_analytics');
        if (saved) {
            analytics = { ...analytics, ...JSON.parse(saved) };
        }
    }

    function updateAnalyticsStorage() {
        localStorage.setItem('vectra_analytics', JSON.stringify(analytics));
    }

    function updateAnalyticsDisplay() {
        document.getElementById('total-messages').textContent = analytics.totalMessages;
        document.getElementById('api-calls').textContent = analytics.apiCalls;
        document.getElementById('tool-calls').textContent = analytics.toolCalls;
        
        // Calculate session time
        const sessionTime = Math.floor((Date.now() - analytics.sessionStart) / 1000 / 60);
        document.getElementById('session-time').textContent = `${sessionTime}m`;

        // Update tool usage
        const toolUsageList = document.getElementById('tool-usage-list');
        toolUsageList.innerHTML = '';
        if (Object.keys(analytics.toolUsage).length === 0) {
            toolUsageList.innerHTML = '<div class="tool-usage-item"><span>No tools used yet</span></div>';
        } else {
            const sortedTools = Object.entries(analytics.toolUsage).sort((a, b) => b[1] - a[1]);
            sortedTools.forEach(([tool, count]) => {
                const item = document.createElement('div');
                item.className = 'tool-usage-item';
                item.innerHTML = `<span>${tool}</span><span class="badge bg-primary">${count}</span>`;
                toolUsageList.appendChild(item);
            });
        }

        // Update model usage
        const modelUsageList = document.getElementById('model-usage-list');
        modelUsageList.innerHTML = '';
        if (Object.keys(analytics.modelUsage).length === 0) {
            modelUsageList.innerHTML = '<div class="model-usage-item"><span>No models used yet</span></div>';
        } else {
            const sortedModels = Object.entries(analytics.modelUsage).sort((a, b) => b[1] - a[1]);
            sortedModels.forEach(([model, count]) => {
                const item = document.createElement('div');
                item.className = 'model-usage-item';
                item.innerHTML = `<span>${model}</span><span class="badge bg-success">${count}</span>`;
                modelUsageList.appendChild(item);
            });
        }
    }

    function trackApiCall(modelName) {
        analytics.apiCalls++;
        if (analytics.modelUsage[modelName]) {
            analytics.modelUsage[modelName]++;
        } else {
            analytics.modelUsage[modelName] = 1;
        }
        updateAnalyticsStorage();
    }

    function trackToolCall(toolName) {
        analytics.toolCalls++;
        if (analytics.toolUsage[toolName]) {
            analytics.toolUsage[toolName]++;
        } else {
            analytics.toolUsage[toolName] = 1;
        }
        updateAnalyticsStorage();
    }

    // --- Export Function ---
    function exportChat() {
        const exportData = {
            timestamp: new Date().toISOString(),
            model: getSelectedModel(),
            conversationHistory: conversationHistory,
            analytics: analytics,
            sessionDuration: Date.now() - sessionStartTime
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `vectra-chat-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        link.click();
        
        showAlert('Chat exported successfully!', 'success');
    }

    // --- Provider Helper Functions ---
    function getModelProvider(modelName) {
        if (!modelName) return null;
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
        if (!key || !provider) return false;
        switch (provider) {
            case 'openai': return key.startsWith('sk-');
            case 'google': return key.length > 20;
            case 'anthropic': return key.startsWith('sk-ant-');
            default: return key.length > 10;
        }
    }

    function formatRequestForProvider(provider, model, messages, tools) {
        if (provider === 'google' && uploadedFile) {
            const lastUserMessage = messages[messages.length - 1];
            const otherMessages = messages.slice(0, -1);
            const multimodalContent = {
                role: 'user',
                parts: [
                    { text: lastUserMessage.content },
                    { inline_data: { mime_type: uploadedFile.type, data: uploadedFile.base64 } }
                ]
            };
            return { contents: [...otherMessages.map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] })), multimodalContent] };
        }
        switch (provider) {
            case 'openai': return { model, messages, tools, tool_choice: 'auto' };
            case 'google': return { contents: messages.map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] })) };
            case 'anthropic': return { model, max_tokens: 1000, messages: messages.filter(msg => msg.role !== 'system'), tools };
            default: return { model, messages, tools, tool_choice: 'auto' };
        }
    }

    function getAuthHeaders(provider, apiKey) {
        switch (provider) {
            case 'openai': return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
            case 'google': return { 'Content-Type': 'application/json' };
            case 'anthropic': return { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
            default: return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
        }
    }

    function getSelectedModel() {
        if (modelSelect.value === "") return null;
        return { name: modelSelect.value, displayName: modelSelect.options[modelSelect.selectedIndex].text, provider: getModelProvider(modelSelect.value) };
    }

    // --- API Key Management with localStorage ---
    function getCurrentApiKey() {
        const key = apiKeyInput.value.trim();
        if (key) {
            return key;
        }
        if (typeof LLM_API_KEY !== 'undefined' && LLM_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE') {
            return LLM_API_KEY;
        }
        return null;
    }

    function loadApiKey() {
        const savedKey = localStorage.getItem('vectra_api_key');
        if (savedKey) {
            apiKeyInput.value = savedKey;
            apiKeyInput.dispatchEvent(new Event('input'));
        }
    }

    function saveApiKey(key) {
        localStorage.setItem('vectra_api_key', key);
    }

    function clearApiKey() {
        localStorage.removeItem('vectra_api_key');
        apiKeyInput.value = '';
        apiKeyInput.dispatchEvent(new Event('input'));
        apiKeyModal.hide();
        showAlert('API key has been cleared from your browser.', 'info');
    }

    // --- File Handling Logic ---
    attachFileBtn.addEventListener('click', () => fileInput.click());
    removeFileBtn.addEventListener('click', clearFileUpload);

    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const model = getSelectedModel();
        if (!model || model.provider !== 'google') {
            showAlert('Image upload is only supported for Google Gemini models.', 'warning');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedFile = { name: file.name, type: file.type, base64: e.target.result.split(',')[1] };
            previewImage.src = e.target.result;
            filePreviewContainer.classList.remove('d-none');
            showAlert(`Attached ${file.name}. Add a prompt and send.`, 'info');
        };
        reader.readAsDataURL(file);
    });

    function clearFileUpload() {
        uploadedFile = null;
        fileInput.value = '';
        filePreviewContainer.classList.add('d-none');
        previewImage.src = '#';
    }
    
    // --- Event Listeners ---
    newChatBtn.addEventListener('click', resetChat);
    confirmClearApiKeyBtn.addEventListener('click', clearApiKey);

    // Export/Analytics Event Listeners
    exportBtn.addEventListener('click', exportChat);
    
    analyticsBtn.addEventListener('click', updateAnalyticsDisplay);
    resetAnalyticsBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset all analytics data?')) {
            analytics = {
                totalMessages: 0,
                apiCalls: 0,
                toolCalls: 0,
                toolUsage: {},
                modelUsage: {},
                sessionStart: Date.now()
            };
            updateAnalyticsStorage();
            updateAnalyticsDisplay();
            showAlert('Analytics data has been reset.', 'info');
        }
    });

    apiKeyInput.addEventListener('input', function() {
        const key = this.value.trim();
        saveApiKey(key);
        
        const model = getSelectedModel();
        if (key) {
            if (model && validateApiKey(model.provider, key)) {
                updateConnectionStatus('connected');
            } else if (model) {
                updateConnectionStatus('error', 'Invalid key format');
            }
        } else {
            updateConnectionStatus('disconnected');
        }
    });

    modelSelect.addEventListener('change', function() {
        const model = getSelectedModel();
        if(model) {
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
        }
    });

    chatWindow.addEventListener('click', (event) => {
        const promptBtn = event.target.closest('.prompt-btn');
        if (promptBtn) {
            const promptText = promptBtn.dataset.prompt;
            userInput.value = promptText;
            chatForm.dispatchEvent(new Event('submit'));
        }
        const copyBtn = event.target.closest('.btn-copy');
        if (copyBtn) {
            const codeBlock = copyBtn.closest('.code-block');
            const codeToCopy = codeBlock.textContent;
            navigator.clipboard.writeText(codeToCopy).then(() => {
                copyBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                }, 1500);
            }).catch(err => console.error('Failed to copy text: ', err));
        }
    });

    // --- Scroll-to-Bottom Button Logic ---  // <-- ADDED
    chatWindow.addEventListener('scroll', () => {
        // Check if the user has scrolled up from the bottom
        if (chatWindow.scrollHeight - chatWindow.scrollTop - chatWindow.clientHeight > 100) {
            scrollToBottomBtn.classList.add('visible');
        } else {
            scrollToBottomBtn.classList.remove('visible');
        }
    });

    scrollToBottomBtn.addEventListener('click', () => {
        scrollToBottom(); // Re-use your existing function
    });

    // --- Core Agent Logic ---
    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const model = getSelectedModel();

        if (!model) {
            showAlert('Please select an LLM model first.', 'warning');
            return;
        }

        const userMessage = userInput.value.trim();
        const apiKey = getCurrentApiKey();
        if (!userMessage && !uploadedFile) return;

        if (!apiKey) {
            let providerName = model.provider.charAt(0).toUpperCase() + model.provider.slice(1);
            if (model.provider === 'openai') {
                providerName = 'OpenAI';
            }
            showAlert(`Please enter your ${providerName} API key first.`, 'warning');
            apiKeyInput.focus();
            return;
        }

        const promptsContainer = document.getElementById('example-prompts');
        if (promptsContainer) {
            promptsContainer.style.display = 'none';
        }

        let messageContent = userMessage;
        if (uploadedFile) {
            messageContent += `<br><img src="${previewImage.src}" class="message-image-preview" alt="Uploaded Image">`;
        }
        addMessage('user', messageContent);
        conversationHistory.push({ role: 'user', content: userMessage });
        userInput.value = '';
        clearFileUpload();
        await runAgentLoop(apiKey);
    });

    async function runAgentLoop(apiKey) {
        setLoading(true);
        updateConnectionStatus('connecting');
        const model = getSelectedModel();

        // Track API call
        trackApiCall(model.displayName);

        if (model.provider !== 'openai') {
            await runNonStreamingAgentLoop(apiKey);
            return;
        }

        try {
            const requestBody = formatRequestForProvider(model.provider, model.name, conversationHistory, tools);
            requestBody.stream = true;

            const response = await fetch(getApiEndpoint(model.provider), {
                method: 'POST',
                headers: getAuthHeaders(model.provider, apiKey),
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`${model.provider.toUpperCase()} API Error: ${errorData.error?.message || 'Unknown error'}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = "";
            let toolCalls = [];
            const agentMessageElement = addMessage('agent', '<span class="streaming-cursor"></span>');
            
            let accumulatedToolCallChunks = {};

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data.trim() === '[DONE]') break;
                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices[0].delta;
                            if (delta.content) {
                                fullResponse += delta.content;
                                agentMessageElement.innerHTML = markdownToHtml(fullResponse) + '<span class="streaming-cursor"></span>';
                                scrollToBottom();
                            }
                            if (delta.tool_calls) {
                                for(const toolCallChunk of delta.tool_calls) {
                                    if(toolCallChunk.index !== undefined) {
                                        if(!accumulatedToolCallChunks[toolCallChunk.index]) {
                                            accumulatedToolCallChunks[toolCallChunk.index] = { id: '', type: 'function', function: { name: '', arguments: '' } };
                                        }
                                        if(toolCallChunk.id) accumulatedToolCallChunks[toolCallChunk.index].id = toolCallChunk.id;
                                        if(toolCallChunk.function.name) accumulatedToolCallChunks[toolCallChunk.index].function.name = toolCallChunk.function.name;
                                        if(toolCallChunk.function.arguments) accumulatedToolCallChunks[toolCallChunk.index].function.arguments += toolCallChunk.function.arguments;
                                    }
                                }
                            }
                        } catch (e) {}
                    }
                }
            }
            
            agentMessageElement.innerHTML = markdownToHtml(fullResponse);
            toolCalls = Object.values(accumulatedToolCallChunks);
            const assistantMessage = { role: 'assistant', content: fullResponse };
            if (toolCalls.length > 0) {
                assistantMessage.tool_calls = toolCalls;
            }
            conversationHistory.push(assistantMessage);
            updateConnectionStatus('connected');

            if (toolCalls.length > 0) {
                await handleToolCalls(toolCalls, apiKey);
            } else {
                setLoading(false);
            }
        } catch (error) {
            setLoading(false);
            updateConnectionStatus('error', 'API Error');
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('incorrect api key')) {
                showAlert('The API key you provided is incorrect. Please check it and try again.');
            } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
                showAlert('You have exceeded your API quota or rate limit. Please check your account status.');
            } else {
                showAlert(`An unexpected error occurred: ${error.message}`);
            }
        }
    }
    
    async function runNonStreamingAgentLoop(apiKey) {
        setLoading(true);
        updateConnectionStatus('connecting');
        try {
            const model = getSelectedModel();
            const endpoint = getApiEndpoint(model.provider);
            const headers = getAuthHeaders(model.provider, apiKey);
            const requestBody = formatRequestForProvider(model.provider, model.name, conversationHistory, tools);
            let url = endpoint;
            if (model.provider === 'google') {
                url = `${endpoint}${model.name}:generateContent?key=${apiKey}`;
            }
            const response = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(requestBody) });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`${model.provider.toUpperCase()} API Error: ${errorData.error?.message || errorData.message || 'Unknown error'}`);
            }
            const data = await response.json();
            let assistantMessage;
            switch(model.provider) {
                case 'openai': assistantMessage = data.choices[0].message; break;
                case 'google': assistantMessage = { role: 'assistant', content: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini' }; break;
                case 'anthropic': assistantMessage = { role: 'assistant', content: data.content?.[0]?.text || 'No response from Claude' }; break;
                default: assistantMessage = data.choices[0].message;
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
            setLoading(false);
            updateConnectionStatus('error', 'API Error');
            const errorMessage = error.message.toLowerCase();
            const model = getSelectedModel();

            if (model && model.provider === 'anthropic' && errorMessage.includes('failed to fetch')) {
                showAlert('Could not connect to Anthropic. This often happens if the API key is missing or incorrect.');
            } else if (errorMessage.includes('incorrect api key')) {
                showAlert('The API key you provided is incorrect. Please check it and try again.');
            } else {
                showAlert(`An unexpected error occurred: ${error.message}`);
            }
        }
    }

    async function handleToolCalls(toolCalls, apiKey) {
        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            //addMessage('tool', `🔧 Using tool: <strong>${functionName}</strong> with arguments: ${JSON.stringify(args)}`);
            
            // Track tool usage
            trackToolCall(functionName);
            
            let result;
            try {
                if (agentTools[functionName]) {
                    const argValue = Object.values(args)[0];
                    result = await agentTools[functionName](argValue);
                    if (functionName !== 'createChart') { // Don't show a result message for charts
                        //addMessage('tool-output', `✅ Tool Result:<br><div class="code-block">${result}</div>`);
                    }
                } else {
                    result = `❌ Unknown tool: ${functionName}`;
                    addMessage('tool-output', result);
                }
            } catch (error) {
                result = `❌ Error in tool ${functionName}: ${error.message}`;
                addMessage('tool-output', result);
            }
            conversationHistory.push({ tool_call_id: toolCall.id, role: 'tool', name: functionName, content: result });
        }
        await runAgentLoop(apiKey);
    }

    // --- Init ---
    console.log("Modern LLM Agent initialized successfully!");
    loadApiKey(); // Load the saved API key on startup
    loadAnalytics(); // Load analytics data
    
    if (!apiKeyInput.value.trim()) {
        showAlert('Welcome! Please enter your API key to get started.', 'info');
        setTimeout(() => apiKeyInput.focus(), 1000);
    }
});