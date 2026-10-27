import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const base=new URL('./',import.meta.url);
createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;const relative=path==='/'?'preview.html':decodeURIComponent(path.slice(1));if(relative.includes('..'))throw Error();const file=new URL(relative,base);const data=await readFile(file);res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css'})[relative.split('.').pop()]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${process.env.PORT||4173}/#studentmyday/progress`));
