import type { Structure, Tissue } from './data';
import type { RegionPack } from './regions';
import { marked } from './html';
interface AtlasState {
 selected: string|null; multi: string[]; hovered: string|null;
 atlasRegion: string; atlasTypes: Set<Tissue>; onlyVisible: boolean; layers: Set<Tissue>;
}
export function createAtlasPanel(app: HTMLElement, pack: RegionPack, state: AtlasState,
 select: (id: string) => void, selectedConnectionHighlights: () => Set<string>, isDisposed: () => boolean) {
 const $ = <T extends HTMLElement = HTMLElement>(selector: string) => app.querySelector<T>(selector)!;
 const { structures, colors, atlasIds } = pack;
 const browsableStructures = structures.filter(d => d.tissue !== 'skin');
 const searchable = new Map(browsableStructures.map(d => [d.id, (d.name+' '+d.group+' '+d.description).toLowerCase()]));
 const counts = new Map<Tissue, number>();
 const groupedByTissue = new Map<Tissue, Map<string, Structure[]>>();
 for(const tissue of pack.atlasOrder) {
  const members = browsableStructures.filter(d=>d.tissue===tissue);
  counts.set(tissue, members.length);
  groupedByTissue.set(tissue,new Map([...new Set(members.map(d=>d.group))].sort().map(group=>[group,members.filter(d=>d.group===group).sort((a,b)=>a.name.localeCompare(b.name))])));
 }
const atlasOrder: Tissue[] = pack.atlasOrder.filter(tissue => tissue !== "skin");
const atlasNames = pack.atlasNames;
const collapsedTissues = new Set<string>();
try { for (const value of JSON.parse(localStorage.getItem('atlas-collapsed') || '[]')) if (atlasOrder.includes(value)) collapsedTissues.add(value); } catch {}
const isSelected = (id: string) => id === state.selected || state.multi.includes(id);
function renderList() {
  const focusedRow=(document.activeElement as HTMLElement)?.closest<HTMLButtonElement>('.structure-row')?.dataset.id;
  const q = $<HTMLInputElement>('#search').value.trim().toLowerCase();
  const ids = atlasIds(state.atlasRegion);
  const items = browsableStructures.filter(d => ids.has(d.id) && state.atlasTypes.has(d.tissue) && (!state.onlyVisible || state.layers.has(d.tissue)) && searchable.get(d.id)!.includes(q));
  $('#type-filters').innerHTML = atlasOrder.map(t => `<button data-atlas-type="${t}" aria-pressed="${state.atlasTypes.has(t)}"><i style="background:${colors[t]}"></i>${atlasNames[t]} <span>${counts.get(t) ?? 0}</span></button>`).join('');
  app.querySelectorAll<HTMLButtonElement>('[data-atlas-type]').forEach(b=>b.onclick=()=>{const t=b.dataset.atlasType as Tissue;state.atlasTypes.has(t)?state.atlasTypes.delete(t):state.atlasTypes.add(t);renderList();});
  $<HTMLSelectElement>('#atlas-area').value=state.atlasRegion;
  $<HTMLInputElement>('#only-visible').checked=state.onlyVisible;
  $('#list-count').textContent=`Showing ${items.length} of ${browsableStructures.length}`;
  $('#clear-filters').hidden=!q && state.atlasRegion==='all' && !state.onlyVisible && atlasOrder.every(t=>state.atlasTypes.has(t));
  const container=$('#structure-list');container.replaceChildren();
  const matched = new Set(items.map(item => item.id));
  for (const tissue of atlasOrder) {
    const members=items.filter(d=>d.tissue===tissue);if(!members.length)continue;
    const section=document.createElement('details');section.className='tissue-section';section.dataset.tissue=tissue;
    section.open=!!q || !collapsedTissues.has(tissue) || members.some(d=>isSelected(d.id));
    section.innerHTML=`<summary>${atlasNames[tissue]} <span>${members.length}</span></summary>`;
    section.ontoggle=()=>{if(q || isDisposed())return;section.open?collapsedTissues.delete(tissue):collapsedTissues.add(tissue);try{localStorage.setItem('atlas-collapsed',JSON.stringify([...collapsedTissues]));}catch{}};
    for(const [group, ordered] of groupedByTissue.get(tissue) ?? []) {
      const grouped=ordered.filter(d=>matched.has(d.id)); if(!grouped.length)continue;
      const heading=document.createElement('h3');heading.innerHTML=`${marked(group,q)} <span>${grouped.length}</span>`;section.append(heading);
      for(const d of grouped){const row=document.createElement('button');row.className='structure-row';row.dataset.id=d.id;row.innerHTML=`<i style="background:${colors[d.tissue]}"></i><span>${marked(d.name,q)}${q && !d.name.toLowerCase().includes(q) && d.description.toLowerCase().includes(q) ? `<small>${marked(d.description,q)}</small>` : ''}</span>`;row.onclick=()=>select(d.id);section.append(row);}
    }
    container.append(section);
  }
  if(!items.length)container.innerHTML='<p class="empty">No matches. Try another structure name or clear the filters.</p>';
  updateRows();
  if(focusedRow)app.querySelector<HTMLButtonElement>(`.structure-row[data-id="${focusedRow}"]`)?.focus({preventScroll:true});
}
let lastScrolledSelection: string | null = null;
function updateRows() {
  const highlighted=selectedConnectionHighlights();
  app.querySelectorAll<HTMLButtonElement>('.structure-row').forEach(b=>{
    const selected=isSelected(b.dataset.id!);
    b.classList.toggle('selected',selected);b.classList.toggle('connected',!selected&&highlighted.has(b.dataset.id!));b.classList.toggle('hovered',b.dataset.id===state.hovered);b.setAttribute('aria-pressed',String(selected));
    if(b.dataset.id===state.selected && lastScrolledSelection!==state.selected){b.closest('details')!.open=true;b.scrollIntoView({block:'nearest'});}
  });
  lastScrolledSelection=state.selected;
}
function clearFilters(){state.atlasRegion='all';state.atlasTypes=new Set(atlasOrder);state.onlyVisible=false;$<HTMLInputElement>('#search').value='';renderList();}
$('#clear-filters').onclick=clearFilters;
$<HTMLSelectElement>('#atlas-area').onchange=e=>{state.atlasRegion=(e.target as HTMLSelectElement).value;renderList();};
$<HTMLInputElement>('#only-visible').onchange=e=>{state.onlyVisible=(e.target as HTMLInputElement).checked;renderList();};
$('#structure-list').onkeydown=e=>{
  if(!['ArrowUp','ArrowDown','Enter'].includes(e.key))return;
  const rows=[...app.querySelectorAll<HTMLButtonElement>('.tissue-section[open] .structure-row')];
  const current=rows.indexOf(document.activeElement as HTMLButtonElement);
  if(e.key==='Enter'){if(current>=0){e.preventDefault();rows[current].click();}return;}
  e.preventDefault();const next=current<0?0:Math.max(0,Math.min(rows.length-1,current+(e.key==='ArrowDown'?1:-1)));rows[next]?.focus();
};

 return { renderList, updateRows, clearFilters };
}
