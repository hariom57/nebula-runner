let currentUser = null;

export function initAuth() {
  currentUser = localStorage.getItem('currentUser');
  if (!currentUser) showAuthModal();
}

export function showAuthModal() {
  const overlay = document.getElementById('authOverlay');
  overlay.style.display = 'flex'; // Use flex for centering
  document.getElementById('usernameInput').focus();
}

export function saveUsername() {
  const username = document.getElementById('usernameInput').value.trim();
  if (username) {
    localStorage.setItem('currentUser', username);
    currentUser = username;
    document.getElementById('authOverlay').style.display = 'none';
    document.dispatchEvent(new Event('userAuthenticated')); // New event
    setTimeout(() => {
      const pilotNameEl = document.getElementsByClassName('pilot-name')[0];
      if (pilotNameEl) pilotNameEl.innerHTML = 'CDR. ' + currentUser;
    }, 0);
  }
}


export function getCurrentUser() {
    return currentUser;
}

window.saveUsername = saveUsername;