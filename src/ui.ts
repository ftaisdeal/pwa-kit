export function showInAppNotification(title: string, body: string): void {
  const notification = document.createElement('div');
  notification.className = 'in-app-notification';
  notification.innerHTML = `
      <strong>${title}</strong><br>
      ${body}
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

export function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {}
): void {
  console.log('Event tracked:', eventName, properties);
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
