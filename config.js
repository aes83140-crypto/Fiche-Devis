/* Code d'accès administrateur — UN SEUL endroit à modifier.
   Utilisé par la page d'accueil (mode administrateur) et par les fiches
   en construction (accès réservé). */
window.RECORD_ADMIN_CODE = 'Chris04';
/* Indice affiché en cas d'oubli (le code lui-même reste inchangé ici).
   Ne jamais y écrire le code ou une partie reconnaissable : juste un rappel
   de la logique utilisée pour le retrouver (ex. « demander à Christophe »). */
window.RECORD_ADMIN_HINT = 'Demander le code à Christophe BATAILLE.';

/* Code séparé, demandé uniquement pour REMETTRE À ZÉRO les statistiques ou les avis.
   À ne pas communiquer avec le code administrateur : un responsable peut consulter
   et gérer les listes, mais pas effacer l'historique. */
window.RECORD_RESET_CODE = 'Reset04';

/* Espace partagé Supabase (statistiques + liste des techniciens) — collé une fois
   pour toutes ici : toutes les pages et tablettes le connaissent dès qu'elles
   chargent ce fichier, sans jeton GitHub. */
window.RECORD_SUPABASE_URL = 'https://aviixriaxyoumhxndzdw.supabase.co';
window.RECORD_SUPABASE_KEY = 'sb_publishable_3q4W4qZgUiNjhQrP2DPWQw_BKjNxp06';

/* Version de ce fichier — sert uniquement de repère visuel dans la Console (F12). */
window.RECORD_CONFIG_VERSION = 'v2026-09.7';

/* Contrôle de version : chaque page compare sa version (repère vAAAA-MM.N en bas de page)
   à celle en ligne, à l'ouverture et à chaque retour sur l'appli. Si elle est dépassée,
   un bandeau propose d'actualiser. Rien à maintenir : on relit simplement la page en ligne. */
(function(){
  var RE = /v\d{4}-\d{2}\.\d+/;
  var dernier = 0, bandeau = null;
  function num(v){ var m = /v(\d{4})-(\d{2})\.(\d+)/.exec(v || ''); return m ? (+m[1])*1e6 + (+m[2])*1e4 + (+m[3]) : 0; }
  function versionLocale(){
    var els = document.querySelectorAll('div');
    for(var i = els.length - 1; i >= 0; i--){
      var t = (els[i].textContent || '').trim();
      if(t.length < 16 && /^v\d{4}-\d{2}\.\d+$/.test(t)) return t;
    }
    return '';
  }
  function saisieEnCours(){
    var ch = document.querySelectorAll('input[type=text],input[type=number],input[type=email],input[type=tel],textarea');
    for(var i = 0; i < ch.length; i++){ if(ch[i].value && ch[i].value.trim() && ch[i].offsetParent) return true; }
    return false;
  }
  async function actualiser(){
    if(saisieEnCours() && !confirm("Une fiche est en cours de saisie : elle sera effacée.\nEnvoie-la d'abord si besoin.\n\nActualiser quand même ?")) return;
    try{
      if('serviceWorker' in navigator){ var regs = await navigator.serviceWorker.getRegistrations(); for(var r of regs){ await r.unregister(); } }
      if(window.caches){ var ks = await caches.keys(); for(var k of ks){ await caches.delete(k); } }
    }catch(e){}
    location.reload();
  }
  function montrer(v){
    if(bandeau) return;
    bandeau = document.createElement('div');
    bandeau.setAttribute('role', 'status');
    bandeau.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:99999;max-width:520px;margin:0 auto;display:flex;align-items:center;gap:12px;background:#1E3448;color:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 8px 28px rgba(0,0,0,.28);font:600 14px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;';
    var txt = document.createElement('div');
    txt.style.cssText = 'flex:1;min-width:0;';
    txt.textContent = 'Nouvelle version disponible (' + v + ')';
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = 'Actualiser';
    b.style.cssText = 'flex-shrink:0;min-height:44px;padding:0 16px;border:0;border-radius:10px;background:#fff;color:#1E3448;font:700 14px/1 inherit;font-family:inherit;cursor:pointer;';
    b.onclick = actualiser;
    bandeau.appendChild(txt); bandeau.appendChild(b);
    document.body.appendChild(bandeau);
  }
  async function verifier(){
    if(location.protocol !== 'https:' && location.protocol !== 'http:') return;
    if(Date.now() - dernier < 60000) return;
    dernier = Date.now();
    var locale = versionLocale();
    if(!locale || !navigator.onLine) return;
    try{
      var u = location.pathname + (location.pathname.indexOf('?') < 0 ? '?' : '&') + 'vc=' + Date.now();
      var r = await fetch(u, { cache:'no-store' });
      if(!r.ok) return;
      var html = await r.text();
      var tags = html.match(/>\s*(v\d{4}-\d{2}\.\d+)\s*</g);
      if(!tags) return;
      var enLigne = RE.exec(tags[tags.length - 1])[0];
      if(num(enLigne) > num(locale)) montrer(enLigne);
    }catch(e){}
  }
  function lancer(){ setTimeout(verifier, 1500); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lancer); else lancer();
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible') verifier(); });
  window.addEventListener('online', verifier);
})();
