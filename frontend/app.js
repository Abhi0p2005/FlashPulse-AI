document.addEventListener("DOMContentLoaded", () => {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    const generatorForm = document.getElementById("generator-form");
    const generateBtn = document.getElementById("generate-btn");
    const outputPlaceholder = document.getElementById("output-placeholder");
    const outputText = document.getElementById("output-text");
    const copyTextBtn = document.getElementById("copy-text-btn");
    const copyStreamLoader = document.getElementById("copy-stream-loader");
    const chatInputForm = document.getElementById("chat-input-form");
    const chatInput = document.getElementById("chat-input");
    const chatMessagesBox = document.getElementById("chat-messages-box");
    const clearChatBtn = document.getElementById("clear-chat-btn");
    const quickPromptBtns = document.querySelectorAll(".quick-prompt-btn");
    const countdownEl = document.getElementById("countdown");
    const pmUpdateBtn = document.getElementById("pm-update-btn");
    const feedContainer = document.getElementById("feed-container");
    const feedCount = document.getElementById("feed-count");

    let chatHistory = [
        { role: "assistant", content: "Hello! I'm PulseAI, your flash sale concierge. Browse products on the left, click one for details, or ask me anything! ⚡" }
    ];

    const USERS = ["Alex","Jordan","Taylor","Morgan","Casey","Riley","Avery","Quinn","Harper","Drew","Sage","Blake","Cameron","Dakota","Skyler","Reese","Finley","Rowan","Emerson","Parker"];
    const LOCATIONS = ["NYC","LA","Chicago","Austin","Miami","Seattle","Denver","Boston","SF","ATL","PDX","Dallas"];
    let orderCount = 0;
    let userCart = [];
    let userOrders = [];

    // ======= PRODUCT DATA =======
    const shopProducts = [
        { id: 1, name: "Sony WH-1000XM5 Wireless Headphones", origPrice: 399.99, flashPrice: 249.99, stock: 12, badge: "Best Seller",
            images: [
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
                "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80",
                "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80"
            ],
            description: "Industry-leading noise cancellation with Dual Noise Sensor technology. Experience crystal-clear hands-free calling and breathtaking sound quality with 30-hour battery life.",
            specs: ["Active Noise Cancellation", "30-hour battery life", "Premium sound drivers", "Fast charging (10min = 5hrs)", "Multipoint connection"] },
        { id: 2, name: "Apple AirPods Pro 2nd Gen", origPrice: 249.99, flashPrice: 179.99, stock: 8, badge: "Trending",
            images: [
                "https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=400&q=80",
                "https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=400&q=80",
                "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400&q=80"
            ],
            description: "Adaptive Audio automatically adjusts noise control. Personalized Spatial Audio with dynamic head tracking for an immersive listening experience.",
            specs: ["Adaptive Noise Control", "Spatial Audio", "Up to 6hrs listening", "MagSafe charging case", "IPX4 sweat resistant"] },
        { id: 3, name: "Samsung Galaxy Watch 6", origPrice: 329.99, flashPrice: 229.99, stock: 5, badge: "Limited Stock",
            images: [
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
                "https://images.unsplash.com/photo-1546868871-af0de0ae72f7?w=400&q=80",
                "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&q=80"
            ],
            description: "Your wellness partner with advanced sleep tracking, body composition analysis, and ECG monitoring. Powered by Wear OS with a vibrant Super AMOLED display.",
            specs: ["Sapphire Crystal Glass", "Body composition analysis", "ECG & BP monitoring", "Wear OS powered", "Up to 40hrs battery"] },
        { id: 4, name: "JBL Flip 6 Bluetooth Speaker", origPrice: 129.99, flashPrice: 89.99, stock: 3, badge: "70% OFF",
            images: [
                "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80",
                "https://images.unsplash.com/photo-1589003077984-894e133dabab?w=400&q=80",
                "https://images.unsplash.com/photo-1606220838315-056192d5e927?w=400&q=80"
            ],
            description: "Bold JBL Original Pro Sound with a powerful racetrack woofer. IP67 waterproof and dustproof — take the party anywhere.",
            specs: ["IP67 waterproof", "12hrs playtime", "PartyBoost mode", "Racetrack woofer", "USB-C charging"] },
        { id: 5, name: "Logitech MX Master 3S", origPrice: 99.99, flashPrice: 69.99, stock: 15, badge: "Popular",
            images: [
                "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&q=80",
                "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80",
                "https://images.unsplash.com/photo-1629429407759-01cd3d7cfb38?w=400&q=80"
            ],
            description: "The master of all mice. 8K DPI optical sensor, quiet clicks, and MagSpeed scroll wheel — perfect for productivity and creative workflows.",
            specs: ["8K DPI optical sensor", "Quiet click technology", "MagSpeed scroll wheel", "USB-C fast charging", "3-device multi-connect"] },
        { id: 6, name: "Anker Power Bank 20K", origPrice: 65.99, flashPrice: 39.99, stock: 0, badge: "Flash Deal",
            images: [
                "https://images.unsplash.com/photo-1609592424827-00f5f3123f9d?w=400&q=80",
                "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&q=80",
                "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80"
            ],
            description: "High-capacity 20,000mAh portable charger with PowerIQ 3.0 fast charging. Charge a smartphone up to 5 times on a single charge.",
            specs: ["20,000mAh capacity", "PowerIQ 3.0 fast charge", "Dual USB-C + USB-A", "Up to 5 phone charges", "18W PD supported"] }
    ];

    // ======= RENDER SHOP =======
    const renderShop = () => {
        const grid = document.getElementById("shop-grid");
        grid.innerHTML = "";
        shopProducts.forEach(p => {
            const discount = Math.round((1 - p.flashPrice / p.origPrice) * 100);
            const soldOut = p.stock <= 0;
            const item = document.createElement("div");
            item.className = `shop-item${soldOut ? " shop-item-soldout" : ""}`;
            item.dataset.id = p.id;
            item.innerHTML = `
                <div class="shop-item-badge">${p.badge}</div>
                <div class="shop-item-image">
                    <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
                    ${soldOut ? '<div class="soldout-overlay">SOLD OUT</div>' : ""}
                </div>
                <h3>${p.name}</h3>
                <div class="shop-item-pricing">
                    <span class="shop-item-price">$${p.flashPrice.toFixed(2)}</span>
                    <span class="shop-item-orig">$${p.origPrice.toFixed(2)}</span>
                    <span class="shop-item-discount">-${discount}%</span>
                </div>
                <div class="shop-item-stock${p.stock <= 3 && p.stock > 0 ? " critical" : ""}">${soldOut ? "Sold Out" : `Only ${p.stock} left`}</div>
            `;
            grid.appendChild(item);
        });
    };

    // ======= PRODUCT MODAL =======
    let currentModalProduct = null;
    let currentModalImageIndex = 0;

    const openModal = (productId) => {
        const p = shopProducts.find(x => x.id === productId);
        if (!p || p.stock <= 0) return;
        currentModalProduct = p;
        currentModalImageIndex = 0;
        const modal = document.getElementById("product-modal");
        document.getElementById("modal-badge").textContent = p.badge;
        document.getElementById("modal-name").textContent = p.name;
        document.getElementById("modal-flash-price").textContent = `$${p.flashPrice.toFixed(2)}`;
        document.getElementById("modal-orig-price").textContent = `$${p.origPrice.toFixed(2)}`;
        const discount = Math.round((1 - p.flashPrice / p.origPrice) * 100);
        document.getElementById("modal-discount").textContent = `-${discount}%`;
        document.getElementById("modal-desc").textContent = p.description;
        const specsEl = document.getElementById("modal-specs");
        specsEl.innerHTML = p.specs.map(s => `<div class="modal-spec"><i class="fa-solid fa-check"></i> ${s}</div>`).join("");
        const stockEl = document.getElementById("modal-stock");
        stockEl.textContent = `Only ${p.stock} units remaining!`;
        stockEl.className = `modal-stock${p.stock <= 3 ? " critical" : ""}`;
        document.getElementById("modal-add-btn").disabled = false;
        document.getElementById("modal-buy-btn").disabled = false;
        updateModalImage();
        modal.classList.remove("hidden");
    };

    const updateModalImage = () => {
        if (!currentModalProduct) return;
        document.getElementById("modal-img").src = currentModalProduct.images[currentModalImageIndex];
        const thumbs = document.getElementById("modal-thumbnails");
        thumbs.innerHTML = currentModalProduct.images.map((img, i) =>
            `<div class="modal-thumb${i === currentModalImageIndex ? " active" : ""}" data-index="${i}">
                <img src="${img}" alt="">
            </div>`
        ).join("");
    };

    document.getElementById("modal-thumbnails").addEventListener("click", (e) => {
        const thumb = e.target.closest(".modal-thumb");
        if (!thumb) return;
        currentModalImageIndex = parseInt(thumb.dataset.index);
        updateModalImage();
    });

    document.getElementById("modal-close").addEventListener("click", () => {
        document.getElementById("product-modal").classList.add("hidden");
    });
    document.getElementById("product-modal").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById("product-modal").classList.add("hidden");
        }
    });

    document.getElementById("modal-add-btn").addEventListener("click", () => {
        if (!currentModalProduct) return;
        const existing = userCart.find(item => item.id === currentModalProduct.id);
        if (existing) {
            existing.qty++;
        } else {
            userCart.push({ id: currentModalProduct.id, name: currentModalProduct.name, price: currentModalProduct.flashPrice, image: currentModalProduct.images[0], qty: 1 });
        }
        updateCartUI();
        document.getElementById("product-modal").classList.add("hidden");
        showNotification(`${currentModalProduct.name} added to cart!`);
    });

    document.getElementById("modal-buy-btn").addEventListener("click", () => {
        if (!currentModalProduct) return;
        checkoutProduct(currentModalProduct);
        document.getElementById("product-modal").classList.add("hidden");
    });

    // ======= CLICK PRODUCT =======
    document.getElementById("shop-grid").addEventListener("click", (e) => {
        const item = e.target.closest(".shop-item");
        if (!item) return;
        const id = parseInt(item.dataset.id);
        const p = shopProducts.find(x => x.id === id);
        if (!p || p.stock <= 0) return;
        openModal(id);
    });

    // ======= CART =======
    const updateCartUI = () => {
        const countEl = document.getElementById("user-cart-count");
        const totalItems = userCart.reduce((sum, item) => sum + item.qty, 0);
        countEl.textContent = totalItems;
        const panel = document.getElementById("cart-items");
        const footer = document.getElementById("cart-footer");
        if (userCart.length === 0) {
            panel.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
            document.getElementById("cart-total").textContent = "$0.00";
            document.getElementById("cart-checkout-btn").disabled = true;
            return;
        }
        panel.innerHTML = userCart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-img"><img src="${item.image}" alt=""></div>
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>$${item.price.toFixed(2)} x ${item.qty}</p>
                </div>
                <button class="cart-item-remove" data-id="${item.id}"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `).join("");
        const total = userCart.reduce((sum, item) => sum + item.price * item.qty, 0);
        document.getElementById("cart-total").textContent = `$${total.toFixed(2)}`;
        document.getElementById("cart-checkout-btn").disabled = false;
    };

    document.getElementById("cart-items").addEventListener("click", (e) => {
        const btn = e.target.closest(".cart-item-remove");
        if (!btn) return;
        const id = parseInt(btn.dataset.id);
        userCart = userCart.filter(item => item.id !== id);
        updateCartUI();
    });

    document.getElementById("cart-toggle-btn").addEventListener("click", () => {
        document.getElementById("cart-panel").classList.remove("hidden");
        document.getElementById("cart-overlay").classList.remove("hidden");
        updateCartUI();
    });

    document.getElementById("cart-close-btn").addEventListener("click", closeCart);
    document.getElementById("cart-overlay").addEventListener("click", closeCart);

    function closeCart() {
        document.getElementById("cart-panel").classList.add("hidden");
        document.getElementById("cart-overlay").classList.add("hidden");
    }

    document.getElementById("cart-checkout-btn").addEventListener("click", () => {
        if (userCart.length === 0) return;
        userCart.forEach(item => {
            const product = shopProducts.find(p => p.id === item.id);
            if (product) checkoutProduct(product);
        });
        userCart = [];
        updateCartUI();
        closeCart();
    });

    // ======= CHECKOUT & ORDERS =======
    function checkoutProduct(product) {
        if (product.stock <= 0) return;
        product.stock--;
        orderCount++;
        if (feedCount) feedCount.textContent = `${orderCount} orders`;

        const now = new Date();
        const deliveryDate = new Date(now);
        deliveryDate.setDate(deliveryDate.getDate() + 2 + Math.floor(Math.random() * 3));

        userOrders.push({
            productId: product.id,
            name: product.name,
            price: product.flashPrice,
            image: product.images[0],
            orderDate: now.toLocaleDateString(),
            deliveryDate: deliveryDate.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' }),
            status: "processing"
        });

        renderOrders();
        renderShop();
        addFeedItem(true);
        showNotification(`Order placed! ${product.name} arriving ${deliveryDate.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })} 🎉`);
    }

    const renderOrders = () => {
        const container = document.getElementById("orders-container");
        if (userOrders.length === 0) {
            container.innerHTML = '<p class="orders-empty">No orders yet. Start shopping!</p>';
            return;
        }
        container.innerHTML = userOrders.map(o => `
            <div class="order-card">
                <div class="order-card-img"><img src="${o.image}" alt=""></div>
                <div class="order-card-info">
                    <h4>${o.name}</h4>
                    <p>Ordered: ${o.orderDate} • $${o.price.toFixed(2)}</p>
                    <span class="delivery-date"><i class="fa-solid fa-truck"></i> Delivery by ${o.deliveryDate}</span>
                    <span class="order-status processing"><i class="fa-solid fa-clock"></i> Processing</span>
                </div>
            </div>
        `).join("");
    };

    document.getElementById("orders-toggle-btn").addEventListener("click", () => {
        const section = document.getElementById("orders-section");
        section.classList.toggle("hidden");
        renderOrders();
    });

    // ======= SHOW NOTIFICATION =======
    const showNotification = (msg) => {
        const existing = document.querySelector(".shop-notification");
        if (existing) existing.remove();
        const n = document.createElement("div");
        n.className = "shop-notification";
        n.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${msg}`;
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 3000);
    };

    // ======= TAB SWITCHING =======
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            tabButtons.forEach(t => t.classList.remove("active"));
            btn.classList.add("active");
            tabContents.forEach(content => {
                content.classList.remove("active");
                if (content.getAttribute("id") === targetTab) content.classList.add("active");
            });
        });
    });

    // ======= COUNTDOWN =======
    let durationSec = 9 * 60 + 59;
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

    const formatMarkdown = (text) => {
        if (!text) return "";
        let html = text;
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
        return html.split('\n').map(line => {
            const t = line.trim();
            if (t.startsWith('<h3>')) return line;
            if (t === "") return "";
            return `<p>${line}</p>`;
        }).join('');
    };

    const scrollToBottom = (el) => { el.scrollTop = el.scrollHeight; };

    // ======= PRODUCT MANAGEMENT (Admin) =======
    const getProductContext = () => {
        const name = document.getElementById("pm-name").value || "Unknown Product";
        const origPrice = parseFloat(document.getElementById("pm-orig-price").value) || 0;
        const flashPrice = parseFloat(document.getElementById("pm-flash-price").value) || 0;
        const stock = parseInt(document.getElementById("pm-stock").value) || 0;
        const cart = parseInt(document.getElementById("pm-cart").value) || 0;
        const image = document.getElementById("pm-image").value || "";
        return { name, origPrice, flashPrice, stock, cart, image };
    };

    const updateProductPreview = () => {
        const p = getProductContext();
        document.getElementById("pm-preview-name").textContent = p.name;
        document.getElementById("pm-preview-flash").textContent = `$${p.flashPrice.toFixed(2)}`;
        document.getElementById("pm-preview-orig").textContent = `$${p.origPrice.toFixed(2)}`;
        document.getElementById("pm-preview-image").src = p.image;
        document.getElementById("pm-stock-left").textContent = p.stock;
        document.getElementById("pm-cart-count").textContent = p.cart;
        const discount = Math.round((1 - p.flashPrice / p.origPrice) * 100);
        document.getElementById("pm-preview-discount").textContent = `-${discount}%`;
        const stockEl = document.getElementById("pm-preview-stock");
        if (p.stock <= 5) stockEl.classList.add("critical"); else stockEl.classList.remove("critical");
    };

    pmUpdateBtn.addEventListener("click", updateProductPreview);
    ["pm-name","pm-orig-price","pm-flash-price","pm-stock","pm-cart","pm-image"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", updateProductPreview);
    });

    // ======= LIVE METRICS =======
    const metricEls = { traffic: document.getElementById("metric-traffic"), sales: document.getElementById("metric-sales"), conversion: document.getElementById("metric-conversion"), revenue: document.getElementById("metric-revenue") };
    let metricValues = { traffic: 12480, sales: 847, conversion: 6.8, revenue: 296.4 };
    const updateMetrics = () => {
        metricValues.traffic += Math.floor(Math.random() * 30) - 8;
        metricValues.traffic = Math.max(8000, metricValues.traffic);
        metricEls.traffic.textContent = metricValues.traffic.toLocaleString();
        metricValues.sales += Math.floor(Math.random() * 3);
        metricEls.sales.textContent = metricValues.sales;
        metricValues.conversion += (Math.random() * 0.3 - 0.1);
        metricValues.conversion = Math.max(3, Math.min(15, metricValues.conversion));
        metricEls.conversion.textContent = metricValues.conversion.toFixed(1);
        metricValues.revenue += Math.random() * 2.5;
        metricEls.revenue.textContent = `$${metricValues.revenue.toFixed(1)}K`;
    };
    setInterval(updateMetrics, 3000);

    // ======= LIVE PURCHASE FEED =======
    const addFeedItem = (isPurchase = true) => {
        const user = USERS[Math.floor(Math.random() * USERS.length)];
        const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
        const p = getProductContext();
        const time = new Date().toLocaleTimeString();
        const item = document.createElement("div");
        item.className = "feed-item";
        const avatar = document.createElement("div");
        avatar.className = `feed-avatar ${isPurchase ? "purchase" : "cart"}`;
        avatar.textContent = user[0];
        const info = document.createElement("div");
        info.className = "feed-info";
        if (isPurchase) {
            const amount = (p.flashPrice * (0.9 + Math.random() * 0.2)).toFixed(2);
            info.innerHTML = `<span class="feed-user">${user}</span><span class="feed-action"> purchased </span><span class="feed-product-name">${p.name}</span><div class="feed-amount">$${amount}</div>`;
        } else {
            info.innerHTML = `<span class="feed-user">${user}</span><span class="feed-action"> added to cart </span><span class="feed-product-name">${p.name}</span>`;
        }
        const timeEl = document.createElement("span");
        timeEl.className = "feed-time";
        timeEl.textContent = time;
        item.appendChild(avatar);
        item.appendChild(info);
        item.appendChild(timeEl);
        const placeholder = feedContainer.querySelector(".feed-placeholder");
        if (placeholder) placeholder.remove();
        feedContainer.insertBefore(item, feedContainer.firstChild);
        if (isPurchase) { orderCount++; feedCount.textContent = `${orderCount} orders`; }
        while (feedContainer.children.length > 50) feedContainer.removeChild(feedContainer.lastChild);
    };

    setInterval(() => addFeedItem(true), 2000 + Math.random() * 3000);
    setInterval(() => addFeedItem(false), 4000 + Math.random() * 4000);
    for (let i = 0; i < 8; i++) setTimeout(() => addFeedItem(true), i * 300);

    // ======= COPY GENERATOR =======
    generatorForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const productName = document.getElementById("product-name").value;
        const originalPrice = document.getElementById("original-price").value;
        const flashPrice = document.getElementById("flash-price").value;
        const style = document.querySelector('input[name="style-tone"]:checked').value;
        const additionalDetails = document.getElementById("additional-details").value;

        outputPlaceholder.classList.add("hidden");
        outputText.classList.remove("hidden");
        outputText.innerHTML = "";
        copyTextBtn.disabled = true;
        copyStreamLoader.classList.remove("hidden");
        generateBtn.disabled = true;

        try {
            const response = await fetch("/api/generate-copy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_name: productName, original_price: originalPrice, flash_price: flashPrice, style, additional_details: additionalDetails })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let accumulatedText = "", buffer = "";
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
                            outputText.innerHTML = `<div class="error-alert"><i class="fa-solid fa-triangle-exclamation"></i> ${dataContent.slice(7).trim()}</div>`;
                            copyStreamLoader.classList.add("hidden");
                            generateBtn.disabled = false;
                            return;
                        }
                        accumulatedText += dataContent;
                        outputText.innerHTML = formatMarkdown(accumulatedText);
                    }
                }
            }
            if (accumulatedText.trim().length > 0) {
                copyTextBtn.disabled = false;
                copyTextBtn.dataset.clipboard = accumulatedText;
            }
        } catch (error) {
            outputText.innerHTML = `<div class="error-alert"><i class="fa-solid fa-circle-exclamation"></i> Network Error: Failed to reach the flash backend service.</div>`;
        } finally {
            copyStreamLoader.classList.add("hidden");
            generateBtn.disabled = false;
        }
    });

    copyTextBtn.addEventListener("click", () => {
        const textToCopy = copyTextBtn.dataset.clipboard;
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHTML = copyTextBtn.innerHTML;
            copyTextBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
            copyTextBtn.style.background = "var(--color-success)";
            setTimeout(() => { copyTextBtn.innerHTML = originalHTML; copyTextBtn.style.background = ""; }, 2000);
        });
    });

    // ======= PULSEAI PROACTIVE =======
    const proactiveMessages = [
        "Would you like me to recommend similar products?",
        "I can help track your order — just ask!",
        "Need help with cart or checkout? I'm here!",
        "Want to know your delivery status?",
        "I can assist in Spanish, French, and more!"
    ];
    const getRandomProactive = () => proactiveMessages[Math.floor(Math.random() * proactiveMessages.length)];

    // ======= CHAT =======
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
        return bubbleDiv;
    };

    const handleChatSubmit = async (userText) => {
        if (!userText || userText.trim() === "") return;
        appendMessageBubble("user", userText);
        chatHistory.push({ role: "user", content: userText });
        const botBubble = appendMessageBubble("bot", "");
        chatInput.disabled = true;
        const sendBtn = document.getElementById("chat-send-btn");
        sendBtn.disabled = true;

        try {
            const p = getProductContext();
            const ordersContext = userOrders.length > 0
                ? `\nUser Orders: ${userOrders.map(o => `${o.name} - $${o.price.toFixed(2)} - Ordered: ${o.orderDate} - Delivery: ${o.deliveryDate} - Status: ${o.status}`).join(" | ")}`
                : "";
            const cartContext = userCart.length > 0
                ? `\nItems in Cart: ${userCart.map(c => `${c.name} x${c.qty}`).join(", ")}`
                : "";

            const payload = {
                messages: chatHistory.map(m => ({ role: m.role === "bot" ? "assistant" : m.role, content: m.content })),
                product_context: `${p.name} (Price: $${p.flashPrice.toFixed(2)})${ordersContext}${cartContext}`
            };

            const response = await fetch("/api/chat-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let accumulatedReply = "", buffer = "";
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
                            botBubble.style.background = "rgba(239,68,68,0.1)";
                            return;
                        }
                        accumulatedReply += dataContent;
                        botBubble.textContent = accumulatedReply;
                        scrollToBottom(chatMessagesBox);
                    }
                }
            }
            chatHistory.push({ role: "bot", content: accumulatedReply });
            if (chatHistory.length >= 6 && chatHistory.length % 2 === 0) {
                setTimeout(() => {
                    const proactiveMsg = getRandomProactive();
                    const sb = appendMessageBubble("bot", `💡 ${proactiveMsg}`);
                    chatHistory.push({ role: "bot", content: `💡 ${proactiveMsg}` });
                }, 1500);
            }
        } catch (error) {
            botBubble.textContent = "Network Error: Unable to stream response from PulseAI.";
            botBubble.style.color = "#fca5a5";
        } finally {
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.focus();
        }
    };

    chatInputForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = chatInput.value;
        chatInput.value = "";
        handleChatSubmit(text);
    });

    clearChatBtn.addEventListener("click", () => {
        chatMessagesBox.innerHTML = `
            <div class="message bot">
                <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="msg-bubble">Hello! I'm PulseAI, your flash sale concierge. Browse products on the left, click one for details, or ask me anything! ⚡</div>
            </div>
        `;
        chatHistory = [{ role: "assistant", content: "Hello! I'm PulseAI, your flash sale concierge. Browse products on the left, click one for details, or ask me anything! ⚡" }];
    });

    const buyNowBtn = document.querySelector(".buy-now-btn");
    if (buyNowBtn) {
        buyNowBtn.addEventListener("click", () => {
            const p = getProductContext();
            alert("Checkout simulated! Your order for " + p.name + " is being processed.");
            addFeedItem(true);
            const stockInput = document.getElementById("pm-stock");
            stockInput.value = Math.max(0, parseInt(stockInput.value) - 1);
            updateProductPreview();
        });
    }

    quickPromptBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            handleChatSubmit(btn.getAttribute("data-prompt"));
        });
    });

    // ======= INIT =======
    renderShop();
});
