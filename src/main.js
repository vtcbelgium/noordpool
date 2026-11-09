import { NorthPoleExperience } from './experience/NorthPoleExperience.js';

const element = (id) => document.getElementById(id);
const app = element('app');
const canvas = element('scene');
const helpDialog = element('help-dialog');
const sceneButtons = ['snow-button', 'aurora-button', 'reset-button', 'gift-button', 'explore-button'];
let experience;
let toastTimer;
let loaded = false;

// Preferences are optional: private browsing must work without localStorage.
function readPreferences() {
  try {
    return JSON.parse(localStorage.getItem('noordpool-preferences')) || {};
  } catch {
    return {};
  }
}

const preferences = readPreferences();
let snowEnabled = preferences.snow !== false;
let auroraEnabled = preferences.aurora !== false;
const quality = ['auto', 'high', 'low'].includes(preferences.quality) ? preferences.quality : 'auto';

function savePreferences() {
  try {
    localStorage.setItem('noordpool-preferences', JSON.stringify({
      snow: snowEnabled,
      aurora: auroraEnabled,
      quality: element('quality-select').value,
    }));
  } catch { /* The scene also works when browser storage is unavailable. */ }
}

function showError(error) {
  console.error('De Noordpool-scène kon niet worden weergegeven:', error);
  element('loading').hidden = true;
  element('error').hidden = false;
  element('fps-label').textContent = 'SCÈNE NIET BESCHIKBAAR';
  sceneButtons.forEach((id) => { element(id).disabled = true; });
  element('quality-select').disabled = true;
  fullscreenButton.disabled = true;
}

function updateStats({ fps }) {
  if (!loaded) {
    loaded = true;
    element('loading').hidden = true;
    app.dataset.ready = 'true';
  }
  element('fps-label').textContent = `${Math.round(fps)} FPS`;
}

function updateGift(open) {
  app.dataset.giftOpen = String(open);
  element('gift-button-label').innerHTML = open
    ? 'Sluit je cadeau <span aria-hidden="true">↙</span>'
    : 'Open je cadeau <span aria-hidden="true">↗</span>';
  element('gift-button').setAttribute('aria-pressed', String(open));
  clearTimeout(toastTimer);
  element('gift-toast').hidden = !open;
  if (open) toastTimer = setTimeout(() => { element('gift-toast').hidden = true; }, 6500);
}

element('snow-button').setAttribute('aria-pressed', String(snowEnabled));
element('aurora-button').setAttribute('aria-pressed', String(auroraEnabled));
element('quality-select').value = quality;
element('gift-button').setAttribute('aria-pressed', 'false');

const fullscreenButton = element('fullscreen-button');
try {
  experience = new NorthPoleExperience({ canvas, onStats: updateStats, onGiftChange: updateGift, onError: showError });
  experience.setSnow(snowEnabled);
  experience.setAurora(auroraEnabled);
  experience.setQuality(quality);
} catch (error) {
  showError(error);
}

element('snow-button').addEventListener('click', () => {
  snowEnabled = !snowEnabled;
  experience?.setSnow(snowEnabled);
  element('snow-button').setAttribute('aria-pressed', String(snowEnabled));
  savePreferences();
});

element('aurora-button').addEventListener('click', () => {
  auroraEnabled = !auroraEnabled;
  experience?.setAurora(auroraEnabled);
  element('aurora-button').setAttribute('aria-pressed', String(auroraEnabled));
  savePreferences();
});

element('quality-select').addEventListener('change', (event) => {
  experience?.setQuality(event.target.value);
  savePreferences();
});

element('gift-button').addEventListener('click', () => { experience?.toggleGift(); });
element('reset-button').addEventListener('click', () => {
  experience?.resetView();
  app.classList.remove('exploring');
  document.querySelector('.intro').inert = false;
});

element('explore-button').addEventListener('click', () => {
  app.classList.add('exploring');
  document.querySelector('.intro').inert = true;
  element('reset-button').focus({ preventScroll: true });
  experience?.focusGift();
});

element('help-button').addEventListener('click', () => { helpDialog.showModal(); });
element('close-help').addEventListener('click', () => { helpDialog.close(); });
helpDialog.addEventListener('click', (event) => {
  // A click on the backdrop closes the dialog; a click on its padding does not.
  const bounds = helpDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) helpDialog.close();
});

element('reload-button').addEventListener('click', () => { location.reload(); });

if (!document.fullscreenEnabled) fullscreenButton.hidden = true;
fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await app.requestFullscreen();
  } catch {
    fullscreenButton.hidden = true;
  }
});
document.addEventListener('fullscreenchange', () => {
  const label = document.fullscreenElement ? 'Volledig scherm verlaten' : 'Volledig scherm';
  fullscreenButton.setAttribute('aria-label', label);
  fullscreenButton.title = label;
});

// Release GPU resources when leaving the page. Keep them for the back/forward cache.
window.addEventListener('pagehide', (event) => {
  if (!event.persisted) {
    clearTimeout(toastTimer);
    experience?.dispose();
  }
});
