// Listen for messages from main page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'notify') {
    self.registration.showNotification('💧 Pee Reminder', {
      body: 'Time to take a pee!',
      icon: '/icon.png', // optional: you can add an icon in the public folder
    });
  }
});
