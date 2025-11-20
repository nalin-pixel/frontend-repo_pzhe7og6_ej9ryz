/* NEUROSHIELD – Global JS (No frameworks) */

// Fonts
(function loadFonts(){
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
})();

// Theme Toggle
(function themeInit(){
  const pref = localStorage.getItem('neuro_theme') || 'light';
  if (pref === 'dark') document.documentElement.classList.add('dark');
  document.addEventListener('click', (e)=>{
    const t = e.target.closest('[data-theme-toggle]');
    if (!t) return;
    document.documentElement.classList.toggle('dark');
    const mode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('neuro_theme', mode);
  });
})();

// Simple router-like nav: store active page title
(function navInit(){
  const path = location.pathname.split('/').pop() || 'index.html';
  const selector = `.nav-links a[href$="${path}"]`;
  const active = document.querySelector(selector);
  if (active) active.classList.add('badge');
})();

// Emergency Modal
const EmergencyModal = (() => {
  let backdrop;
  function ensure(){
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>Critical emotional risk detected. You are not alone.</h3>
        <p>Please consider the options below. If you are in immediate danger, contact local emergency services.</p>
        <div class="modal-actions">
          <button class="btn" data-motivation>Motivation Message</button>
          <button class="btn btn-primary" data-breathe>Breathing Exercise</button>
          <button class="btn btn-ghost" data-helpline>Call Helpline (Simulated)</button>
          <button class="btn" data-close>Close</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e)=>{
      if (e.target.dataset.close || e.target === backdrop) hide();
      if (e.target.matches('[data-motivation]')) showMotivation();
      if (e.target.matches('[data-breathe]')) showBreathing();
      if (e.target.matches('[data-helpline]')) simulateHelpline();
    });
    return backdrop;
  }
  function show(){ ensure(); backdrop.style.display = 'flex'; }
  function hide(){ if (backdrop) backdrop.style.display = 'none'; }
  function showMotivation(){ alert(randomQuote()); }
  function showBreathing(){
    const w = window.open('', '', 'width=360,height=420');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Breathing Exercise</title>
      <link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap" rel="stylesheet">
      <style>html,body{height:100%;margin:0;background:#0b1220;color:#e8f3ff;font-family:Poppins,system-ui;display:grid;place-items:center} .box{width:180px;height:180px;border-radius:999px;border:2px solid #6C63FF;background:rgba(108,99,255,.18);display:grid;place-items:center;animation:b 6s ease-in-out infinite;box-shadow:0 10px 40px rgba(0,0,0,.4)}@keyframes b{0%{transform:scale(.9)}50%{transform:scale(1.1)}100%{transform:scale(.9)}} .tip{margin-top:18px;opacity:.8}</style>
      </head><body><div><div class='box'>Breathe</div><div class='tip'>Inhale 4s • Hold 2s • Exhale 6s</div></div></body></html>`);
  }
  function simulateHelpline(){
    alert('Dialing helpline (simulated). If you need support: India: 9152987821 (Kiran), USA: 988 (Suicide & Crisis Lifeline), UK: 116 123 (Samaritans).');
  }
  return { show, hide };
})();

// Quotes
const QUOTES = [
  'You are stronger than you think.',
  'This moment will pass; your courage will remain.',
  'Breathe. One step at a time.',
  'Your feelings are valid, and help is real.',
  'Rest is productive. Be kind to yourself.',
  'You’re not alone in this.',
  'Progress over perfection.',
  'Your story isn’t over yet.',
  'Asking for help is a sign of strength.',
  'Small steps lead to big changes.',
  'You matter more than you know.',
  'Let today be a fresh start.',
  'Storms don’t last forever.',
  'You deserve peace and support.',
  'Keep going; we believe in you.'
];
function randomQuote(){ return QUOTES[Math.floor(Math.random()*QUOTES.length)]; }

// LocalStorage utils for scores
const Storage = {
  pushScore(score){
    const key = 'neuro_scores';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({ score, ts: Date.now() });
    const trimmed = list.slice(0,10);
    localStorage.setItem(key, JSON.stringify(trimmed));
  },
  getScores(){ return JSON.parse(localStorage.getItem('neuro_scores') || '[]'); }
};

// HuggingFace API
const HF_TOKEN = localStorage.getItem('hf_token') || '';
async function hfQuery(modelUrl, payload, isImage=false){
  const headers = { 'Accept': 'application/json' };
  if (HF_TOKEN) headers['Authorization'] = `Bearer ${HF_TOKEN}`;
  if (!isImage) headers['Content-Type'] = 'application/json';
  const res = await fetch(modelUrl, {
    method: 'POST',
    headers,
    body: isImage ? payload : JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HF API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Risk aggregation helper (simple heuristic)
function aggregateRisk({ emotion, polarity, toxicity, selfHarmProb, imageEmotion, imageSentiment }){
  let score = 1;
  const negBoost = (polarity === 'negative' ? 3 : polarity === 'neutral' ? 1 : 0);
  const toxBoost = Math.min(Math.round((toxicity || 0) * 10), 10);
  const shBoost = Math.min(Math.round((selfHarmProb || 0) * 10), 10);
  const emoBoost = (emotion && ['sadness','fear','anger','disgust'].includes(emotion)) ? 3 : 0;
  const imgBoost = (imageEmotion && ['sad','angry','fear'].includes(imageEmotion.toLowerCase())) ? 3 : 0;
  const imgSentBoost = (imageSentiment && imageSentiment.toLowerCase().includes('negative')) ? 2 : 0;
  score += negBoost + Math.max(toxBoost, shBoost) + emoBoost + imgBoost + imgSentBoost;
  score = Math.max(1, Math.min(10, Math.round(score/2)));
  return score;
}

function recommendedAction(score){
  if (score >= 9) return 'Emergency alert: Contact local services or a trusted adult immediately.';
  if (score >= 7) return 'High risk: Reach out to a helpline or a mental health professional now.';
  if (score >= 5) return 'Moderate risk: Practice self-care and talk to someone you trust.';
  return 'Low risk: Keep journaling and practicing mindfulness.';
}

// Page-specific logic

// Home: attach Spline safely (loaded inline in HTML via script)

// Text Analyzer
async function analyzeTextFlow(){
  const ta = document.querySelector('#text-input');
  const out = document.querySelector('#text-output');
  if (!ta || !out) return;
  const text = ta.value.trim();
  if (!text) { out.innerHTML = '<p class="muted">Please enter some text.</p>'; return; }
  out.innerHTML = '<p>Analyzing with AI models…</p>';
  try {
    // Emotion model
    const emotionRes = await hfQuery('https://api-inference.huggingface.co/models/bhadresh-savani/distilbert-base-uncased-emotion', { inputs: text });
    // Pick highest score label
    const emoArr = Array.isArray(emotionRes) ? emotionRes[0] : emotionRes;
    const topEmotion = (emoArr && emoArr.sort ? [...emoArr].sort((a,b)=>b.score-a.score)[0]?.label : 'neutral') || 'neutral';

    // Toxicity
    const toxRes = await hfQuery('https://api-inference.huggingface.co/models/Hate-speech-CNERG/bert-base-uncased-hatexplain', { inputs: text });
    let toxicity = 0;
    if (Array.isArray(toxRes) && Array.isArray(toxRes[0])) {
      const flat = toxRes[0]; // [{label,score}]
      const hateScore = flat.find(x=>/hate/i.test(x.label))?.score || 0;
      const offensive = flat.find(x=>/offensive|abusive|toxic/i.test(x.label))?.score || 0;
      toxicity = Math.max(hateScore, offensive);
    }

    // Self-harm risk (roberta_toxicity_classifier outputs labels TOXIC/NON_TOXIC etc.)
    const shRes = await hfQuery('https://api-inference.huggingface.co/models/s-nlp/roberta_toxicity_classifier', { inputs: text });
    let selfHarmProb = 0;
    if (Array.isArray(shRes) && Array.isArray(shRes[0])) {
      const flat = shRes[0];
      selfHarmProb = flat.find(x=>/toxic/i.test(x.label))?.score || 0;
    }

    // Polarity heuristic using emotion mapping
    const polarity = ['joy','love','surprise'].includes(topEmotion.toLowerCase()) ? 'positive' : (['sadness','anger','fear','disgust'].includes(topEmotion.toLowerCase()) ? 'negative' : 'neutral');

    const finalScore = aggregateRisk({ emotion: topEmotion.toLowerCase(), polarity, toxicity, selfHarmProb });

    // Save to storage
    Storage.pushScore(finalScore);

    if (finalScore >= 7) EmergencyModal.show();

    const action = recommendedAction(finalScore);

    out.innerHTML = `
      <div class="output">
        <h4>AI Analysis Result</h4>
        <div class="row">
          <div>
            <p><strong>Detected emotion:</strong> ${topEmotion}</p>
            <p><strong>Sentiment polarity:</strong> <span class="pill">${polarity}</span></p>
            <p><strong>Toxicity score:</strong> ${(toxicity*100).toFixed(1)}%</p>
          </div>
          <div>
            <p><strong>Self-harm risk (model):</strong> ${(selfHarmProb*100).toFixed(1)}%</p>
            <p><strong>Final risk score:</strong> <span class="pill">${finalScore} / 10</span></p>
            <p><strong>Recommended action:</strong> ${action}</p>
          </div>
        </div>
        <p class="lead" style="margin-top:10px">Explanation: The score combines emotion polarity, detected toxicity, and self-harm indicators using a weighted heuristic. Higher toxic/self-harm probabilities raise the score.</p>
      </div>`;
  } catch (e) {
    out.innerHTML = `<div class="output"><p>Failed to analyze. ${e.message}</p><p>If this is an auth error, set your HuggingFace token locally: localStorage.setItem('hf_token', 'hf_xxx')</p></div>`;
  }
}

// Image Analyzer
async function analyzeImageFlow(){
  const input = document.querySelector('#image-input');
  const out = document.querySelector('#image-output');
  if (!input || !out) return;
  const file = input.files && input.files[0];
  if (!file) { out.innerHTML = '<p class="muted">Please upload an image.</p>'; return; }
  out.innerHTML = '<p>Analyzing image…</p>';
  try {
    const buf = await file.arrayBuffer();
    const blob = new Blob([buf], { type: file.type || 'image/jpeg' });
    // Facial emotions
    const emo = await hfQuery('https://api-inference.huggingface.co/models/dima806/facial_emotions_image_detection', blob, true);
    let imageEmotion = 'neutral';
    try {
      // Model returns array of objects with label/score or nested; handle robustly
      const all = Array.isArray(emo) ? emo : [];
      const flat = all.flat().filter(Boolean);
      const top = flat.sort((a,b)=>(b.score||0)-(a.score||0))[0];
      imageEmotion = (top?.label || 'neutral');
    } catch {}

    // Image sentiment via ResNet-50 labels heuristic
    const sent = await hfQuery('https://api-inference.huggingface.co/models/microsoft/resnet-50', blob, true);
    let imageSentiment = 'neutral';
    try {
      const flat = Array.isArray(sent) ? sent : [];
      const top = flat.sort((a,b)=>(b.score||0)-(a.score||0))[0];
      const lbl = (top?.label || '').toLowerCase();
      if (/coffin|weapon|gun|blood|cemetery|funeral|accident|war|prison/.test(lbl)) imageSentiment = 'negative';
      else if (/flower|smile|sun|beach|puppy|cat|family|friends|celebration/.test(lbl)) imageSentiment = 'positive';
      else imageSentiment = 'neutral';
    } catch {}

    const finalScore = aggregateRisk({ imageEmotion, imageSentiment, polarity: 'neutral', toxicity: 0, selfHarmProb: 0 });
    Storage.pushScore(finalScore);
    if (finalScore >= 7) EmergencyModal.show();
    const action = recommendedAction(finalScore);

    out.innerHTML = `
      <div class="output">
        <h4>Image Analysis Result</h4>
        <div class="row">
          <div>
            <p><strong>Facial emotion:</strong> ${imageEmotion}</p>
            <p><strong>Overall sentiment:</strong> ${imageSentiment}</p>
          </div>
          <div>
            <p><strong>Depressive indicators:</strong> ${imageSentiment==='negative' || /sad|fear|angry/i.test(imageEmotion) ? 'Present' : 'Low'}</p>
            <p><strong>Final risk score:</strong> <span class="pill">${finalScore} / 10</span></p>
            <p><strong>Recommended action:</strong> ${action}</p>
          </div>
        </div>
      </div>`;
  } catch (e) {
    out.innerHTML = `<div class="output"><p>Failed to analyze image. ${e.message}</p><p>If this is an auth error, set your HuggingFace token locally: localStorage.setItem('hf_token', 'hf_xxx')</p></div>`;
  }
}

// Dashboard
function renderDashboard(){
  const canvas = document.getElementById('trend');
  if (!canvas) return;
  const scores = Storage.getScores().slice().reverse();
  const labels = scores.map((s,i)=> new Date(s.ts).toLocaleTimeString());
  const data = scores.map(s=> s.score);
  const highest = data.length ? Math.max(...data) : 0;
  const avg = data.length ? (data.reduce((a,b)=>a+b,0)/data.length) : 0;
  const mood = avg>=7?'High Risk':avg>=5?'Moderate':'Stable';

  document.getElementById('highest').textContent = highest.toFixed(0);
  document.getElementById('average').textContent = avg.toFixed(1);
  document.getElementById('mood').textContent = mood;

  // Chart.js
  new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Risk Score',
        data,
        borderColor: '#6C63FF',
        backgroundColor: 'rgba(108,99,255,0.25)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#6C63FF'
      }]
    },
    options: {
      scales: { y: { suggestedMin: 0, suggestedMax: 10, ticks: { stepSize: 1 } } },
      plugins: { legend: { display: false } },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Bind buttons
document.addEventListener('click', (e)=>{
  if (e.target.matches('#analyze-text')) analyzeTextFlow();
  if (e.target.matches('#analyze-image')) analyzeImageFlow();
});

// Expose to window for debugging
window.NeuroShield = { analyzeTextFlow, analyzeImageFlow, EmergencyModal, Storage, randomQuote };
