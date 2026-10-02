/* ============================================================
   STORIES — 25 stories (full data, condensed texts for brevity)
   ============================================================ */
const stories = window.stories || [];

/* ============================================================
   LANGUAGE & SPEED
   ============================================================ */
const LANGS = {
  en: { name:"English", flag:"🇬🇧", code:"en-US" },
  fr: { name:"French", flag:"🇫🇷", code:"fr-FR" },
  nl: { name:"Dutch", flag:"🇳🇱", code:"nl-NL" }
};
const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5];

/* ============================================================
   STATE
   ============================================================ */
let state = {
  nativeLang: localStorage.getItem('lf_nativeLang') || null,
  learningLang: localStorage.getItem('lf_learningLang') || null,
  level: localStorage.getItem('lf_level') || null,
  onboardingComplete: localStorage.getItem('lf_onboardingComplete') === 'true',
  darkMode: localStorage.getItem('lf_darkMode') === 'true',
  audioSpeed: parseFloat(localStorage.getItem('lf_audioSpeed')) || 1.0
};
if (!SPEED_OPTIONS.includes(state.audioSpeed)) { state.audioSpeed = 1.0; localStorage.setItem('lf_audioSpeed','1.0'); }

let currentStoryId = null, currentStory = null;
let currentSentenceIndex = 0, sentenceModeActive = false, showTranslation = false;
let quizState = {}, flashcardIndex = 0, flashcardFlipped = false;
let currentLevelFilter = 'all', currentContinentFilter = 'all', currentCategoryFilter = 'all';
let searchQuery = '', currentView = 'home';

/* Audio sync state — for word-by-word highlighting */
let audioState = {
  isPlaying: false,
  sentenceIndex: 0,
  words: [],           // [{text, charStart, charEnd, element}]
  currentWordIndex: -1,
  startTime: 0,
  charIndex: 0,
  utterance: null,
  estimatedDurationMs: 0,
  rafId: null,
  paused: false
};

const onboarding = document.getElementById('onboarding');
const mainApp = document.getElementById('mainApp');
const wordPopup = document.getElementById('wordPopup');
const themeToggle = document.getElementById('themeToggle');

/* ============================================================
   READING POSITION — sentence selection + mobile auto-scroll
   ============================================================ */
function clearSentenceSelection() {
  document.querySelectorAll('.sentence-pair.speaking').forEach(el => {
    el.classList.remove('speaking');
    el.removeAttribute('aria-current');
  });
}

function ensureSentenceVisible(el, behavior = 'smooth') {
  if (!el) return;

  const topBar = document.querySelector('.top-bar');
  const bottomNav = document.querySelector('.bottom-nav');
  const topOffset = (topBar ? topBar.getBoundingClientRect().height : 0) + 12;
  const bottomOffset = (bottomNav ? bottomNav.getBoundingClientRect().height : 0) + 20;

  const rect = el.getBoundingClientRect();
  const visibleTop = topOffset;
  const visibleBottom = window.innerHeight - bottomOffset;

  if (rect.top < visibleTop) {
    window.scrollBy({
      top: rect.top - visibleTop,
      behavior
    });
  } else if (rect.bottom > visibleBottom) {
    window.scrollBy({
      top: rect.bottom - visibleBottom,
      behavior
    });
  }
}

function selectReadingSentence(sentenceIndex, options = {}) {
  const { scroll = true, behavior = 'smooth' } = options;
  clearSentenceSelection();

  const el = document.querySelector(`.sentence-pair[data-index="${sentenceIndex}"]`);
  if (!el) return;

  el.classList.add('speaking');
  el.setAttribute('aria-current', 'true');

  if (scroll) {
    ensureSentenceVisible(el, behavior);
  }
}


/* ============================================================
   ONBOARDING
   ============================================================ */
let tempNative=null, tempLearning=null, tempLevel=null;
function showStep(n) {
  document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step'+n).classList.add('active');
}
function openOnboarding() {
  tempNative=state.nativeLang; tempLearning=state.learningLang; tempLevel=state.level;
  onboarding.style.display='flex'; mainApp.classList.remove('active'); showStep(1);
  document.querySelectorAll('#nativeOptions .lang-option').forEach(o => o.classList.toggle('selected', o.dataset.lang===tempNative));
  document.getElementById('step1Next').disabled = !tempNative;
  updateLearningOptions();
  document.querySelectorAll('#learningOptions .lang-option').forEach(o => o.classList.toggle('selected', o.dataset.lang===tempLearning));
  document.getElementById('step2Next').disabled = !tempLearning;
  document.querySelectorAll('#levelOptions .level-option').forEach(o => o.classList.toggle('selected', o.dataset.level===tempLevel));
  document.getElementById('startLearning').disabled = !tempLevel;
}
document.querySelectorAll('#nativeOptions .lang-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('#nativeOptions .lang-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected'); tempNative = opt.dataset.lang;
    document.getElementById('step1Next').disabled = false;
  });
});
document.getElementById('step1Next').addEventListener('click', () => {
  if (!tempNative) return; showStep(2); updateLearningOptions();
});
function updateLearningOptions() {
  document.querySelectorAll('#learningOptions .lang-option').forEach(opt => {
    opt.classList.remove('selected','disabled');
    if (opt.dataset.lang === tempNative) opt.classList.add('disabled');
  });
  tempLearning=null; document.getElementById('step2Next').disabled=true;
}
document.querySelectorAll('#learningOptions .lang-option').forEach(opt => {
  opt.addEventListener('click', () => {
    if (opt.classList.contains('disabled')) return;
    document.querySelectorAll('#learningOptions .lang-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected'); tempLearning = opt.dataset.lang;
    document.getElementById('step2Next').disabled = false;
  });
});
document.getElementById('step2Back').addEventListener('click', () => showStep(1));
document.getElementById('step2Next').addEventListener('click', () => {
  if (!tempLearning || tempLearning===tempNative) return; showStep(3);
});
document.querySelectorAll('#levelOptions .level-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('#levelOptions .level-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected'); tempLevel = opt.dataset.level;
    document.getElementById('startLearning').disabled = false;
  });
});
document.getElementById('step3Back').addEventListener('click', () => showStep(2));
document.getElementById('startLearning').addEventListener('click', () => {
  if (!tempLevel || tempNative===tempLearning) return;
  state.nativeLang=tempNative; state.learningLang=tempLearning; state.level=tempLevel;
  state.onboardingComplete=true;
  localStorage.setItem('lf_nativeLang', state.nativeLang);
  localStorage.setItem('lf_learningLang', state.learningLang);
  localStorage.setItem('lf_level', state.level);
  localStorage.setItem('lf_onboardingComplete','true');
  onboarding.style.display='none'; mainApp.classList.add('active'); initApp();
});

/* ============================================================
   INIT
   ============================================================ */
function initApp() {
  applyTheme(); updateLangPairDisplay(); updateNav();
  renderHome(); setupNavigation(); setupFilters(); setupSearch();
}
function applyTheme() {
  document.body.classList.toggle('dark', state.darkMode);
  themeToggle.textContent = state.darkMode ? '🌙' : '☀️';
}
themeToggle.addEventListener('click', () => {
  state.darkMode = !state.darkMode; localStorage.setItem('lf_darkMode', state.darkMode); applyTheme();
});
function updateLangPairDisplay() {
  const text = document.getElementById('langPairText');
  if (!state.nativeLang || !state.learningLang) return;
  text.textContent = `${LANGS[state.nativeLang].flag} → ${LANGS[state.learningLang].flag}`;
}
document.getElementById('langPairBtn').addEventListener('click', openOnboarding);

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}
function switchView(view) {
  stopAudio();
  currentView = view;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view===view));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-'+view);
  if (el) el.classList.add('active');
  window.scrollTo({top:0, behavior:'smooth'});
  if (view==='home') renderHome();
  if (view==='discover') renderDiscover();
  if (view==='vocabulary') renderVocabulary();
  if (view==='progress') renderProgress();
  if (view==='settings') renderSettings();
  if (view==='story') renderStoryView();
}
function updateNav() {
  const sN = document.getElementById('settingsNative');
  if (sN) {
    sN.textContent = state.nativeLang ? LANGS[state.nativeLang].name : '—';
    document.getElementById('settingsLearning').textContent = state.learningLang ? LANGS[state.learningLang].name : '—';
    document.getElementById('settingsLevel').textContent = state.level || '—';
    document.getElementById('settingsSpeed').textContent = state.audioSpeed + '×';
  }
}

/* ============================================================
   HOME
   ============================================================ */
function renderHome() {
  if (!state.nativeLang || !state.learningLang) return;
  document.getElementById('welcomeTitle').textContent = 'Discover something new';
  document.getElementById('welcomeSub').textContent = `Learn ${LANGS[state.learningLang].name} by exploring the world.`;

  const lastStoryId = localStorage.getItem('lf_lastStory');
  if (lastStoryId) {
    const lastStory = stories.find(s => s.id === parseInt(lastStoryId));
    if (lastStory) {
      document.getElementById('continueSection').style.display = 'block';
      document.getElementById('continueStory').innerHTML = renderStoryCard(lastStory);
    }
  }
  const levelOrder = ['A2','B1','B2','C1'];
  const userLevelIdx = levelOrder.indexOf(state.level);
  const recommended = [...stories].sort((a,b) =>
    Math.abs(levelOrder.indexOf(a.level) - userLevelIdx) - Math.abs(levelOrder.indexOf(b.level) - userLevelIdx)
  ).slice(0,3);
  document.getElementById('recommendedGrid').innerHTML = recommended.map(renderStoryCard).join('');

  const categories = [...new Set(stories.map(s => s.category))];
  document.getElementById('categoryChips').innerHTML = categories.map(c =>
    `<button class="category-chip" onclick="filterByCategory('${c}')">${c}</button>`
  ).join('');

  const progress = getProgress();
  const completed = Object.values(progress).filter(p => p.completed).length;
  const vp = getVocabProgress();
  const wordsCount = Object.keys(vp).length;
  const quizAvg = getQuizAverage();

  document.getElementById('progressMini').innerHTML = `
    <div class="mini-stat"><div class="number">${completed}/${stories.length}</div><div class="label">Stories</div></div>
    <div class="mini-stat"><div class="number">${wordsCount}</div><div class="label">Words</div></div>
    <div class="mini-stat"><div class="number">${quizAvg}%</div><div class="label">Quiz avg</div></div>
    <div class="mini-stat"><div class="number">${state.level}</div><div class="label">Level</div></div>
  `;
  attachCardHandlers();
}
function filterByCategory(cat) { currentCategoryFilter = cat; switchView('discover'); }

function renderStoryCard(story) {
  const title = story.titles[state.learningLang] || story.titles.en;
  const summary = story.summaries[state.nativeLang] || story.summaries.en;
  const favs = getFavorites();
  const isFav = favs.includes(story.id);
  return `
    <div class="story-card" data-id="${story.id}">
      <div class="card-visual">
        <span>📖</span>
        <span class="flag">${story.flag} ${story.country}</span>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="level-badge ${story.level}">${story.level}</span>
          <span>${story.category}</span>
          <span>${story.estimatedMinutes} min</span>
        </div>
        <h3>${title}</h3>
        <div class="card-location">${story.country}, ${story.continent}</div>
        <div class="card-summary">${summary}</div>
        <div class="card-footer">
          <button class="btn-read" onclick="event.stopPropagation(); openStory(${story.id})">Read</button>
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${story.id})">
            ${isFav ? '♥' : '♡'}
          </button>
        </div>
      </div>
    </div>
  `;
}
function attachCardHandlers() {
  document.querySelectorAll('.story-card').forEach(card => {
    card.addEventListener('click', () => openStory(parseInt(card.dataset.id)));
  });
}

/* ============================================================
   DISCOVER
   ============================================================ */
function renderDiscover() {
  if (!state.nativeLang || !state.learningLang) return;
  const categories = [...new Set(stories.map(s => s.category))];
  const catRow = document.getElementById('categoryFilters');
  if (catRow.children.length <= 1) {
    categories.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'filter-chip'; btn.dataset.cat = c; btn.textContent = c;
      btn.addEventListener('click', () => {
        document.querySelectorAll('#categoryFilters .filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); currentCategoryFilter = c; renderDiscover();
      });
      catRow.appendChild(btn);
    });
  }
  const filtered = stories.filter(s => {
    const levelMatch = currentLevelFilter==='all' || s.level===currentLevelFilter;
    const contMatch = currentContinentFilter==='all' || s.continent===currentContinentFilter;
    const catMatch = currentCategoryFilter==='all' || s.category===currentCategoryFilter;
    const title = s.titles[state.learningLang] || s.titles.en;
    const searchMatch = !searchQuery ||
      title.toLowerCase().includes(searchQuery) ||
      s.country.toLowerCase().includes(searchQuery) ||
      s.category.toLowerCase().includes(searchQuery) ||
      s.continent.toLowerCase().includes(searchQuery);
    return levelMatch && contMatch && catMatch && searchMatch;
  });
  document.getElementById('discoverGrid').innerHTML = filtered.length > 0
    ? filtered.map(renderStoryCard).join('')
    : '<p style="color:var(--text-secondary); text-align:center; padding:40px 0;">No stories match your filters.</p>';
  attachCardHandlers();
}
function setupFilters() {
  document.querySelectorAll('#levelFilters .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#levelFilters .filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); currentLevelFilter = btn.dataset.level; renderDiscover();
    });
  });
  document.querySelectorAll('#continentFilters .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#continentFilters .filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); currentContinentFilter = btn.dataset.continent; renderDiscover();
    });
  });
}
function setupSearch() {
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase(); renderDiscover();
  });
}

/* ============================================================
   STORY VIEW
   ============================================================ */
function openStory(id) {
  stopAudio();
  currentStoryId = id;
  currentStory = stories.find(s => s.id === id);
  currentSentenceIndex = 0; sentenceModeActive = false; showTranslation = false;
  quizState = {}; flashcardIndex = 0; flashcardFlipped = false;
  localStorage.setItem('lf_lastStory', id);
  switchView('story');
}

function renderStoryView() {
  if (!currentStory) return;
  const s = currentStory;
  const native = state.nativeLang;
  const learning = state.learningLang;
  const progress = getProgress();
  const sp = progress[s.id] || {};

  const title = s.titles[learning] || s.titles.en;
  const text = s.texts[learning] || s.texts.en;
  const summary = s.summaries[native] || s.summaries.en;
  const hook = s.hooks[native] || s.hooks.en;

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const translation = s.texts[native] || s.texts.en;
  const translationSentences = translation.match(/[^.!?]+[.!?]+/g) || [translation];

  const favs = getFavorites();
  const isFav = favs.includes(s.id);
  const understoodCount = sp.understood || 0;
  const totalSentences = sentences.length;
  const pct = Math.round((understoodCount / totalSentences) * 100);

  document.getElementById('storyContent').innerHTML = `
    <div class="story-header">
      <h1>${title}</h1>
      <div class="story-meta-row">
        <span>${s.flag} ${s.country}</span>
        <span class="level-badge ${s.level}">${s.level}</span>
        <span>${s.category}</span>
        <span>⏱ ${s.estimatedMinutes} min</span>
        <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(${s.id}); renderStoryView();">
          ${isFav ? '♥' : '♡'}
        </button>
      </div>
      <div class="story-hook">${hook}</div>
    </div>

    <div class="reading-controls">
      <div class="mode-selector">
        <button class="mode-btn ${!sentenceModeActive ? 'active' : ''}" onclick="setMode('full')">Full text</button>
        <button class="mode-btn ${sentenceModeActive ? 'active' : ''}" onclick="setMode('sentence')">Sentences</button>
      </div>
      <div class="audio-controls">
        <button class="audio-btn" id="playBtn" onclick="playFromStart()">▶ Play</button>
        <button class="audio-btn" id="pauseBtn" onclick="togglePause()">⏸</button>
        <button class="audio-btn" onclick="stopAudio()">⏹</button>
      </div>
      <div class="speed-control">
        ${SPEED_OPTIONS.map(sp => `
          <button class="speed-btn ${state.audioSpeed===sp ? 'active' : ''}" onclick="setAudioSpeed(${sp})">${sp}×</button>
        `).join('')}
      </div>
    </div>

    <div class="progress-bar-container">
      <span>Progress: ${pct}%</span>
      <div class="progress-track"><div class="progress-fill" style="width: ${pct}%"></div></div>
    </div>

    <div id="fullTextMode" style="display: ${sentenceModeActive ? 'none' : 'block'}">
      <div class="story-content" id="storyContentList">
        ${sentences.map((sent, i) => {
          const trans = translationSentences[i] || '';
          const understood = sp[`s_${i}`] || false;
          return `
            <div class="sentence-pair ${showTranslation ? 'show-translation' : ''} ${understood ? 'understood' : ''}" data-index="${i}">
              <div class="sentence-fr" data-sentence-index="${i}">${wrapWords(sent, i)}</div>
              <div class="sentence-translation">${trans}</div>
              <span class="understood-check">✓</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div id="sentenceModeView" class="sentence-mode" style="display: ${sentenceModeActive ? 'flex' : 'none'}">
      <div class="current-fr" id="currentFr">${wrapWords(sentences[0], 0)}</div>
      <div class="current-translation" id="currentTrans">${translationSentences[0] || ''}</div>
      <div class="sentence-nav">
        <button onclick="prevSentence()" ${currentSentenceIndex===0 ? 'disabled' : ''}>← Prev</button>
        <button onclick="speakCurrentSentence()">🔊</button>
        <button onclick="nextSentence()" ${currentSentenceIndex>=sentences.length-1 ? 'disabled' : ''}>Next →</button>
      </div>
      <div style="font-size:.82rem; color:var(--text-secondary);">${currentSentenceIndex+1} / ${sentences.length}</div>
    </div>

    <div style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;">
      <button class="audio-btn" style="flex:1;" onclick="toggleTranslation()">
        ${showTranslation ? '🙈 Hide' : '👁 Show translation'}
      </button>
      <button class="audio-btn" style="flex:1;" onclick="markUnderstood()">✓ Understood</button>
    </div>

    <div class="vocab-section">
      <h2>Important words</h2>
      <table class="vocab-table">
        <thead><tr><th>${LANGS[learning].name}</th><th>${LANGS[native].name}</th><th></th></tr></thead>
        <tbody>
          ${s.vocabulary.map((v, vi) => {
            const vp = getVocabProgress();
            const saved = vp[v.word] !== undefined;
            return `
              <tr>
                <td>${v.word}</td>
                <td>${v.translations[native] || v.translations.en}</td>
                <td><button class="save-btn ${saved ? 'saved' : ''}" onclick="saveWord('${v.word.replace(/'/g,"\\'")}', ${vi})">${saved ? '★' : '☆'}</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="flashcard-area">
      <h2>Practice vocabulary</h2>
      <div class="flashcard" id="flashcard" onclick="flipFlashcard()">
        <span id="flashcardContent">${s.vocabulary[0].word}</span>
      </div>
      <div class="flashcard-controls">
        <button onclick="nextFlashcard()">Next →</button>
        <button class="primary" onclick="markVocabKnown()">Know it</button>
        <button onclick="reviewAgain()">Review</button>
      </div>
    </div>

    <div class="quiz-section">
      <h2>Quiz</h2>
      <div id="quizContainer">
        ${s.quiz.map((q, qi) => `
          <div class="quiz-question" data-qindex="${qi}">
            <h4>${q.question[learning] || q.question.en}</h4>
            <div class="q-translation">${q.question[native] || q.question.en}</div>
            <div class="quiz-options">
              ${(q.options[learning] || q.options.en).map((opt, oi) => `
                <div class="quiz-option" data-qi="${qi}" data-oi="${oi}">${opt}</div>
              `).join('')}
            </div>
            <div class="quiz-feedback"></div>
          </div>
        `).join('')}
      </div>
      <div id="quizScore" class="quiz-score" style="display:none;"></div>
    </div>

    <div style="margin-top:20px;">
      <h3 style="font-size:1rem;">Grammar focus</h3>
      <p style="color:var(--text-secondary); margin-top:6px; font-size:.88rem;">${s.grammarFocus[native] || s.grammarFocus.en}</p>
    </div>

    <button class="btn-complete" onclick="completeStory()">
      ${sp.completed ? '✓ Story completed' : 'Mark as completed'}
    </button>
  `;

  attachQuizListeners();
  attachSentenceListeners();
  updateFlashcard();
}

/* Wrap words with data attributes for highlighting */
function wrapWords(sentence, sentenceIndex) {
  let wordIndex = 0;
  return sentence.replace(/([a-zA-ZÀ-ÿ\u00C0-\u017F'-]+)/g, (m) => {
    const idx = wordIndex++;
    return `<span class="word" data-word="${m.replace(/"/g,'&quot;')}" data-sentence="${sentenceIndex}" data-word-index="${idx}">${m}</span>`;
  });
}

function attachSentenceListeners() {
  document.querySelectorAll('.word').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      showWordPopup(el.dataset.word, el);
    });
  });
  document.querySelectorAll('.sentence-pair').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('word')) return;
      const idx = parseInt(el.dataset.index);
      playSentenceByIndex(idx);
    });
  });
}

function highlightSentence(el) {
  clearSentenceSelection();
  if (!el) return;
  el.classList.add('speaking');
  el.setAttribute('aria-current', 'true');
  ensureSentenceVisible(el);
}

function showWordPopup(word, element) {
  if (!currentStory) return;
  const native = state.nativeLang;
  const vocab = currentStory.vocabulary.find(v =>
    v.word.toLowerCase() === word.toLowerCase() ||
    v.word.toLowerCase().includes(word.toLowerCase())
  );
  if (vocab) {
    const trans = vocab.translations[native] || vocab.translations.en;
    const vp = getVocabProgress();
    const saved = vp[vocab.word] !== undefined;
    wordPopup.innerHTML = `
      <h4>${vocab.word}</h4>
      <div class="translation-line"><strong>${LANGS[native].name}:</strong> ${trans}</div>
      <div class="definition">${vocab.definitions[state.learningLang] || vocab.definitions.en}</div>
      <div class="example">« ${vocab.examples[state.learningLang] || vocab.examples.en} »</div>
      <div class="popup-actions">
        <button class="popup-btn" onclick="speakText('${vocab.word.replace(/'/g,"\\'")}')">🔊 Listen</button>
        <button class="popup-btn primary" onclick="saveWord('${vocab.word.replace(/'/g,"\\'")}', ${currentStory.vocabulary.indexOf(vocab)}); this.textContent='Saved ★'">${saved ? 'Saved ★' : '☆ Save'}</button>
      </div>
    `;
  } else {
    wordPopup.innerHTML = `<h4>${word}</h4><div style="color:var(--text-secondary); font-size:.82rem;">Not in this story's vocabulary.</div>`;
  }
  wordPopup.classList.add('active');
}
document.addEventListener('click', (e) => {
  if (!wordPopup.contains(e.target) && !e.target.classList.contains('word')) {
    wordPopup.classList.remove('active');
  }
});

/* ============================================================
   AUDIO — CALM VOICE + WORD-BY-WORD SYNC
   ============================================================ */

/* Pick the calmest, most relaxed voice available */
function getCalmVoice(lang) {
  const voices = window.speechSynthesis.getVoices();
  const langCode = lang === 'fr' ? 'fr' : (lang === 'nl' ? 'nl' : 'en');
  const candidates = voices.filter(v => v.lang.toLowerCase().startsWith(langCode));

  if (candidates.length === 0) return null;

  // Preference list — names of known calm/smooth voices
  const preferredNames = [
    'Samantha', 'Karen', 'Moira', 'Tessa', 'Fiona',   // iOS calm female
    'Amelie', 'Amélie', 'Audrey', 'Marie',            // French
    'Xander', 'Lotte', 'Fenna',                       // Dutch
    'Google UK English Female', 'Google Français',
    'Microsoft Sonia', 'Microsoft Julie', 'Microsoft Hortense',
    'Google Nederlands'
  ];

  // First try preferred names
  for (const name of preferredNames) {
    const found = candidates.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
    if (found) return found;
  }

  // Then prefer female voices (usually calmer for language learning)
  const female = candidates.find(v => /female|femme|vrouw|woman/i.test(v.name));
  if (female) return female;

  // Then prefer local service voices (usually smoother)
  const local = candidates.find(v => v.localService);
  if (local) return local;

  return candidates[0];
}

/* Speech wrapper */
function speakText(text, options = {}) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = LANGS[state.learningLang].code;
  // Calmer settings: slower base rate, gentle pitch
  utter.rate = (options.rate || state.audioSpeed) * 0.92;   // slightly slower
  utter.pitch = options.pitch !== undefined ? options.pitch : 0.95; // slightly lower = calmer
  utter.volume = 1;

  const voice = getCalmVoice(state.learningLang);
  if (voice) utter.voice = voice;

  if (options.onboundary) utter.onboundary = options.onboundary;
  if (options.onend) utter.onend = options.onend;
  if (options.onstart) utter.onstart = options.onstart;

  window.speechSynthesis.speak(utter);
  return utter;
}

/* ============================================================
   WORD-BY-WORD HIGHLIGHTING ENGINE
   Strategy: use SpeechSynthesis `onboundary` events when available.
   Fallback: estimate timing per word based on character count.
   ============================================================ */

function clearAllHighlights() {
  document.querySelectorAll('.word.speaking-word, .word.spoken-word, .word.paused-word')
    .forEach(w => w.classList.remove('speaking-word', 'spoken-word', 'paused-word'));
  clearSentenceSelection();
}

function getWordElements(sentenceIndex) {
  return Array.from(document.querySelectorAll(`.word[data-sentence="${sentenceIndex}"]`));
}

function getSentenceText(sentenceIndex) {
  if (!currentStory) return '';
  const text = currentStory.texts[state.learningLang] || currentStory.texts.en;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences[sentenceIndex] || '';
}

/* Play a sentence with word-by-word highlighting */
function playSentenceByIndex(sentenceIndex) {
  if (!currentStory) return;
  const text = getSentenceText(sentenceIndex);
  if (!text) return;

  // Ensure correct view mode — if in full-text mode, make sure the sentence is visible
  if (!sentenceModeActive) {
    const sentenceEl = document.querySelector(`.sentence-pair[data-index="${sentenceIndex}"]`);
    if (sentenceEl) {
      highlightSentence(sentenceEl);
    }
  }

  const wordElements = getWordElements(sentenceIndex);
  if (wordElements.length === 0) return;

  clearAllHighlights();

  audioState.isPlaying = true;
  audioState.sentenceIndex = sentenceIndex;
  audioState.words = wordElements;
  audioState.currentWordIndex = -1;
  audioState.paused = false;

  // Also highlight the sentence container
  const sentenceContainer = document.querySelector(`.sentence-pair[data-index="${sentenceIndex}"]`);
  if (sentenceContainer) sentenceContainer.classList.add('speaking');

  // Estimate timing: avg ~5.5 chars per word / ~2.8 chars per sec adjusted by rate
  const words = text.match(/[a-zA-ZÀ-ÿ\u00C0-\u017F'-]+/g) || [];
  const totalChars = text.length;
  const effectiveRate = (state.audioSpeed || 1) * 0.92;
  // French pronunciation: ~14 chars/sec at 1x. Adjust by rate.
  const estimatedDurationMs = Math.max(1500, (totalChars / 14 / effectiveRate) * 1000);
  audioState.estimatedDurationMs = estimatedDurationMs;

  let boundarySupported = false;
  let wordIndex = -1;
  let startTime = performance.now();

  // Fallback timing-based highlighter
  function startFallbackHighlight() {
    const fallbackDuration = estimatedDurationMs;
    const wordCount = words.length;
    // Distribute time proportional to word length
    const lengths = words.map(w => Math.max(2, w.length));
    const totalLen = lengths.reduce((a,b) => a+b, 0);
    const durations = lengths.map(l => (l / totalLen) * fallbackDuration);
    let acc = 0;
    const wordStartTimes = durations.map(d => { const t = acc; acc += d; return t; });

    const t0 = performance.now();
    function tick() {
      if (!audioState.isPlaying) return;
      const elapsed = performance.now() - t0;
      let newIdx = wordIndex;
      for (let i = 0; i < wordStartTimes.length; i++) {
        if (elapsed >= wordStartTimes[i]) newIdx = i;
        else break;
      }
      if (newIdx !== wordIndex) {
        setActiveWord(newIdx);
        wordIndex = newIdx;
      }
      if (elapsed >= fallbackDuration) return;
      audioState.rafId = requestAnimationFrame(tick);
    }
    audioState.rafId = requestAnimationFrame(tick);
  }

  // Try to use onboundary (word-level events when supported)
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = LANGS[state.learningLang].code;
  utter.rate = (state.audioSpeed || 1) * 0.92;
  utter.pitch = 0.95;
  utter.volume = 1;
  const voice = getCalmVoice(state.learningLang);
  if (voice) utter.voice = voice;

  utter.onboundary = (event) => {
    if (event.name === 'word' || event.name === undefined) {
      boundarySupported = true;
      // Find which word this boundary corresponds to
      const charIdx = event.charIndex;
      // Count words before this char index in the raw text
      const before = text.substring(0, charIdx);
      const wordMatches = before.match(/[a-zA-ZÀ-ÿ\u00C0-\u017F'-]+/g) || [];
      const wIdx = wordMatches.length;
      if (wIdx !== wordIndex && wIdx < wordElements.length) {
        setActiveWord(wIdx);
        wordIndex = wIdx;
      }
    }
  };

  utter.onstart = () => {
    // Give onboundary a chance to fire first
    setTimeout(() => {
      if (!boundarySupported && audioState.isPlaying) {
        startFallbackHighlight();
      }
    }, 150);
  };

  utter.onend = () => {
    audioState.isPlaying = false;
    if (audioState.rafId) cancelAnimationFrame(audioState.rafId);
    // Keep last word visible briefly, then clear
    setTimeout(() => clearAllHighlights(), 200);
    // Auto-advance to next sentence in sentence mode
    if (sentenceModeActive && currentStory) {
      const text2 = currentStory.texts[state.learningLang] || currentStory.texts.en;
      const sentences2 = text2.match(/[^.!?]+[.!?]+/g) || [text2];
      if (audioState.sentenceIndex < sentences2.length - 1) {
        // Optional: auto-advance. Disabled by default for user control.
      }
    }
  };

  utter.onerror = () => {
    audioState.isPlaying = false;
    if (audioState.rafId) cancelAnimationFrame(audioState.rafId);
  };

  audioState.utterance = utter;
  window.speechSynthesis.speak(utter);

  // Fallback: if no boundary events fire within 400ms, use estimated timing
  setTimeout(() => {
    if (!boundarySupported && audioState.isPlaying) {
      startFallbackHighlight();
    }
  }, 400);
}

function setActiveWord(index) {
  // Clear previous active
  audioState.words.forEach((el, i) => {
    el.classList.remove('speaking-word');
    if (i < index) el.classList.add('spoken-word');
  });
  if (index >= 0 && audioState.words[index]) {
    audioState.words[index].classList.add('speaking-word');
    // Scroll into view on mobile if needed
    const el = audioState.words[index];
    const rect = el.getBoundingClientRect();
    const topBar = document.querySelector('.top-bar');
    const bottomNav = document.querySelector('.bottom-nav');
    const topOffset = (topBar ? topBar.getBoundingClientRect().height : 0) + 12;
    const bottomOffset = (bottomNav ? bottomNav.getBoundingClientRect().height : 0) + 20;
    if (rect.top < topOffset || rect.bottom > window.innerHeight - bottomOffset) {
      ensureSentenceVisible(el.closest('.sentence-pair') || el);
    }
  }
  audioState.currentWordIndex = index;
}

/* Play the whole story — sequentially play each sentence with highlighting */
function playFromStart() {
  if (!currentStory) return;
  if (audioState.isPlaying) {
    togglePause();
    return;
  }

  const learning = state.learningLang;
  const text = currentStory.texts[learning] || currentStory.texts.en;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  // Reset playback
  currentSentenceIndex = 0;
  playSentenceSequence(0, sentences.length);
}

function playSentenceSequence(startIdx, totalSentences) {
  if (startIdx >= totalSentences) {
    audioState.isPlaying = false;
    return;
  }
  currentSentenceIndex = startIdx;
  playSentenceByIndexWithCallback(startIdx, () => {
    // Small pause between sentences for calm narration
    setTimeout(() => {
      if (audioState.isPlaying) {
        playSentenceSequence(startIdx + 1, totalSentences);
      }
    }, 350);
  });
}

function playSentenceByIndexWithCallback(sentenceIndex, callback) {
  if (!currentStory) return;
  const text = getSentenceText(sentenceIndex);
  if (!text) { if (callback) callback(); return; }

  const wordElements = getWordElements(sentenceIndex);
  clearAllHighlights();

  audioState.isPlaying = true;
  audioState.sentenceIndex = sentenceIndex;
  audioState.words = wordElements;
  audioState.currentWordIndex = -1;

  const sentenceContainer = document.querySelector(`.sentence-pair[data-index="${sentenceIndex}"]`);
  if (sentenceContainer) {
    selectReadingSentence(sentenceIndex);
  }

  const words = text.match(/[a-zA-ZÀ-ÿ\u00C0-\u017F'-]+/g) || [];
  const totalChars = text.length;
  const effectiveRate = (state.audioSpeed || 1) * 0.92;
  const estimatedDurationMs = Math.max(1500, (totalChars / 14 / effectiveRate) * 1000);
  audioState.estimatedDurationMs = estimatedDurationMs;

  let boundarySupported = false;
  let wordIndex = -1;

  function startFallback() {
    const lengths = words.map(w => Math.max(2, w.length));
    const totalLen = lengths.reduce((a,b) => a+b, 0);
    const durations = lengths.map(l => (l / totalLen) * estimatedDurationMs);
    let acc = 0;
    const starts = durations.map(d => { const t = acc; acc += d; return t; });
    const t0 = performance.now();
    function tick() {
      if (!audioState.isPlaying) return;
      const elapsed = performance.now() - t0;
      let newIdx = wordIndex;
      for (let i = 0; i < starts.length; i++) {
        if (elapsed >= starts[i]) newIdx = i; else break;
      }
      if (newIdx !== wordIndex) { setActiveWord(newIdx); wordIndex = newIdx; }
      if (elapsed >= estimatedDurationMs) return;
      audioState.rafId = requestAnimationFrame(tick);
    }
    audioState.rafId = requestAnimationFrame(tick);
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = LANGS[state.learningLang].code;
  utter.rate = (state.audioSpeed || 1) * 0.92;
  utter.pitch = 0.95;
  const voice = getCalmVoice(state.learningLang);
  if (voice) utter.voice = voice;

  utter.onboundary = (event) => {
    if (event.name === 'word' || event.name === undefined) {
      boundarySupported = true;
      const before = text.substring(0, event.charIndex);
      const wIdx = (before.match(/[a-zA-ZÀ-ÿ\u00C0-\u017F'-]+/g) || []).length;
      if (wIdx !== wordIndex && wIdx < wordElements.length) {
        setActiveWord(wIdx); wordIndex = wIdx;
      }
    }
  };
  utter.onstart = () => {
    setTimeout(() => {
      if (!boundarySupported && audioState.isPlaying) startFallback();
    }, 150);
  };
  utter.onend = () => {
    if (audioState.rafId) cancelAnimationFrame(audioState.rafId);
    setTimeout(() => clearAllHighlights(), 150);
    if (callback) callback();
  };
  utter.onerror = () => {
    audioState.isPlaying = false;
    if (audioState.rafId) cancelAnimationFrame(audioState.rafId);
  };

  audioState.utterance = utter;
  window.speechSynthesis.speak(utter);

  setTimeout(() => {
    if (!boundarySupported && audioState.isPlaying) startFallback();
  }, 400);
}

function togglePause() {
  const synth = window.speechSynthesis;
  if (synth.speaking && !synth.paused) {
    synth.pause();
    audioState.paused = true;
    // Mark current word as paused
    if (audioState.words[audioState.currentWordIndex]) {
      audioState.words[audioState.currentWordIndex].classList.add('paused-word');
    }
    if (audioState.rafId) cancelAnimationFrame(audioState.rafId);
  } else if (synth.paused) {
    synth.resume();
    audioState.paused = false;
    if (audioState.words[audioState.currentWordIndex]) {
      audioState.words[audioState.currentWordIndex].classList.remove('paused-word');
    }
  }
}

function stopAudio() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (audioState.rafId) cancelAnimationFrame(audioState.rafId);
  audioState.isPlaying = false;
  audioState.paused = false;
  setTimeout(() => clearAllHighlights(), 50);
}

function speakCurrentSentence() {
  if (!currentStory) return;
  playSentenceByIndex(currentSentenceIndex);
}

function setAudioSpeed(speed) {
  if (!SPEED_OPTIONS.includes(speed)) return;
  state.audioSpeed = speed;
  localStorage.setItem('lf_audioSpeed', speed.toString());
  document.querySelectorAll('.speed-btn').forEach(b => {
    b.classList.toggle('active', parseFloat(b.textContent) === speed);
  });
  updateNav();
}
/* ============================================================
   MODES
   ============================================================ */
function setMode(mode) {
  stopAudio();
  sentenceModeActive = mode === 'sentence';
  currentSentenceIndex = 0;
  renderStoryView();
}
function toggleTranslation() {
  showTranslation = !showTranslation;
  renderStoryView();
}
function prevSentence() {
  if (currentSentenceIndex > 0) {
    stopAudio();
    currentSentenceIndex--;
    updateSentenceMode();
  }
}
function nextSentence() {
  if (!currentStory) return;
  const text = currentStory.texts[state.learningLang] || currentStory.texts.en;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  if (currentSentenceIndex < sentences.length - 1) {
    stopAudio();
    currentSentenceIndex++;
    updateSentenceMode();
  }
}
function updateSentenceMode() {
  if (!currentStory) return;
  const learning = state.learningLang;
  const native = state.nativeLang;
  const text = currentStory.texts[learning] || currentStory.texts.en;
  const translation = currentStory.texts[native] || currentStory.texts.en;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const translationSentences = translation.match(/[^.!?]+[.!?]+/g) || [translation];

  const frEl = document.getElementById('currentFr');
  const trEl = document.getElementById('currentTrans');
  if (frEl) frEl.innerHTML = wrapWords(sentences[currentSentenceIndex], currentSentenceIndex);
  if (trEl) trEl.textContent = translationSentences[currentSentenceIndex] || '';

  const prevBtn = document.querySelector('.sentence-nav button:first-child');
  const nextBtn = document.querySelector('.sentence-nav button:last-child');
  if (prevBtn) prevBtn.disabled = currentSentenceIndex === 0;
  if (nextBtn) nextBtn.disabled = currentSentenceIndex >= sentences.length - 1;

  const counter = document.querySelector('#sentenceModeView div:last-child');
  if (counter) counter.textContent = `${currentSentenceIndex + 1} / ${sentences.length}`;

  attachSentenceListeners();
}

function markUnderstood() {
  if (!currentStory) return;
  const progress = getProgress();
  const sp = progress[currentStory.id] || {};
  sp.understood = (sp.understood || 0) + 1;
  progress[currentStory.id] = sp;
  saveProgress(progress);
  renderStoryView();
}

/* ============================================================
   QUIZ
   ============================================================ */
function attachQuizListeners() {
  document.querySelectorAll('.quiz-option').forEach(opt => {
    opt.addEventListener('click', function () {
      const qi = parseInt(this.dataset.qi);
      const oi = parseInt(this.dataset.oi);
      if (quizState[qi] !== undefined) return;
      const q = currentStory.quiz[qi];
      const correct = q.answer === oi;
      quizState[qi] = { correct, oi };
      document.querySelectorAll(`.quiz-option[data-qi="${qi}"]`).forEach(o => {
        o.classList.add('disabled');
        const oiO = parseInt(o.dataset.oi);
        if (oiO === q.answer) o.classList.add('correct');
        else if (oiO === oi && !correct) o.classList.add('incorrect');
      });
      const feedback = document.querySelector(`.quiz-question[data-qindex="${qi}"] .quiz-feedback`);
      feedback.textContent = correct ? 'Correct ✓' : 'Try again';
      feedback.style.color = correct ? 'var(--success)' : 'var(--warning)';
      if (Object.keys(quizState).length === currentStory.quiz.length) showQuizScore();
    });
  });
}
function showQuizScore() {
  const total = currentStory.quiz.length;
  let correct = 0;
  Object.values(quizState).forEach(v => { if (v.correct) correct++; });
  const pct = Math.round((correct / total) * 100);
  const scoreDiv = document.getElementById('quizScore');
  scoreDiv.style.display = 'block';
  let message = pct >= 80 ? 'Excellent!' : (pct >= 60 ? 'Very good!' : 'Keep practicing!');
  scoreDiv.innerHTML = `${correct} / ${total} — ${pct}%<br><span style="font-size:.82rem; font-weight:400;">${message}</span>`;
  const progress = getProgress();
  const sp = progress[currentStory.id] || {};
  sp.quizScore = correct; sp.quizTotal = total;
  progress[currentStory.id] = sp;
  saveProgress(progress);
}

/* ============================================================
   FLASHCARDS
   ============================================================ */
function updateFlashcard() {
  if (!currentStory) return;
  const v = currentStory.vocabulary[flashcardIndex];
  if (!v) return;
  const el = document.getElementById('flashcardContent');
  if (!el) return;
  el.textContent = flashcardFlipped ? (v.translations[state.nativeLang] || v.translations.en) : v.word;
}
function flipFlashcard() { flashcardFlipped = !flashcardFlipped; updateFlashcard(); }
function nextFlashcard() {
  if (!currentStory) return;
  flashcardIndex = (flashcardIndex + 1) % currentStory.vocabulary.length;
  flashcardFlipped = false; updateFlashcard();
}
function buildVocabEntry(v, story) {
  return {
    word: v.word,
    translation: v.translations[state.nativeLang] || v.translations.en,
    definition: v.definitions[state.learningLang] || v.definitions.en,
    example: v.examples[state.learningLang] || v.examples.en,
    storyId: story.id,
    storyTitle: story.titles[state.learningLang] || story.titles.en,
    learning: state.learningLang, native: state.nativeLang, known: false
  };
}
function markVocabKnown() {
  if (!currentStory) return;
  const v = currentStory.vocabulary[flashcardIndex];
  const vp = getVocabProgress();
  vp[v.word] = buildVocabEntry(v, currentStory); vp[v.word].known = true;
  saveVocabProgress(vp); nextFlashcard();
}
function reviewAgain() {
  if (!currentStory) return;
  const v = currentStory.vocabulary[flashcardIndex];
  const vp = getVocabProgress();
  vp[v.word] = buildVocabEntry(v, currentStory); vp[v.word].known = false;
  saveVocabProgress(vp); nextFlashcard();
}
function saveWord(word, vocabIndex) {
  if (!currentStory) return;
  const v = currentStory.vocabulary[vocabIndex];
  if (!v) return;
  const vp = getVocabProgress();
  if (vp[v.word]) delete vp[v.word];
  else vp[v.word] = buildVocabEntry(v, currentStory);
  saveVocabProgress(vp);
  renderStoryView();
}
function completeStory() {
  if (!currentStory) return;
  const progress = getProgress();
  const sp = progress[currentStory.id] || {};
  sp.completed = true;
  progress[currentStory.id] = sp;
  saveProgress(progress);
  renderStoryView();
}

/* ============================================================
   VOCABULARY VIEW
   ============================================================ */
function renderVocabulary() {
  const vp = getVocabProgress();
  const keys = Object.keys(vp);
  const container = document.getElementById('vocabList');
  if (keys.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary); margin-top:20px; text-align:center;">No saved words yet.<br>Click ☆ next to vocabulary in any story.</p>';
    return;
  }
  container.innerHTML = keys.map(key => {
    const item = vp[key];
    const learned = item.known;
    return `
      <div class="vocab-item">
        <h4>${item.word}</h4>
        <div class="vocab-trans">${item.translation}</div>
        <div class="vocab-example">« ${item.example} »</div>
        <div class="vocab-source">From: ${item.storyTitle || 'Unknown'}</div>
        <div class="vocab-actions">
          <button onclick="speakText('${item.word.replace(/'/g,"\\'")}')">🔊 Listen</button>
          <button class="${learned ? 'learned' : ''}" onclick="toggleWordLearned('${key.replace(/'/g,"\\'")}')">
            ${learned ? '✓ Learned' : 'Mark learned'}
          </button>
          <button onclick="removeWord('${key.replace(/'/g,"\\'")}')">Remove</button>
        </div>
      </div>
    `;
  }).join('');
}
function toggleWordLearned(word) {
  const vp = getVocabProgress();
  if (vp[word]) { vp[word].known = !vp[word].known; saveVocabProgress(vp); renderVocabulary(); }
}
function removeWord(word) {
  const vp = getVocabProgress();
  delete vp[word]; saveVocabProgress(vp); renderVocabulary();
}

/* ============================================================
   PROGRESS VIEW
   ============================================================ */
function renderProgress() {
  const progress = getProgress();
  const vp = getVocabProgress();
  const favs = getFavorites();
  const completed = Object.values(progress).filter(p => p.completed).length;
  const started = Object.keys(progress).length;
  const wordsCount = Object.keys(vp).length;
  const quizAvg = getQuizAverage();

  document.getElementById('progressStats').innerHTML = `
    <div class="stat-card"><div class="number">${completed}/${stories.length}</div><div class="label">Completed</div></div>
    <div class="stat-card"><div class="number">${started}</div><div class="label">Started</div></div>
    <div class="stat-card"><div class="number">${wordsCount}</div><div class="label">Words saved</div></div>
    <div class="stat-card"><div class="number">${quizAvg}%</div><div class="label">Quiz average</div></div>
    <div class="stat-card"><div class="number">${state.level}</div><div class="label">Level</div></div>
    <div class="stat-card"><div class="number">${favs.length}</div><div class="label">Favorites</div></div>
  `;

  let readiness = '';
  if (quizAvg >= 85 && state.level !== 'C1') {
    const nextLevel = state.level === 'A2' ? 'B1' : (state.level === 'B1' ? 'B2' : 'C1');
    readiness = `Your quiz average is ${quizAvg}%. You may be ready to try ${nextLevel}.`;
  } else if (quizAvg >= 70 && state.level !== 'C1') {
    readiness = `Your quiz average is ${quizAvg}%. Keep practicing at ${state.level}.`;
  } else {
    readiness = `Keep practicing at ${state.level}. Your quiz average is ${quizAvg}%.`;
  }
  document.getElementById('levelReadiness').innerHTML = `<strong>Level readiness:</strong> ${readiness}`;
}
function getQuizAverage() {
  const progress = getProgress();
  let total = 0, count = 0;
  Object.values(progress).forEach(p => {
    if (p.quizScore !== undefined && p.quizTotal) { total += p.quizScore / p.quizTotal; count++; }
  });
  return count > 0 ? Math.round((total / count) * 100) : 0;
}

function renderSettings() { updateNav(); }

/* ============================================================
   LOCAL STORAGE
   ============================================================ */
function getFavorites() { return JSON.parse(localStorage.getItem('lf_favorites') || '[]'); }
function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id); else favs.splice(idx, 1);
  localStorage.setItem('lf_favorites', JSON.stringify(favs));
  if (currentView === 'story') renderStoryView(); else renderHome();
}
function getProgress() { return JSON.parse(localStorage.getItem('lf_progress') || '{}'); }
function saveProgress(p) { localStorage.setItem('lf_progress', JSON.stringify(p)); }
function getVocabProgress() { return JSON.parse(localStorage.getItem('lf_vocabProgress') || '{}'); }
function saveVocabProgress(vp) { localStorage.setItem('lf_vocabProgress', JSON.stringify(vp)); }

/* ============================================================
   BACK
   ============================================================ */
document.getElementById('backBtn').addEventListener('click', () => {
  stopAudio();
  switchView('home');
});

/* ============================================================
   STARTUP
   ============================================================ */
if (state.onboardingComplete && state.nativeLang && state.learningLang && state.level && state.nativeLang !== state.learningLang) {
  onboarding.style.display = 'none';
  mainApp.classList.add('active');
  initApp();
} else {
  onboarding.style.display = 'flex';
  mainApp.classList.remove('active');
}

/* Preload voices */
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    // Re-select calm voice once voices are loaded
    // (no action needed — getCalmVoice is called at speak time)
  };
}

/* Expose to window */
window.openOnboarding = openOnboarding;
window.openStory = openStory;
window.toggleFavorite = toggleFavorite;
window.setMode = setMode;
window.toggleTranslation = toggleTranslation;
window.markUnderstood = markUnderstood;
window.playFromStart = playFromStart;
window.togglePause = togglePause;
window.stopAudio = stopAudio;
window.prevSentence = prevSentence;
window.nextSentence = nextSentence;
window.speakCurrentSentence = speakCurrentSentence;
window.setAudioSpeed = setAudioSpeed;
window.flipFlashcard = flipFlashcard;
window.nextFlashcard = nextFlashcard;
window.markVocabKnown = markVocabKnown;
window.reviewAgain = reviewAgain;
window.completeStory = completeStory;
window.saveWord = saveWord;
window.speakText = speakText;
window.toggleWordLearned = toggleWordLearned;
window.removeWord = removeWord;
window.filterByCategory = filterByCategory;
window.renderStoryView = renderStoryView;
window.playSentenceByIndex = playSentenceByIndex;