/**
 * app.js — Orchestrateur principal
 *
 * CORRECTION ÉCRAN NOIR :
 * La scène A-Frame est injectée dans le DOM UNIQUEMENT après
 * le clic utilisateur, quand le conteneur est déjà visible.
 * AR.js initialise alors le flux caméra dans un contexte DOM actif.
 */

import {
  startBearingEngine,
  stopBearingEngine,
  requestCompassPermission,
} from './bearing-engine.js';

import { syncNFTEntities, clearAllNFT } from './nft-manager.js';

import {
  showLoader, hideLoader,
  updateCompass,
  updateGPSAccuracy,
  updatePhoneStatus,
  updateDirectionList,
  showDetectedMonument, hideDetectedPanel,
  showError,
} from './ui.js';

// ─────────────────────────────────────────────
// Références DOM
// ─────────────────────────────────────────────
const startScreen  = document.getElementById('start-screen');
const arContainer  = document.getElementById('ar-container');
const startBtn     = document.getElementById('start-btn');

// ─────────────────────────────────────────────
// Init au chargement
// ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  startBtn.addEventListener('click', handleStart);
  document.getElementById('detected-close').addEventListener('click', hideDetectedPanel);

  window.addEventListener('monumentDetected', (e) => showDetectedMonument(e.detail));
  window.addEventListener('monumentLost',     ()  => hideDetectedPanel());
});

// ─────────────────────────────────────────────
// Injecter la scène A-Frame dans le DOM
// APRÈS que le conteneur est rendu visible
// ─────────────────────────────────────────────
function injectARScene() {
  // Vérifier si la scène existe déjà (protection double-clic)
  if (document.querySelector('a-scene')) return document.querySelector('a-scene');

  const scene = document.createElement('a-scene');

  // Attributs AR.js NFT — PAS de gps-camera ici,
  // on gère le GPS nous-mêmes dans le bearing engine
  scene.setAttribute('vr-mode-ui',  'enabled: false');
  scene.setAttribute('renderer',    'logarithmicDepthBuffer: true; antialias: true; alpha: true');
  scene.setAttribute('embedded',    '');
  scene.setAttribute('arjs',        'trackingMethod: best; sourceType: webcam; debugUIEnabled: false;');

  // Caméra standard — AR.js s'occupe de l'orientation via DeviceOrientation
  const cam = document.createElement('a-entity');
  cam.setAttribute('camera', '');
  scene.appendChild(cam);

  // Insérer la scène EN PREMIER dans arContainer
  // (avant le HUD, loader, etc.)
  arContainer.insertBefore(scene, arContainer.firstChild);

  return scene;
}

// ─────────────────────────────────────────────
// Clic sur Démarrer
// ─────────────────────────────────────────────
async function handleStart() {
  startBtn.disabled = true;

  // 1. Permissions iOS boussole
  try {
    await requestCompassPermission();
  } catch (e) {
    showError('Accès boussole refusé : ' + e.message);
    startBtn.disabled = false;
    return;
  }

  // 2. Masquer l'écran de démarrage, afficher le conteneur AR
  startScreen.style.display    = 'none';
  arContainer.style.display    = 'block';
  showLoader('Démarrage de la caméra…');

  // 3. Injecter la scène A-Frame maintenant que le DOM est visible
  //    → AR.js peut accéder correctement au flux webcam
  const scene = injectARScene();
  let nftActive = false;

  // 4. Écouter la fin du chargement AR.js
  window.addEventListener('arjs-nft-loaded', () => {
    hideLoader();
    console.log('[App] Marqueurs NFT prêts');
  });

  // Timeout de sécurité si arjs-nft-loaded ne se déclenche jamais
  // (cas où aucun marqueur n'est chargé au démarrage)
  setTimeout(() => hideLoader(), 6000);

  // 5. Démarrer GPS + boussole
  await startBearingEngine({
    onUpdate: ({ heading, candidates, all, phoneIsRaised, gpsAccuracy }) => {

      updateCompass(heading);
      updateDirectionList(all);
      updatePhoneStatus(phoneIsRaised);
      if (gpsAccuracy !== undefined) updateGPSAccuracy(gpsAccuracy);

      // Charger les marqueurs NFT seulement si téléphone levé
      if (phoneIsRaised && candidates.length > 0) {
        if (!nftActive) {
          showLoader('Chargement des marqueurs NFT…');
          nftActive = true;
        }
        syncNFTEntities(candidates, scene);

      } else if (!phoneIsRaised && nftActive) {
        clearAllNFT(scene);
        nftActive = false;
        hideLoader();
      }
    },

    onGPSError: (err) => {
      const msgs = {
        1: 'GPS refusé. Activez la localisation dans les réglages.',
        2: 'Signal GPS indisponible. Essayez en extérieur.',
        3: 'GPS timeout. Vérifiez votre connexion.',
      };
      showError(msgs[err.code] || 'Erreur GPS : ' + err.message);
      hideLoader();
    },
  });
}

window.addEventListener('pagehide', stopBearingEngine);
