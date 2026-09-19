const DayRouteMap=(()=>{
	const $=id=>document.getElementById(id);
	const sleep=ms=>new Promise(r=>setTimeout(r,ms));
	let map=null,layer=null,renderToken=0,lastItems=[],lastContext="";

	function esc(v){return String(v??"").replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s]));}
	function extractCoords(raw){
		if(!raw)return null;
		let s=String(raw);
		try{s=decodeURIComponent(s)}catch(e){}
		let m=s.match(/@(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)/);
		if(m)return {lat:+m[1],lng:+m[2]};
		m=s.match(/[?&](?:query|q|destination|origin)=(-?\\d+(?:\\.\\d+)?),\\s*(-?\\d+(?:\\.\\d+)?)/i);
		if(m)return {lat:+m[1],lng:+m[2]};
		m=s.match(/!3d(-?\\d+(?:\\.\\d+)?).*?!4d(-?\\d+(?:\\.\\d+)?)/);
		if(m)return {lat:+m[1],lng:+m[2]};
		m=s.match(/!2d(-?\\d+(?:\\.\\d+)?).*?!3d(-?\\d+(?:\\.\\d+)?)/);
		if(m)return {lat:+m[2],lng:+m[1]};
		return null;
	}

	function queryFromUrl(raw){
		if(!raw)return "";
		try{
			const u=new URL(raw);
			for(const key of ["query","q","destination","origin"]){
				const v=u.searchParams.get(key);
				if(v&&!/^-?\\d+(?:\\.\\d+)?,\\s*-?\\d/.test(v))return v;
			}
			const p=decodeURIComponent(u.pathname||"");
			const m=p.match(/\\/place\\/([^/]+)/i);
			if(m)return m[1].replace(/\\+/g," ");
		}catch(e){}
		return "";
	}

	async function geocode(q){
		const key="travel-geocode:"+q.toLocaleLowerCase();
		try{
			const cached=JSON.parse(localStorage.getItem(key)||"null");
			if(cached&&Date.now()-cached.saved<1000*60*60*24*90)return cached.value;
		}catch(e){}
		const url="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q="+encodeURIComponent(q);
		const res=await fetch(url,{headers:{"Accept":"application/json"}});
		if(!res.ok)throw new Error("geocode");
		const rows=await res.json();
		if(!rows.length)return null;
		const value={lat:+rows[0].lat,lng:+rows[0].lon,display:rows[0].display_name};
		try{localStorage.setItem(key,JSON.stringify({saved:Date.now(),value}))}catch(e){}
		return value;
	}

	async function resolveItem(item,context,index){
		let pos=extractCoords(item.map_url);
		if(pos)return Object.assign({},item,pos,{index});
		const fromUrl=queryFromUrl(item.map_url);
		const base=(item.place||fromUrl||item.title||"").trim();
		if(!base)return null;
		const q=[base,context].filter(Boolean).join(", ");
		try{
			pos=await geocode(q);
			if(!pos&&context)pos=await geocode(base);
			return pos?Object.assign({},item,pos,{index}):null;
		}catch(e){return null}
	}

	function icon(n){
		return L.divIcon({className:"route-number-icon",html:'<div class="route-pin"><b>'+n+'</b></div>',iconSize:[32,32],iconAnchor:[16,31],popupAnchor:[0,-29]});
	}
	function fmtDistance(m){return m>=1000?(m/1000).toFixed(m>=10000?0:1)+" km":Math.round(m)+" m";}
	function fmtDuration(sec){
		const min=Math.round(sec/60);
		if(min<60)return min+"분";
		const h=Math.floor(min/60),r=min%60;
		return h+"시간"+(r?" "+r+"분":"");
	}

	async function roadRoute(points){
		if(points.length<2)return null;
		const coords=points.map(p=>p.lng+","+p.lat).join(";");
		const url="https://router.project-osrm.org/route/v1/driving/"+coords+"?overview=full&geometries=geojson&steps=false";
		try{
			const res=await fetch(url);
			if(!res.ok)return null;
			const data=await res.json();
			return data.code==="Ok"&&data.routes&&data.routes.length?data.routes[0]:null;
		}catch(e){return null}
	}

	function googleDirections(points){
		if(!points.length)return "";
		const label=p=>p.lat+","+p.lng;
		if(points.length===1)return points[0].map_url||("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(label(points[0])));
		const params=new URLSearchParams({api:"1",origin:label(points[0]),destination:label(points[points.length-1]),travelmode:"driving"});
		if(points.length>2)params.set("waypoints",points.slice(1,-1).map(label).join("|"));
		return "https://www.google.com/maps/dir/?"+params.toString();
	}

	function ensureMap(){
		if(map)return map;
		map=L.map("routeMap",{zoomControl:true,scrollWheelZoom:false});
		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
		layer=L.layerGroup().addTo(map);
		return map;
	}

	async function render(items,{context=""}={}){
		const token=++renderToken;
		const linked=(items||[]).filter(x=>x.map_url);
		const wrap=$("routeMapWrap"),empty=$("routeMapEmpty"),meta=$("routeMapMeta"),open=$("openDayRoute");
		if(!wrap||!empty)return;
		if(!linked.length){
			wrap.classList.add("hidden");
			empty.classList.remove("hidden");
			empty.textContent="Google Maps 링크가 있는 일정에 지도 경로가 표시됩니다.";
			if(open)open.classList.add("hidden");
			return;
		}
		empty.classList.remove("hidden");
		empty.textContent="지도 위치를 불러오는 중...";
		const points=[];
		for(let i=0;i<linked.length;i++){
			const p=await resolveItem(linked[i],context,i+1);
			if(token!==renderToken)return;
			if(p)points.push(p);
			if(i<linked.length-1)await sleep(1050);
		}
		if(token!==renderToken)return;
		if(!points.length){
			wrap.classList.add("hidden");
			empty.classList.remove("hidden");
			empty.textContent="링크에서 위치를 찾지 못했습니다. 일정의 장소명을 조금 더 정확하게 적어주세요.";
			if(open)open.classList.add("hidden");
			return;
		}
		empty.classList.add("hidden");
		wrap.classList.remove("hidden");
		const m=ensureMap();
		layer.clearLayers();
		const bounds=[];
		points.forEach((p,i)=>{
			const marker=L.marker([p.lat,p.lng],{icon:icon(i+1)}).addTo(layer);
			marker.bindPopup("<strong>"+(i+1)+". "+esc(p.title||p.place||"일정")+"</strong>"+(p.place?"<br>"+esc(p.place):""));
			bounds.push([p.lat,p.lng]);
		});
		const route=await roadRoute(points);
		if(token!==renderToken)return;
		if(route){
			const latlngs=route.geometry.coordinates.map(c=>[c[1],c[0]]);
			L.polyline(latlngs,{weight:5,opacity:.78}).addTo(layer);
			meta.innerHTML="<strong>"+points.length+"개 장소</strong><span>총 "+fmtDistance(route.distance)+"</span><span>운전 약 "+fmtDuration(route.duration)+"</span>";
			latlngs.forEach(x=>bounds.push(x));
		}else{
			L.polyline(points.map(p=>[p.lat,p.lng]),{weight:4,opacity:.65,dashArray:"8 8"}).addTo(layer);
			meta.innerHTML="<strong>"+points.length+"개 장소</strong><span>도로 경로를 불러오지 못해 위치를 직선으로 표시했습니다.</span>";
		}
		m.fitBounds(bounds,{padding:[28,28],maxZoom:14});
		setTimeout(()=>m.invalidateSize(),80);
		if(open){
			open.href=googleDirections(points);
			open.classList.remove("hidden");
		}
	}

	return {render};
})();
window.DayRouteMap=DayRouteMap;
