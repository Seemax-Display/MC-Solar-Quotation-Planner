const state = { step: 'customer', selectedPromoId: 'mono-falda-6-10', cart: [] };
const STORAGE_KEY = 'fv_shop_zip_draft_v1';
const fmtMoney = (v) => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
const esc = (str) => String(str ?? '').replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s]));
const $ = (id) => document.getElementById(id);
function val(id, fallback='') { const el=$(id); return el ? el.value : fallback; }
function num(id, fallback=0) { const v=parseFloat(val(id)); return Number.isFinite(v) ? v : fallback; }
function phase(){ return document.querySelector('input[name="promoPhase"]:checked')?.value || 'monofase'; }
function roofLabel(v){ return {falda:'Tetto a Falda',termocopertura:'Tetto Termocopertura',piano:'Tetto Piano'}[v] || v; }
function filteredPromos(){ return window.PROMOS.filter(p => p.phase===phase() && p.roof===val('promoRoofType','falda')); }
function currentPromo(){ return window.PROMOS.find(p=>p.id===state.selectedPromoId) || filteredPromos()[0] || window.PROMOS[0]; }
function commission(){ return window.PROMO_CONFIG.commissions[num('commercialDiscount',45)] || 0; }
function calcPromo(p=currentPromo()){
  const d = num('commercialDiscount',45);
  const c = commission();
  const backup = val('backupMode')==='presente' ? window.PROMO_CONFIG.backupCost : 0;
  const extra = num('extraCost',0);
  const vat = num('vat',10);
  const listPrice = (p.basePrice || 0) + backup + extra;
  const discountAmount = listPrice * d/100;
  const net = Math.max(0, listPrice - discountAmount);
  const vatAmount = net * vat/100;
  const total = net + vatAmount;
  return {p,d,c,backup,extra,vat,listPrice,discountAmount,net,vatAmount,total,commissionAmount:net*c/100};
}
function cartTotals(){ const qty = state.cart.reduce((s,i)=>s+i.qty,0); const total = state.cart.reduce((s,i)=>s+i.qty*i.price,0); return {qty,total}; }
function setStep(step){ state.step=step; document.querySelectorAll('.step').forEach(el=>el.classList.remove('active')); $('step-'+step).classList.add('active'); document.querySelectorAll('.step-item').forEach(el=>el.classList.toggle('active', el.dataset.step===step)); renderAll(); window.scrollTo({top:0,behavior:'smooth'}); }
function updateDiscounts(){ const select=$('commercialDiscount'); const old=select.value; const allowed=window.PROMO_CONFIG.discounts[phase()]; select.innerHTML=allowed.map(v=>`<option value="${v}">${v}%</option>`).join(''); select.value=allowed.includes(Number(old)) ? old : allowed[0]; $('commissionPercent').value = commission() + '%'; }
function ensurePromo(){ const fps=filteredPromos(); if(!fps.find(p=>p.id===state.selectedPromoId) && fps[0]) state.selectedPromoId=fps[0].id; }
function renderPromos(){ ensurePromo(); const html = filteredPromos().map(p=>{ const c=calcPromo(p); const selected=p.id===state.selectedPromoId; return `
  <article class="card ${selected?'selected':''}">
    <div class="promo-image"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></div>
    <div class="card-head"><div><h3>${esc(p.shortName)}</h3><div style="color:var(--muted);font-size:13px">${esc(p.name)}</div></div><span class="badge">${esc(p.badge)}</span></div>
    <ul class="key-points">${p.summary.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    <div class="price-line"><span>Prezzo fisso Promo</span><strong>${p.basePrice>0?fmtMoney(p.basePrice):'Da definire'}</strong></div>
    <div class="price-line"><span>Totale stimato con sconto ${c.d}%</span><strong>${p.basePrice>0?fmtMoney(c.total):'Da definire'}</strong></div>
    <div class="nav-row"><button class="btn-primary" data-select-promo="${p.id}">${selected?'Selezionata':'Seleziona'}</button><button class="btn-secondary" data-add-promo="${p.id}">Aggiungi al carrello</button><button class="btn-ghost" data-toggle="details-${p.id}">Maggiori dettagli</button></div>
    <div class="details" id="details-${p.id}"><ul>${p.details.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
  </article>` }).join('') || '<div class="alert-box">Nessuna Promo disponibile.</div>';
  $('promoCards').innerHTML = html;
}
function populateFilters(){
  const cats=['Tutte le categorie',...Array.from(new Set(window.PRODUCTS.map(p=>p.category))).sort()];
  const systems=['Tutti i sistemi',...Array.from(new Set(window.PRODUCTS.map(p=>p.system))).sort()];
  const cat=$('shopCategory'), sys=$('shopSystem'); const oldCat=cat.value||cats[0], oldSys=sys.value||systems[0];
  cat.innerHTML=cats.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  sys.innerHTML=systems.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  cat.value=cats.includes(oldCat)?oldCat:cats[0]; sys.value=systems.includes(oldSys)?oldSys:systems[0];
}
function filteredProducts(){ const q=val('shopSearch','').toLowerCase().trim(); const cat=val('shopCategory','Tutte le categorie'); const sys=val('shopSystem','Tutti i sistemi'); return window.PRODUCTS.filter(p=>{ const text=(p.model+' '+p.description+' '+p.category+' '+p.system).toLowerCase(); return (!q||text.includes(q)) && (cat==='Tutte le categorie'||p.category===cat) && (sys==='Tutti i sistemi'||p.system===sys); }); }
function renderProducts(){ const list=filteredProducts(); $('productCount').textContent = `${list.length} prodotti visualizzati su ${window.PRODUCTS.length}`; $('productGrid').innerHTML = list.map(p=>`
  <article class="card product-card">
    <div class="product-image"><img src="${esc(p.image)}" alt="${esc(p.model)}" loading="lazy"></div>
    <div class="card-head"><div><h3>${esc(p.model)}</h3><div class="product-meta"><span class="pill">${esc(p.category)}</span><span class="pill">${esc(p.system)}</span></div></div><span class="badge green">${fmtMoney(p.price)}</span></div>
    <p class="product-description">${esc(p.description)}</p>
    <div class="nav-row"><button class="btn-primary" data-add-product="${p.id}">Aggiungi al carrello</button></div>
  </article>`).join('') || '<div class="alert-box">Nessun prodotto trovato.</div>';
}
function addProduct(id){ const p=window.PRODUCTS.find(x=>x.id===id); if(!p)return; const rowId='product-'+id; const ex=state.cart.find(i=>i.rowId===rowId); if(ex) ex.qty++; else state.cart.push({rowId,type:'Negozio',code:p.model,name:p.model,description:p.description,price:p.price,qty:1,image:p.image}); renderAll(); }
function addPromo(id){ const p=window.PROMOS.find(x=>x.id===id); if(!p)return; const c=calcPromo(p); const rowId=`promo-${id}-${c.d}-${val('backupMode')}-${num('extraCost',0)}-${num('vat',10)}`; const price=p.basePrice>0?c.total:0; const ex=state.cart.find(i=>i.rowId===rowId); if(ex) ex.qty++; else state.cart.push({rowId,type:'Promo',code:p.shortName,name:p.name,description:`Sconto ${c.d}% - Provvigione ${c.c}% - Backup ${val('backupMode')==='presente'?'Presente':'Non presente'}`,price,qty:1,image:p.image}); renderAll(); }
function changeQty(rowId,delta){ const item=state.cart.find(i=>i.rowId===rowId); if(!item)return; item.qty+=delta; if(item.qty<=0) state.cart=state.cart.filter(i=>i.rowId!==rowId); renderAll(); }
function removeItem(rowId){ state.cart=state.cart.filter(i=>i.rowId!==rowId); renderAll(); }
function clearCart(){ if(confirm('Vuoi svuotare il carrello?')){ state.cart=[]; renderAll(); } }
function renderCart(){ const totals=cartTotals(); if(!state.cart.length){ $('cartContainer').innerHTML='<div class="alert-box">Il carrello e vuoto. Aggiungi una Promo o prodotti dal Negozio.</div>'; return; } $('cartContainer').innerHTML=`
  <div class="result-hero"><div class="metric"><span>Righe carrello</span><strong>${state.cart.length}</strong></div><div class="metric"><span>Quantita totale</span><strong>${totals.qty}</strong></div><div class="metric"><span>Totale merce</span><strong>${fmtMoney(totals.total)}</strong></div><div class="metric"><span>Cliente</span><strong>${esc(val('customerName')||val('companyName')||'-')}</strong></div></div>
  <div style="overflow-x:auto"><table class="cart-table"><thead><tr><th>Tipo</th><th>Articolo</th><th>Descrizione</th><th>Prezzo</th><th>Q.tà</th><th>Totale</th><th class="no-print">Azioni</th></tr></thead><tbody>${state.cart.map(item=>`<tr><td><span class="badge ${item.type==='Promo'?'orange':'green'}">${esc(item.type)}</span></td><td><strong>${esc(item.code)}</strong><br><small>${esc(item.name)}</small></td><td>${esc(item.description)}</td><td>${fmtMoney(item.price)}</td><td><span class="qty-controls no-print"><button class="btn-secondary" data-qty="${item.rowId}" data-delta="-1">-</button><strong>${item.qty}</strong><button class="btn-secondary" data-qty="${item.rowId}" data-delta="1">+</button></span><span class="print-only">${item.qty}</span></td><td><strong>${fmtMoney(item.price*item.qty)}</strong></td><td class="no-print"><button class="btn-danger" data-remove="${item.rowId}">Rimuovi</button></td></tr>`).join('')}</tbody></table></div>
  <div class="price-line"><span>Totale commessa</span><strong>${fmtMoney(totals.total)}</strong></div>
  <div class="nav-row no-print"><button class="btn-primary" id="printOrderBtn2">Stampa commessa d'ordine</button><button class="btn-ghost" id="saveDraftBtn2">Salva bozza</button><button class="btn-danger" id="clearCartBtn">Svuota carrello</button></div>`; }
function updateSummary(){ const c=calcPromo(); const totals=cartTotals(); $('livePromo').textContent=c.p.shortName||'-'; $('liveCartItems').textContent=`${totals.qty} articoli`; $('liveDiscount').textContent=`${c.d}%`; $('liveCartTotal').textContent=fmtMoney(totals.total); $('cartBadge').textContent=totals.qty; $('heroCartCount').textContent=`${totals.qty} ${totals.qty===1?'articolo':'articoli'}`; $('heroCartTotal').textContent=fmtMoney(totals.total); $('sumRoof').textContent=roofLabel(val('promoRoofType')); $('sumBackup').textContent=val('backupMode')==='presente'?'Presente':'Non presente'; $('sumCommission').textContent=c.c+'%'; $('sumCommissionAmount').textContent=c.p.basePrice>0?fmtMoney(c.commissionAmount):'Da definire'; }
function renderAll(){ updateDiscounts(); ensurePromo(); populateFilters(); renderPromos(); renderProducts(); renderCart(); updateSummary(); }
function saveDraft(){ const data={}; document.querySelectorAll('input,select,textarea').forEach(el=>{ if(el.type==='radio') data[el.name]=document.querySelector(`input[name="${el.name}"]:checked`)?.value; else if(el.id) data[el.id]=el.value; }); localStorage.setItem(STORAGE_KEY,JSON.stringify({data,cart:state.cart,selectedPromoId:state.selectedPromoId})); alert('Bozza salvata su questo dispositivo.'); }
function loadDraft(){ const raw=localStorage.getItem(STORAGE_KEY); if(!raw)return; try{ const s=JSON.parse(raw); state.cart=s.cart||[]; state.selectedPromoId=s.selectedPromoId||state.selectedPromoId; Object.entries(s.data||{}).forEach(([k,v])=>{ const el=$(k); if(el) el.value=v; else { const r=document.querySelector(`input[name="${k}"][value="${v}"]`); if(r) r.checked=true; } }); }catch(e){ console.warn(e); } }
function reset(){ if(confirm('Vuoi cancellare la simulazione corrente e ripartire da zero?')){ localStorage.removeItem(STORAGE_KEY); location.reload(); } }
function printOrder(){ if(!state.cart.length){ alert('Il carrello e vuoto. Aggiungi almeno un articolo.'); return; } setStep('cart'); setTimeout(()=>window.print(),250); }
function bindGlobal(){ document.body.addEventListener('click',e=>{ const t=e.target.closest('button,.hero-cart'); if(!t)return; if(t.dataset.step) setStep(t.dataset.step); if(t.dataset.selectPromo){ state.selectedPromoId=t.dataset.selectPromo; renderAll(); } if(t.dataset.addPromo) addPromo(t.dataset.addPromo); if(t.dataset.addProduct) addProduct(t.dataset.addProduct); if(t.dataset.toggle){ $(t.dataset.toggle)?.classList.toggle('open'); } if(t.dataset.qty) changeQty(t.dataset.qty,Number(t.dataset.delta)); if(t.dataset.remove) removeItem(t.dataset.remove); }); document.querySelectorAll('input,select,textarea').forEach(el=>el.addEventListener('change',()=>{ if(el.id==='roofType') $('promoRoofType').value=el.value; renderAll(); })); $('shopSearch').addEventListener('input',renderProducts); $('shopCategory').addEventListener('change',renderProducts); $('shopSystem').addEventListener('change',renderProducts); $('saveDraftBtn').addEventListener('click',saveDraft); $('newSimulationBtn').addEventListener('click',reset); $('printOrderBtn').addEventListener('click',printOrder); document.addEventListener('click',e=>{ if(e.target.id==='printOrderBtn2') printOrder(); if(e.target.id==='saveDraftBtn2') saveDraft(); if(e.target.id==='clearCartBtn') clearCart(); }); }
(function init(){ $('quoteDate').valueAsDate = new Date(); populateFilters(); loadDraft(); updateDiscounts(); ensurePromo(); bindGlobal(); renderAll(); })();
