const CAT_COLORS = { Electronics:'#00d4ff', Clothing:'#7c3aed', 'Food & Beverage':'#00e676', Books:'#ffd740', Sports:'#ff5252', 'Home & Decor':'#ff6d00', Other:'#5c7a9e' };
const CAT_ICONS  = { Electronics:'💻', Clothing:'👕', 'Food & Beverage':'🍔', Books:'📚', Sports:'⚽', 'Home & Decor':'🏠', Other:'📦' };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let sales = JSON.parse(localStorage.getItem('sad_sales') || '[]');
let currentFilter = 'all';

document.getElementById('header-date').textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
document.getElementById('s-date').value = new Date().toISOString().split('T')[0];

function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  render();
}

function getFiltered() {
  const now = new Date();
  return sales.filter(s => {
    const d = new Date(s.date);
    if (currentFilter === 'today') return d.toDateString() === now.toDateString();
    if (currentFilter === 'week')  return (now - d) <= 7*24*60*60*1000;
    if (currentFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });
}

function addSale() {
  const product  = document.getElementById('s-product').value.trim();
  const amount   = parseFloat(document.getElementById('s-amount').value);
  const category = document.getElementById('s-category').value;
  const date     = document.getElementById('s-date').value;
  if (!product || isNaN(amount) || amount <= 0) { alert('Fill product name and valid amount.'); return; }
  sales.unshift({ id: Date.now(), product, amount, category, date });
  localStorage.setItem('sad_sales', JSON.stringify(sales));
  document.getElementById('s-product').value = '';
  document.getElementById('s-amount').value  = '';
  render();
}

function fmt(n) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

function render() {
  const filtered = getFiltered();
  const total    = filtered.reduce((a,s) => a+s.amount, 0);
  const avg      = filtered.length ? total/filtered.length : 0;

  document.getElementById('kpi-revenue').textContent    = fmt(total);
  document.getElementById('kpi-sales').textContent      = filtered.length;
  document.getElementById('kpi-rev-change').textContent = filtered.length + ' sale' + (filtered.length!==1?'s':'');
  document.getElementById('kpi-avg').textContent        = 'Avg ' + fmt(avg);

  const catTotals  = {};
  filtered.forEach(s => { catTotals[s.category] = (catTotals[s.category]||0) + s.amount; });
  const sortedCats = Object.entries(catTotals).sort((a,b) => b[1]-a[1]);
  if (sortedCats.length > 0) {
    document.getElementById('kpi-top-cat').textContent = (CAT_ICONS[sortedCats[0][0]]||'📦') + ' ' + sortedCats[0][0];
    document.getElementById('kpi-top-pct').textContent = total > 0 ? ((sortedCats[0][1]/total)*100).toFixed(0)+'% of revenue' : '—';
  } else {
    document.getElementById('kpi-top-cat').textContent = '—';
    document.getElementById('kpi-top-pct').textContent = '—';
  }

  const prodTotals = {};
  filtered.forEach(s => { prodTotals[s.product] = (prodTotals[s.product]||0)+s.amount; });
  const sortedProds = Object.entries(prodTotals).sort((a,b) => b[1]-a[1]);
  document.getElementById('kpi-best-prod').textContent = sortedProds.length>0 ? sortedProds[0][0] : '—';

  // Bar chart
  const monthlyTotals = {};
  sales.forEach(s => {
    const d = new Date(s.date);
    const key = MONTHS[d.getMonth()] + ' ' + d.getFullYear().toString().slice(2);
    monthlyTotals[key] = (monthlyTotals[key]||0)+s.amount;
  });
  const monthEntries = Object.entries(monthlyTotals).slice(-6);
  const barEl = document.getElementById('bar-chart');
  if (!monthEntries.length) {
    barEl.innerHTML = '<div class="empty" style="width:100%">No data yet.</div>';
  } else {
    const maxVal = Math.max(...monthEntries.map(e => e[1]));
    barEl.innerHTML = monthEntries.map(([month, val]) => {
      const h = Math.max(8, (val/maxVal*100).toFixed(1));
      return `<div class="bar-group">
        <div class="bar-wrap"><div class="bar" style="height:${h}%;background:linear-gradient(180deg,var(--accent),var(--accent2))" title="${month}: ${fmt(val)}"></div></div>
        <div class="bar-label">${month.split(' ')[0]}</div>
      </div>`;
    }).join('');
  }

  // Donut
  document.getElementById('donut-total').textContent = fmt(total);
  const donutEl  = document.getElementById('donut-arcs');
  const legendEl = document.getElementById('donut-legend');
  if (!sortedCats.length) { donutEl.innerHTML=''; legendEl.innerHTML='<div class="empty">No data.</div>'; }
  else {
    const r = 38, circ = 2*Math.PI*r;
    let offset = 0;
    donutEl.innerHTML = sortedCats.map(([cat,val]) => {
      const pct  = total>0 ? val/total : 0;
      const dash = pct*circ;
      const el   = `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${CAT_COLORS[cat]||'#888'}" stroke-width="18" stroke-dasharray="${dash} ${circ-dash}" stroke-dashoffset="${-offset}"/>`;
      offset += dash; return el;
    }).join('');
    legendEl.innerHTML = sortedCats.slice(0,4).map(([cat,val]) => `
      <div class="legend-row">
        <div class="legend-dot" style="background:${CAT_COLORS[cat]||'#888'}"></div>
        <div class="legend-name">${cat}</div>
        <div class="legend-pct">${total>0?((val/total)*100).toFixed(0):0}%</div>
      </div>`).join('');
  }

  // Recent sales
  const recentEl = document.getElementById('recent-sales');
  if (!filtered.length) { recentEl.innerHTML='<div class="empty">No sales in this period.</div>'; return; }
  recentEl.innerHTML = filtered.slice(0,8).map(s => `
    <div class="sale-row">
      <div class="sale-icon" style="background:${CAT_COLORS[s.category]||'#888'}22">${CAT_ICONS[s.category]||'📦'}</div>
      <div class="sale-info"><div class="s-name">${s.product}</div><div class="s-meta">${s.category} · ${s.date}</div></div>
      <div class="sale-right"><div class="s-amt">${fmt(s.amount)}</div></div>
    </div>`).join('');
}

render();
