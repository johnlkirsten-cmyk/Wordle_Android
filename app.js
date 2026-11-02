import {
  MAX_ATTEMPTS,
  availableLengths,
  chooseTarget,
  getFeedback,
  parseWords,
} from "./game-engine.mjs";

const boardElement = document.querySelector("#board");
const keyboardElement = document.querySelector("#keyboard");
const messageElement = document.querySelector("#message");
const lengthSelect = document.querySelector("#length-select");
const themeSelect = document.querySelector("#theme-select");
const newGameButton = document.querySelector("#new-game");
const definitionElement = document.querySelector("#definition");
const definitionTextElement = document.querySelector("#definition-text");
const themes = new Set(["dark", "light", "pastel"]);
const keyboardRows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

let words = [];
let target = "";
let wordLength = 5;
let guesses = [];
let draft = "";
let gameOver = false;
let ready = false;
let definitionRequestId = 0;

function savedValue(key) {
  return localStorage.getItem(key);
}

function startNewGame() {
  definitionRequestId += 1;
  target = chooseTarget(words, wordLength);
  guesses = [];
  draft = "";
  gameOver = false;
  boardElement.replaceChildren();
  boardElement.style.setProperty("--word-length", wordLength);
  messageElement.textContent = "";
  newGameButton.hidden = true;
  definitionElement.hidden = true;
  definitionTextElement.textContent = "";

  for (let row = 0; row < MAX_ATTEMPTS; row += 1) {
    const rowElement = document.createElement("div");
    rowElement.className = "board-row";
    rowElement.setAttribute("role", "row");
    for (let column = 0; column < wordLength; column += 1) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.setAttribute("role", "gridcell");
      tile.setAttribute("aria-label", `Row ${row + 1}, letter ${column + 1}, empty`);
      rowElement.append(tile);
    }
    boardElement.append(rowElement);
  }

  for (const button of keyboardElement.querySelectorAll("button[data-letter]")) {
    button.classList.remove("gray", "yellow", "green");
  }
}

function setTheme(theme) {
  const selectedTheme = themes.has(theme) ? theme : "dark";
  document.body.dataset.theme = selectedTheme;
  themeSelect.value = selectedTheme;
  document.querySelector('meta[name="theme-color"]').content =
    selectedTheme === "light" ? "#f5f5f5" : selectedTheme === "pastel" ? "#f6eef8" : "#121213";
  localStorage.setItem("wordle-theme", selectedTheme);
}

function createKeyboard() {
  for (const row of keyboardRows) {
    const rowElement = document.createElement("div");
    rowElement.className = "keyboard-row";
    for (const letter of row) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "key";
      button.textContent = letter;
      button.dataset.letter = letter;
      button.setAttribute("aria-label", letter);
      button.addEventListener("click", () => enterLetter(letter));
      rowElement.append(button);
    }
    if (row === "ZXCVBNM") {
      const enter = document.createElement("button");
      enter.type = "button";
      enter.className = "key key-wide";
      enter.textContent = "Enter";
      enter.addEventListener("click", submitGuess);
      rowElement.prepend(enter);

      const backspace = document.createElement("button");
      backspace.type = "button";
      backspace.className = "key key-wide";
      backspace.textContent = "⌫";
      backspace.setAttribute("aria-label", "Backspace");
      backspace.addEventListener("click", removeLetter);
      rowElement.append(backspace);
    }
    keyboardElement.append(rowElement);
  }
}

function currentGuess() {
  return draft;
}

function enterLetter(letter) {
  if (!ready || gameOver || currentGuess().length >= wordLength) return;
  draft = currentGuess() + letter;
  updateCurrentRow();
}

function removeLetter() {
  if (!ready || gameOver || currentGuess().length === 0) return;
  draft = currentGuess().slice(0, -1);
  updateCurrentRow();
}

function updateCurrentRow() {
  const row = boardElement.children[guesses.length];
  const guess = currentGuess();
  [...row.children].forEach((tile, index) => {
    const letter = guess[index] ?? "";
    tile.textContent = letter;
    tile.classList.toggle("filled", Boolean(letter));
    tile.setAttribute(
      "aria-label",
      `Row ${guesses.length + 1}, letter ${index + 1}, ${letter || "empty"}`
    );
  });
}

function submitGuess() {
  if (!ready || gameOver) return;
  const guess = currentGuess();
  if (guess.length !== wordLength) {
    showMessage(`Enter a ${wordLength}-letter word.`);
    return;
  }
  if (!wordSet.has(guess)) {
    showMessage("That word is not in the list.");
    return;
  }

  const feedback = getFeedback(target, guess);
  const row = boardElement.children[guesses.length];
  [...row.children].forEach((tile, index) => {
    const color = feedback[index];
    tile.classList.remove("filled");
    tile.classList.add(color, "revealed");
    tile.setAttribute("aria-label", `Row ${guesses.length + 1}, ${guess[index]}, ${color}`);
    const key = keyboardElement.querySelector(`[data-letter="${guess[index]}"]`);
    if (!key.classList.contains("green") &&
        !(key.classList.contains("yellow") && color === "gray")) {
      key.classList.remove("gray", "yellow");
      key.classList.add(color);
    }
  });

  guesses.push(guess);
  draft = "";
  if (guess === target) {
    finishGame(`Excellent! You got it in ${guesses.length} ${guesses.length === 1 ? "guess" : "guesses"}.`);
  } else if (guesses.length === MAX_ATTEMPTS) {
    finishGame(`The word was ${target}.`);
  } else {
    showMessage("");
  }
}

function finishGame(message) {
  gameOver = true;
  showMessage(`${message} Solution: ${target}.`);
  newGameButton.hidden = false;
  newGameButton.focus();
  definitionElement.hidden = false;
  definitionTextElement.textContent = "Looking up the definition...";
  const requestId = ++definitionRequestId;
  loadDefinition(target, requestId);
}

async function loadDefinition(word, requestId) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (requestId !== definitionRequestId) return;
    if (response.status === 404) {
      definitionTextElement.textContent = "No dictionary entry was found for this solution.";
      return;
    }
    if (!response.ok) {
      definitionTextElement.textContent = "Definition unavailable: the dictionary service returned an error.";
      return;
    }

    const entries = await response.json();
    const meaning = entries
      .flatMap((entry) => entry.meanings ?? [])
      .find((item) => item.definitions?.[0]?.definition);
    if (requestId !== definitionRequestId) return;
    definitionTextElement.textContent = meaning
      ? `${meaning.partOfSpeech ?? "Definition"}: ${meaning.definitions[0].definition}`
      : "No dictionary definition was found for this solution.";
  } catch (error) {
    if (!(error instanceof TypeError || error instanceof DOMException || error instanceof SyntaxError)) {
      throw error;
    }
    console.error("Could not retrieve the solution definition:", error);
    if (requestId === definitionRequestId) {
      definitionTextElement.textContent = "Definition unavailable: could not reach the dictionary service.";
    }
  }
}

function showMessage(message) {
  messageElement.textContent = message;
}

let wordSet = new Set();

async function initialize() {
  createKeyboard();
  try {
    const response = await fetch("./words.txt");
    if (!response.ok) {
      throw new Error(`Could not load words.txt (${response.status}).`);
    }
    words = parseWords(await response.text());
    wordSet = new Set(words);
    const lengths = availableLengths(words);
    if (lengths.length === 0) throw new Error("The word list contains no valid words.");

    for (const length of lengths) {
      const option = document.createElement("option");
      option.value = String(length);
      option.textContent = String(length);
      lengthSelect.append(option);
    }
    const storedLength = Number(savedValue("wordle-length"));
    wordLength = lengths.includes(storedLength) ? storedLength : lengths.includes(5) ? 5 : lengths[0];
    lengthSelect.value = String(wordLength);
    setTheme(savedValue("wordle-theme") ?? "dark");
    ready = true;
    startNewGame();
  } catch (error) {
    console.error("Wordle could not start:", error);
    showMessage("Could not load the word list. Check your connection and reload.");
  }
}

lengthSelect.addEventListener("change", () => {
  const selectedLength = Number(lengthSelect.value);
  if (!availableLengths(words).includes(selectedLength)) return;
  wordLength = selectedLength;
  localStorage.setItem("wordle-length", String(wordLength));
  startNewGame();
});

themeSelect.addEventListener("change", () => setTheme(themeSelect.value));
newGameButton.addEventListener("click", startNewGame);

document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "Enter") {
    event.preventDefault();
    submitGuess();
  } else if (event.key === "Backspace") {
    removeLetter();
  } else if (/^[a-z]$/i.test(event.key)) {
    enterLetter(event.key.toUpperCase());
  }
});

initialize();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch((error) => {
    console.error("Wordle offline support could not be enabled:", error);
  });
}
