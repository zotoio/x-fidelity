import React,{useEffect,useState}from'react';
import{Modal,Input}from'antd';// Poor import formatting

// Second file to trigger codeRhythm-iterative rule with different patterns
interface User{id:number;name:string;email:string;}// No spacing

const InconsistentStyleComponent:React.FC=()=>
{// Inconsistent brace placement
const[users,setUsers]=useState<User[]>([]);
  const [modal, setModal] = useState( false );
    const[loading,setLoading]=useState(false);

// Inconsistent function formatting
const handleSubmit=async(userData:User)=>{
setLoading(true);
try{
    await new Promise(resolve=>setTimeout(resolve,1000));
setUsers(prev=>[...prev,userData]);
setModal(false);
}catch(error){
console.error(error);
  }finally {
      setLoading( false );
  }
};

// Mix of arrow and regular functions with poor formatting
function processUser(user:User){
if(user.id>0){
return{
...user,
processed:true,
timestamp:Date.now()
};
}else{
throw new Error('Invalid user ID');
}
}

const validateEmail=(email:string)=>{return email.includes('@')&&email.includes('.');}

// Poor indentation and spacing
useEffect(()=>{
const fetchUsers=async()=>{
try{
const response=await fetch('/api/users');
  const data = await response.json( );
    setUsers(data);
}catch(err){
console.error('Failed to fetch users',err);
}
};
fetchUsers();
},[]);

// Inconsistent object formatting
const userConfig={debug:true,retries:3,timeout:5000};
const apiSettings = {
  baseUrl: 'https://api.example.com',
    version: 'v1' ,
      headers:{
        'Content-Type':'application/json',
    'Authorization': 'Bearer token'
  }
};

// Poor conditional formatting
const renderUserList=()=>{
if(users.length===0){return<div>No users found</div>;}
else{
return(
<ul style={{listStyle:'none',padding:0}}>
{users.map(user=>
<li key={user.id}style={{margin:'5px',padding:'10px',border:'1px solid #ccc'}}>
<span>{user.name}</span>-<span>{user.email}</span>
</li>
)}
</ul>
);
}
};

return(
<div style={{padding:'20px',margin:'10px'}}>
<h2>Inconsistent Style Component</h2>
<p>This component has terrible code rhythm and formatting</p>

<button onClick={()=>setModal(true)}disabled={loading}>
{loading?'Loading...':'Add User'}
</button>

{renderUserList()}

<Modal
title="Add User"
open={modal}
onCancel={()=>setModal(false)}
footer={null}
>
<form onSubmit={(e)=>{
e.preventDefault();
const formData=new FormData(e.target as HTMLFormElement);
const newUser={
id:Date.now(),
name:formData.get('name')as string,
email:formData.get('email')as string
};
handleSubmit(newUser);
}}>
<Input name="name"placeholder="Name"required/>
<Input name="email"type="email"placeholder="Email"required/>
<button type="submit">Submit</button>
</form>
</Modal>
</div>
);
};

export default InconsistentStyleComponent; 