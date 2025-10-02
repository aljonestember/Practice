const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Function to add messages to chat
function addMessage(message, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", sender);
  msgDiv.textContent = message;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Function to show typing indicator
function showTyping() {
  const typingDiv = document.createElement("div");
  typingDiv.classList.add("message", "ai");
  typingDiv.textContent = "SoulSyncAI is typing...";
  typingDiv.id = "typing";
  chatWindow.appendChild(typingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Remove typing indicator
function removeTyping() {
  const typingDiv = document.getElementById("typing");
  if (typingDiv) typingDiv.remove();
}

// Send message to backend
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  addMessage(message, "user");
  userInput.value = "";
  showTyping();

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await response.json();
    removeTyping();
    addMessage(data.reply, "ai");
  } catch (error) {
    removeTyping();
    addMessage("Error: Could not reach SoulSyncAI", "ai");
    console.error(error);
  }
}

// Send on button click
sendBtn.addEventListener("click", sendMessage);

// Send on Enter key
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
