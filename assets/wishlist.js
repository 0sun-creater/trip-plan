const TripWishlist=(()=>{
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function safeUrl(v){const s=String(v||'').trim();if(!s)return'';try{const u=new URL(s);return /^https?:$/.test(u.protocol)?u.href:''}catch(e){return''}}
async function init(){
  const cfg=window.TRAVEL_CONFIG||{},tripId=new URLSearchParams(location.search).get('id');
  const box=document.getElementById('wishlistList'),add=document.getElementById('addWishlist'),form=document.getElementById('wishlistForm'),modal=document.getElementById('wishlistModal');
  if(!tripId||!box||!window.supabase||!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY)return;
  const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
  const [{data:{session}},{data:trip}]=await Promise.all([db.auth.getSession(),db.from('trips').select('owner_id').eq('id',tripId).single()]);
  const canEdit=!!session?.user&&session.user.id===trip?.owner_id;
  if(add)add.classList.toggle('hidden',!canEdit);
  const close=()=>modal?.classList.add('hidden');
  async function render(){
    const {data,error}=await db.from('trip_wishlist').select('*').eq('trip_id',tripId).order('created_at');
    if(error){box.innerHTML='<div class="wishlist-empty">가고 싶은 곳을 불러오지 못했습니다.</div>';return}
    const rows=data||[];
    box.innerHTML=rows.length?rows.map(x=>{const url=safeUrl(x.url);return `<div class="wishlist-item"><div class="wishlist-copy"><div class="wishlist-name">${url?`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(x.name)} <span>↗</span></a>`:esc(x.name)}</div>${x.note?`<div class="wishlist-note">${esc(x.note)}</div>`:''}</div>${canEdit?`<button class="wishlist-delete" data-wishlist-delete="${x.id}" aria-label="삭제" title="삭제">×</button>`:''}</div>`}).join(''):'<div class="wishlist-empty">아직 저장한 곳이 없습니다.</div>';
    box.querySelectorAll('[data-wishlist-delete]').forEach(btn=>btn.onclick=async()=>{if(!confirm('이 링크를 삭제할까요?'))return;const {error}=await db.from('trip_wishlist').delete().eq('id',btn.dataset.wishlistDelete);if(error)return alert(error.message);render()});
  }
  if(add)add.onclick=()=>{form.reset();modal.classList.remove('hidden')};
  form?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(form),name=String(f.get('name')||'').trim(),url=String(f.get('url')||'').trim(),note=String(f.get('note')||'').trim();if(!name)return;const {error}=await db.from('trip_wishlist').insert({trip_id:tripId,owner_id:session.user.id,name,url:url||null,note});if(error)return alert(error.message);form.reset();close();render()});
  modal?.addEventListener('click',e=>{if(e.target===modal||e.target.matches('[data-wishlist-close]'))close()});
  await render();
}
return{init};
})();
window.TripWishlist=TripWishlist;
