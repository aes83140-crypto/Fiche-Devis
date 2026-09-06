/* Code d'accès administrateur — UN SEUL endroit à modifier.
   Utilisé par la page d'accueil (mode administrateur) et par les fiches
   en construction (accès réservé). */
window.RECORD_ADMIN_CODE = 'Chris04';
/* Indice affiché en cas d'oubli (le code lui-même reste inchangé ici).
   Ne jamais y écrire le code ou une partie reconnaissable : juste un rappel
   de la logique utilisée pour le retrouver (ex. « demander à Christophe »). */
window.RECORD_ADMIN_HINT = 'Demander le code à Christophe BATAILLE.';

/* Espace partagé Supabase (statistiques + liste des techniciens) — collé une fois
   pour toutes ici : toutes les pages et tablettes le connaissent dès qu'elles
   chargent ce fichier, sans jeton GitHub. */
window.RECORD_SUPABASE_URL = 'https://aviixriaxyoumhxndzdw.supabase.co';
window.RECORD_SUPABASE_KEY = 'sb_publishable_3q4W4qZgUiNjhQrP2DPWQw_BKjNxp06';

/* Version de ce fichier — sert uniquement de repère visuel dans la Console (F12). */
window.RECORD_CONFIG_VERSION = 'v2026-09.4';
