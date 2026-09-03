/* Code d'accès administrateur — UN SEUL endroit à modifier.
   Utilisé par la page d'accueil (mode administrateur) et par les fiches
   en construction (accès réservé). */
window.RECORD_ADMIN_CODE = 'Chris04';

/* Adresse de l'espace partagé (statistiques + listes des techniciens),
   collée une fois pour toutes ici : plus besoin de jeton GitHub pour la diffuser,
   toutes les pages et tablettes la connaissent dès qu'elles chargent ce fichier. */
window.RECORD_STATS_URL = "https://script.google.com/macros/s/AKfycbylrX5f-BXY68CXQDa5tcKH16hnhUh9BDaekIv0kdFUftS1k1w3jx1iD4HXhnavLot1/exec";