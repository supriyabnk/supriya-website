/* 3D background (Three.js) */
(function () {
  const canvas = document.getElementById('bg3d');
  if (!canvas || typeof THREE === 'undefined') return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Phones/tablets only: the browser address bar slides in/out while scrolling and fires
  // constant resize events. We lock the canvas size so the page never jumps. Desktop is untouched.
  const mobile = matchMedia('(pointer: coarse)').matches && matchMedia('(hover: none)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.z = 14;

  const mk = (geo, color, op) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: op }));
  const ico = mk(new THREE.IcosahedronGeometry(3.2, 1), 0x2dd4bf, .35); ico.position.set(6, 1, -4);
  const knot = mk(new THREE.TorusKnotGeometry(1.6, .45, 120, 16), 0x6366f1, .35); knot.position.set(-7, -2, -3);
  const oct = mk(new THREE.OctahedronGeometry(1.6), 0xf5b942, .4); oct.position.set(-3, 4.5, -2);
  scene.add(ico, knot, oct);

  const N = 900, pos = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - .5) * 60;
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pm = new THREE.PointsMaterial({ color: 0x9fb4ff, size: .07, transparent: true, opacity: .8 });
  const pts = new THREE.Points(pg, pm);
  scene.add(pts);

  let lastW = 0;
  const resize = () => {
    if (mobile) {
      if (innerWidth === lastW) return;          // ignore height-only changes (address bar)
      lastW = innerWidth;
      const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    } else {
      renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    }
  };
  resize(); addEventListener('resize', resize);

  let mx = 0, my = 0, sy = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
  addEventListener('scroll', () => sy = scrollY, { passive: true });

  const recolor = () => {
    const light = document.documentElement.dataset.theme === 'light';
    pm.color.set(light ? 0x3b4a85 : 0x9fb4ff);
    [ico, knot, oct].forEach(m => m.material.opacity = light ? .5 : .35);
  };
  recolor(); addEventListener('themechange', recolor);

  const clock = new THREE.Clock();
  (function loop() {
    const t = clock.getElapsedTime();
    if (!reduce) {
      ico.rotation.x = t * .15; ico.rotation.y = t * .2;
      knot.rotation.x = t * .2; knot.rotation.y = t * .12;
      oct.rotation.y = t * .35; oct.rotation.z = t * .15;
      pts.rotation.y = t * .015;
    }
    camera.position.x += (mx * 3 - camera.position.x) * .04;
    camera.position.y += (-my * 2 - sy * .004 - camera.position.y) * .04;
    camera.lookAt(0, -sy * .002, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
})();
