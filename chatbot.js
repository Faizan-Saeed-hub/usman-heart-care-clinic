// Usman Heart Care Clinic - Chatbot Component
// Injects a floating chatbot widget into pages and handles conversational logic (rule-based fallback & Gemini API).

document.addEventListener("DOMContentLoaded", () => {
  // Prevent double injection if included multiple times
  if (document.getElementById("uhc-chat-widget")) return;

  // Create Chatbot Wrapper
  const widgetWrapper = document.createElement("div");
  widgetWrapper.id = "uhc-chat-widget";
  widgetWrapper.innerHTML = `
    <!-- Floating Chat Trigger -->
    <button id="uhc-chat-trigger" class="chat-trigger" aria-label="Open chat assistant">
      <span class="chat-trigger-icon">💬</span>
      <span class="chat-trigger-badge">1</span>
    </button>

    <!-- Chat Window Container -->
    <div id="uhc-chat-container" class="chat-container closed">
      <div class="chat-header">
        <div class="chat-doctor-info">
          <div class="chat-doctor-avatar">❤</div>
          <div>
            <h4 class="chat-title">UHC Heart Assistant</h4>
            <span class="chat-status">Online • Virtual Guide</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <button type="button" id="uhc-chat-clear" class="chat-clear-btn" title="Clear Chat History" style="background:none; border:0; color:rgba(255,255,255,0.8); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center;">🗑</button>
          <button type="button" id="uhc-chat-close" class="chat-close" aria-label="Close chat" style="line-height:1;">×</button>
        </div>
      </div>

      <!-- Messages Log -->
      <div id="uhc-chat-messages" class="chat-messages">
        <!-- Messages will be dynamically inserted here -->
      </div>

      <!-- Quick Reply Chips -->
      <div id="uhc-chat-chips" class="chat-chips">
        <button class="chat-chip" data-msg="What are the clinic timings?">⏰ Timings</button>
        <button class="chat-chip" data-msg="What are the services and fees?">💳 Fees & Services</button>
        <button class="chat-chip" data-msg="How can I book an appointment?">📅 Book Appointment</button>
        <button class="chat-chip" data-msg="Where is the clinic located?">📍 Location / Map</button>
      </div>

      <!-- Input Form -->
      <form id="uhc-chat-form" class="chat-form">
        <input type="text" id="uhc-chat-input" class="chat-input" placeholder="Type a message..." required autocomplete="off">
        <button type="submit" id="uhc-chat-send" class="chat-send" aria-label="Send message">➔</button>
      </form>
    </div>
  `;

  document.body.appendChild(widgetWrapper);

  // DOM Elements
  const trigger = document.getElementById("uhc-chat-trigger");
  const container = document.getElementById("uhc-chat-container");
  const closeBtn = document.getElementById("uhc-chat-close");
  const clearBtn = document.getElementById("uhc-chat-clear");
  const messagesDiv = document.getElementById("uhc-chat-messages");
  const form = document.getElementById("uhc-chat-form");
  const input = document.getElementById("uhc-chat-input");
  const chips = document.querySelectorAll(".chat-chip");
  const badge = document.querySelector(".chat-trigger-badge");

  const STORAGE_KEY_HISTORY = "uhcChatHistory";
  let conversationHistory = []; // Stores { sender: "user" | "bot", text: string }
  let isFirstOpen = true;

  // Load chat history from localStorage
  function loadChatHistory() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        conversationHistory = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load chat history", e);
    }
  }

  // Save chat history to localStorage
  function saveChatHistory() {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(conversationHistory));
    } catch (e) {
      console.warn("Failed to save chat history", e);
    }
  }

  // Render history bubbles in UI
  function renderChatHistory() {
    messagesDiv.innerHTML = "";
    if (conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        appendMessage(msg.sender, msg.text, false);
      });
      isFirstOpen = false;
      badge.style.display = "none";
    }
  }

  // Initialize History
  loadChatHistory();
  renderChatHistory();

  // Toggle Chat window
  trigger.addEventListener("click", () => {
    container.classList.toggle("closed");
    badge.style.display = "none"; // Hide badge once opened

    if (isFirstOpen) {
      sendBotGreeting();
      isFirstOpen = false;
    }
    input.focus();
  });

  closeBtn.addEventListener("click", () => {
    container.classList.add("closed");
  });

  clearBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your chat history?")) {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      conversationHistory = [];
      messagesDiv.innerHTML = "";
      isFirstOpen = true;
      sendBotGreeting();
    }
  });

  // Handle Form Submission
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    handleUserMessage(text);
    input.value = "";
  });

  // Handle Chip Clicks
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const msg = chip.getAttribute("data-msg");
      handleUserMessage(msg);
    });
  });

  // Greeting Message
  function sendBotGreeting() {
    const chatbotSettings = window.UHC.getChatbotSettings();
    const greetingText = chatbotSettings.greeting || "Hello! I am UHC-Bot, the virtual assistant for Usman Heart Care Clinic. How can I help you today?";
    appendMessage("bot", greetingText);
    conversationHistory.push({ sender: "bot", text: greetingText });
    saveChatHistory();
  }

  // Handle User Message
  async function handleUserMessage(text) {
    appendMessage("user", text);
    conversationHistory.push({ sender: "user", text: text });
    saveChatHistory();

    // Show typing indicator
    const typingIndicator = appendTypingIndicator();

    try {
      const reply = await getAssistantResponse(text);
      removeTypingIndicator(typingIndicator);
      appendMessage("bot", reply);
      conversationHistory.push({ sender: "bot", text: reply });
      saveChatHistory();
    } catch (err) {
      removeTypingIndicator(typingIndicator);
      appendMessage("bot", "Sorry, I encountered an issue. Please call the clinic directly at 0334-4192623 or try again later.");
    }
  }

  // Append message bubble
  function appendMessage(sender, text, scroll = true) {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble-container ${sender}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Simple markdown-to-html conversion for messages (bold, italic, links)
    const formattedText = parseMarkdown(text);

    bubble.innerHTML = `
      <div class="chat-bubble">
        <div class="chat-bubble-text">${formattedText}</div>
        <span class="chat-bubble-time">${time}</span>
      </div>
    `;
    
    messagesDiv.appendChild(bubble);
    if (scroll) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }

  // Append Typing Indicator
  function appendTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "chat-bubble-container bot typing-container";
    indicator.innerHTML = `
      <div class="chat-bubble typing">
        <div class="dot-flashing"></div>
      </div>
    `;
    messagesDiv.appendChild(indicator);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return indicator;
  }

  // Remove Typing Indicator
  function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  // Simple Markdown Parser
  function parseMarkdown(text) {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Replace bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    
    // Replace italic (_text_)
    html = html.replace(/_(.*?)_/g, "<em>$1</em>");

    // Replace links ([text](url))
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Replace new lines
    html = html.replace(/\n/g, "<br>");

    return html;
  }

  // Assistant Response Logic
  async function getAssistantResponse(userMsg) {
    const botSettings = window.UHC.getChatbotSettings();
    const apiKey = botSettings.geminiApiKey;

    // If API Key exists, determine endpoint and call it
    if (apiKey && apiKey.trim() !== "") {
      try {
        if (apiKey.startsWith("sk-or-")) {
          return await sendToOpenRouter(userMsg);
        } else {
          return await sendToGemini(userMsg);
        }
      } catch (err) {
        console.warn("AI API failed, falling back to rule-based responses.", err);
      }
    }

    // Otherwise (or if API fails), fall back to local rule-based response
    return getRuleBasedResponse(userMsg);
  }

  // Call OpenRouter API
  async function sendToOpenRouter(userMsg) {
    const botSettings = window.UHC.getChatbotSettings();
    const apiKey = botSettings.geminiApiKey;
    
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const systemPrompt = getSystemPrompt();

    // Prepare message log in OpenRouter completions format
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Append last history ensuring alternating roles
    let lastRole = null;
    const lastHistory = conversationHistory.slice(-6);
    lastHistory.forEach(msg => {
      const role = msg.sender === "user" ? "user" : "assistant";
      if (role !== lastRole) {
        messages.push({
          role: role,
          content: msg.text
        });
        lastRole = role;
      }
    });

    const referer = (window.location.origin && window.location.origin !== "null") ? window.location.origin : "https://usman-heart-care-clinic.local";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": referer,
        "X-Title": "Usman Heart Care Clinic Assistant"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messages,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter request failed: ${response.statusText}`);
    }

    const resJson = await response.json();
    const textReply = resJson.choices?.[0]?.message?.content;
    if (!textReply) {
      throw new Error("Empty response from OpenRouter.");
    }

    return textReply;
  }

  // Call Gemini API
  async function sendToGemini(userMsg) {
    const botSettings = window.UHC.getChatbotSettings();
    const apiKey = botSettings.geminiApiKey;
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const systemPrompt = getSystemPrompt();

    // Prepare history payload for Gemini contents API ensuring alternating roles
    const contents = [];
    let lastRole = null;
    
    // Get last 6 messages to keep it lightweight but conversational
    const lastHistory = conversationHistory.slice(-6);
    lastHistory.forEach(msg => {
      const role = msg.sender === "user" ? "user" : "model";
      if (role !== lastRole) {
        contents.push({
          role: role,
          parts: [{ text: msg.text }]
        });
        lastRole = role;
      }
    });

    // Note: To keep history robust, we include the system prompt inside systemInstruction
    const requestBody = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.statusText}`);
    }

    const resJson = await response.json();
    const textReply = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textReply) {
      throw new Error("Empty candidate list or parts in Gemini response.");
    }

    return textReply;
  }

  // Construct Dynamic System Prompt
  function getSystemPrompt() {
    const settings = window.UHC.getSettings();
    const services = window.UHC.getServices();
    const timings = window.UHC.getTimings();
    
    // Format services
    const servicesStr = services.map(s => `- ${s.title}: ${s.price} (${s.desc})`).join("\n");
    
    // Format timings
    let timingsStr = "";
    for (let i = 0; i < 7; i++) {
      const slots = timings[i] || [];
      if (slots.length > 0) {
        const formattedSlots = slots.map(t => window.UHC.formatTime12h(t));
        timingsStr += `- ${window.UHC.dayNames[i]}: Open from ${formattedSlots[0]} to ${formattedSlots[formattedSlots.length - 1]} (${slots.length} slots available)\n`;
      } else {
        timingsStr += `- ${window.UHC.dayNames[i]}: Closed\n`;
      }
    }

    return `You are UHC-Bot, the official virtual assistant for Usman Heart Care Clinic in Sharaqpur, Punjab, Pakistan.
You must keep your answers extremely short, concise, and direct (max 2 sentences, 40 words). Never write large paragraphs.

STRICT SCOPE BOUNDARIES (CRITICAL):
1. You must ONLY answer questions related to health, medicine, cardiology, diseases, symptoms, healthy living, and the details of Usman Heart Care Clinic (timings, fees, services, doctor profile, location, and bookings).
2. If a user asks a question about ANY topic other than health, medicine, or the clinic, you MUST politely decline to answer, stating: "I am a virtual guide for Usman Heart Care Clinic. I can only assist you with health, medicine, and clinic-related inquiries."

Medical & Health Guidelines:
- Provide very brief general information.
- Always remind the user in a short phrase that this is for educational purposes. Encourage booking a consultation.

Clinic Information:
- Clinic Name: ${settings.name}
- Location: ${settings.location}
- Google Maps Location: ${settings.mapsUrl}
- Contact Phone: ${settings.phone}
- WhatsApp Number: ${settings.whatsapp}
- Doctor: ${settings.doctorName} (${settings.doctorTitle})
- Doctor Qualifications: ${settings.doctorDegree}
- Doctor Profile: ${settings.doctorDescription}

Services and Fees:
${servicesStr}

Visiting Hours / Timings:
${timingsStr}

Important Guidelines:
1. Website Pages Links: When referring to pages on our website, you MUST use Markdown links, for example: [Book Appointment](appointment.html) or [Contact Us](contact.html). Do NOT write raw text like 'appointment.html' or 'visit appointment.html'.
2. Online Appointment Booking: Patients can book appointments by visiting our [Book Appointment](appointment.html) page on our website, selecting a date/time slot, and sending the details to our WhatsApp number ${settings.whatsapp}.
3. Keep answers extremely short, clear, and direct.`;
  }

  // Fallback rule-based matching
  function getRuleBasedResponse(userMessage) {
    const cleanMsg = userMessage.toLowerCase().trim();
    const settings = window.UHC.getSettings();
    const services = window.UHC.getServices();
    const timings = window.UHC.getTimings();

    if (cleanMsg.includes("timing") || cleanMsg.includes("hour") || cleanMsg.includes("when") || cleanMsg.includes("open") || cleanMsg.includes("close") || cleanMsg.includes("schedule") || cleanMsg.includes("time")) {
      let scheduleText = "Our clinic visiting hours are:\n";
      for (let i = 0; i < 7; i++) {
        const slots = timings[i] || [];
        if (slots.length > 0) {
          const formattedSlots = slots.map(t => window.UHC.formatTime12h(t));
          scheduleText += `• **${window.UHC.dayNames[i]}**: ${formattedSlots[0]} – ${formattedSlots[formattedSlots.length - 1]}\n`;
        } else {
          scheduleText += `• **${window.UHC.dayNames[i]}**: Closed\n`;
        }
      }
      return scheduleText;
    }

    if (cleanMsg.includes("fee") || cleanMsg.includes("price") || cleanMsg.includes("charge") || cleanMsg.includes("cost") || cleanMsg.includes("consult") || cleanMsg.includes("service") || cleanMsg.includes("ecg") || cleanMsg.includes("echo")) {
      let serviceText = "Here are the services and fees at our clinic:\n";
      services.forEach(s => {
        serviceText += `• **${s.title}**: ${s.price}\n   _${s.desc}_\n`;
      });
      return serviceText;
    }

    if (cleanMsg.includes("appointment") || cleanMsg.includes("book") || cleanMsg.includes("date") || cleanMsg.includes("slot") || cleanMsg.includes("reserve")) {
      return `To book an appointment, please visit our **[Appointment Page](appointment.html)**. Enter the patient details, choose an available date and time slot, and click 'Create Appointment Request'. You can then send it to us via WhatsApp at **${settings.whatsapp}**!`;
    }

    if (cleanMsg.includes("contact") || cleanMsg.includes("phone") || cleanMsg.includes("number") || cleanMsg.includes("whatsapp") || cleanMsg.includes("call")) {
      return `You can contact us via:\n• **Phone (Clinic/Appointments)**: ${settings.phone}\n• **WhatsApp**: ${settings.whatsapp}\n• Feel free to call us during visiting hours!`;
    }

    if (cleanMsg.includes("location") || cleanMsg.includes("where") || cleanMsg.includes("address") || cleanMsg.includes("map") || cleanMsg.includes("find") || cleanMsg.includes("directions")) {
      return `Usman Heart Care Clinic is located at:\n**${settings.location}**\n\nYou can find directions on **[Google Maps](${settings.mapsUrl})**.`;
    }

    if (cleanMsg.includes("doctor") || cleanMsg.includes("rasheed") || cleanMsg.includes("ahmad") || cleanMsg.includes("who is") || cleanMsg.includes("cardiologist")) {
      return `**${settings.doctorName}** (${settings.doctorTitle})\n_${settings.doctorDegree}_\n\n${settings.doctorDescription}`;
    }

    if (cleanMsg.includes("disease") || cleanMsg.includes("symptom") || cleanMsg.includes("pain") || cleanMsg.includes("chest") || cleanMsg.includes("breath") || cleanMsg.includes("heart") || cleanMsg.includes("attack") || cleanMsg.includes("bp") || cleanMsg.includes("pressure") || cleanMsg.includes("fever") || cleanMsg.includes("medical") || cleanMsg.includes("treatment") || cleanMsg.includes("medicine") || cleanMsg.includes("sick") || cleanMsg.includes("ill") || cleanMsg.includes("condition") || cleanMsg.includes("diagnose")) {
      return `For clinical advice or medical emergencies, please seek medical care immediately. You can book an appointment with **${settings.doctorName}** on our **[Appointment Page](appointment.html)** or via WhatsApp at **${settings.whatsapp}**.`;
    }

    if (cleanMsg.includes("hello") || cleanMsg.includes("hi") || cleanMsg.includes("hey") || cleanMsg.includes("greetings") || cleanMsg.includes("assalam")) {
      return `Hello! How can I help you today? You can ask about our timings, services and fees, location, doctor info, or how to book an appointment.`;
    }

    return `I'm here to assist you with clinic hours, fees, doctor profile, location, and bookings. For more detailed inquiries, feel free to call us at **${settings.phone}** or WhatsApp at **${settings.whatsapp}**.`;
  }
});
