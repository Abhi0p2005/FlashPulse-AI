// ========================================================
// FLASHPULSE AI - CLIENT-SIDE APPLICATION JAVASCRIPT
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    
    // Admin Generator Elements
    const generatorForm = document.getElementById("generator-form");
    const generateBtn = document.getElementById("generate-btn");
    const outputPlaceholder = document.getElementById("output-placeholder");
    const outputText = document.getElementById("output-text");
    const copyTextBtn = document.getElementById("copy-text-btn");
    const copyStreamLoader = document.getElementById("copy-stream-loader");
    
    // Shopper Chat Elements
    const chatInputForm = document.getElementById("chat-input-form");
    const chatInput = document.getElementById("chat-input");
    const chatMessagesBox = document.getElementById("chat-messages-box");
    const clearChatBtn = document.getElementById("clear-chat-btn");
    const quickPromptBtns = document.querySelectorAll(".quick-prompt-btn");
    const countdownEl = document.getElementById("countdown");
    const productSelector = document.getElementById("product-selector"); // New

    // Updates product display
    const updateProductDisplay = () => {
        const [name, flashPrice, origPrice, imageUrl] = productSelector.value.split('|');
        document.getElementById('display-product-name').textContent = name;
        document.getElementById('display-flash-price').textContent = `$${flashPrice}`;
        document.getElementById('display-orig-price').textContent = `$${origPrice}`;
        document.getElementById('product-image').src = imageUrl;
    };

    productSelector.addEventListener('change', updateProductDisplay);

    // Chat History State
    let chatHistory = [
        { role: "assistant", content: "Hello there! I'm PulseAI, your instant flash sale concierge. High-velocity shoppers are snapping up items rapidly! Do you have any questions before completing your checkout? ⚡" }
    ];

    // ========================================================
    // 1. NAVIGATION & TAB SWITCHING
    // ========================================================
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            
            // Toggle active class on tab buttons
            tabButtons.forEach(t => t.classList.remove("active"));
            btn.classList.add("active");
            
            // Toggle active class on tab contents
            tabContents.forEach(content => {
                content.classList.remove("active");
                if (content.getAttribute("id") === targetTab) {
                    content.classList.add("active");
                }
            });
        });
    });

    // ========================================================
    // 2. SIMULATED FLASH SALE COUNTDOWN TIMER
    // ========================================================
    let durationSec = 9 * 60 + 59; // 9 minutes 59 seconds
    const startCountdown = () => {
        const timer = setInterval(() => {
            const minutes = Math.floor(durationSec / 60);
            const seconds = durationSec % 60;
            
            countdownEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (durationSec <= 0) {
                clearInterval(timer);
                countdownEl.textContent = "00:00";
                countdownEl.closest(".urgency-banner").style.background = "#374151";
            }
            durationSec--;
        }, 1000);
    };
    startCountdown();

    // ========================================================
    // 3. UTILITY FUNCTIONS
    // ========================================================
    
    // Simple custom markdown formatter for streaming output
    const formatMarkdown = (text) => {
        if (!text) return "";
        let html = text;
        
        // Convert headers ### Header
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
        
        // Convert paragraphs (double newlines) to styled divs or paragraphs
        // Excluding lines that are headers
        const lines = html.split('\n');
        const formattedLines = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('<h3>')) {
                return line;
            } else if (trimmed === "") {
                return "";
            } else {
                return `<p>${line}</p>`;
            }
        });
        
        return formattedLines.join('');
    };

    // Auto scroll chat to bottom
    const scrollToBottom = (element) => {
        element.scrollTop = element.scrollHeight;
    };

    // ========================================================
    // 4. FEATURE 1: ADMIN FLASH MARKETING COPY GENERATOR (SSE Streaming)
    // ========================================================
    generatorForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const productName = document.getElementById("product-name").value;
        const originalPrice = document.getElementById("original-price").value;
        const flashPrice = document.getElementById("flash-price").value;
        const style = document.querySelector('input[name="style-tone"]:checked').value;
        const additionalDetails = document.getElementById("additional-details").value;
        
        // Reset UI Output
        outputPlaceholder.classList.add("hidden");
        outputText.classList.remove("hidden");
        outputText.innerHTML = "";
        copyTextBtn.disabled = true;
        copyStreamLoader.classList.remove("hidden");
        generateBtn.disabled = true;
        
        const payload = {
            product_name: productName,
            original_price: originalPrice,
            flash_price: flashPrice,
            style: style,
            additional_details: additionalDetails
        };
        
        try {
            const response = await fetch("/api/generate-copy", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let accumulatedText = "";
            let buffer = "";
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // Decode the current stream chunk
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                
                // Store the last incomplete line back in buffer
                buffer = lines.pop();
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    
                    if (trimmed.startsWith("data: ")) {
                        const dataContent = trimmed.slice(6);
                        
                        // Check for backend error message
                        if (dataContent.startsWith("[ERROR]")) {
                            const errMessage = dataContent.slice(7).trim();
                            outputText.innerHTML = `<div class="error-alert">
                                <i class="fa-solid fa-triangle-exclamation"></i> <strong>Configuration Error:</strong><br>${errMessage}
                            </div>`;
                            copyStreamLoader.classList.add("hidden");
                            generateBtn.disabled = false;
                            return;
                        }
                        
                        accumulatedText += dataContent;
                        // Render stream progressively
                        outputText.innerHTML = formatMarkdown(accumulatedText);
                    }
                }
            }
            
            // Process any remaining text in the buffer
            if (buffer && buffer.startsWith("data: ")) {
                const dataContent = buffer.slice(6).trim();
                if (dataContent.startsWith("[ERROR]")) {
                    outputText.innerHTML = `<div class="error-alert">${dataContent.slice(7)}</div>`;
                } else {
                    accumulatedText += dataContent;
                    outputText.innerHTML = formatMarkdown(accumulatedText);
                }
            }
            
            // Unlock Copy to clipboard if text is generated successfully
            if (accumulatedText.trim().length > 0) {
                copyTextBtn.disabled = false;
                // Store text on button dataset for copying
                copyTextBtn.dataset.clipboard = accumulatedText;
            }
            
        } catch (error) {
            console.error("Copy stream error:", error);
            outputText.innerHTML = `<div class="error-alert">
                <i class="fa-solid fa-circle-exclamation"></i> <strong>Network Error:</strong> Failed to reach the flash backend service. Ensure FastAPI server is running.
            </div>`;
        } finally {
            copyStreamLoader.classList.add("hidden");
            generateBtn.disabled = false;
        }
    });

    // Copy Generated text to Clipboard
    copyTextBtn.addEventListener("click", () => {
        const textToCopy = copyTextBtn.dataset.clipboard;
        if (!textToCopy) return;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHTML = copyTextBtn.innerHTML;
            copyTextBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
            copyTextBtn.style.background = "var(--color-success)";
            copyTextBtn.style.borderColor = "var(--color-success)";
            setTimeout(() => {
                copyTextBtn.innerHTML = originalHTML;
                copyTextBtn.style.background = "";
                copyTextBtn.style.borderColor = "";
            }, 2000);
        }).catch(err => {
            console.error("Failed to copy text: ", err);
        });
    });


    // ========================================================
    // 5. FEATURE 2: HIGH-VELOCITY STREAMING CUSTOMER CHAT (SSE Streaming)
    // ========================================================
    
    // Add Message Bubble helper
    const appendMessageBubble = (role, text) => {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", role);
        
        const avatarDiv = document.createElement("div");
        avatarDiv.classList.add("msg-avatar");
        avatarDiv.innerHTML = role === "bot" ? '<i class="fa-solid fa-robot"></i>' : '<i class="fa-solid fa-user"></i>';
        
        const bubbleDiv = document.createElement("div");
        bubbleDiv.classList.add("msg-bubble");
        bubbleDiv.textContent = text;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(bubbleDiv);
        chatMessagesBox.appendChild(messageDiv);
        
        scrollToBottom(chatMessagesBox);
        return bubbleDiv; // Return reference to append streaming text
    };

    // Stream Support Chat API call
    const handleChatSubmit = async (userText) => {
        if (!userText || userText.trim() === "") return;
        
        // Append user message
        appendMessageBubble("user", userText);
        chatHistory.push({ role: "user", content: userText });
        
        // Append placeholder bot bubble
        const botBubble = appendMessageBubble("bot", "");
        
        // Disable chat input
        chatInput.disabled = true;
        const sendBtn = document.getElementById("chat-send-btn");
        sendBtn.disabled = true;
        
        try {
            const [name, flashPrice, origPrice] = productSelector.value.split('|');
            const payload = {
                messages: chatHistory.map(m => ({
                    role: m.role === "bot" ? "assistant" : m.role,
                    content: m.content
                })),
                product_context: `${name} (Price: $${flashPrice}, Regular: $${origPrice})`
            };
            
            const response = await fetch("/api/chat-stream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let accumulatedReply = "";
            let buffer = "";
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    
                    if (trimmed.startsWith("data: ")) {
                        const dataContent = trimmed.slice(6);
                        
                        if (dataContent.startsWith("[ERROR]")) {
                            botBubble.textContent = `[Error] ${dataContent.slice(7).trim()}`;
                            botBubble.style.color = "#fca5a5";
                            botBubble.style.background = "rgba(239, 68, 68, 0.1)";
                            botBubble.style.borderColor = "rgba(239, 68, 68, 0.3)";
                            return;
                        }
                        
                        accumulatedReply += dataContent;
                        botBubble.textContent = accumulatedReply;
                        scrollToBottom(chatMessagesBox);
                    }
                }
            }
            
            // Process leftover buffer
            if (buffer && buffer.startsWith("data: ")) {
                const dataContent = buffer.slice(6).trim();
                if (dataContent.startsWith("[ERROR]")) {
                    botBubble.textContent = `[Error] ${dataContent.slice(7)}`;
                } else {
                    accumulatedReply += dataContent;
                    botBubble.textContent = accumulatedReply;
                }
                scrollToBottom(chatMessagesBox);
            }
            
            // Add bot reply to state
            chatHistory.push({ role: "bot", content: accumulatedReply });
            
        } catch (error) {
            console.error("Chat streaming error:", error);
            botBubble.textContent = "Network Error: Unable to stream response from PulseAI. Please verify FastAPI backend is live.";
            botBubble.style.color = "#fca5a5";
        } finally {
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.focus();
        }
    };

    // Chat submit event
    chatInputForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = chatInput.value;
        chatInput.value = "";
        handleChatSubmit(text);
    });

    // Clear Chat Logic
    clearChatBtn.addEventListener("click", () => {
        chatMessagesBox.innerHTML = `
            <div class="message bot">
                <div class="msg-avatar">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <div class="msg-bubble">
                    Hello there! I'm PulseAI, your instant flash sale concierge. High-velocity shoppers are snapping up items rapidly! Do you have any questions before completing your checkout? ⚡
                </div>
            </div>
        `;
        chatHistory = [
            { role: "assistant", content: "Hello there! I'm PulseAI, your instant flash sale concierge. High-velocity shoppers are snapping up items rapidly! Do you have any questions before completing your checkout? ⚡" }
        ];
    });

    // Buy Now Button Logic
    const buyNowBtn = document.querySelector(".buy-now-btn");
    console.log("Buy Now Button found:", buyNowBtn);
    if (buyNowBtn) {
        buyNowBtn.addEventListener("click", () => {
            console.log("Checkout clicked!");
            alert("Checkout simulated! Your order for " + document.getElementById('display-product-name').textContent + " is being processed.");
        });
    }

    // Quick FAQ Suggestion Buttons Click Handler
    quickPromptBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const prompt = btn.getAttribute("data-prompt");
            handleChatSubmit(prompt);
        });
    });
});
