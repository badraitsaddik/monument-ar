/**
 * app.js
 * Point d'entrée de l'application.
 * Orchestre : permissions → GPS+boussole → sync NFT → UI
 */

import {
  startBearingEngine,
  stopBearingEngine,
  requestCompassPermission,
} from './bearing-engine.js';

import { syncNFTEntities, clearAllNFT } from './nft-manager.js';

import {
  showLoader, hideLoader,
  showStartScreen, hideStartScreen,
  updateCompass, updateGPSAccuracy,
  updatePhoneStatus, updateDirectionList,
  showDetectedMonument, hideDetectedPanel,
  showError, onStartClick,
} from './ui.js';

// ─────────────────────────────────────────────────────────────────────────────
// Initialisation au chargement
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  showStartScreen();
  onStartClick(handleStart);

  // Fermer le panneau de monument détecté
  document.getElementById('detected-close').addEventListener('click', hideDetectedPanel);

  // Écouter les événements NFT (depuis nft-manager)
  window.addEventListener('monumentDetected', (e) => showDetectedMonument(e.detail));
  window.addEventListener('monumentLost',     ()  => hideDetectedPanel());

  // Masquer le loader AR.js quand les descripteurs sont prêts
  window.addEventListener('arjs-nft-loaded', () => {
    hideLoader();
    console.log('[App] Marqueurs NFT chargés');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Démarrage (déclenché par bouton pour obtenir les permissions iOS)
// ─────────────────────────────────────────────────────────────────────────────
async function handleStart() {
  showLoader('Demande de permissions…');

  try {
    await requestCompassPermission();
  } catch (e) {
    showError('Accès à la boussole refusé : ' + e.message);
    hideLoader();
    return;
  }

  hideStartScreen();
  showLoader('Initialisation GPS et boussole…');

  const scene = document.querySelector('a-scene');
  let nftActive = false;

  // ── Boucle principale : mise à jour boussole + GPS ─────────────────────────
  await startBearingEngine({
    onUpdate: ({ heading, candidates, all, phoneIsRaised, beta }) => {

      // 1. Mettre à jour la boussole visuelle
      updateCompass(heading);

      // 2. Mettre à jour la liste directionnelle
      updateDirectionList(all);

      // 3. Mettre à jour le statut (à plat / levé)
      updatePhoneStatus(phoneIsRaised);

      // 4. Sync des entités NFT seulement si le téléphone est levé
      //    et qu'il y a des candidats dans l'axe
      if (phoneIsRaised && candidates.length > 0) {
        if (!nftActive) {
          showLoader('Chargement des marqueurs NFT…');
          nftActive = true;
        }
        syncNFTEntities(candidates, scene);
      } else if (!phoneIsRaised && nftActive) {
        // Téléphone remis à plat → on vide la scène pour économiser les ressources
        clearAllNFT(scene);
        nftActive = false;
        hideLoader();
      }
    },

    onGPSError: (err) => {
      const msg = err.code === 1 ? 'GPS refusé. Veuillez autoriser la localisation.'
                : err.code === 2 ? 'Signal GPS indisponible.'
                : 'Erreur GPS : ' + err.message;
      showError(msg);
      hideLoader();
    },
  });

  // Premier loader masqué après 8s max (AR.js peut être lent à démarrer)
  setTimeout(hideLoader, 8000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Nettoyage si l'utilisateur quitte la page
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('pagehide', stopBearingEngine);
