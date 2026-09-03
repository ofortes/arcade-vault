// Puerto a TypeScript de references/started-games/02-asteroids/game.js
// Misma física/constantes que el original, incluyendo drawHUD/drawOverlay
// (el motor sigue dibujando su propio HUD y overlay de game-over dentro del
// canvas); en paralelo reporta el mismo estado a React vía AsteroidsCallbacks.
// El ciclo de vida (listeners, requestAnimationFrame) queda controlado por
// mount/destroy en vez de ejecutarse una sola vez al cargar el script.

export interface AsteroidsCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export interface AsteroidsGameHandle {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  destroy: () => void;
}

const W = 800;
const H = 600;

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];
const POINTS = [0, 100, 50, 20];

// Formas fijas para asteroides grandes (tamaño 3), como en el arcade original.
const LARGE_ASTEROID_SHAPES: [number, number][][] = [
  [
    [-1.706, 0.957],
    [-1.072, 0.864],
    [-0.559, 0.383],
    [-0.093, 0.871],
    [0.595, 0.859],
    [1.021, 0.596],
    [1.563, 0.901],
    [2.351, 0.905],
    [3.121, 0.996],
    [3.714, 1.0],
  ],
  [
    [0, 1.0],
    [0.7, 0.85],
    [1.3, 0.95],
    [2.0, 0.7],
    [2.6, 0.9],
    [3.3, 0.75],
    [3.9, 0.95],
    [4.6, 0.8],
    [5.3, 0.9],
  ],
  [
    [0, 0.9],
    [0.55, 0.6],
    [1.1, 0.95],
    [1.7, 0.8],
    [2.2, 1.0],
    [2.8, 0.65],
    [3.4, 0.9],
    [3.9, 0.75],
    [4.4, 0.95],
    [4.9, 0.7],
    [5.6, 0.85],
  ],
  [
    [0, 0.8],
    [0.9, 1.0],
    [1.7, 0.65],
    [2.4, 0.9],
    [3.2, 0.75],
    [3.9, 1.0],
    [4.7, 0.6],
    [5.5, 0.85],
  ],
];

const POWERUP_TIME_THRESHOLD = 20;
const POWERUP_LIFESPAN = 12;

class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][];

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    if (size === 3) {
      const shape =
        LARGE_ASTEROID_SHAPES[randInt(0, LARGE_ASTEROID_SHAPES.length - 1)];
      this.verts = shape.map(([a, r]) => [
        Math.cos(a) * this.radius * r,
        Math.sin(a) * this.radius * r,
      ]);
    } else {
      const n = randInt(8, 13);
      this.verts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = this.radius * rand(0.6, 1.0);
        this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 3;
  shootCooldown = 0;
  tripleShotTimer = 0;
  dead = false;

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.tripleShotTimer = 0;
    this.dead = false;
  }

  update(dt: number, keys: Record<string, boolean>) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShotTimer > 0) this.tripleShotTimer -= dt;

    const ROT = 3.5;
    const THRUST = 260;
    const DRAG = 0.987;

    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShotTimer > 0) {
      const SPREAD = 0.22;
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  activateTripleShot() {
    if (this.dead) return;
    this.tripleShotTimer = 10;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -9);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 9);
    ctx.closePath();
    ctx.stroke();

    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = "rgba(255, 130, 0, 0.85)";
      ctx.stroke();
    }

    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

class PowerUp {
  x: number;
  y: number;
  radius = 14;
  t = 0;
  ttl = POWERUP_LIFESPAN;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number) {
    this.t += dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const pulse = 1 + Math.sin(this.t * 4) * 0.15;
    if (this.ttl < 3 && Math.floor(this.ttl * 6) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (const a of [-0.3, 0, 0.3]) {
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(a) * (this.radius - 4),
        Math.sin(a) * (this.radius - 4),
      );
    }
    ctx.stroke();
    ctx.restore();
  }
}

type GameState = "playing" | "dead" | "gameover";

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGameHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");

  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};

  const onKeyDown = (e: KeyboardEvent) => {
    justPressed[e.code] = !keys[e.code];
    keys[e.code] = true;
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    )
      e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }

  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let powerUp: PowerUp | null;
  let powerUpSpawnTimer: number;
  let score: number;
  let lives: number;
  let level: number;
  let state: GameState;
  let deadTimer: number;

  let lastScore = -1;
  let lastLives = -1;
  let lastLevel = -1;
  let gameOverReported = false;

  function reportState() {
    if (score !== lastScore) {
      lastScore = score;
      callbacks.onScoreChange(score);
    }
    if (lives !== lastLives) {
      lastLives = lives;
      callbacks.onLivesChange(lives);
    }
    if (level !== lastLevel) {
      lastLevel = level;
      callbacks.onLevelChange(level);
    }
    if (state === "gameover" && !gameOverReported) {
      gameOverReported = true;
      callbacks.onGameOver(score);
    }
  }

  function spawnPowerUp() {
    powerUp = new PowerUp(rand(40, W - 40), rand(40, H - 40));
    powerUpSpawnTimer = 0;
  }

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUp = null;
    powerUpSpawnTimer = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    gameOverReported = false;
    spawnAsteroids(4);
    spawnPowerUp();
    reportState();
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    ship.reset();
    spawnAsteroids(3 + level);
    spawnPowerUp();
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  function update(dt: number) {
    if (state === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    if (powerUp) powerUp.update(dt);

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);

    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    if (powerUp) {
      if (powerUp.dead) {
        powerUp = null;
      } else if (dist(ship, powerUp) < ship.radius + powerUp.radius) {
        ship.activateTripleShot();
        explode(powerUp.x, powerUp.y, 10);
        powerUp = null;
      }
    } else {
      powerUpSpawnTimer += dt;
      if (powerUpSpawnTimer >= POWERUP_TIME_THRESHOLD) spawnPowerUp();
    }

    if (asteroids.length === 0) nextLevel();
  }

  function drawLifeIcon(x: number, y: number) {
    ctx!.save();
    ctx!.translate(x, y);
    ctx!.rotate(-Math.PI / 2);
    ctx!.strokeStyle = "#fff";
    ctx!.lineWidth = 1.2;
    ctx!.lineJoin = "round";
    ctx!.beginPath();
    ctx!.moveTo(9, 0);
    ctx!.lineTo(-6, -5);
    ctx!.lineTo(-3, 0);
    ctx!.lineTo(-6, 5);
    ctx!.closePath();
    ctx!.stroke();
    ctx!.restore();
  }

  function drawHUD() {
    ctx!.fillStyle = "#fff";
    ctx!.font = "15px monospace";

    ctx!.textAlign = "left";
    ctx!.fillText(`SCORE  ${score}`, 14, 26);

    ctx!.textAlign = "center";
    ctx!.fillText(`NIVEL ${level}`, W / 2, 26);

    for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);

    if (ship.tripleShotTimer > 0) {
      ctx!.textAlign = "left";
      ctx!.fillStyle = "#0f0";
      ctx!.fillText(`TRIPLE x3  ${Math.ceil(ship.tripleShotTimer)}s`, 14, 48);
    }
  }

  function drawOverlay(title: string, sub: string) {
    ctx!.textAlign = "center";
    ctx!.fillStyle = "#fff";
    ctx!.font = "bold 46px monospace";
    ctx!.fillText(title, W / 2, H / 2 - 18);
    ctx!.font = "18px monospace";
    ctx!.fillStyle = "rgba(255,255,255,0.65)";
    ctx!.fillText(sub, W / 2, H / 2 + 22);
  }

  function draw() {
    ctx!.fillStyle = "#000";
    ctx!.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx!));
    asteroids.forEach((a) => a.draw(ctx!));
    bullets.forEach((b) => b.draw(ctx!));
    if (powerUp) powerUp.draw(ctx!);
    ship.draw(ctx!);

    drawHUD();

    if (state === "gameover") drawOverlay("GAME OVER", `PUNTAJE: ${score}`);
  }

  let rafId = 0;
  let lastTime: number | null = null;
  let running = true;
  let paused = false;

  function loop(ts: number) {
    if (!running) return;
    if (!paused) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      update(dt);
      draw();
      reportState();
    } else {
      lastTime = ts;
    }
    rafId = requestAnimationFrame(loop);
  }

  initGame();
  rafId = requestAnimationFrame(loop);

  return {
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
    restart() {
      initGame();
    },
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
