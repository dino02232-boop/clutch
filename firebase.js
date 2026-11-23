(function () {
  if (!window.firebase || !window.CLUTCH_FIREBASE_CONFIG) return;
  if (!firebase.apps.length) firebase.initializeApp(window.CLUTCH_FIREBASE_CONFIG);
  window.clutchAuth = firebase.auth();
  window.clutchDb = firebase.firestore();
})();
