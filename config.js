/* Accès administrateur : il n'y a plus de code ici. L'administrateur se connecte avec
   son e-mail et son mot de passe Supabase (compte créé dans Authentication > Users),
   vérifiés par Supabase lui-même — voir recordAdminLogin plus bas.
   Indice affiché en cas d'erreur de connexion : ne jamais y écrire le mot de passe. */
window.RECORD_ADMIN_HINT = 'Demander le mot de passe à Christophe BATAILLE.';

/* Code de confirmation, demandé avant d'effacer des statistiques ou des avis
   (remise à zéro ou mode gestion). Simple garde-fou contre une fausse manœuvre :
   la vraie protection est la connexion administrateur, exigée par Supabase. */
window.RECORD_RESET_CODE = 'Reset04';

/* Espace partagé Supabase (statistiques + liste des techniciens) — collé une fois
   pour toutes ici : toutes les pages et tablettes le connaissent dès qu'elles
   chargent ce fichier, sans jeton GitHub. */
window.RECORD_SUPABASE_URL = 'https://aviixriaxyoumhxndzdw.supabase.co';
window.RECORD_SUPABASE_KEY = 'sb_publishable_3q4W4qZgUiNjhQrP2DPWQw_BKjNxp06';

/* Version de ce fichier — sert uniquement de repère visuel dans la Console (F12). */
window.RECORD_CONFIG_VERSION = 'v2026-10.1';

/* Connexion administrateur (Supabase Auth). Le mot de passe n'est écrit nulle part :
   Supabase le vérifie et renvoie un jeton valable environ 1 h, gardé le temps de l'onglet.
   Sans ce jeton, Supabase refuse de lire les stats et les avis, de les effacer
   et de modifier la liste des techniciens. */
(function(){
  var KEY = 'record-admin-session';
  var memo = null; // secours si sessionStorage est bloqué
  function lire(){ try{ return JSON.parse(sessionStorage.getItem(KEY) || 'null') || memo; }catch(e){ return memo; } }
  window.recordAdminToken = function(){
    var s = lire();
    return (s && s.token && Date.now() < s.exp - 60000) ? s.token : null;
  };
  window.recordAdminEmail = function(){ var s = lire(); return (s && window.recordAdminToken()) ? s.email : ''; };
  window.recordAdminLogout = function(){ memo = null; try{ sessionStorage.removeItem(KEY); }catch(e){} };
  /* Renvoie true si l'e-mail et le mot de passe sont acceptés, false sinon ;
     lève une erreur si Supabase est injoignable (réseau). */
  window.recordAdminLogin = async function(email, password){
    var r = await fetch(window.RECORD_SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method:'POST',
      headers:{ apikey: window.RECORD_SUPABASE_KEY, 'Content-Type':'application/json' },
      body: JSON.stringify({ email: String(email || '').trim(), password: String(password || '') })
    });
    if(!r.ok) return false;
    var d = await r.json();
    if(!d || !d.access_token) return false;
    memo = { token: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000, email: (d.user && d.user.email) || email };
    try{ sessionStorage.setItem(KEY, JSON.stringify(memo)); }catch(e){}
    return true;
  };
})();

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
