const state = { step: 'customer', selectedPromoId: 'mono-falda-6-10', cart: [], shopDiscount: null, pendingProductAdd: null };
const STORAGE_KEY = 'fv_shop_zip_draft_v2';
const fmtMoney = (v) => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v)||0);
const esc = (str) => String(str ?? '').replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s]));
const $ = (id) => document.getElementById(id);
function val(id, fallback='') { const el=$(id); return el ? el.value : fallback; }
function num(id, fallback=0) { const v=parseFloat(val(id)); return Number.isFinite(v) ? v : fallback; }
function phase(){ return document.querySelector('input[name="promoPhase"]:checked')?.value || 'monofase'; }
function roofLabel(v){ return {falda:'Tetto a Falda',termocopertura:'Tetto Termocopertura',piano:'Tetto Piano'}[v] || v; }
function filteredPromos(){ return window.PROMOS.filter(p => p.phase===phase() && p.roof===val('promoRoofType','falda')); }
function currentPromo(){ return window.PROMOS.find(p=>p.id===state.selectedPromoId) || filteredPromos()[0] || window.PROMOS[0]; }
function commissionByDiscount(discount){ const d=Number(discount)||0; return window.PROMO_CONFIG.commissions[d] || (d>=50 ? 4 : 0); }
function promoCommission(){ return commissionByDiscount(num('commercialDiscount',45)); }
function calcPromo(p=currentPromo()){
  const d = num('commercialDiscount',45);
  const c = promoCommission();
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
function isSolisOrDyness(p){ const t=`${p.model} ${p.description} ${p.category} ${p.system}`.toLowerCase(); return t.includes('solis') || t.includes('dyness'); }
function productPhase(p){ const t=`${p.model} ${p.description} ${p.category} ${p.system}`.toLowerCase(); if(t.includes('single phase')||t.includes('1ph')||t.includes('monofase')) return 'monofase'; if(t.includes('three phase')||t.includes('3ph')||t.includes('trifase')) return 'trifase'; return 'altro'; }
function kitGroupForProduct(p){
  const c=String(p.category||'');
  const s=String(p.system||'');
  const m=String(p.model||'');
  const d=String(p.description||'');
  const t=`${m} ${d} ${c} ${s}`.toLowerCase();
  if(c==='Moduli Fotovoltaici') return 'panel';
  if(c==='Ottimizzatori') return 'optimizer';
  if(c==='Sistemi di Accumulo Dyness' || c==='EP Cube') return 'battery';
  if(c==='Livoltek Inverter e Accumulo' && s.toLowerCase().includes('batterie')) return 'battery';
  if(c==='Inverter di Stringa' || c==='Inverter di Stringa Industriali' || c==='Inverter Ibridi' || c==='Livoltek Inverter e Accumulo') return 'inverter';
  if(c==='Accessori Solis' && (t.includes('wi-fi') || t.includes('wifi') || t.includes('datalogger'))) return 'monitoring';
  if(c==='Cavi Solari e Quadristica'){
    if(s==='Cavi solari' || t.includes('cavo')){
      if(t.includes('rosso')) return 'cable_red';
      if(t.includes('nero')) return 'cable_black';
      return 'cable';
    }
    if(s==='Connettori' || t.includes('connettore')) return 'connector';
    if(s==='Quadristica' || t.includes('quadro')){
      if(/\bac\b/i.test(t) || t.includes('quadro ac')) return 'quadro_ac';
      if(/\bdc\b/i.test(t) || t.includes('quadro dc')) return 'quadro_dc';
      return 'quadro';
    }
  }
  if(c==='Struttura per Impianti FV'){
    if(s==='Morsetti' && t.includes('centrale')) return 'mid_clamp';
    if(s==='Morsetti' && t.includes('finale')) return 'end_clamp';
    if(s==='Zavorre' || t.includes('zavorra')) return 'zavorra';
    if(s==='Profili' && (t.includes('giunto') || t.includes('joint'))) return 'joint';
    if(s==='Profili') return 'profile';
    if(t.includes('coppo')) return 'coppo';
    if(s==='Staffe' || s==='Viti prigioniere' || s==='Bulloneria') return 'mounting';
    return 'structure';
  }
  return null;
}
function kitGroupForCartLine(line){
  if(line.kitGroup) return line.kitGroup;
  const p=window.PRODUCTS.find(x=>x.id===line.productId || x.model===line.code || x.model===line.name);
  return p ? kitGroupForProduct(p) : null;
}
function isKitComponent(p){ return !!kitGroupForProduct(p); }
function productVatRate(p){ return 22; }
function requiredKitGroupsForCurrentRoof(){
  const roof=val('roofType', val('promoRoofType','falda'));
  const base=['panel','inverter','battery','quadro_ac','quadro_dc','connector','cable'];
  if(roof==='piano') return [...base,'zavorra','mid_clamp','end_clamp'];
  if(roof==='termocopertura') return [...base,'profile','mid_clamp','end_clamp'];
  return [...base,'profile','joint','coppo','mid_clamp','end_clamp'];
}
function hasCompleteShopKit(){
  const groups=new Set();
  for(const line of state.cart){
    if(line.type!=='Negozio') continue;
    const g=kitGroupForCartLine(line);
    if(g) groups.add(g);
  }
  const hasCable=(groups.has('cable_red') && groups.has('cable_black')) || groups.has('cable');
  return requiredKitGroupsForCurrentRoof().every(g => g==='cable' ? hasCable : groups.has(g));
}
function recalcLinePricing(line){
  line.unitNet=Math.max(0, Number(line.listUnit||0) * (1 - Number(line.discountPercent||0)/100));
  line.unitVat=line.unitNet * Number(line.vatRate||0)/100;
  line.unitTotal=line.unitNet + line.unitVat;
  line.commissionPercent=commissionByDiscount(line.discountPercent);
}
function refreshCartPricing(){
  const completeKit=hasCompleteShopKit();
  for(const line of state.cart){
    if(line.type!=='Negozio') { recalcLinePricing(line); continue; }
    line.kitGroup=kitGroupForCartLine(line);
    const isKit=!!line.kitGroup;
    line.vatRate=(completeKit && isKit) ? 10 : 22;
    recalcLinePricing(line);
    const discountNote=line.baseMeta || `Sconto negozio ${line.discountPercent}%`;
    const kitNote=isKit ? (completeKit ? 'IVA 10%: componente incluso in kit completo' : 'IVA 22%: kit non ancora completo') : 'IVA 22%';
    line.meta=`${discountNote} · ${kitNote}`;
  }
}
function effectiveShopDiscount(p){ if(state.shopDiscount === null) return null; return state.shopDiscount===50 && isSolisOrDyness(p) ? 51 : state.shopDiscount; }
function makeCartLine({type, code, name, description, image, listUnit, discountPercent, vatRate, qty=1}){
  const unitNet = Math.max(0, Number(listUnit||0) * (1 - Number(discountPercent||0)/100));
  const unitVat = unitNet * Number(vatRate||0)/100;
  const unitTotal = unitNet + unitVat;
  const commissionPercent = commissionByDiscount(discountPercent);
  return { type, code, name, description, image, listUnit:Number(listUnit)||0, discountPercent:Number(discountPercent)||0, vatRate:Number(vatRate)||0, unitNet, unitVat, unitTotal, commissionPercent, qty };
}
function rowKeyForProduct(p, d, vat){ return `product-${p.id}-${d}-${vat}`; }
function rowKeyForPromo(id, c){ return `promo-${id}-${c.d}-${val('backupMode')}-${num('extraCost',0)}-${c.vat}`; }
function cartTotals(){
  return state.cart.reduce((tot,i)=>{
    tot.qty += i.qty;
    tot.list += i.listUnit*i.qty;
    tot.taxable += i.unitNet*i.qty;
    tot.vat += i.unitVat*i.qty;
    tot.total += i.unitTotal*i.qty;
    tot.commission += i.unitNet*i.qty*(i.commissionPercent||0)/100;
    return tot;
  }, {qty:0,list:0,taxable:0,vat:0,total:0,commission:0});
}
function averageCommission(totals){ return totals.taxable>0 ? (totals.commission/totals.taxable)*100 : 0; }
function setStep(step){ state.step=step; document.querySelectorAll('.step').forEach(el=>el.classList.remove('active')); $('step-'+step)?.classList.add('active'); document.querySelectorAll('.step-item').forEach(el=>el.classList.toggle('active', el.dataset.step===step)); renderAll(); window.scrollTo({top:0,behavior:'smooth'}); }
function updateDiscounts(){ const select=$('commercialDiscount'); const old=select.value; const allowed=window.PROMO_CONFIG.discounts[phase()]; select.innerHTML=allowed.map(v=>`<option value="${v}">${v}%</option>`).join(''); select.value=allowed.includes(Number(old)) ? old : allowed[0]; $('commissionPercent').value = promoCommission() + '%'; }
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
function filteredProducts(){
  const q=val('shopSearch','').toLowerCase().trim();
  const cat=val('shopCategory','Tutte le categorie');
  const sys=val('shopSystem','Tutti i sistemi');
  const ph=val('shopPhase','all');
  return window.PRODUCTS.filter(p=>{
    const text=(p.model+' '+p.description+' '+p.category+' '+p.system).toLowerCase();
    return (!q||text.includes(q)) && (cat==='Tutte le categorie'||p.category===cat) && (sys==='Tutti i sistemi'||p.system===sys) && (ph==='all'||productPhase(p)===ph);
  });
}
function renderProducts(){ const list=filteredProducts(); $('productCount').textContent = `${list.length} prodotti visualizzati su ${window.PRODUCTS.length}`; $('productGrid').innerHTML = list.map(p=>{
  const ph=productPhase(p);
  const vat=productVatRate(p);
  const vatLabel = isKitComponent(p) ? 'IVA 22% / 10% kit' : 'IVA 22%';
  const discount = state.shopDiscount===null ? 'Da scegliere' : `${effectiveShopDiscount(p)}%`;
  return `
  <article class="card product-card">
    <div class="product-image"><img src="${esc(p.image)}" alt="${esc(p.model)}" loading="lazy"></div>
    <div class="card-head"><div><h3>${esc(p.model)}</h3><div class="product-meta"><span class="pill">${esc(p.category)}</span><span class="pill">${esc(p.system)}</span>${ph!=='altro'?`<span class="pill">${ph==='monofase'?'Monofase':'Trifase'}</span>`:''}<span class="pill">${vatLabel}</span></div></div><span class="badge green">${fmtMoney(p.price)}</span></div>
    <p class="product-description">${esc(p.description)}</p>
    <div class="price-line"><span>Sconto negozio</span><strong>${discount}</strong></div>
    <div class="nav-row"><button class="btn-primary" data-add-product="${p.id}">Aggiungi al carrello</button></div>
  </article>`}).join('') || '<div class="alert-box">Nessun prodotto trovato.</div>';
}
function openDiscountModal(productId, sourceEl){ state.pendingProductAdd={productId, sourceEl}; $('discountModal').classList.add('open'); $('discountModal').setAttribute('aria-hidden','false'); }
function closeDiscountModal(){ $('discountModal').classList.remove('open'); $('discountModal').setAttribute('aria-hidden','true'); state.pendingProductAdd=null; }
function applyShopDiscount(discount){ state.shopDiscount=Number(discount); const pending=state.pendingProductAdd; $('discountModal').classList.remove('open'); $('discountModal').setAttribute('aria-hidden','true'); state.pendingProductAdd=null; if(pending) addProduct(pending.productId, pending.sourceEl, true); else renderAll(); }
function animateToCart(sourceEl){
  const cartButton=document.querySelector('.cart-button');
  if(!sourceEl || !cartButton) return;
  const s=(sourceEl.closest('.card')||sourceEl).getBoundingClientRect();
  const t=cartButton.getBoundingClientRect();
  const dot=document.createElement('div'); dot.className='fly-dot';
  const startX=s.left+s.width/2-14, startY=s.top+s.height/2-14;
  const endX=t.left+t.width/2-14, endY=t.top+t.height/2-14;
  dot.style.left=startX+'px'; dot.style.top=startY+'px';
  document.body.appendChild(dot);
  requestAnimationFrame(()=>{ dot.style.transform=`translate(${endX-startX}px, ${endY-startY}px) scale(.35)`; dot.style.opacity='0.15'; });
  setTimeout(()=>dot.remove(),760);
}
function addProduct(id, sourceEl=null, force=false){
  const p=window.PRODUCTS.find(x=>x.id===id); if(!p)return;
  if(state.shopDiscount===null && !force){ openDiscountModal(id, sourceEl); return; }
  const d=effectiveShopDiscount(p); const vat=22;
  const rowId=rowKeyForProduct(p,d,vat);
  const ex=state.cart.find(i=>i.rowId===rowId);
  if(ex) ex.qty++;
  else {
    const line=makeCartLine({type:'Negozio', code:p.model, name:p.model, description:p.description, image:p.image, listUnit:p.price, discountPercent:d, vatRate:vat});
    line.rowId=rowId;
    line.productId=p.id;
    line.kitGroup=kitGroupForProduct(p);
    line.baseMeta=isSolisOrDyness(p)&&state.shopDiscount===50 ? 'Sconto 51% automatico SOLIS/DYNESS' : 'Sconto negozio '+d+'%';
    line.meta=line.baseMeta + ' · IVA 22%';
    state.cart.push(line);
  }
  refreshCartPricing();
  animateToCart(sourceEl); renderAll();
}
function addPromo(id, sourceEl=null){ const p=window.PROMOS.find(x=>x.id===id); if(!p)return; const c=calcPromo(p); const rowId=rowKeyForPromo(id,c); const ex=state.cart.find(i=>i.rowId===rowId); if(ex) ex.qty++; else { const line=makeCartLine({type:'Promo', code:p.shortName, name:p.name, description:`Sconto ${c.d}% - Provvigione ${c.c}% - Backup ${val('backupMode')==='presente'?'Presente':'Non presente'}`, image:p.image, listUnit:c.listPrice, discountPercent:c.d, vatRate:c.vat}); line.rowId=rowId; line.meta=`IVA ${c.vat}%`; state.cart.push(line); } animateToCart(sourceEl); renderAll(); }
function changeQty(rowId,delta){ const item=state.cart.find(i=>i.rowId===rowId); if(!item)return; item.qty+=delta; if(item.qty<=0) state.cart=state.cart.filter(i=>i.rowId!==rowId); renderAll(); }
function removeItem(rowId){ state.cart=state.cart.filter(i=>i.rowId!==rowId); renderAll(); }
function clearCart(){ if(confirm('Vuoi svuotare il carrello?')){ state.cart=[]; state.shopDiscount=null; renderAll(); } }
function renderCart(){ const totals=cartTotals(); if(!state.cart.length){ $('cartContainer').innerHTML='<div class="alert-box">Il carrello è vuoto. Aggiungi una Promo o prodotti dal Negozio.</div>'; return; } $('cartContainer').innerHTML=`
  <div class="result-hero"><div class="metric"><span>Righe carrello</span><strong>${state.cart.length}</strong></div><div class="metric"><span>Quantità totale</span><strong>${totals.qty}</strong></div><div class="metric"><span>Imponibile ordine</span><strong>${fmtMoney(totals.taxable)}</strong></div><div class="metric"><span>Totale IVA inclusa</span><strong>${fmtMoney(totals.total)}</strong></div></div>
  <div style="overflow-x:auto"><table class="cart-table"><thead><tr><th>Tipo</th><th>Articolo</th><th>Descrizione</th><th>Listino</th><th>Sconto</th><th>Imponibile</th><th>IVA</th><th>Q.tà</th><th>Totale</th><th class="no-print">Azioni</th></tr></thead><tbody>${state.cart.map(item=>`<tr><td><span class="badge ${item.type==='Promo'?'orange':'green'}">${esc(item.type)}</span></td><td><strong>${esc(item.code)}</strong><br><small>${esc(item.name)}</small></td><td>${esc(item.description)}${item.meta?`<span class="muted">${esc(item.meta)}</span>`:''}</td><td>${fmtMoney(item.listUnit)}</td><td>${item.discountPercent}%</td><td>${fmtMoney(item.unitNet)}</td><td>${item.vatRate}%<span class="muted">${fmtMoney(item.unitVat)}</span></td><td><span class="qty-controls no-print"><button class="btn-secondary" data-qty="${item.rowId}" data-delta="-1">-</button><strong>${item.qty}</strong><button class="btn-secondary" data-qty="${item.rowId}" data-delta="1">+</button></span><span class="print-only">${item.qty}</span></td><td><strong>${fmtMoney(item.unitTotal*item.qty)}</strong></td><td class="no-print"><button class="btn-danger" data-remove="${item.rowId}">Rimuovi</button></td></tr>`).join('')}</tbody></table></div>
  <div class="price-line"><span>Totale imponibile ordine</span><strong>${fmtMoney(totals.taxable)}</strong></div>
  <div class="price-line"><span>Totale IVA</span><strong>${fmtMoney(totals.vat)}</strong></div>
  <div class="price-line"><span>Totale commessa IVA inclusa</span><strong>${fmtMoney(totals.total)}</strong></div>
  <div class="price-line"><span>Provvigione stimata sull'imponibile</span><strong>${fmtMoney(totals.commission)} (${averageCommission(totals).toFixed(2).replace('.',',')}%)</strong></div>
  <div class="nav-row no-print"><button class="btn-primary" id="printOrderBtn2">Stampa commessa d'ordine</button><button class="btn-ghost" id="saveDraftBtn2">Salva bozza</button><button class="btn-danger" id="clearCartBtn">Svuota carrello</button></div>`; }
function updateSummary(){ const c=calcPromo(); const totals=cartTotals(); $('livePromo').textContent=c.p.shortName||'-'; $('liveCartItems').textContent=`${totals.qty} articoli`; $('liveDiscount').textContent=state.shopDiscount===null?`${c.d}%`:`Shop ${state.shopDiscount}%`; $('liveCartTotal').textContent=fmtMoney(totals.total); $('cartBadge').textContent=totals.qty; $('heroCartCount').textContent=`${totals.qty} ${totals.qty===1?'articolo':'articoli'}`; $('heroCartTotal').textContent=fmtMoney(totals.total); $('sumRoof').textContent=roofLabel(val('promoRoofType')); $('sumBackup').textContent=val('backupMode')==='presente'?'Presente':'Non presente'; $('sumCommission').textContent=totals.taxable>0?`${averageCommission(totals).toFixed(2).replace('.',',')}%`:c.c+'%'; $('sumCommissionAmount').textContent=totals.taxable>0?fmtMoney(totals.commission):(c.p.basePrice>0?fmtMoney(c.commissionAmount):'Da definire'); }
function renderAll(){ updateDiscounts(); ensurePromo(); populateFilters(); refreshCartPricing(); renderPromos(); renderProducts(); renderCart(); updateSummary(); }
function saveDraft(){ const data={}; document.querySelectorAll('input,select,textarea').forEach(el=>{ if(el.type==='radio') data[el.name]=document.querySelector(`input[name="${el.name}"]:checked`)?.value; else if(el.id) data[el.id]=el.value; }); localStorage.setItem(STORAGE_KEY,JSON.stringify({data,cart:state.cart,selectedPromoId:state.selectedPromoId,shopDiscount:state.shopDiscount})); alert('Bozza salvata su questo dispositivo.'); }
function loadDraft(){ const raw=localStorage.getItem(STORAGE_KEY); if(!raw)return; try{ const s=JSON.parse(raw); state.cart=s.cart||[]; state.selectedPromoId=s.selectedPromoId||state.selectedPromoId; state.shopDiscount=(s.shopDiscount===undefined?null:s.shopDiscount); Object.entries(s.data||{}).forEach(([k,v])=>{ const el=$(k); if(el) el.value=v; else { const r=document.querySelector(`input[name="${k}"][value="${v}"]`); if(r) r.checked=true; } }); }catch(e){ console.warn(e); } }
function reset(){ if(confirm('Vuoi cancellare la simulazione corrente e ripartire da zero?')){ localStorage.removeItem(STORAGE_KEY); location.reload(); } }
function printOrder(){ if(!state.cart.length){ alert('Il carrello è vuoto. Aggiungi almeno un articolo.'); return; } setStep('cart'); setTimeout(()=>window.print(),250); }
function bindGlobal(){
  document.body.addEventListener('click',e=>{
    const t=e.target.closest('button,.hero-cart'); if(!t)return;
    if(t.dataset.step) setStep(t.dataset.step);
    if(t.dataset.selectPromo){ state.selectedPromoId=t.dataset.selectPromo; renderAll(); }
    if(t.dataset.addPromo) addPromo(t.dataset.addPromo, t);
    if(t.dataset.addProduct) addProduct(t.dataset.addProduct, t);
    if(t.dataset.toggle){ $(t.dataset.toggle)?.classList.toggle('open'); }
    if(t.dataset.qty) changeQty(t.dataset.qty,Number(t.dataset.delta));
    if(t.dataset.remove) removeItem(t.dataset.remove);
    if(t.dataset.discountChoice) applyShopDiscount(Number(t.dataset.discountChoice));
  });
  document.querySelectorAll('input,select,textarea').forEach(el=>el.addEventListener('change',()=>{ if(el.id==='roofType') $('promoRoofType').value=el.value; renderAll(); }));
  $('shopSearch').addEventListener('input',renderProducts);
  $('shopCategory').addEventListener('change',renderProducts);
  $('shopSystem').addEventListener('change',renderProducts);
  $('shopPhase').addEventListener('change',renderProducts);
  $('saveDraftBtn').addEventListener('click',saveDraft);
  $('newSimulationBtn').addEventListener('click',reset);
  $('printOrderBtn').addEventListener('click',printOrder);
  $('discountModalClose').addEventListener('click',closeDiscountModal);
  $('discountModal').addEventListener('click',e=>{ if(e.target.id==='discountModal') closeDiscountModal(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && $('discountModal').classList.contains('open')) closeDiscountModal(); });
  document.addEventListener('click',e=>{ if(e.target.id==='printOrderBtn2') printOrder(); if(e.target.id==='saveDraftBtn2') saveDraft(); if(e.target.id==='clearCartBtn') clearCart(); });
}
(function init(){ $('quoteDate').valueAsDate = new Date(); populateFilters(); loadDraft(); updateDiscounts(); ensurePromo(); bindGlobal(); renderAll(); })();
