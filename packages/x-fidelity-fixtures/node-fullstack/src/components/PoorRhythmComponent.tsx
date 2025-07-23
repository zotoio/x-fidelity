import React,{useState,useEffect}from'react';

// This component has poor code rhythm and should trigger the codeRhythm-iterative rule
// Inconsistent spacing, mixed styles, poor readability

export function PoorRhythmComponent({items,loading,onItemClick}:any){
const[selectedItems,setSelectedItems]=useState<string[]>([]);
const[filter,setFilter]=useState('');

// Inconsistent spacing and formatting
useEffect(()=>{
if(loading){
console.log('Loading items...');
}else{
if(items&&items.length>0){
console.log('Items loaded:',items.length);
}
}
},[loading,items]);

// Poor nesting and complex logic
const processItems=(items:any[])=>{
let result=[];
for(let i=0;i<items.length;i++){
if(items[i]){
if(items[i].active){
if(items[i].category==='important'){
if(items[i].status==='pending'){
if(items[i].priority>5){
result.push({
...items[i],
processed:true,
timestamp:Date.now()
});
}
}
}
}
}
}
return result;
};

const handleItemSelection=(itemId:string)=>{
if(selectedItems.includes(itemId)){
setSelectedItems(prev=>prev.filter(id=>id!==itemId));
}else{
setSelectedItems(prev=>[...prev,itemId]);
}
};

// Mixed code styles and poor formatting
const filteredItems=items?items.filter((item:any)=>{
if(!filter)return true;
if(item.name&&item.name.toLowerCase().includes(filter.toLowerCase()))return true;
if(item.description&&item.description.toLowerCase().includes(filter.toLowerCase()))return true;
return false;
}):[];

const processedItems=processItems(filteredItems);

return(
<div className="poor-rhythm-component">
<div className="header">
<h2>Poor Rhythm Component</h2>
<input type="text"value={filter}onChange={(e)=>setFilter(e.target.value)}placeholder="Filter items"/>
</div>
<div className="content">
{loading?(
<div>Loading...</div>
):(
<div>
{processedItems.map((item:any)=>(
<div key={item.id}className={`item ${selectedItems.includes(item.id)?'selected':''}`}onClick={()=>{
handleItemSelection(item.id);
onItemClick&&onItemClick(item);
}}>
<div className="item-header">
<span className="item-name">{item.name}</span>
<span className="item-status">{item.status}</span>
</div>
<div className="item-body">
<p>{item.description}</p>
{item.metadata&&(
<div className="metadata">
{Object.entries(item.metadata).map(([key,value]:any)=>(
<span key={key}className="metadata-item">{key}:{typeof value==='object'?JSON.stringify(value):value}</span>
))}
</div>
)}
</div>
{item.actions&&item.actions.length>0&&(
<div className="item-actions">
{item.actions.map((action:any,index:number)=>(
<button key={index}onClick={(e)=>{
e.stopPropagation();
if(action.handler){
action.handler(item);
}
}}>{action.label}</button>
))}
</div>
)}
</div>
))}
</div>
)}
</div>
<div className="footer">
<span>Selected: {selectedItems.length}</span>
<span>Total: {processedItems.length}</span>
</div>
</div>
);
} 