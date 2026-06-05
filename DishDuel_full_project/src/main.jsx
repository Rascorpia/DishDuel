import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { defaultRecipes } from './recipes';
import './style.css';

// Вспомогательные функции для работы с LocalStorage
const loadFromLocalStorage = (key, defaultValue) => {
  try {
    const savedItem = localStorage.getItem(key);
    return savedItem ? JSON.parse(savedItem) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

const saveToLocalStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Главный компонент приложения
function App() {
  const [tab, setTab] = useState('play');
  const [custom, setCustom] = useState(() => {
    return loadFromLocalStorage('customRecipes', []);
  });
  const [disabled, setDisabled] = useState(() => {
    return loadFromLocalStorage('disabledRecipes', []);
  });
  const [mode, setMode] = useState('tournament');

  const allRecipes = [...defaultRecipes, ...custom];
  const activeRecipes = allRecipes.filter((recipe) => {
    return !disabled.includes(recipe.id);
  });

  return (
    <div className="app">
      <header>
        <div>
          <b className="logo">DishDuel</b>
          <p>Выбери лучшее блюдо через красивую дуэль вкусов</p>
        </div>
        <nav>
          <button 
            className={tab === 'play' ? 'on' : ''} 
            onClick={() => {
              setTab('play');
            }}
          >
            Игра
          </button>
          <button 
            className={tab === 'dishes' ? 'on' : ''} 
            onClick={() => {
              setTab('dishes');
            }}
          >
            Блюда
          </button>
        </nav>
      </header>

      {tab === 'play' ? (
        <Game 
          recipes={activeRecipes} 
          mode={mode} 
          setMode={setMode} 
        />
      ) : (
        <Dishes 
          all={allRecipes} 
          disabled={disabled} 
          setDisabled={(newValue) => {
            setDisabled(newValue);
            saveToLocalStorage('disabledRecipes', newValue);
          }} 
          custom={custom} 
          setCustom={(newValue) => {
            setCustom(newValue);
            saveToLocalStorage('customRecipes', newValue);
          }} 
        />
      )}
    </div>
  );
}

// Компонент игрового процесса (Дуэли)
function Game({ recipes, mode, setMode }) {
  const [queue, setQueue] = useState([]);
  const [pair, setPair] = useState(null);
  const [winner, setWinner] = useState(null);
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState(false);

  function start() {
    let arr = [...recipes].sort(() => {
      return Math.random() - 0.5;
    });
    setWinner(null);
    setStarted(true);
    setRound(1);

    if (mode === 'all') {
      let pairs = [];
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          pairs.push([arr[i], arr[j]]);
        }
      }
      setQueue(pairs);
      setPair(pairs[0]);
    } else {
      setQueue(arr.slice(2));
      setPair([arr[0], arr[1]]);
    }
  }

  function pick(selectedRecipe) {
    if (mode === 'all') {
      let next = queue.slice(1);
      selectedRecipe.score = (selectedRecipe.score || 0) + 1;
      setQueue(next);

      if (next[0]) {
        setPair(next[0]);
      } else {
        const sortedByScore = recipes.slice().sort((a, b) => {
          return (b.score || 0) - (a.score || 0);
        });
        finish(sortedByScore[0] || selectedRecipe);
      }
    } else {
      let next = queue.slice();
      if (next.length) {
        setPair([selectedRecipe, next.shift()]);
        setQueue(next);
        setRound((prevRound) => {
          return prevRound + 1;
        });
      } else {
        finish(selectedRecipe);
      }
    }
  }

  function finish(finalWinner) {
    setWinner(finalWinner);
    setPair(null);
    confetti({
      particleCount: 180,
      spread: 90,
      origin: { y: 0.65 }
    });
  }

  if (recipes.length < 2) {
    return (
      <section className="center card">
        <h2>Нужно минимум 2 выбранных блюда</h2>
        <p>Перейди во вкладку “Блюда” и включи больше рецептов.</p>
      </section>
    );
  }

  return (
    <main>
      {!started && !winner && (
        <section className="hero">
          <h1>Найди своё идеальное блюдо</h1>
          <p>{recipes.length} блюд готовы к соревнованию. Турнир — быстро, каждый с каждым — максимально честно.</p>
          <div className="seg">
            <button 
              className={mode === 'tournament' ? 'on' : ''} 
              onClick={() => {
                setMode('tournament');
              }}
            >
              Турнир
            </button>
            <button 
              className={mode === 'all' ? 'on' : ''} 
              onClick={() => {
                setMode('all');
              }}
            >
              Каждый с каждым
            </button>
          </div>
          <button className="primary" onClick={start}>Начать дуэль</button>
        </section>
      )}

      {pair && (
        <section>
          <div className="progress">Раунд {round} · осталось {queue.length}</div>
          <div className="duel">
            <FoodCard recipe={pair[0]} onClick={() => { pick(pair[0]); }} />
            <div className="vs">VS</div>
            <FoodCard recipe={pair[1]} onClick={() => { pick(pair[1]); }} />
          </div>
        </section>
      )}

      <AnimatePresence>
        {winner && <Result winner={winner} restart={start} />}
      </AnimatePresence>
    </main>
  );
}

// Компонент карточки блюда
function FoodCard({ recipe, onClick }) {
  return (
    <motion.button 
      className="food" 
      onClick={onClick} 
      initial={{ opacity: 0, y: 30, scale: 0.96 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      whileHover={{ y: -8, scale: 1.02 }} 
      whileTap={{ scale: 0.98 }}
    >
      <img src={recipe.image} alt={recipe.name} />
      <h2>{recipe.name}</h2>
      <p>{recipe.description}</p>
      <span>{recipe.time} · {recipe.difficulty} · {recipe.calories}</span>
    </motion.button>
  );
}

// Компонент отображения результата дуэли
function Result({ winner, restart }) {
  return (
    <motion.section 
      className="result card" 
      initial={{ opacity: 0, y: 40 }} 
      animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <img src={winner.image} alt={winner.name} />
      </div>
      <div>
        <small>Победитель</small>
        <h1>{winner.name}</h1>
        <p>{winner.description}</p>
        <div className="badges">
          <span>{winner.category}</span>
          <span>{winner.time}</span>
          <span>{winner.calories}</span>
        </div>
        <h3>Ингредиенты</h3>
        <ul>
          {winner.ingredients.map((item, index) => {
            return <li key={index}>{item}</li>;
          })}
        </ul>
        <h3>Приготовление</h3>
        <ol>
          {winner.steps.map((step, index) => {
            return <li key={index}>{step}</li>;
          })}
        </ol>
        <p className="tip">Совет: {winner.tips}</p>
        <button className="primary" onClick={restart}>Играть снова</button>
      </div>
    </motion.section>
  );
}

// Компонент управления списком блюд и добавления кастомных рецептов
function Dishes({ all, disabled, setDisabled, custom, setCustom }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    ingredients: '',
    steps: '',
    image: ''
  });

  function toggle(id) {
    if (disabled.includes(id)) {
      setDisabled(disabled.filter((x) => {
        return x !== id;
      }));
    } else {
      setDisabled([...disabled, id]);
    }
  }

  function add(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      return;
    }

    const id = 'custom-' + Date.now();
    const newRecipe = {
      id: id,
      name: form.name,
      category: 'Моё',
      time: '30 мин',
      difficulty: 'легко',
      calories: '—',
      description: form.description || 'Пользовательский рецепт',
      image: form.image || '/images/carbonara.svg',
      ingredients: form.ingredients.split('\n').filter(Boolean),
      steps: form.steps.split('\n').filter(Boolean),
      tips: 'Можно настроить рецепт под свой вкус.'
    };

    setCustom([...custom, newRecipe]);
    setForm({
      name: '',
      description: '',
      ingredients: '',
      steps: '',
      image: ''
    });
  }

  function removeCustomRecipe(id) {
    setCustom(custom.filter((recipe) => {
      return recipe.id !== id;
    }));
    setDisabled(disabled.filter((disabledId) => {
      return disabledId !== id;
    }));
  }

  return (
    <main className="gridPage">
      <section className="card">
        <h2>Участники соревнования</h2>
        <p>Сними галочку, чтобы блюдо не участвовало в дуэлях.</p>
        <div className="list">
          {all.map((recipe) => {
            const isCustom = recipe.id.toString().startsWith('custom-');
            
            return (
              <div key={recipe.id} className="recipe-item">
                <label className="recipe-label">
                  <input 
                    type="checkbox" 
                    checked={!disabled.includes(recipe.id)} 
                    onChange={() => {
                      toggle(recipe.id);
                    }}
                  />
                  <img src={recipe.image} alt={recipe.name} className="recipe-img" />
                  <span className="recipe-text">
                    {recipe.name}
                    <small>{recipe.category}</small>
                  </span>
                </label>
                
                {isCustom && (
                  <button 
                    className="delete-btn"
                    onClick={() => {
                      removeCustomRecipe(recipe.id);
                    }}
                  >
                    Удалить
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>Добавить своё блюдо</h2>
        <form onSubmit={add} className="form">
          <input 
            placeholder="Название" 
            value={form.name} 
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
            }}
          />
          <textarea 
            placeholder="Описание" 
            value={form.description} 
            onChange={(e) => {
              setForm({ ...form, description: e.target.value });
            }}
          />
          <textarea 
            placeholder="Ингредиенты, каждый с новой строки" 
            value={form.ingredients} 
            onChange={(e) => {
              setForm({ ...form, ingredients: e.target.value });
            }}
          />
          <textarea 
            placeholder="Шаги приготовления, каждый с новой строки" 
            value={form.steps} 
            onChange={(e) => {
              setForm({ ...form, steps: e.target.value });
            }}
          />
          <input 
            placeholder="URL картинки, необязательно" 
            value={form.image} 
            onChange={(e) => {
              setForm({ ...form, image: e.target.value });
            }}
          />
          <button className="primary">Добавить</button>
        </form>
      </section>
    </main>
  );
}

// Рендеринг приложения в DOM
createRoot(document.getElementById('root')).render(<App />);
