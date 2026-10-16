import { log } from './logger';
// Popovers render in the browser's top layer, above everything else, without
// z-index juggling. Where the Popover API is missing, the element is simply a
// fixed-position box, so this stays a progressive enhancement.
function showInTopLayer(element: HTMLElement): void {
  if (typeof element.showPopover === 'function') {
    element.setAttribute('popover', 'manual');
    element.showPopover();
  }
}

export function showInAppNotification(title: string, body: string): void {
  const notification = document.createElement('div');
  notification.className = 'in-app-notification';
  const heading = document.createElement('strong');
  heading.textContent = title;
  notification.append(heading, document.createElement('br'), body);

  document.body.appendChild(notification);
  showInTopLayer(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Asks the user to apply a waiting service worker update. `onReload` runs
// when they accept; "Later" dismisses the prompt until the next visit.
export function showUpdatePrompt(onReload: () => void): void {
  if (document.querySelector('.update-prompt')) return;

  const prompt = document.createElement('div');
  prompt.className = 'update-prompt';
  prompt.setAttribute('role', 'status');

  const message = document.createElement('p');
  message.textContent = 'A new version is available.';

  const reload = document.createElement('button');
  reload.type = 'button';
  reload.className = 'button button-primary';
  reload.textContent = 'Reload';
  reload.addEventListener('click', () => {
    reload.disabled = true;
    onReload();
  });

  const later = document.createElement('button');
  later.type = 'button';
  later.className = 'button button-secondary';
  later.textContent = 'Later';
  later.addEventListener('click', () => prompt.remove());

  prompt.append(message, reload, later);
  document.body.appendChild(prompt);
  showInTopLayer(prompt);
  reload.focus();
}

export function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {}
): void {
  log.debug('Event tracked:', eventName, properties);
  // Integrate with your analytics service
}

// Delegated click handler: runs `handler` when an element with `className` is clicked
export function onClick(
  className: string,
  handler: (event: MouseEvent) => void
): void {
  document.addEventListener('click', (event) => {
    if (
      event.target instanceof Element &&
      event.target.classList.contains(className)
    ) {
      handler(event);
    }
  });
}
