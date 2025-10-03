/* SoulSyncAI — BIG offline demo assistant with suggestions & memory
   Paste this entire file into script.js (replace existing).
   Works with your index.html & styles.css which must include:
   - container with id="chatArea"
   - input with id="userInput"
   - button with id="sendBtn"
   - typing bubble CSS for .ai-msg.typing and .dot
*/

/* ===========================
   Basic DOM + Config
   =========================== */
const chatArea = document.getElementById("chatArea");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const TYPING_MIN = 600;
const TYPING_VAR = 900;
const MEMORY_KEEP = 200;
const RECENT_REPLY_KEEP = 40;
const SUGGESTION_KEEP = 6;

let conversation = []; // {sender, text, ts}
let topics = {}; // keyword -> count
let recentAIReplies = []; // avoid repeats
let recentJokes = []; // avoid repeating jokes
let lastUserShort = ""; // last short user message

function nowIso(){ return new Date().toISOString(); }
function pushMemory(sender, text){
  conversation.push({sender, text, ts: nowIso()});
  if(conversation.length > MEMORY_KEEP) conversation.shift();
  if(sender === "user"){
    const words = text.toLowerCase().split(/\W+/).filter(Boolean);
    words.slice(0, 12).forEach(w => topics[w] = (topics[w]||0)+1);
    lastUserShort = text.length < 40 ? text : "";
  }
}
function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function chance(p){ return Math.random() < p; }
function avoidRepeatPick(arr, recentList){
  const filtered = arr.filter(a => !recentList.includes(a));
  const pick = filtered.length ? rand(filtered) : rand(arr);
  recentList.push(pick);
  if(recentList.length > RECENT_REPLY_KEEP) recentList.shift();
  return pick;
}
function avoidRepeat(arr){
  return avoidRepeatPick(arr, recentAIReplies);
}

/* ===========================
   Large Jokes Bank (100+)
   =========================== */
const JOKES = [
"Why did the developer go broke? Because he used up all his cache.",
"Why do programmers prefer dark mode? Because light attracts bugs.",
"Why did the scarecrow get promoted? He was outstanding in his field.",
"What do you call fake spaghetti? An impasta.",
"Why did the bicycle fall over? It was two tired.",
"Why don't skeletons fight each other? They don't have the guts.",
"What did one wall say to the other? I'll meet you at the corner.",
"Why did the computer show up at work late? It had a hard drive.",
"Why do bees have sticky hair? Because they use honeycombs.",
"Why did the cookie go to the hospital? Because it felt crumby.",
"How do you organize a space party? You planet.",
"Why did the golfer bring two pairs of pants? In case he got a hole in one.",
"What did zero say to eight? Nice belt!",
"Why don't scientists trust atoms? Because they make up everything.",
"Why did the tomato blush? Because it saw the salad dressing.",
"What do you call a fish wearing a bowtie? Sofishticated.",
"Why did the picture go to jail? It was framed.",
"Why did the stadium get hot after the game? All the fans left.",
"What do you call cheese that isn't yours? Nacho cheese.",
"Why did the math book look sad? It had too many problems.",
"Why did the physics professor break up with the biology professor? There was no chemistry.",
"Why did the smartphone need glasses? It lost its contacts.",
"Why do seagulls fly over the sea? Because if they flew over the bay, they'd be bagels.",
"Why was the equal sign so humble? It wasn't less than or greater than anyone.",
"What do you call an alligator detective? An investigator.",
"Why did the coffee file a police report? It got mugged.",
"Why are elevator jokes so good? They work on many levels.",
"Why did the programmer quit his job? Because he didn't get arrays.",
"Why do cows have hooves instead of feet? Because they lactose.",
"What did one plate say to the other? Lunch is on me.",
"What did the ocean say to the shore? Nothing, it just waved.",
"Why did the cookie cry? Because his mom was a wafer too long.",
"What's orange and sounds like a parrot? A carrot.",
"Why don't some couples go to the gym? Because some relationships don't work out.",
"Why did the computer keep sneezing? It had a bad case of CAPS LOCK.",
"Why was six afraid of seven? Because seven eight nine.",
"Why did the chicken join a band? Because it had the drumsticks.",
"Why are ghosts bad liars? Because you can see right through them.",
"What do you call a snowman in July? A puddle.",
"Why did the tomato turn red? It saw the salad dressing!",
"What do you call a dinosaur with an extensive vocabulary? A thesaurus.",
"Why did the bicycle fall over? It was two-tired.",
"Why did the calendar go on a diet? It had too many dates.",
"Why did the coach go to the bank? To get his quarter back.",
"What do you call a fish with no eyes? Fsh.",
"Why don't oysters share their pearls? Because they're shellfish.",
"Why did the scarecrow win an award? For being outstanding in his field.",
"Why do programmers hate nature? Too many bugs.",
"What's a programmer's favorite hangout place? Foo Bar.",
"Why was the broom late? It over swept.",
"Why was the belt arrested? For holding up a pair of pants.",
"Why did the coffee go to school? It wanted to be a latte smarter.",
"Why did the computer go to therapy? It had too many tabs open.",
"Why did the grape stop in the middle of the road? It ran out of juice.",
"Why did the music teacher need a ladder? To reach the high notes.",
"Why did the math teacher open a bakery? She wanted to make pi.",
"Why did the man put his money in the freezer? He wanted cold hard cash."
];
// extend to ~150 jokes by repeating variations
while(JOKES.length < 160) JOKES.push(...JOKES.slice(0, 40));

/* ===========================
   Suggestion Chips (common suggestions)
   =========================== */
const GLOBAL_SUGGESTIONS = [
  "Ask for a joke",
  "Give me a quick recipe",
  "Help me make a to-do list",
  "Calculate 23 * 19",
  "What's the time?",
  "Give me motivation",
  "Recommend a short activity",
  "Explain AI in simple terms",
  "Tell me a fun fact",
  "Help me write an email"
];

/* ===========================
   Glossary & small facts
   =========================== */
const GLOSSARY = {
  "ai": "AI stands for artificial intelligence — systems that perform tasks that normally require human intelligence.",
  "api": "API means Application Programming Interface — a way for applications to talk to each other.",
  "javascript": "JavaScript is a programming language commonly used to build interactive websites.",
  "html": "HTML is the markup language for creating web page structure.",
  "css": "CSS styles HTML; it controls layout, color, and appearance."
};

/* ===========================
   Helpers: UI message + suggestions
   =========================== */
function createBubble(sender, text){
  const el = document.createElement("div");
  el.className = sender === "user" ? "user-msg" : "ai-msg";
  // preserve newlines
  text.split("\n").forEach((line, idx) => {
    const p = document.createElement("div");
    p.textContent = line;
    el.appendChild(p);
  });
  return el;
}

// attach suggestions under the last AI bubble
function attachSuggestions(suggestions){
  // remove old suggestion box if present
  const old = document.getElementById("suggestions-box");
  if(old) old.remove();

  if(!suggestions || suggestions.length === 0) return;
  const box = document.createElement("div");
  box.id = "suggestions-box";
  box.style.display = "flex";
  box.style.flexWrap = "wrap";
  box.style.gap = "8px";
  box.style.marginTop = "8px";

  suggestions.slice(0,6).forEach(s => {
    const chip = document.createElement("button");
    chip.className = "suggestion-chip";
    chip.textContent = s;
    chip.style.padding = "6px 10px";
    chip.style.borderRadius = "14px";
    chip.style.border = "1px solid rgba(255,255,255,0.06)";
    chip.style.background = "transparent";
    chip.style.color = "inherit";
    chip.style.cursor = "pointer";
    chip.addEventListener("click", ()=> {
      userInput.value = s;
      userInput.focus();
      // optional: auto-send when clicking
      // sendBtn.click();
    });
    box.appendChild(chip);
  });

  // append to chatArea as last child (directly under last AI bubble)
  chatArea.appendChild(box);
  chatArea.scrollTop = chatArea.scrollHeight;
}

/* ===========================
   Typing bubble helper
   =========================== */
function showTypingBubble(){
  const bubble = document.createElement("div");
  bubble.className = "ai-msg typing";
  bubble.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
  chatArea.appendChild(bubble);
  chatArea.scrollTop = chatArea.scrollHeight;
  return bubble;
}

/* ===========================
   Intent handlers (broad coverage)
   =========================== */
function tryMathEval(s){
  try{
    const cleaned = s.replace(/[^0-9+\-*/(). %]/g,"");
    if(!/[\d]/.test(cleaned)) return null;
    const val = Function(`"use strict"; return (${cleaned})`)();
    if(typeof val === "number" && isFinite(val)) return val;
  }catch(e){}
  return null;
}

function findReply(text){
  const t = text.trim();
  const lower = t.toLowerCase();

  // direct short commands
  if(/\b(joke|tell me a joke|make me laugh)\b/i.test(t)){
    const joke = avoidRepeatPick(JOKES, recentJokes);
    return {reply: joke, suggestions: ["Another joke", "Explain the joke", "Tell a fun fact"]};
  }
  if(/\b(what can you do|what do you do|capabilities)\b/i.test(t)){
    return {reply: "I'm your personal assistant demo — I can do quick math, suggest recipes, tell jokes, make lists, and help brainstorm. What would you like?", suggestions: ["Give me a recipe", "Make a to-do list", "Tell me a joke"]};
  }
  if(/\b(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(t)){
    return {reply: avoidRepeat([
      "Hi — I'm your personal assistant. How can I help you today?",
      "Hello! What can I do for you right now?",
      "Hey! Need help with something?"
    ]), suggestions: GLOBAL_SUGGESTIONS};
  }
  if(/\b(thank(s| you)?|appreciate it|cheers)\b/i.test(t)){
    return {reply: avoidRepeat(["You're welcome!", "Anytime — happy to help.", "Glad I could help."]), suggestions: ["Anything else?","Give feedback"]};
  }
  if(/\b(bye|goodbye|see you|later)\b/i.test(t)){
    return {reply: avoidRepeat(["Goodbye — take care!", "Talk soon — have a great day!", "See you later!"]), suggestions: []};
  }

  // time/date
  if(/\b(what(?:'s| is)? the time|time now|current time)\b/i.test(t)){
    return {reply: `The current time is ${new Date().toLocaleTimeString()}.`, suggestions: ["What's the date?","Set a reminder (demo)"]};
  }
  if(/\b(what(?:'s| is)? the date|today's date|what day is it)\b/i.test(t)){
    return {reply: `Today is ${new Date().toLocaleDateString()}.`, suggestions: ["What's the time?","Tell me something interesting"]};
  }

  // math
  const mathVal = tryMathEval(t);
  if(mathVal !== null) return {reply: `That equals ${mathVal}.`, suggestions: ["Calculate 12*12","Convert 10 km to miles"]};

  // conversions
  {
    const re = /([\d.]+)\s*(cm|m|km|kg|lb|lbs|mi|miles|c|f|°c|°f)/i;
    const m = t.match(re);
    if(m){
      const v = parseFloat(m[1]); const unit = m[2].toLowerCase();
      let out = null;
      if(unit==="cm") out = `${v} cm = ${(v/100).toFixed(3)} m.`;
      if(unit==="m") out = `${v} m = ${(v*100).toFixed(2)} cm.`;
      if(unit==="km") out = `${v} km = ${(v*1000).toFixed(2)} m.`;
      if(unit==="mi"||unit==="miles") out = `${v} miles = ${(v*1.60934).toFixed(3)} km.`;
      if(unit==="kg") out = `${v} kg = ${(v*2.20462).toFixed(3)} lb.`;
      if(unit==="lb"||unit==="lbs") out = `${v} lb = ${(v/2.20462).toFixed(3)} kg.`;
      if(unit==="c"||unit==="°c") out = `${v}°C = ${(v*9/5+32).toFixed(1)}°F.`;
      if(unit==="f"||unit==="°f") out = `${v}°F = ${((v-32)*5/9).toFixed(1)}°C.`;
      if(out) return {reply: out, suggestions: ["Convert 10 km to miles","Convert 72 F to C"]};
    }
  }

  // recipe suggestions
  if(/\b(recipe|cook|dinner|lunch|breakfast|what can I make)\b/i.test(t)){
    if(/pasta|spaghetti|noodles/i.test(t)) return {reply: "Quick garlic pasta: sauté garlic in olive oil, toss with cooked pasta, add chili flakes, parmesan, and lemon zest.", suggestions: ["Give measurements","Suggest wine pairing"]};
    if(/chicken/i.test(t)) return {reply: "Roasted chicken breasts: olive oil, garlic, herbs, 20–25 min at 200°C. Serve with salad or rice.", suggestions: ["Easy sides","Marinade ideas"]};
    return {reply: "Tell me a main ingredient and I'll suggest a recipe (e.g., chicken, pasta, eggs).", suggestions: ["I have eggs","I have pasta"]};
  }

  // jokes explicit
  if(/\b(another joke|again|more jokes)\b/i.test(t)) {
    const joke = avoidRepeatPick(JOKES, recentJokes);
    return {reply: joke, suggestions: ["Another joke","Explain the joke","Tell a fun fact"]};
  }

  // definitions
  {
    const re = /\b(what is|define|meaning of)\s+(.{1,60})\??$/i;
    const m = t.match(re);
    if(m){
      const term = m[2].trim().toLowerCase();
      if(GLOSSARY[term]) return {reply: `${term}: ${GLOSSARY[term]}`, suggestions: ["Explain in simple terms","Give example use"]};
      return {reply: `Here's a brief definition of "${term}". If you want a deeper explanation, tell me the area (e.g., tech, history).`, suggestions: ["Give examples","Explain like I'm five"]};
    }
  }

  // todo list creation
  if(/\b(todo|to-do|make a list|shopping list|shopping)\b/i.test(t)){
    const items = t.split(/[:,]\s*/).slice(1).join(", ");
    if(items) return {reply: `Here’s your formatted list:\n- ${items.split(/\s*,\s*/).join("\n- ")}`, suggestions: ["Add item","Clear list"]};
    return {reply: "Sure — give me items separated by commas and I'll format a checklist.", suggestions: ["Milk, eggs, bread"]};
  }

  // feelings / empathy
  if(/\b(sad|depressed|anxious|stressed|lonely|bored|happy|tired)\b/i.test(t)){
    if(/sad|depressed|lonely/i.test(t)) return {reply: "I'm sorry you're feeling that way. Want a quick breathing exercise or to talk about it?", suggestions: ["Breathing exercise","Talk about it"]};
    if(/anxious|stressed/i.test(t)) return {reply: "Try 4-4-6 breathing: inhale 4s, hold 4s, exhale 6s. Want a short grounding exercise?", suggestions: ["Start breathing exercise","Short grounding"]};
    if(/bored/i.test(t)) return {reply: "Bored? I can suggest a quick activity: a 10-minute creative prompt, a tiny coding challenge, or a quick walk.", suggestions: ["Give a creative prompt","Start a 5-min challenge"]};
    if(/happy|good|great/i.test(t)) return {reply: "That's great to hear! Want a fun fact or a song suggestion to celebrate?", suggestions: ["Fun fact","Song suggestion"]};
  }

  // recall explicit "remember"
  if(/\b(do you remember|what did I say earlier|remember that I)\b/i.test(t)){
    const userMsgs = conversation.filter(c=>c.sender==="user").slice(-8).map(u=>u.text);
    if(userMsgs.length === 0) return {reply: "I don't have anything earlier in this session yet — tell me what you'd like me to remember.", suggestions: ["Remember this: ..."]};
    const sample = userMsgs[userMsgs.length-1];
    return {reply: `Earlier you said: "${sample}". Do you want to continue that topic?`, suggestions: ["Yes, continue","No, change topic"]};
  }

  // short inputs like "so" or "and?"
  if(/^\s*(so|and|then|well)\s*[\?\!]*$/i.test(t) || t.length < 4){
    // if last topic exists, ask follow-up or propose suggestions
    const keys = Object.keys(topics).filter(k => topics[k] > 1 && k.length > 3);
    if(keys.length && chance(0.6)){
      const k = rand(keys);
      return {reply: `About ${k} — would you like to continue that thread or shift to something else?`, suggestions: [`Continue ${k}`, "Shift topic", "Give a summary"]};
    }
    return {reply: avoidRepeat([
      "Could you say a little more so I can help?",
      "Short and sweet — do you want a quick answer or step-by-step?",
      "I can help — what outcome are you after?"
    ]), suggestions: GLOBAL_SUGGESTIONS};
  }

  // music / song suggestion
  if(/\b(song|music|playlist|recommend a song)\b/i.test(t)){
    return {reply: "What's your mood? Chill, energetic, focus, or nostalgic?", suggestions: ["Chill","Energetic","Focus","Nostalgic"]};
  }

  // quick fallback for many words: try to map to likely actions
  {
    const words = lower.split(/\W+/).filter(Boolean);
    if(words.includes("email") || words.includes("write") && words.includes("email")){
      return {reply: "I can draft an email. Tell me the recipient and the purpose (e.g., schedule meeting, follow-up).", suggestions: ["Draft meeting invite","Follow-up email"]};
    }
    if(words.includes("recipe") || words.includes("cook") || words.includes("dinner")){
      return {reply: "Tell me main ingredient or dietary preference and I'll suggest something quick.", suggestions: ["I have chicken","I want vegan"]};
    }
    if(words.includes("motivate") || words.includes("motivation") || words.includes("quote")){
      return {reply: avoidRepeat(["You’ve got this — pick one small task and do 10 minutes. Want a motivational quote?","Progress beats perfection — want a short plan?"]), suggestions: ["Give me a quote","Make a plan"]};
    }
  }

  // default: ask for goal / offer suggestions
  return {reply: avoidRepeat([
    "I can help with that — do you want a quick summary or a step-by-step plan?",
    "Tell me the goal and I'll make a practical suggestion.",
    "I don't have live web access in this demo, but I can reason through it with you."
  ]), suggestions: GLOBAL_SUGGESTIONS};
}

/* ===========================
   Send flow with typing + suggestions
   =========================== */
function createBubbleAndAppend(sender, text){
  const bubble = createBubble(sender, text);
  chatArea.appendChild(bubble);
  chatArea.scrollTop = chatArea.scrollHeight;
  pushMemory(sender, text);
  return bubble;
}

async function sendMessageFlow(userText){
  // append user bubble
  createBubbleAndAppend("user", userText);

  // show animated typing bubble
  const typingBubble = showTypingBubble();

  // simulate delay proportional to length
  const delay = TYPING_MIN + Math.min(userText.length * 16, 1800) + Math.random() * TYPING_VAR;
  await new Promise(r => setTimeout(r, delay));

  // compute reply
  const res = findReply(userText);
  typingBubble.remove();

  // ensure non-repetition of replies
  let reply = res.reply;
  if(recentAIReplies.includes(reply) && chance(0.6)){
    // pick a safe alternate
    const alt = avoidRepeat([
      "I can help with that — want a short or detailed answer?",
      "Let's break it down — would you like steps or examples?",
      "I can do that — should I start with a quick summary?"
    ]);
    reply = alt;
  }

  // append AI bubble
  createBubbleAndAppend("ai", reply);
  // record ai reply history to avoid repeats
  recentAIReplies.push(reply);
  if(recentAIReplies.length > RECENT_REPLY_KEEP) recentAIReplies.shift();

  // attach suggestions if present
  let suggestions = [];
  if(res.suggestions) suggestions = res.suggestions;
  else {
    // default dynamic suggestions based on topics & reply type
    suggestions = [
      "Another example",
      "Make a short plan",
      "Explain like I'm five",
      "Give me a joke",
      "Summarize this"
    ];
  }
  // include some global suggestions
  const mix = [...new Set([...suggestions.slice(0,4), ...GLOBAL_SUGGESTIONS])];
  attachSuggestions(mix.slice(0, SUGGESTION_KEEP));
}

/* ===========================
   UI events
   =========================== */
sendBtn.addEventListener("click", ()=>{
  const txt = userInput.value.trim();
  if(!txt) return;
  userInput.value = "";
  sendMessageFlow(txt);
});
userInput.addEventListener("keypress", (e)=>{
  if(e.key === "Enter"){
    e.preventDefault();
    sendBtn.click();
  }
});

/* ===========================
   Startup greeting
   =========================== */
appendMessage("ai", "Hi — I'm your personal assistant. How can I help you today?");
storeAIRepliesInit = () => {}; // placeholder

/* ===========================
   small helper: createBubble used above
   =========================== */
function createBubble(sender, text){
  const el = document.createElement("div");
  el.className = sender === "user" ? "user-msg" : "ai-msg";
  // preserve line breaks
  text.split("\n").forEach(line => {
    const p = document.createElement("div");
    p.textContent = line;
    el.appendChild(p);
  });
  return el;
}

/* ===========================
   END OF FILE
   =========================== */
