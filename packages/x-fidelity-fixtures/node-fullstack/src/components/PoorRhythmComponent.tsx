import React,{useState,useEffect}from 'react';
import{Button}from 'antd';
// Poor formatting and inconsistent style to trigger codeRhythm rule

interface Data{id:string;name:string;}

const PoorRhythmComponent:React.FC=()=>{
const[items,setItems]=useState<Data[]>([]);
const[loading,setLoading]=useState(false);
const [count,setCount ] = useState( 0 );

// Inconsistent indentation and spacing
useEffect(()=>
{
if(loading){
console.log('loading...');
}else{
    console.log('not loading');
        if(items.length>0)
    {
        console.log( 'has items' );
            for(let i=0;i<items.length;i++){
                const item=items[i];
if(item.id==='special'){
console.log('found special item');
break;
}
            }
}
}
},[loading,items]);

// More inconsistent formatting
const handleClick=()=>{
    setLoading(true);
setTimeout(()=>{
const newItems=[
{id:'1',name:'Item 1'},
    {id: '2', name: 'Item 2' },
        { id : '3' , name : 'Item 3' }
];
        setItems(newItems);
            setLoading(false);
},1000);
};

const processItems=(items:Data[])=>{
return items.map(item=>
{
return{
...item,
processed:true,
    timestamp:Date.now()
};
}).filter(item=>
    item.id!=='exclude'
);
};

// Inconsistent spacing and formatting
return(
<div style={{padding:'10px',margin:'5px'}}>
<h3>Poor Rhythm Component</h3>
        <p>This component has intentionally poor code rhythm</p>
    <Button onClick={handleClick} loading={loading}
        type="primary"
    >
Load Items
    </Button>
    
<div style={{marginTop:'20px'}}>
{items.length>0&&(
<ul>
{items.map(item=>(
    <li key={item.id} style={{listStyle:'none',padding:'2px'}}>
        {item.name}
            </li>
))}
</ul>
)}
    </div>
        
        <div>
Count: {count}
<Button onClick={()=>setCount(count+1)} size="small">+</Button>
            <Button onClick={()=>setCount(count-1)} size="small">-</Button>
</div>
</div>
);
};

export default PoorRhythmComponent; 