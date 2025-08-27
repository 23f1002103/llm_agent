/**
 * A collection of tools the LLM agent can use.
 */
const agentTools = {
    /**
     * Performs a Google search and returns the top results.
     * @param {string} query The search query.
     * @returns {Promise<string>} A string containing the search results.
     */
    googleSearch: async function(query) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX_ID}&q=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Google Search API failed with status: ${response.status}`);
            }
            const data = await response.json();
            
            // Extract snippets from the top 3 results
            const results = data.items?.slice(0, 3).map(item => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet
            }));

            if (!results || results.length === 0) {
                return "No search results found.";
            }
            
            // Format the results into a single string for the LLM
            return JSON.stringify(results);

        } catch (error) {
            console.error('Google Search Error:', error);
            return `Error performing search: ${error.message}`;
        }
    },

    /**
     * Calls the AI Pipe API for flexible dataflows.
     * NOTE: This is a placeholder. You'll need to replace the URL and logic
     * with the actual details provided for your course project.
     * @param {object} data The data to send to the AI Pipe.
     * @returns {Promise<string>} The result from the AI Pipe.
     */
    aiPipe: async function(data) {
        try {
            // --- Replace with your actual AI Pipe API endpoint and logic ---
            console.log("Calling AI Pipe with data:", data);
            // const response = await fetch('YOUR_AI_PIPE_ENDPOINT', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         'Authorization': `Bearer ${AI_PIPE_API_KEY}`
            //     },
            //     body: JSON.stringify(data)
            // });
            // if (!response.ok) {
            //     throw new Error(`AI Pipe API failed with status: ${response.status}`);
            // }
            // const result = await response.json();
            // return JSON.stringify(result);
            // --- End of placeholder logic ---
            
            // Mock response for this POC
            return "Successfully called AI Pipe. Result: [mock_data]";

        } catch (error) {
            console.error('AI Pipe Error:', error);
            return `Error calling AI Pipe: ${error.message}`;
        }
    },

    /**
     * Securely executes a string of JavaScript code.
     * @param {string} code The JavaScript code to execute.
     * @returns {string} The result of the executed code or an error message.
     */
    executeJavascript: function(code) {
        // Using a try-catch block to handle errors during code execution.
        // new Function() is generally safer than eval() but still powerful.
        // For a real-world application, a more robust sandbox (like a web worker or iframe) is recommended.
        try {
            const result = new Function(code)();
            // If the result is an object, stringify it to ensure it can be displayed.
            if (typeof result === 'object') {
                return JSON.stringify(result);
            }
            return String(result);
        } catch (error) {
            console.error('JavaScript Execution Error:', error);
            return `Error executing code: ${error.name} - ${error.message}`;
        }
    }
};