const EnsureDays=(()=>{
function dateRange(start,end){const out=[];if(!start||!end||end<start)return out;for(let d=new Date(start+'T00:00:00Z'),last=new Date(end+'T00:00:00Z');d<=last;d.setUTCDate(d.getUTCDate()+1))out.push(d.toISOString().slice(0,10));return out}
async function run(){
	const cfg=window.TRAVEL_CONFIG||{},tripId=new URLSearchParams(location.search).get('id');
	if(!tripId||!window.supabase||!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY)return {ok:false,reason:'config'};
	const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
	const {data:{session},error:sessionError}=await db.auth.getSession();
	if(sessionError||!session?.user)return {ok:false,reason:'auth',error:sessionError};
	const {data:trip,error:tripError}=await db.from('trips').select('id,owner_id,start_date,end_date').eq('id',tripId).single();
	if(tripError||!trip)return {ok:false,reason:'trip',error:tripError};
	if(trip.owner_id!==session.user.id)return {ok:false,reason:'owner'};
	const wanted=dateRange(trip.start_date,trip.end_date);
	if(!wanted.length)return {ok:false,reason:'date'};
	const {data:existing,error:dayReadError}=await db.from('days').select('id,date,title').eq('trip_id',tripId).order('date').order('created_at');
	if(dayReadError)return {ok:false,reason:'read',error:dayReadError};
	const existingDates=new Set((existing||[]).map(x=>x.date)),missing=wanted.filter(date=>!existingDates.has(date));
	for(const date of missing){
		const {error}=await db.from('days').insert({trip_id:tripId,owner_id:session.user.id,date,title:'Day',place:'',summary:''});
		if(error){console.error('자동 Day 생성 실패:',date,error);alert(`Day 일정 자동 생성에 실패했습니다.\n${date}: ${error.message}`);return {ok:false,reason:'insert',error}}
	}
	const {data:all,error:allError}=await db.from('days').select('id,title,date').eq('trip_id',tripId).order('date').order('created_at');
	if(allError)return {ok:false,reason:'read-after',error:allError};
	for(let i=0;i<(all||[]).length;i++){
		const title=`Day ${i+1}`;
		if(all[i].title!==title){const {error}=await db.from('days').update({title}).eq('id',all[i].id);if(error)return {ok:false,reason:'rename',error}}
	}
	return {ok:true,created:missing.length,total:(all||[]).length};
}
return{run}
})();
window.EnsureDays=EnsureDays;