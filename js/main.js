import { Game } from './Game.js';

let game = null;
let started = false;

async function startGame() {
  if (started) return;
  started = true;
  document.getElementById('btn-start').disabled = true;
  document.getElementById('btn-start').textContent = 'Loading...';
  
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  document.body.appendChild(container);
  
  game = new Game(container);
  window.game = game;
  await game.init();
}

document.getElementById('btn-start').addEventListener('click', startGame);
