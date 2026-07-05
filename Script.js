/* =========================================================
   HIMACHAL PRADESH — interactive 3D landing
   ========================================================= */

/* ---------- Scroll progress + nav ---------- */
const scrollProgress = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const pct = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
  scrollProgress.style.width = pct + '%';
}, { passive:true });

/* ---------- Cursor glow ---------- */
const glow = document.getElementById('cursorGlow');
let glowActive = false;
window.addEventListener('mousemove', (e) => {
  glow.style.left = e.clientX + 'px';
  glow.style.top = e.clientY + 'px';
  glow.style.opacity = 1;
});
window.addEventListener('mouseleave', () => glow.style.opacity = 0);

/* ---------- Paraglider follows cursor loosely within hero ---------- */
const hero = document.getElementById('hero');
const glider = document.getElementById('paraglider');
hero.addEventListener('mousemove', (e) => {
  const r = hero.getBoundingClientRect();
  const xPct = (e.clientX - r.left) / r.width;
  const yPct = (e.clientY - r.top) / r.height;
  glider.style.left = (10 + xPct * 55) + '%';
  glider.style.top = (10 + yPct * 40) + '%';
});

/* =========================================================
   THREE.JS LOW-POLY MOUNTAIN SCENE
   ========================================================= */
(function initScene(){
  const canvas = document.getElementById('mountainCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(hero.clientWidth, hero.clientHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1B2A4A, 0.028);

  const camera = new THREE.PerspectiveCamera(50, hero.clientWidth/hero.clientHeight, 0.1, 200);
  camera.position.set(0, 6, 26);

  // Lighting
  const ambient = new THREE.AmbientLight(0x8fa9c7, 0.7);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe3b0, 1.1);
  sun.position.set(-20, 25, 10);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8fc7e0, 0.4);
  rim.position.set(15, 10, -15);
  scene.add(rim);

  // Low-poly ridge generator
  function makeRidge(width, depth, segments, peakHeight, colorTop, colorBase, z, jitter){
    const geo = new THREE.PlaneGeometry(width, depth, segments, 6);
    geo.rotateX(-Math.PI/2);
    const pos = geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x = pos.getX(i);
      const zLocal = pos.getZ(i);
      const t = (x / width) + 0.5;
      const ridgeShape = Math.sin(t*Math.PI*3.1 + jitter) * 0.5 + Math.sin(t*Math.PI*7 + jitter*2)*0.2;
      const depthFactor = 1 - Math.abs(zLocal/(depth/2));
      let y = Math.max(0, ridgeShape) * peakHeight * depthFactor;
      y += (Math.random()-0.5) * peakHeight * 0.04;
      pos.setY(i, y);
    }
    geo.computeVertexNormals();

    const colTop = new THREE.Color(colorTop);
    const colBase = new THREE.Color(colorBase);
    const colors = [];
    for(let i=0;i<pos.count;i++){
      const y = pos.getY(i);
      const f = Math.min(1, y / peakHeight);
      const c = colBase.clone().lerp(colTop, f);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors:true, flatShading:true, roughness:0.9, metalness:0
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = z;
    return mesh;
  }

  const ridgeFar   = makeRidge(90, 30, 40, 9,  0xEAF2FA, 0x3a4f70, -30, 1.4);
  const ridgeMid   = makeRidge(80, 26, 36, 12, 0xF6F8FB, 0x2c4a5c, -14, 3.1);
  const ridgeNear  = makeRidge(70, 24, 32, 15, 0xE9EEF3, 0x1b2c22,  4, 5.6);
  scene.add(ridgeFar, ridgeMid, ridgeNear);

  // Snow particles
  const flakeCount = 260;
  const flakeGeo = new THREE.BufferGeometry();
  const flakePos = new Float32Array(flakeCount*3);
  for(let i=0;i<flakeCount;i++){
    flakePos[i*3]   = (Math.random()-0.5) * 90;
    flakePos[i*3+1] = Math.random() * 40;
    flakePos[i*3+2] = (Math.random()-0.5) * 50;
  }
  flakeGeo.setAttribute('position', new THREE.BufferAttribute(flakePos, 3));
  const flakeMat = new THREE.PointsMaterial({ color:0xffffff, size:0.18, transparent:true, opacity:0.75 });
  const flakes = new THREE.Points(flakeGeo, flakeMat);
  scene.add(flakes);

  // Mouse parallax target
  let mouseX = 0, mouseY = 0;
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    mouseX = ((e.clientX - r.left) / r.width) - 0.5;
    mouseY = ((e.clientY - r.top) / r.height) - 0.5;
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animate(){
    requestAnimationFrame(animate);

    if(!reduceMotion){
      camera.position.x += (mouseX * 6 - camera.position.x) * 0.03;
      camera.position.y += (6 - mouseY * 3 - camera.position.y) * 0.03;
      camera.lookAt(0, 4, -10);

      const pos = flakeGeo.attributes.position;
      for(let i=0;i<flakeCount;i++){
        let y = pos.getY(i) - 0.05;
        if(y < -2){ y = 40; }
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(y*0.1)*0.005);
      }
      pos.needsUpdate = true;

      ridgeFar.position.x = mouseX * 1.2;
      ridgeMid.position.x = mouseX * 2.4;
      ridgeNear.position.x = mouseX * 4;
    } else {
      camera.lookAt(0, 4, -10);
    }

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = hero.clientWidth / hero.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(hero.clientWidth, hero.clientHeight);
  });
})();

/* =========================================================
   STAT COUNTERS
   ========================================================= */
const statNums = document.querySelectorAll('.stat-num');
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      animateCount(entry.target);
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold:0.6 });
statNums.forEach(el => statObserver.observe(el));

function animateCount(el){
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1400;
  const start = performance.now();
  function tick(now){
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1-p, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* =========================================================
   3D TILT CARDS
   ========================================================= */
document.querySelectorAll('[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateY(${px*14}deg) rotateX(${-py*14}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateY(0deg) rotateX(0deg) translateY(0)';
  });
});

/* =========================================================
   SEASONS PANEL
   ========================================================= */
const seasonData = {
  spring: {
    temp: '8–22°C', title: 'Spring — March to May',
    text: 'Rhododendron forests turn the mid-hills scarlet, orchards blossom white across Kullu and Shimla, and melting snow feeds every stream back to full voice.'
  },
  summer: {
    temp: '15–30°C', title: 'Summer — June to July',
    text: 'The plains-heat escape season. Shimla and Manali fill up, while Spiti and Lahaul finally open their high passes after months of snow.'
  },
  monsoon: {
    temp: '18–26°C', title: 'Monsoon — July to September',
    text: 'The lower and mid hills turn deep green under steady rain, though landslide-prone roads make the trans-Himalayan cold desert — rain-shadowed and dry — the safer route.'
  },
  autumn: {
    temp: '5–20°C', title: 'Autumn — October to November',
    text: 'The clearest skies of the year. Walnut and apple harvests finish, the light turns gold on the deodars, and distant snow peaks sharpen into focus.'
  },
  winter: {
    temp: '-8–10°C', title: 'Winter — December to February',
    text: 'Snowfall closes the high passes and buries Kufri, Narkanda, and Solang in powder — ski season in the mid-hills, hard silence in the high valleys.'
  }
};

const seasonPanel = document.getElementById('seasonPanel');
function renderSeason(key){
  const d = seasonData[key];
  seasonPanel.innerHTML = `
    <div class="season-temp">${d.temp}</div>
    <div>
      <h3>${d.title}</h3>
      <p>${d.text}</p>
    </div>
  `;
}
renderSeason('spring');
document.querySelectorAll('.season-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderSeason(tab.dataset.season);
  });
});

/* =========================================================
   SCROLL REVEAL for section heads / cards
   ========================================================= */
const revealTargets = document.querySelectorAll('.dcard, .culture-card, .adv-card, .section-head');
revealTargets.forEach(el => {
  el.style.opacity = 0;
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity .7s ease, transform .7s ease';
});
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      entry.target.style.opacity = 1;
      entry.target.style.transform = 'translateY(0)';
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold:0.15 });
revealTargets.forEach(el => revealObserver.observe(el));