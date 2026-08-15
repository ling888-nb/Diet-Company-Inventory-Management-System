const n=(e,t="-")=>{if(!e)return t;const r=new Date(e);return Number.isNaN(r.getTime())?t:r.toLocaleDateString("zh-CN")};export{n as f};
