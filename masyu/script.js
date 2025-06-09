const n = 3;
const cellSize = 80;
const margin = 20;

const circles = [
  ['B','W','B'],
  ['W',null,'W'],
  ['B','W','B']
];

const hor = Array.from({length:n+1},()=>Array(n).fill(false));
const ver = Array.from({length:n},()=>Array(n+1).fill(false));

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
canvas.width = cellSize*n + margin*2;
canvas.height = cellSize*n + margin*2;

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#888';
  ctx.lineWidth=1;
  for(let i=0;i<=n;i++){
    const y=margin+i*cellSize;
    ctx.beginPath();
    ctx.moveTo(margin,y);
    ctx.lineTo(margin+n*cellSize,y);
    ctx.stroke();
  }
  for(let j=0;j<=n;j++){
    const x=margin+j*cellSize;
    ctx.beginPath();
    ctx.moveTo(x,margin);
    ctx.lineTo(x,margin+n*cellSize);
    ctx.stroke();
  }
  for(let i=0;i<n;i++){
    for(let j=0;j<n;j++){
      const c=circles[i][j];
      if(!c)continue;
      const x=margin+j*cellSize+cellSize/2;
      const y=margin+i*cellSize+cellSize/2;
      ctx.beginPath();
      ctx.arc(x,y,cellSize*0.2,0,Math.PI*2);
      if(c==='B'){
        ctx.fillStyle='#000';
        ctx.fill();
      }else{
        ctx.fillStyle='#fff';
        ctx.fill();
        ctx.strokeStyle='#000';
        ctx.stroke();
      }
    }
  }
  ctx.strokeStyle='#6c63ff';
  ctx.lineWidth=4;
  for(let i=0;i<=n;i++){
    for(let j=0;j<n;j++){
      if(hor[i][j]){
        const x1=margin+j*cellSize;
        const y=margin+i*cellSize;
        const x2=margin+(j+1)*cellSize;
        ctx.beginPath();
        ctx.moveTo(x1,y);
        ctx.lineTo(x2,y);
        ctx.stroke();
      }
    }
  }
  for(let i=0;i<n;i++){
    for(let j=0;j<=n;j++){
      if(ver[i][j]){
        const x=margin+j*cellSize;
        const y1=margin+i*cellSize;
        const y2=margin+(i+1)*cellSize;
        ctx.beginPath();
        ctx.moveTo(x,y1);
        ctx.lineTo(x,y2);
        ctx.stroke();
      }
    }
  }
}

draw();

function toggleEdge(x,y){
  const tol=cellSize*0.3;
  for(let i=0;i<=n;i++){
    const y0=margin+i*cellSize;
    if(Math.abs(y-y0)<tol){
      for(let j=0;j<n;j++){
        const x1=margin+j*cellSize;
        const x2=margin+(j+1)*cellSize;
        if(x>=x1-tol && x<=x2+tol){
          hor[i][j]=!hor[i][j];
          return true;
        }
      }
    }
  }
  for(let j=0;j<=n;j++){
    const x0=margin+j*cellSize;
    if(Math.abs(x-x0)<tol){
      for(let i=0;i<n;i++){
        const y1=margin+i*cellSize;
        const y2=margin+(i+1)*cellSize;
        if(y>=y1-tol && y<=y2+tol){
          ver[i][j]=!ver[i][j];
          return true;
        }
      }
    }
  }
  return false;
}

canvas.addEventListener('click',e=>{
  const r=canvas.getBoundingClientRect();
  const x=e.clientX-r.left;
  const y=e.clientY-r.top;
  if(toggleEdge(x,y)){
    draw();
    if(checkSolved()){
      Timer.stop();
      document.getElementById('timerDisplay').classList.add('solved');
      setTimeout(()=>alert('Solved!'),50);
    }
  }
});

document.getElementById('resetBtn').addEventListener('click',()=>{
  for(let i=0;i<=n;i++)for(let j=0;j<n;j++)hor[i][j]=false;
  for(let i=0;i<n;i++)for(let j=0;j<=n;j++)ver[i][j]=false;
  Timer.reset();
  Timer.start();
  document.getElementById('timerDisplay').classList.remove('solved');
  draw();
});

function cellEdges(r,c){
  return{top:hor[r][c],bottom:hor[r+1][c],left:ver[r][c],right:ver[r][c+1]};
}

function cellType(r,c){
  const e=cellEdges(r,c);
  const cnt=e.top+e.bottom+e.left+e.right;
  if(cnt!==2)return null;
  if(e.left&&e.right)return{kind:'straight',dir:'h'};
  if(e.top&&e.bottom)return{kind:'straight',dir:'v'};
  if(e.top&&e.right)return{kind:'turn',dirs:['top','right']};
  if(e.right&&e.bottom)return{kind:'turn',dirs:['right','bottom']};
  if(e.bottom&&e.left)return{kind:'turn',dirs:['bottom','left']};
  if(e.left&&e.top)return{kind:'turn',dirs:['left','top']};
  return null;
}

function edgesCount(){
  let c=0;
  for(let i=0;i<=n;i++)for(let j=0;j<n;j++)if(hor[i][j])c++;
  for(let i=0;i<n;i++)for(let j=0;j<=n;j++)if(ver[i][j])c++;
  return c;
}

function nodeNeighbors(i,j){
  const a=[];
  if(i>0&&ver[i-1][j])a.push([i-1,j]);
  if(i<n&&ver[i][j])a.push([i+1,j]);
  if(j>0&&hor[i][j-1])a.push([i,j-1]);
  if(j<n&&hor[i][j])a.push([i,j+1]);
  return a;
}

function checkConnectivity(){
  const visited=new Set();
  let start=null;
  for(let i=0;i<=n;i++){
    for(let j=0;j<=n;j++){
      const deg=nodeNeighbors(i,j).length;
      if(deg===1||deg>2)return false;
      if(deg>0&&!start)start=[i,j];
    }
  }
  if(!start)return false;
  const stack=[start];
  visited.add(start.toString());
  let edgeVisited=0;
  while(stack.length){
    const [i,j]=stack.pop();
    for(const [ni,nj] of nodeNeighbors(i,j)){
      const key=ni+','+nj;
      if(!visited.has(key)){
        visited.add(key);
        stack.push([ni,nj]);
      }
      edgeVisited++;
    }
  }
  edgeVisited/=2;
  return edgeVisited===edgesCount();
}

function checkCircles(){
  for(let i=0;i<n;i++){
    for(let j=0;j<n;j++){
      const type=circles[i][j];
      if(!type)continue;
      const ct=cellType(i,j);
      if(!ct)return false;
      if(type==='W'){
        if(ct.kind!=='straight')return false;
        const neigh=ct.dir==='h'?[[i,j-1],[i,j+1]]:[[i-1,j],[i+1,j]];
        let ok=false;
        for(const [ni,nj] of neigh){
          if(ni<0||ni>=n||nj<0||nj>=n)continue;
          const nt=cellType(ni,nj);
          if(nt&&nt.kind==='turn')ok=true;
        }
        if(!ok)return false;
      }else if(type==='B'){
        if(ct.kind!=='turn')return false;
        const map={
          'top,right':[[i-1,j,'v'],[i,j+1,'h']],
          'right,bottom':[[i,j+1,'h'],[i+1,j,'v']],
          'bottom,left':[[i+1,j,'v'],[i,j-1,'h']],
          'left,top':[[i,j-1,'h'],[i-1,j,'v']]
        };
        const key=ct.dirs.sort().join(',');
        const req=map[key];
        for(const [ni,nj,dir] of req){
          if(ni<0||ni>=n||nj<0||nj>=n)return false;
          const nt=cellType(ni,nj);
          if(!nt||nt.kind!=='straight'||nt.dir!==dir)return false;
        }
      }
    }
  }
  return true;
}

function checkSolved(){
  return checkConnectivity()&&checkCircles();
}

Timer.reset();
Timer.start();
