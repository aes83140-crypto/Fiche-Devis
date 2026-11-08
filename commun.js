/* Code commun aux fiches techniciens (devis, remontée, vantaux, rideaux, porte neuve, contrat).
   Avant, chaque fiche en avait sa propre copie : une correction devait être faite six fois,
   et certaines copies avaient fini par diverger. Chargé après config.js ; chaque fiche
   récupère ces fonctions via window.RecordCommun. */
(function(){
  const $ = id => document.getElementById(id);
  const TECH_KEY = 'techniciens-preenregistres';
  const STAT_KEY = 'record-stats-usage';
  const STAT_Q = 'record-stats-queue';

  function lsGet(key){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }catch(e){ return null; }
  }

  function lsSet(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }

  function dedupe(a){ const o = []; (a || []).forEach(v=>{ v = String(v).trim(); if(v && o.indexOf(v) < 0) o.push(v); }); return o; }

  function mailOk(v){ return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v || '').trim()); }

  function pdfFileName(prefix, chantier, equip){
    const clean = s => String(s || '').trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
    return [prefix, clean(chantier) || 'chantier', clean(equip) || 'equipement'].join('-') + '.pdf';
  }

  function photoOf(p){
    return (p && typeof p === 'object') ? p : { dataUrl: p, w: 4, h: 3 };
  }

  function dataUrlToFileSync(dataUrl, name){
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(parts[1]);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for(let i=0;i<len;i++){ bytes[i] = binary.charCodeAt(i); }
    return new File([bytes], name, { type: mime });
  }

  function resizeImage(file){
    const maxDim = 1024;
    const QUAL = 0.55;

    function dessine(src, sw, sh){
      let w = sw, h = sh;
      if(w > h && w > maxDim){ h = Math.round(h * maxDim / w); w = maxDim; }
      else if(h > maxDim){ w = Math.round(w * maxDim / h); h = maxDim; }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h);
      x.drawImage(src, 0, 0, w, h);
      return { canvas:c, w, h };
    }
    function estVide(canvas){
      try{
        const x = canvas.getContext('2d');
        const pts = [[2,2],[canvas.width>>1,canvas.height>>1],[canvas.width-3,canvas.height-3],
                     [canvas.width>>2,canvas.height>>2],[canvas.width-(canvas.width>>2),canvas.height-(canvas.height>>2)]];
        return pts.every(p=>{
          const d = x.getImageData(p[0], p[1], 1, 1).data;
          return d[0] > 250 && d[1] > 250 && d[2] > 250;
        });
      }catch(e){ return false; }
    }

    return new Promise(async (resolve)=>{
      // 1. createImageBitmap : red imensionnement pendant le décodage, sans charger
      //    l'image entière en mémoire graphique.
      if(window.createImageBitmap){
        try{
          const probe = await createImageBitmap(file);
          const sw = probe.width, sh = probe.height;
          let bmp = probe;
          if(Math.max(sw, sh) > maxDim){
            const r = maxDim / Math.max(sw, sh);
            try{
              bmp = await createImageBitmap(file, {
                resizeWidth: Math.round(sw * r),
                resizeHeight: Math.round(sh * r),
                resizeQuality: 'high'
              });
              probe.close && probe.close();
            }catch(e){ bmp = probe; }
          }
          const out = dessine(bmp, bmp.width, bmp.height);
          bmp.close && bmp.close();
          if(!estVide(out.canvas)){
            resolve({ dataUrl: out.canvas.toDataURL('image/jpeg', QUAL), w: out.w, h: out.h });
            return;
          }
        }catch(e){}
      }

      // 2. Repli : <img> classique, avec réduction en paliers successifs pour
      //    rester sous la limite mémoire des tablettes.
      const reader = new FileReader();
      reader.onload = function(e){
        const img = new Image();
        img.onload = async function(){
          try{ if(img.decode) await img.decode(); }catch(err){}
          let out = dessine(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
          if(estVide(out.canvas)){
            // paliers : on divise par deux jusqu'à la taille cible
            let src = img, sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height;
            while(Math.max(sw, sh) > maxDim * 2){
              sw = Math.round(sw / 2); sh = Math.round(sh / 2);
              const step = document.createElement('canvas');
              step.width = sw; step.height = sh;
              const sx = step.getContext('2d');
              sx.fillStyle = '#FFFFFF'; sx.fillRect(0, 0, sw, sh);
              sx.drawImage(src, 0, 0, sw, sh);
              src = step;
            }
            out = dessine(src, sw, sh);
          }
          resolve({ dataUrl: out.canvas.toDataURL('image/jpeg', QUAL), w: out.w, h: out.h });
        };
        img.onerror = function(){ resolve(null); };
        img.src = e.target.result;
      };
      reader.onerror = function(){ resolve(null); };
      reader.readAsDataURL(file);
    });
  }

  function setupCombo(inputId, key, placeholder){
    const input = $(inputId);
    if(!input) return;
    // Un seul encart : le technicien tape son nom, des propositions apparaissent ;
    // il peut en choisir une ou continuer à écrire s'il n'est pas enregistré.
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    input.placeholder = placeholder;
    input.setAttribute('autocomplete', 'off');
    input.style.minHeight = '44px';
    const list = document.createElement('div');
    list.style.cssText = 'display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:70;background:#fff;border:1.5px solid #CCD3DB;border-radius:12px;box-shadow:0 20px 40px -22px rgba(18,23,28,.45);max-height:240px;overflow-y:auto;padding:6px;';
    wrap.appendChild(list);
    function fold(s){
      return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    function render(){
      const q = fold(input.value).trim();
      const found = (lsGet(key) || []).slice()
        .sort((a,b)=>String(a).localeCompare(String(b),'fr'))
        .filter(t=> !q || fold(t).indexOf(q) >= 0)
        .slice(0, 40);
      if(!found.length || (found.length === 1 && fold(found[0]) === q)){ list.style.display = 'none'; return; }
      list.innerHTML = found.map(v=> '<div data-v="' + String(v).replace(/"/g,'&quot;') + '" style="padding:11px 12px;border-radius:8px;font-size:15px;color:#12171C;cursor:pointer;min-height:44px;display:flex;align-items:center;">' + String(v).replace(/</g,'&lt;') + '</div>').join('');
      list.style.display = '';
    }
    input.addEventListener('focus', render);
    input.addEventListener('input', render);
    input.addEventListener('keydown', e=>{ if(e.key === 'Escape' || e.key === 'Enter') list.style.display = 'none'; });
    list.addEventListener('mousedown', e=>{
      const opt = e.target.closest('[data-v]');
      if(!opt) return;
      e.preventDefault();
      input.value = opt.getAttribute('data-v');
      list.style.display = 'none';
      input.dispatchEvent(new Event('change', { bubbles:true }));
    });
    document.addEventListener('click', e=>{ if(!wrap.contains(e.target)) list.style.display = 'none'; });
    return { refresh: ()=>{ if(list.style.display !== 'none') render(); } };
  }

  /* Historique des dernières fiches (10 au plus), une clé par type de fiche. */
  function histLoad(key){
    try{ const a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a : []; }
    catch(e){ return []; }
  }
  function histSave(key, list){
    try{ localStorage.setItem(key, JSON.stringify(list.slice(0, 10))); }catch(e){}
  }

  /* Statistiques d'utilisation : gardées sur la tablette, puis remontées vers Supabase
     sans aucune action du technicien. Hors réseau, les lignes restent en attente. */
  function statLog(tech, fiche, how){
    const row = { d: new Date().toISOString(), t: String(tech || '').trim() || 'Non renseigné', f: fiche, h: how || '' };
    try{
      const a = JSON.parse(localStorage.getItem(STAT_KEY) || '[]');
      a.push(row);
      localStorage.setItem(STAT_KEY, JSON.stringify(a.slice(-2000)));
    }catch(e){}
    try{
      const q = JSON.parse(localStorage.getItem(STAT_Q) || '[]');
      q.push(row);
      localStorage.setItem(STAT_Q, JSON.stringify(q.slice(-500)));
    }catch(e){}
    statFlush();
  }
  /* Un seul envoi à la fois (sinon les mêmes lignes partiraient deux fois), et seules les
     lignes envoyées sont retirées de la file : celles ajoutées pendant l'envoi restent.
     Le repère « fd-sync-tag », s'il existe dans la page, affiche l'état de l'envoi. */
  let statEnvoi = false;
  async function statFlush(){
    const SB_URL = window.RECORD_SUPABASE_URL, SB_KEY = window.RECORD_SUPABASE_KEY;
    const tag = $('fd-sync-tag');
    if(!SB_URL || !SB_KEY){ if(tag) tag.textContent = '⚠ statistiques : config.js non à jour'; return; }
    if(statEnvoi) return;
    let q = [];
    try{ q = JSON.parse(localStorage.getItem(STAT_Q) || '[]'); }catch(e){}
    if(!q.length){ if(tag) tag.textContent = ''; return; }
    statEnvoi = true;
    try{
      const r = await fetch(SB_URL + '/rest/v1/stats', {
        method:'POST', keepalive:true,
        headers:{ apikey: SB_KEY, Authorization:'Bearer ' + SB_KEY, 'Content-Type':'application/json', Prefer:'return=minimal' },
        body: JSON.stringify(q)
      });
      if(r.ok){
        let reste = [];
        try{ reste = JSON.parse(localStorage.getItem(STAT_Q) || '[]').slice(q.length); }catch(e){}
        try{ localStorage.setItem(STAT_Q, JSON.stringify(reste)); }catch(e){}
        if(tag) tag.textContent = '';
        if(reste.length) setTimeout(statFlush, 0);
      }
      else if(tag) tag.textContent = '⚠ statistiques en attente (réessai à la prochaine ouverture)';
    }catch(e){ if(tag) tag.textContent = '⚠ statistiques en attente (hors ligne ?)'; }
    finally{ statEnvoi = false; }
  }
  window.addEventListener('online', statFlush);

  /* Liste des techniciens : listes.json (fichier du site), puis la liste tenue à jour par
     les responsables dans Supabase, qui fait référence dès qu'elle répond.
     onMaj est appelée à chaque mise à jour pour rafraîchir les propositions de la page. */
  async function chargerTechniciens(onMaj){
    const maj = () => { try{ if(onMaj) onMaj(); }catch(e){} };
    try{
      const r = await fetch('listes.json?v=' + Date.now(), { cache:'no-store' });
      if(!r.ok) return;
      const d = await r.json();
      lsSet(TECH_KEY, dedupe(d.techniciens));
      maj();
      statFlush();
    }catch(e){ return; }
    if(!window.RECORD_SUPABASE_URL || !window.RECORD_SUPABASE_KEY) return;
    try{
      const r = await fetch(window.RECORD_SUPABASE_URL + '/rest/v1/listes?id=eq.1&select=techniciens', {
        headers:{ apikey: window.RECORD_SUPABASE_KEY, Authorization:'Bearer ' + window.RECORD_SUPABASE_KEY }, cache:'no-store'
      });
      const d = await r.json();
      const t = dedupe(d[0] && d[0].techniciens || []);
      if(t.length){ lsSet(TECH_KEY, t); maj(); }
    }catch(e){}
  }

  /* ---------- Archives des fiches (PDF + photos) ----------
     Chaque fiche envoyée ou téléchargée est copiée dans l'espace Supabase « archives »
     (lecture réservée à l'administrateur, suppression automatique après 2 ans depuis la
     page Archives). La copie se fait en arrière-plan, sans action du technicien : hors
     réseau, elle attend dans la tablette (IndexedDB, les PDF étant trop lourds pour
     localStorage) et repart au retour du réseau ou à la prochaine ouverture d'une fiche.
     Aucune erreur d'archivage ne bloque ni ne retarde l'envoi de la fiche. */
  const ARCH_DB = 'record-archives', ARCH_STORE = 'file', ARCH_BUCKET = 'archives';
  const ARCH_SIG = 'record-archives-recentes', ARCH_MAX = 40;
  let archDbP = null, archEnvoi = false, archMemo = [];

  function archDb(){
    if(archDbP) return archDbP;
    archDbP = new Promise((ok, ko) => {
      try{
        const r = indexedDB.open(ARCH_DB, 1);
        r.onupgradeneeded = () => { r.result.createObjectStore(ARCH_STORE, { keyPath:'id' }); };
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
        r.onblocked = () => ko(new Error('bloqué'));
      }catch(e){ ko(e); }
    });
    archDbP.catch(() => {});
    return archDbP;
  }
  function archTx(mode, fn){
    return archDb().then(db => new Promise((ok, ko) => {
      const tx = db.transaction(ARCH_STORE, mode);
      const st = tx.objectStore(ARCH_STORE);
      let res;
      const r = fn(st);
      if(r) r.onsuccess = () => { res = r.result; };
      tx.oncomplete = () => ok(res);
      tx.onerror = () => ko(tx.error);
      tx.onabort = () => ko(tx.error || new Error('abandon'));
    }));
  }
  const archAll = () => archTx('readonly', st => st.getAll());
  const archPut = rec => archTx('readwrite', st => st.put(rec));
  const archDel = id => archTx('readwrite', st => st.delete(id));

  function uuid(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => b[i] = Math.random() * 256);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0,8) + '-' + h.slice(8,12) + '-' + h.slice(12,16) + '-' + h.slice(16,20) + '-' + h.slice(20);
  }

  /* Copie des données sans les photos ni aucune image encodée (déjà archivées à part). */
  function archNettoie(v, prof){
    if(prof > 6) return null;
    if(typeof v === 'string') return v.startsWith('data:') ? '[image]' : (v.length > 4000 ? v.slice(0, 4000) + '…' : v);
    if(Array.isArray(v)) return v.slice(0, 200).map(x => archNettoie(x, prof + 1));
    if(v && typeof v === 'object'){
      const o = {};
      Object.keys(v).forEach(k => { if(k !== 'photos' && k !== 'photo' && typeof v[k] !== 'function') o[k] = archNettoie(v[k], prof + 1); });
      return o;
    }
    return v;
  }
  function txt(v, n){ return String(v == null ? '' : v).trim().slice(0, n || 200); }
  function archSignature(fiche, data, photos){
    const s = fiche + '|' + JSON.stringify(data) + '|' + photos.map(p => p.length + ':' + p.slice(-40)).join(',');
    let h = 0;
    for(let i = 0; i < s.length; i++){ h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return fiche + h.toString(36) + s.length.toString(36);
  }

  /* opts : { fiche:'RM', data, pdf, photos, meta }
     pdf : Blob/File, document jsPDF, ou fonction qui renvoie l'un des deux (null si aucun PDF).
     photos : facultatif — sinon pris dans data.photos (dataUrl ou { dataUrl }). */
  function archiveFiche(opts){
    try{
      if(!window.RECORD_SUPABASE_URL || !window.RECORD_SUPABASE_KEY) return;
      const fiche = txt(opts.fiche, 10) || 'XX';
      const data = opts.data || {};
      const photos = (opts.photos || data.photos || []).map(p => photoOf(p).dataUrl).filter(d => typeof d === 'string' && d.startsWith('data:image/'));
      const propre = archNettoie(data, 0) || {};
      // même fiche archivée deux fois (téléchargée puis envoyée) : une seule copie par 12 h
      const sig = archSignature(fiche, propre, photos);
      let recentes = lsGet(ARCH_SIG) || [];
      const maintenant = Date.now();
      recentes = recentes.filter(r => r && maintenant - r.t < 12 * 3600e3);
      if(recentes.some(r => r.s === sig)) return;
      recentes.push({ s: sig, t: maintenant });
      lsSet(ARCH_SIG, recentes.slice(-50));

      let pdf = opts.pdf;
      if(typeof pdf === 'function') pdf = pdf();
      if(pdf && typeof pdf.output === 'function') pdf = pdf.output('blob');
      if(pdf && !(pdf instanceof Blob)) pdf = null;
      if(pdf) pdf = new Blob([pdf], { type:'application/pdf' });

      const m = opts.meta || {};
      const d = new Date();
      const id = uuid();
      const dossier = d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + fiche + '-' + id;
      const rec = {
        id, dossier, essais: 0,
        row: {
          id, fiche,
          tech: txt(m.tech != null ? m.tech : data.tech, 120),
          client: txt(m.client != null ? m.client : (data.client || data.nomclient || data.site || data.nom), 200),
          site: txt(m.site != null ? m.site : [data.adresse, data.cpville || data.ville].filter(Boolean).join(' '), 300),
          equip: txt(m.equip != null ? m.equip : (data.equip || data['numero-porte'] || data.numporte || data.fq), 120),
          fait_le: d.toISOString(),
          data: propre,
          pdf_path: pdf ? dossier + '/fiche.pdf' : null,
          photo_paths: photos.map((p, i) => dossier + '/photo-' + String(i + 1).padStart(2, '0') + (/^data:image\/png/.test(p) ? '.png' : /^data:image\/webp/.test(p) ? '.webp' : '.jpg'))
        },
        pdf: pdf || null,
        photos: photos.map((p, i) => { const f = dataUrlToFileSync(p, 'p' + i + '.jpg'); return new Blob([f], { type: f.type || 'image/jpeg' }); })
      };
      archPut(rec).then(archFlush, () => { archMemo.push(rec); archFlush(); });
      // file trop longue (archivage impossible depuis longtemps) : on garde les plus récentes
      archAll().then(list => {
        if(list && list.length > ARCH_MAX){
          list.sort((a, b) => String(a.row.fait_le).localeCompare(String(b.row.fait_le)));
          list.slice(0, list.length - ARCH_MAX).forEach(r => archDel(r.id).catch(() => {}));
        }
      }).catch(() => {});
    }catch(e){ try{ console.warn('[archives] non archivé :', e); }catch(e2){} }
  }

  /* Un objet déjà déposé (envoi précédent interrompu) compte comme réussi. */
  async function archDepot(path, blob){
    const SB_URL = window.RECORD_SUPABASE_URL, SB_KEY = window.RECORD_SUPABASE_KEY;
    const r = await fetch(SB_URL + '/storage/v1/object/' + ARCH_BUCKET + '/' + path, {
      method:'POST',
      headers:{ apikey: SB_KEY, Authorization:'Bearer ' + SB_KEY, 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert':'false' },
      body: blob
    });
    if(r.ok || r.status === 409) return;
    const t = await r.text().catch(() => '');
    if(/duplicate|already exists/i.test(t)) return;
    throw new Error('dépôt ' + r.status + ' ' + t.slice(0, 120));
  }
  async function archEnvoie(rec){
    const SB_URL = window.RECORD_SUPABASE_URL, SB_KEY = window.RECORD_SUPABASE_KEY;
    if(rec.pdf) await archDepot(rec.row.pdf_path, rec.pdf);
    for(let i = 0; i < rec.photos.length; i++) await archDepot(rec.row.photo_paths[i], rec.photos[i]);
    const r = await fetch(SB_URL + '/rest/v1/archives', {
      method:'POST',
      headers:{ apikey: SB_KEY, Authorization:'Bearer ' + SB_KEY, 'Content-Type':'application/json', Prefer:'return=minimal' },
      body: JSON.stringify(rec.row)
    });
    if(r.ok || r.status === 409) return;
    const t = await r.text().catch(() => '');
    if(/duplicate key/i.test(t)) return;
    throw new Error('fiche ' + r.status + ' ' + t.slice(0, 120));
  }
  async function archFlush(){
    if(archEnvoi || !window.RECORD_SUPABASE_URL || !window.RECORD_SUPABASE_KEY) return;
    if(navigator.onLine === false) return;
    archEnvoi = true;
    try{
      let list = [];
      try{ list = (await archAll()) || []; }catch(e){}
      list = list.concat(archMemo);
      list.sort((a, b) => String(a.row.fait_le).localeCompare(String(b.row.fait_le)));
      for(const rec of list){
        try{
          await archEnvoie(rec);
          archMemo = archMemo.filter(x => x.id !== rec.id);
          await archDel(rec.id).catch(() => {});
        }catch(e){
          try{ console.warn('[archives] en attente :', e.message || e); }catch(e2){}
          // une fiche refusée à chaque essai (trop lourde…) ne doit pas bloquer les suivantes
          rec.essais = (rec.essais || 0) + 1;
          if(rec.essais >= 25){ archMemo = archMemo.filter(x => x.id !== rec.id); await archDel(rec.id).catch(() => {}); continue; }
          await archPut(rec).catch(() => {});
          break; // réseau ou Supabase indisponible : on réessaiera plus tard
        }
      }
    }finally{ archEnvoi = false; }
  }
  window.addEventListener('online', () => archFlush());
  setTimeout(() => archFlush(), 4000);

  window.RecordCommun = { TECH_KEY, lsGet, lsSet, dedupe, mailOk, pdfFileName, photoOf, dataUrlToFileSync,
    resizeImage, setupCombo, histLoad, histSave, statLog, statFlush, chargerTechniciens, archiveFiche, archFlush };
})();
