import { LanguageId, LanguageConfig } from '../types';

export const LANG_EMOJI: Record<string, string> = {
  python: '🐍', javascript: '🟡', typescript: '🔷', c: '🔵', cpp: '🔵',
  java: '☕', go: '🔹', rust: '🦀', php: '🐘',
  r: '📊', csharp: '🟣', html: '🌐', react: '⚛️',
  vue: '💚', angular: '🔺', sqlite: '🗃️', mongodb: '🍃',
};

export const LANGUAGES: LanguageConfig[] = [
  {
    id: 'python',
    name: 'Python',
    monacoLanguage: 'python',
    defaultCode: 'name = input("Enter name: ")\nprint(f"Hello {name}")',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'javascript',
    name: 'Node.js',
    monacoLanguage: 'javascript',
    defaultCode: 'console.log("Hello Node!");',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    monacoLanguage: 'typescript',
    defaultCode: 'const msg: string = "Hello TS!";\nconsole.log(msg);',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'c',
    name: 'C',
    monacoLanguage: 'c',
    defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello C!\\n");\n    return 0;\n}',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'cpp',
    name: 'C++',
    monacoLanguage: 'cpp',
    defaultCode: '#include <iostream>\n\nint main() {\n    std::cout << "Hello C++!\\n";\n    return 0;\n}',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'java',
    name: 'Java',
    monacoLanguage: 'java',
    defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Java!");\n    }\n}',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'go',
    name: 'Go',
    monacoLanguage: 'go',
    defaultCode: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello Go!")\n}',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'rust',
    name: 'Rust',
    monacoLanguage: 'rust',
    defaultCode: 'fn main() {\n    println!("Hello Rust!");\n}',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'php',
    name: 'PHP',
    monacoLanguage: 'php',
    defaultCode: '<?php\n\necho "Hello PHP!\\n";\n',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'r',
    name: 'R',
    monacoLanguage: 'r',
    defaultCode: 'cat("Hello R!\\n")',
    isWebMode: false,
    isSpecial: false
  },
  {
    id: 'csharp',
    name: 'C#',
    monacoLanguage: 'csharp',
    defaultCode: 'using System;\n\nConsole.WriteLine("Hello C#!");',
    isWebMode: false,
    isSpecial: false
  },

  {
    id: 'sqlite',
    name: 'SQLite',
    monacoLanguage: 'sql',
    defaultCode: `-- Database is pre-loaded with Indian movies!
-- Tables: movies, actors
--
-- movies: id, title, language, genre, lead_actor,
--         lead_actress, director, release_year, rating, box_office_cr
-- actors: id, name, born_year, nationality
--
-- Try these queries (edit and click Run):

-- 1. Show all movies
SELECT * FROM movies;

-- 2. Telugu blockbusters (500cr+)
-- SELECT title, lead_actor, box_office_cr
-- FROM movies
-- WHERE language = 'Telugu' AND box_office_cr > 500
-- ORDER BY box_office_cr DESC;

-- 3. Top rated movies
-- SELECT title, rating, release_year
-- FROM movies
-- WHERE rating >= 8.0
-- ORDER BY rating DESC;

-- 4. Movies by director
-- SELECT title, release_year, rating
-- FROM movies
-- WHERE director = 'S.S. Rajamouli';

-- 5. Count movies by language
-- SELECT language, COUNT(*) as total, ROUND(AVG(rating), 1) as avg_rating
-- FROM movies
-- GROUP BY language;`,
    isWebMode: false,
    isSpecial: true
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    monacoLanguage: 'javascript',
    defaultCode: `// Database is pre-loaded with Indian movies!
// Collections: movies, actors
//
// movies: title, language, genre, lead_actor,
//         lead_actress, director, release_year, rating, box_office_cr
// actors: name, born_year, nationality
//
// Try these queries (edit and click Run):

// 1. Show all movies
db.movies.find({}, { _id: 0, title: 1, lead_actor: 1, release_year: 1 }).forEach(printjson);

// 2. Telugu blockbusters (500cr+)
// db.movies.find(
//   { language: "Telugu", box_office_cr: { $gt: 500 } },
//   { _id: 0, title: 1, lead_actor: 1, box_office_cr: 1 }
// ).sort({ box_office_cr: -1 }).forEach(printjson);

// 3. Top rated movies
// db.movies.find(
//   { rating: { $gte: 8.0 } },
//   { _id: 0, title: 1, rating: 1 }
// ).sort({ rating: -1 }).forEach(printjson);

// 4. Movies by director
// db.movies.find(
//   { director: "S.S. Rajamouli" },
//   { _id: 0, title: 1, release_year: 1, rating: 1 }
// ).forEach(printjson);

// 5. Count movies per language
// db.movies.aggregate([
//   { $group: { _id: "$language", total: { $sum: 1 }, avg_rating: { $avg: "$rating" } } }
// ]).forEach(printjson);`,
    isWebMode: false,
    isSpecial: true
  },
  {
    id: 'html',
    name: 'Vanilla HTML/JS',
    monacoLanguage: 'html',
    defaultCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Runly Playground</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="glow"></div>
      <h1>Welcome to <span class="accent">Runly</span></h1>
      <p class="subtitle">Your live code playground</p>
      <div class="counter-section">
        <button id="decrement">-</button>
        <span id="count">0</span>
        <button id="increment">+</button>
      </div>
      <p class="hint">Edit any file and watch it update live</p>
    </div>
  </div>
  <script src="script.js"><\/script>
</body>
</html>`,
    isWebMode: true,
    isSpecial: false,
    defaultFiles: [
      { name: 'style.css', content: `* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #e4e4e7;
}

.container { perspective: 1000px; }

.card {
  position: relative;
  padding: 3rem 4rem;
  border-radius: 16px;
  background: linear-gradient(145deg, #141419, #1a1a22);
  border: 1px solid rgba(255, 255, 255, 0.06);
  text-align: center;
  animation: float 6s ease-in-out infinite;
  overflow: hidden;
}

.glow {
  position: absolute;
  top: -50%; left: -50%;
  width: 200%; height: 200%;
  background: radial-gradient(circle at 30% 50%, rgba(59, 130, 246, 0.08), transparent 50%);
  pointer-events: none;
}

h1 {
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.accent {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: #71717a;
  font-size: 0.95rem;
  margin-bottom: 2rem;
}

.counter-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.counter-section button {
  width: 44px; height: 44px;
  border-radius: 12px;
  border: 1px solid #27272a;
  background: #18181b;
  color: #fafafa;
  font-size: 1.4rem;
  cursor: pointer;
  transition: all 0.15s;
}

.counter-section button:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  transform: scale(1.05);
}

.counter-section button:active { transform: scale(0.95); }

#count {
  font-size: 2.5rem;
  font-weight: 800;
  min-width: 60px;
  background: linear-gradient(135deg, #3b82f6, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hint { color: #52525b; font-size: 0.8rem; }

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}` },
      { name: 'script.js', content: `let count = 0;
const countEl = document.getElementById('count');
const incBtn = document.getElementById('increment');
const decBtn = document.getElementById('decrement');

function updateCount(val) {
  count += val;
  countEl.textContent = count;
  countEl.style.transform = 'scale(1.2)';
  setTimeout(() => { countEl.style.transform = 'scale(1)'; }, 150);
}

incBtn.addEventListener('click', () => updateCount(1));
decBtn.addEventListener('click', () => updateCount(-1));

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') updateCount(1);
  if (e.key === 'ArrowDown') updateCount(-1);
});` }
    ]
  },
  {
    id: 'react',
    name: 'React',
    monacoLanguage: 'javascript',
    defaultCode: `// main.jsx - Entry point
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);`,
    isWebMode: true,
    isSpecial: false,
    defaultFiles: [
      { name: 'App.jsx', content: `// App.jsx - Main Component
const { useState, useEffect } = React;

function App() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Learn React hooks', done: true },
    { id: 2, text: 'Build a component', done: false },
    { id: 3, text: 'Ship to production', done: false },
  ]);
  const [input, setInput] = useState('');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const addTask = () => {
    if (!input.trim()) return;
    setTasks(prev => [...prev, { id: Date.now(), text: input, done: false }]);
    setInput('');
  };

  const toggleTask = (id) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const deleteTask = (id) =>
    setTasks(prev => prev.filter(t => t.id !== id));

  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="app">
      <div className="card">
        <div className="header">
          <h1>Task Manager</h1>
          <span className="clock">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: pct + '%' }} /></div>
        <p className="progress-text">{done}/{tasks.length} completed</p>
        <div className="input-row">
          <input className="task-input" placeholder="Add a new task..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()} />
          <button className="add-btn" onClick={addTask}>+</button>
        </div>
        <div className="task-list">
          {tasks.map(task => (
            <div key={task.id} className={"task-item" + (task.done ? " done" : "")}>
              <div className="task-left" onClick={() => toggleTask(task.id)}>
                <span className={"check" + (task.done ? " checked" : "")}>
                  {task.done ? "\\u2713" : ""}
                </span>
                <span className={task.done ? "strikethrough" : ""}>{task.text}</span>
              </div>
              <button className="del-btn" onClick={() => deleteTask(task.id)}>\\u00d7</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}` },
      { name: 'style.css', content: `/* style.css - React Task Manager */
* { margin: 0; padding: 0; box-sizing: border-box; }

.app {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.card {
  width: 420px;
  padding: 2rem;
  border-radius: 16px;
  background: linear-gradient(145deg, #141419, #1a1a22);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
h1 { font-size: 1.4rem; font-weight: 700; color: #fafafa; letter-spacing: -0.02em; }
.clock { font-size: 0.85rem; color: #3b82f6; font-family: monospace; }

.progress-bar { height: 4px; border-radius: 4px; background: #27272a; margin-bottom: 0.5rem; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #3b82f6, #60a5fa); transition: width 0.3s; }
.progress-text { font-size: 0.75rem; color: #52525b; margin-bottom: 1.5rem; }

.input-row { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
.task-input { flex: 1; padding: 0.6rem 1rem; border-radius: 10px; border: 1px solid #27272a; background: #18181b; color: #fafafa; font-size: 0.85rem; outline: none; }
.task-input:focus { border-color: #3b82f6; }
.add-btn { width: 42px; border-radius: 10px; border: none; background: #3b82f6; color: #fff; font-size: 1.2rem; cursor: pointer; transition: background 0.15s; }
.add-btn:hover { background: #2563eb; }

.task-list { display: flex; flex-direction: column; gap: 0.5rem; }
.task-item { display: flex; justify-content: space-between; align-items: center; padding: 0.7rem 0.8rem; border-radius: 10px; background: #18181b; border: 1px solid #1e1e24; transition: all 0.2s; }
.task-item.done { opacity: 0.5; }
.task-left { display: flex; align-items: center; gap: 0.7rem; cursor: pointer; flex: 1; color: #e4e4e7; }
.check { width: 20px; height: 20px; border-radius: 6px; border: 2px solid #3f3f46; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #fff; transition: all 0.15s; flex-shrink: 0; }
.check.checked { background: #3b82f6; border-color: #3b82f6; }
.strikethrough { text-decoration: line-through; color: #71717a; }
.del-btn { background: transparent; border: none; color: #52525b; font-size: 1.2rem; cursor: pointer; padding: 0 4px; }
.del-btn:hover { color: #f43f5e; }` }
    ]
  },
  {
    id: 'vue',
    name: 'Vue',
    monacoLanguage: 'html',
    defaultCode: `<!-- main.html - Vue 3 Color Studio -->
<div id="app">
  <div class="app-container">
    <div class="card">
      <h1>{{ title }}</h1>
      <p class="subtitle">Built with Vue 3</p>

      <div class="color-picker">
        <button v-for="color in colors" :key="color.name"
          :style="{ background: color.value }"
          :class="{ active: activeColor === color.name }"
          class="color-btn" @click="selectColor(color)">
        </button>
      </div>

      <div class="preview-box" :style="{ background: selectedGradient }">
        <span class="preview-text">{{ activeColor }}</span>
      </div>

      <div class="stats">
        <div class="stat" v-for="s in statsList" :key="s.label">
          <span class="stat-value">{{ s.value }}</span>
          <span class="stat-label">{{ s.label }}</span>
        </div>
      </div>
    </div>
  </div>
</div>

<link rel="stylesheet" href="style.css">
<script src="app.js"><\/script>`,
    isWebMode: true,
    isSpecial: false,
    defaultFiles: [
      { name: 'app.js', content: `// app.js - Vue 3 Composition API
const { createApp, ref, computed, onMounted, onUnmounted } = Vue;

createApp({
  setup() {
    const title = 'Color Studio';

    const colors = ref([
      { name: 'Blue',   value: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
      { name: 'Purple', value: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
      { name: 'Green',  value: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e, #15803d)' },
      { name: 'Rose',   value: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e, #be123c)' },
      { name: 'Amber',  value: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
      { name: 'Cyan',   value: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    ]);

    const activeColor = ref('Blue');
    const clickCount = ref(0);
    const elapsed = ref(0);
    let timer;

    const selectedGradient = computed(() => {
      const c = colors.value.find(c => c.name === activeColor.value);
      return c ? c.gradient : colors.value[0].gradient;
    });

    const statsList = computed(() => [
      { value: clickCount.value, label: 'Clicks' },
      { value: colors.value.length, label: 'Colors' },
      { value: elapsed.value + 's', label: 'Uptime' },
    ]);

    const selectColor = (color) => {
      activeColor.value = color.name;
      clickCount.value++;
    };

    onMounted(() => { timer = setInterval(() => elapsed.value++, 1000); });
    onUnmounted(() => clearInterval(timer));

    return { title, colors, activeColor, selectedGradient, statsList, clickCount, elapsed, selectColor };
  }
}).mount("#app");` },
      { name: 'style.css', content: `/* style.css - Vue Color Studio */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.card {
  padding: 2.5rem;
  border-radius: 16px;
  background: linear-gradient(145deg, #141419, #1a1a22);
  border: 1px solid rgba(255, 255, 255, 0.06);
  text-align: center;
  min-width: 340px;
}

h1 { font-size: 1.6rem; font-weight: 700; color: #fafafa; margin-bottom: 0.3rem; }
.subtitle { color: #52525b; font-size: 0.85rem; margin-bottom: 2rem; }

.color-picker { display: flex; gap: 0.6rem; justify-content: center; margin-bottom: 1.5rem; flex-wrap: wrap; }
.color-btn { width: 36px; height: 36px; border-radius: 10px; border: 2px solid transparent; cursor: pointer; transition: all 0.2s; }
.color-btn:hover { transform: scale(1.15); }
.color-btn.active { border-color: #fff; transform: scale(1.15); box-shadow: 0 0 16px rgba(255, 255, 255, 0.15); }

.preview-box { height: 80px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; transition: background 0.4s; }
.preview-text { color: #fff; font-weight: 600; font-size: 0.9rem; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3); }

.stats { display: flex; justify-content: center; gap: 2rem; }
.stat { display: flex; flex-direction: column; }
.stat-value { font-size: 1.3rem; font-weight: 700; color: #fafafa; }
.stat-label { font-size: 0.7rem; color: #52525b; text-transform: uppercase; letter-spacing: 0.05em; }` }
    ]
  },
  {
    id: 'angular',
    name: 'Angular',
    monacoLanguage: 'html',
    defaultCode: `<!-- main.html - AngularJS Quick Notes -->
<div ng-app="runlyApp" ng-controller="MainCtrl" class="app-container">
  <div class="card">
    <h1>Quick Notes</h1>
    <p class="subtitle">Built with AngularJS</p>

    <div class="input-row">
      <input ng-model="newNote" placeholder="Write a note..." class="note-input"
        ng-keydown="$event.key === 'Enter' && addNote()" />
      <button ng-click="addNote()" class="add-btn">+</button>
    </div>

    <div class="search-row">
      <input ng-model="search" placeholder="Search notes..." class="search-input" />
      <span class="count">{{filtered.length}} / {{notes.length}}</span>
    </div>

    <div class="notes-list">
      <div ng-repeat="note in filtered = (notes | filter:search) track by note.id" class="note-item">
        <div class="note-content">
          <span class="note-dot" ng-style="{'background': note.color}"></span>
          <span>{{note.text}}</span>
        </div>
        <div class="note-meta">
          <span class="note-time">{{note.time}}</span>
          <button ng-click="deleteNote(note.id)" class="del-btn">&times;</button>
        </div>
      </div>
      <div ng-if="notes.length === 0" class="empty-state">
        No notes yet. Start typing above!
      </div>
    </div>
  </div>
</div>

<link rel="stylesheet" href="style.css">
<script src="app.ts"><\/script>`,
    isWebMode: true,
    isSpecial: false,
    defaultFiles: [
      { name: 'app.ts', content: `// app.ts - Angular Controller
var app = angular.module('runlyApp', []);

app.controller('MainCtrl', function($scope) {
  var colors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#f43f5e', '#06b6d4'];

  $scope.notes = [
    { id: 1, text: 'Welcome to the Angular playground', color: '#3b82f6', time: 'now' },
    { id: 2, text: 'Try adding a new note below', color: '#22c55e', time: 'now' },
  ];
  $scope.newNote = '';
  $scope.search = '';

  $scope.addNote = function() {
    if (!$scope.newNote.trim()) return;
    $scope.notes.unshift({
      id: Date.now(),
      text: $scope.newNote,
      color: colors[Math.floor(Math.random() * colors.length)],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    $scope.newNote = '';
  };

  $scope.deleteNote = function(id) {
    $scope.notes = $scope.notes.filter(function(n) { return n.id !== id; });
  };
});` },
      { name: 'style.css', content: `/* style.css - Angular Notes App */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #e4e4e7;
}

.app-container { width: 100%; max-width: 420px; padding: 1rem; }

.card {
  padding: 2rem;
  border-radius: 16px;
  background: linear-gradient(145deg, #141419, #1a1a22);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

h1 { font-size: 1.5rem; font-weight: 700; color: #fafafa; margin-bottom: 0.2rem; }
.subtitle { color: #52525b; font-size: 0.8rem; margin-bottom: 1.5rem; }

.input-row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.note-input { flex: 1; padding: 0.6rem 1rem; border-radius: 10px; border: 1px solid #27272a; background: #18181b; color: #fafafa; font-size: 0.85rem; outline: none; }
.note-input:focus { border-color: #3b82f6; }
.add-btn { width: 40px; border-radius: 10px; border: none; background: #3b82f6; color: #fff; font-size: 1.2rem; cursor: pointer; transition: background 0.15s; }
.add-btn:hover { background: #2563eb; }

.search-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
.search-input { flex: 1; padding: 0.45rem 0.8rem; border-radius: 8px; border: 1px solid #1e1e24; background: #141418; color: #a1a1aa; font-size: 0.8rem; outline: none; }
.search-input:focus { border-color: #3b82f6; color: #fafafa; }
.count { font-size: 0.75rem; color: #52525b; white-space: nowrap; }

.notes-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 280px; overflow-y: auto; }
.note-item { display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.8rem; border-radius: 10px; background: #18181b; border: 1px solid #1e1e24; transition: border-color 0.15s; }
.note-item:hover { border-color: #27272a; }
.note-content { display: flex; align-items: center; gap: 0.6rem; flex: 1; font-size: 0.85rem; }
.note-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.note-meta { display: flex; align-items: center; gap: 0.5rem; }
.note-time { font-size: 0.7rem; color: #3f3f46; }
.del-btn { background: transparent; border: none; color: #52525b; font-size: 1.1rem; cursor: pointer; padding: 0 4px; }
.del-btn:hover { color: #f43f5e; }
.empty-state { text-align: center; padding: 2rem; color: #3f3f46; font-size: 0.85rem; }` }
    ]
  }
];
