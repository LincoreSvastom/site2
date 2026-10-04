/* =====================================================
   Логика приложения: навигация + две игры
   ===================================================== */

'use strict';

/* ---------------- Утилиты ---------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- Навигация по экранам ---------------- */
function showScreen(id) {
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $('#' + id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('.btn-back').forEach((btn) => {
  btn.addEventListener('click', () => showScreen('screen-menu'));
});

$('#btn-game-facts').addEventListener('click', () => showScreen('screen-shift'));
$('#btn-game-millionaire').addEventListener('click', startMillionaireBoard);

/* =====================================================
   ИГРА 1: «Интересные факты о преподавателях»
   ===================================================== */
const factsGame = {
  shift: null,
  queue: [],      // перемешанные преподаватели смены
  round: 0,
  score: 0,
  answered: false,
};

$$('.shift-btn').forEach((btn) => {
  btn.addEventListener('click', () => startFactsGame(btn.dataset.shift));
});

function startFactsGame(shift) {
  factsGame.shift = shift;
  factsGame.queue = shuffle(TEACHERS_DATA[shift]);
  factsGame.round = 0;
  factsGame.score = 0;
  $('#facts-shift-badge').textContent = shift;
  $('#facts-round-total').textContent = factsGame.queue.length;
  showScreen('screen-facts');
  renderFactRound();
}

function renderFactRound() {
  factsGame.answered = false;
  const teacher = factsGame.queue[factsGame.round];

  $('#facts-round-num').textContent = factsGame.round + 1;
  $('#facts-score').textContent = 'Очки: ' + factsGame.score;
  $('#facts-progress').style.width =
    ((factsGame.round) / factsGame.queue.length) * 100 + '%';
  $('#fact-text').textContent = '«' + teacher.fact + '»';
  $('#btn-next-fact').classList.add('hidden');

  // 4 варианта: правильный + 3 случайных из той же смены
  const others = TEACHERS_DATA[factsGame.shift].filter((t) => t.name !== teacher.name);
  const options = shuffle([teacher, ...shuffle(others).slice(0, 3)]);

  const container = $('#fact-options');
  container.innerHTML = '';

  options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className =
      'teacher-btn bg-white/10 border border-white/15 rounded-2xl px-5 py-4 font-semibold text-left';
    btn.textContent = opt.name;
    btn.addEventListener('click', () => answerFact(btn, opt.name === teacher.name, teacher.name));
    container.appendChild(btn);
  });
}

function answerFact(btn, isCorrect, correctName) {
  if (factsGame.answered) return;
  factsGame.answered = true;

  const buttons = $$('#fact-options .teacher-btn');
  buttons.forEach((b) => {
    b.disabled = true;
    if (b.textContent === correctName) b.classList.add('state-correct');
    else if (b === btn && !isCorrect) b.classList.add('state-wrong');
    else if (b !== btn) b.classList.add('state-dimmed');
  });

  if (isCorrect) factsGame.score++;
  $('#facts-score').textContent = 'Очки: ' + factsGame.score;
  $('#facts-progress').style.width =
    ((factsGame.round + 1) / factsGame.queue.length) * 100 + '%';

  const nextBtn = $('#btn-next-fact');
  if (factsGame.round === factsGame.queue.length - 1) {
    nextBtn.innerHTML = 'Завершить игру <i class="fa-solid fa-flag-checkered"></i>';
  } else {
    nextBtn.innerHTML = 'Следующий факт <i class="fa-solid fa-arrow-right"></i>';
  }
  nextBtn.classList.remove('hidden');
}

$('#btn-next-fact').addEventListener('click', () => {
  if (factsGame.round === factsGame.queue.length - 1) {
    endFactsGame();
  } else {
    factsGame.round++;
    renderFactRound();
  }
});

function endFactsGame() {
  const total = factsGame.queue.length;
  const score = factsGame.score;
  const ratio = score / total;

  let emoji = '💪', text = 'Неплохо! Попробуйте ещё раз.';
  if (ratio === 1)      { emoji = '🏆'; text = 'Идеально! Вы отлично знаете своих преподавателей!'; }
  else if (ratio >= .7) { emoji = '🎉'; text = 'Отличный результат!'; }
  else if (ratio >= .4) { emoji = '👍'; text = 'Хорошая попытка!'; }

  $('#facts-end-emoji').textContent = emoji;
  $('#facts-end-text').textContent = text + ' (' + factsGame.shift + ')';
  $('#facts-final-score').textContent = score + ' / ' + total;
  showScreen('screen-facts-end');
}

$('#btn-facts-replay').addEventListener('click', () => startFactsGame(factsGame.shift));

/* =====================================================
   ИГРА 2: «Своя игра» — интерактивное табло
   ===================================================== */
const milGame = {
  score: 0,
  opened: new Set(),
  current: null,
  locked: false,
  total: Object.values(MILLIONAIRE_DATA).reduce((sum, questions) => sum + questions.length, 0),
};

const CATEGORY_ICONS = ['🌋', '⏳', '🕵️', '🗣️', '🧠', '🎬', '💡'];

function startMillionaireBoard() {
  milGame.score = 0;
  milGame.opened = new Set();
  milGame.current = null;
  milGame.locked = false;
  updateMilScore();
  renderMillionaireBoard();
  showScreen('screen-millionaire');
}

function renderMillionaireBoard() {
  const board = $('#mil-board');
  board.innerHTML = '';

  Object.entries(MILLIONAIRE_DATA).forEach(([category, questions], categoryIndex) => {
    const row = document.createElement('div');
    row.className = 'jeopardy-row';

    const categoryEl = document.createElement('div');
    categoryEl.className = 'jeopardy-category';
    categoryEl.innerHTML =
      '<span class="jeopardy-category-icon">' + CATEGORY_ICONS[categoryIndex % CATEGORY_ICONS.length] + '</span>' +
      '<span>' + escapeHtml(category) + '</span>';
    row.appendChild(categoryEl);

    questions.slice().sort((a, b) => a.points - b.points).forEach((question) => {
      const key = makeQuestionKey(category, question.points);
      const btn = document.createElement('button');
      btn.className = 'jeopardy-card';
      btn.dataset.key = key;
      btn.textContent = question.points;

      if (milGame.opened.has(key)) {
        btn.disabled = true;
        btn.classList.add('used');
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      } else {
        btn.addEventListener('click', () => openMillionaireQuestion(category, question, key));
      }
      row.appendChild(btn);
    });

    board.appendChild(row);
  });

  updateMilProgress();
}

function makeQuestionKey(category, points) {
  return category + '::' + points;
}

function openMillionaireQuestion(category, rawQuestion, key) {
  if (milGame.locked || milGame.opened.has(key)) return;

  const options = shuffle(rawQuestion.options.slice(0, 4));
  if (!options.includes(rawQuestion.correct)) {
    options[0] = rawQuestion.correct;
  }

  milGame.current = {
    category,
    key,
    points: rawQuestion.points,
    question: rawQuestion.question,
    correct: rawQuestion.correct,
    options,
  };
  milGame.locked = false;

  $('#mil-modal-category').textContent = category;
  $('#mil-modal-points').textContent = rawQuestion.points;
  $('#mil-modal-question').textContent = rawQuestion.question;
  $('#mil-modal-status').textContent = '';
  $('#mil-correct-answer').textContent = '';
  $('#mil-correct-answer').classList.add('hidden');

  const answers = $('#mil-modal-answers');
  answers.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];

  options.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.className = 'jeopardy-answer-btn';
    btn.innerHTML = '<span class="jeopardy-answer-letter">' + letters[index] + '</span><span>' + escapeHtml(option) + '</span>';
    btn.addEventListener('click', () => answerMillionaireBoard(btn, option));
    answers.appendChild(btn);
  });

  const overlay = $('#mil-question-overlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
}

async function answerMillionaireBoard(selectedBtn, selectedAnswer) {
  if (milGame.locked || !milGame.current) return;
  milGame.locked = true;

  const current = milGame.current;
  const buttons = $$('#mil-modal-answers .jeopardy-answer-btn');
  buttons.forEach((btn) => (btn.disabled = true));

  const isCorrect = selectedAnswer === current.correct;
  buttons.forEach((btn) => {
    const answerText = btn.querySelector('span:last-child').textContent;
    if (answerText === current.correct) btn.classList.add('state-correct');
    else if (btn === selectedBtn && !isCorrect) btn.classList.add('state-wrong');
    else btn.classList.add('state-dimmed');
  });

  if (isCorrect) {
    milGame.score += current.points;
    $('#mil-modal-status').textContent = '+' + current.points + ' ✓';
    $('#mil-modal-status').className = 'text-sm font-black text-emerald-300';
  } else {
    $('#mil-modal-status').textContent = 'Неверно ✕';
    $('#mil-modal-status').className = 'text-sm font-black text-rose-300';
    const answerEl = $('#mil-correct-answer');
    answerEl.textContent = 'Правильный ответ: ' + current.correct;
    answerEl.classList.remove('hidden');
  }

  milGame.opened.add(current.key);
  updateMilScore();
  updateMilProgress();

  await delay(isCorrect ? 1100 : 1700);
  closeMillionaireQuestion();
  renderMillionaireBoard();

  if (milGame.opened.size >= milGame.total) {
    await delay(250);
    endMillionaireBoard(true);
  }
}

function closeMillionaireQuestion() {
  const overlay = $('#mil-question-overlay');
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
  milGame.current = null;
  milGame.locked = false;
}

function updateMilScore() {
  const scoreEl = $('#mil-score');
  if (scoreEl) scoreEl.textContent = milGame.score;
}

function updateMilProgress() {
  const opened = milGame.opened.size;
  const total = milGame.total;
  const countEl = $('#mil-progress-count');
  const barEl = $('#mil-board-progress');
  if (countEl) countEl.textContent = opened + ' / ' + total;
  if (barEl) barEl.style.width = (total ? (opened / total) * 100 : 0) + '%';
}

function endMillionaireBoard(allOpened = false) {
  closeMillionaireQuestion();
  const opened = milGame.opened.size;
  const total = milGame.total;
  const maxScore = Object.values(MILLIONAIRE_DATA)
    .flat()
    .reduce((sum, q) => sum + q.points, 0);

  let emoji = '🎯';
  if (milGame.score >= maxScore * .8) emoji = '🏆';
  else if (milGame.score >= maxScore * .55) emoji = '🔥';
  else if (milGame.score >= maxScore * .3) emoji = '👏';

  $('#mil-end-emoji').textContent = emoji;
  $('#mil-final-score').textContent = milGame.score + ' баллов';
  $('#mil-end-text').textContent = allOpened
    ? 'Вы открыли все ' + total + ' карточки. Максимально возможный результат — ' + maxScore + ' баллов.'
    : 'Вы завершили игру после ' + opened + ' из ' + total + ' вопросов. Максимально возможный результат — ' + maxScore + ' баллов.';
  showScreen('screen-mil-end');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

$('#btn-mil-finish').addEventListener('click', () => endMillionaireBoard(false));
$('#btn-mil-finish-mobile').addEventListener('click', () => endMillionaireBoard(false));
$('#btn-mil-replay').addEventListener('click', startMillionaireBoard);

