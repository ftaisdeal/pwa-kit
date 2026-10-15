import { trackEvent } from './ui';
import { log } from './logger';

let installPrompt: BeforeInstallPromptEvent | null = null;

export function setupInstallation(): void {
  // Install prompt handling
  window.addEventListener('beforeinstallprompt', (event) => {
    log.debug('Install prompt available');
    event.preventDefault();
    installPrompt = event;
    showInstallButton();
  });

  // Track installation
  window.addEventListener('appinstalled', () => {
    log.debug('App installed successfully');
    trackEvent('pwa_installed');
    hideInstallButton();
  });
}

function showInstallButton(): void {
  const installButton = document.createElement('button');
  installButton.textContent = 'Install App';
  installButton.className = 'install-button';
  installButton.onclick = () => void installApp();

  document.body.appendChild(installButton);
}

function hideInstallButton(): void {
  document.querySelector('.install-button')?.remove();
}

async function installApp(): Promise<void> {
  if (installPrompt) {
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    log.debug('Install prompt result:', result);

    if (result.outcome === 'accepted') {
      trackEvent('pwa_install_accepted');
    } else {
      trackEvent('pwa_install_dismissed');
    }

    installPrompt = null;
    hideInstallButton();
  }
}
