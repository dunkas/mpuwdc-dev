// Preserve the area the member/staff opened a resource from.
const sections={education:{url:'/voter-education/',label:'← Back to Voter Education'},admin:{url:'/admin/',label:'← EC Admin Center'},finance:{url:'/finance/',label:'← Financial Portal'}};
const params=new URLSearchParams(location.search);let area=params.get('from');
if(!sections[area])area=location.pathname.startsWith('/admin/')?'admin':location.pathname.startsWith('/voter-education/')?'education':null;
if(area){const target=sections[area];let nav=document.querySelector('header nav');if(!nav){nav=document.createElement('nav');nav.className='nav';nav.style.padding='12px';document.body.prepend(nav)}if(location.pathname!==target.url){const link=document.createElement('a');link.href=target.url;link.textContent=target.label;link.className='btn gold';link.dataset.sectionReturn=area;nav.prepend(link)}
 for(const link of document.querySelectorAll('a[href]')){if(link.hasAttribute('download'))continue;const url=new URL(link.href,location.href);if(url.origin!==location.origin||url.pathname==='/'||Object.values(sections).some(s=>s.url===url.pathname)||/\.(pdf|docx|png|jpe?g)$/i.test(url.pathname))continue;if(url.pathname===location.pathname&&url.search===location.search)continue;url.searchParams.set('from',area);link.href=url.pathname+url.search+url.hash;link.removeAttribute('target')}
}
