/**
 * Chronicles of Eternity - Game Engine v2 (Stage 2)
 * - 캐릭터 몸체 + 무기 분리 렌더링
 * - 스킬 이펙트 시스템 (slash / magic_ring / explosion / beam / shockwave)
 * - 몬스터 8종 AI 패턴
 */
const GameEngine = (() => {

    /* ═══════════════════════════════════════════════════════
       변수 선언
    ═══════════════════════════════════════════════════════ */
    let canvas, ctx, W, H, animId = null, lastTime = 0;
    let minimapCanvas = null, minimapCtx = null;
    let gameState = 'idle';
    let player = null;
    let monsters = [], projectiles = [], particles = [], effects = [];
    let camera = { x:0, y:0 };
    let stage = null;
    let uiBound = false;
    const keys = {};
    const skillCooldowns = { Z:0, X:0, C:0, V:0 };
    const skillMaxCDs    = { Z:0.28, X:1.5, C:3.0, V:8.0 };

    const TILE = 64, MAP_W = 38, MAP_H = 30;
    let mapTiles = [];      // 0=floor, 1=wall
    let mapDecals = [];     // 장식 타일 정보

    /* ═══════════════════════════════════════════════════════
       몬스터 타입 정의 (8종)
    ═══════════════════════════════════════════════════════ */
    const MON_TYPES = [
        {
            name:'슬라임', emoji:'🟢', color:'#2ecc71',
            hp:100, atk:8,  def:2,  spd:48,  r:14, exp:8,
            behavior:'split',  splitCount:2, splitHp:45
        },
        {
            name:'고블린', emoji:'👺', color:'#e74c3c',
            hp:150, atk:18, def:6,  spd:95,  r:16, exp:18,
            behavior:'flee',  fleeHpPct:0.25
        },
        {
            name:'오크',   emoji:'👹', color:'#e67e22',
            hp:300, atk:32, def:16, spd:58,  r:22, exp:40,
            behavior:'charge', chargeTelegraph:0.8, chargeSpd:290
        },
        {
            name:'해골',   emoji:'💀', color:'#bdc3c7',
            hp:130, atk:24, def:5,  spd:68,  r:16, exp:22,
            behavior:'ranged', preferDist:210, projEmoji:'🦴', projSpd:280
        },
        {
            name:'박쥐',   emoji:'🦇', color:'#8e44ad',
            hp:70,  atk:12, def:1,  spd:145, r:13, exp:12,
            behavior:'swarm', zigzagAmp:60
        },
        {
            name:'좀비',   emoji:'🧟', color:'#7dcea0',
            hp:380, atk:22, def:22, spd:38,  r:20, exp:36,
            behavior:'tank', poisonDmg:3, poisonDur:5
        },
        {
            name:'트롤',   emoji:'🧌', color:'#58d68d',
            hp:450, atk:40, def:20, spd:52,  r:25, exp:55,
            behavior:'regen', regenPerSec:10
        },
        {
            name:'임프',   emoji:'😈', color:'#e67e22',
            hp:110, atk:28, def:8,  spd:105, r:15, exp:32,
            behavior:'teleport', tpInterval:3.0, projEmoji:'🔥', projSpd:250
        },
    ];

    /* ═══════════════════════════════════════════════════════
       초기화
    ═══════════════════════════════════════════════════════ */
    function init(charId) {
        canvas = document.getElementById('game-canvas');
        ctx    = canvas.getContext('2d');
        minimapCanvas = document.getElementById('minimap-canvas');
        minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
        resize();
        window.addEventListener('resize',  resize);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup',   onKeyUp);
        bindHudUI();

        spawnPlayer(charId);
        initStage(1);
        updateHUD();

        if (animId) cancelAnimationFrame(animId);
        lastTime  = performance.now();
        gameState = 'playing';
        loop(lastTime);
    }

    function resize() {
        W = canvas.width  = canvas.clientWidth;
        H = canvas.height = canvas.clientHeight;
        if (minimapCanvas) {
            const size = minimapCanvas.clientWidth || 176;
            minimapCanvas.width = size;
            minimapCanvas.height = size;
        }
    }

    /* ═══════════════════════════════════════════════════════
       맵 생성
    ═══════════════════════════════════════════════════════ */
    function generateMap() {
        mapTiles  = [];
        mapDecals = [];
        for (let y = 0; y < MAP_H; y++) {
            mapTiles[y]  = [];
            mapDecals[y] = [];
            for (let x = 0; x < MAP_W; x++) {
                const isEdge = (x===0||y===0||x===MAP_W-1||y===MAP_H-1);
                mapTiles[y][x]  = isEdge ? 1 : (Math.random() < 0.07 ? 1 : 0);
                mapDecals[y][x] = (!isEdge && mapTiles[y][x]===0 && Math.random()<0.04)
                                    ? ['🕯️','💎','🪨'][Math.floor(Math.random()*3)] : null;
            }
        }
        // 시작 지점 클리어
        for (let dy=-3;dy<=3;dy++) for (let dx=-3;dx<=3;dx++) {
            const ty=3+dy, tx=3+dx;
            if (ty>0&&ty<MAP_H-1&&tx>0&&tx<MAP_W-1) mapTiles[ty][tx]=0;
        }
    }

    function isSolid(tx,ty) {
        if (tx<0||ty<0||tx>=MAP_W||ty>=MAP_H) return true;
        return mapTiles[ty]?.[tx]===1;
    }

    function wouldCollide(x,y,r) {
        return [[-1,-1],[1,-1],[-1,1],[1,1]].some(([sx,sy])=>
            isSolid(Math.floor((x+sx*r)/TILE), Math.floor((y+sy*r)/TILE))
        );
    }

    /* ═══════════════════════════════════════════════════════
       플레이어
    ═══════════════════════════════════════════════════════ */
    function spawnPlayer(charId) {
        const cd = getCharById(charId);
        const bs = cd.baseStats;
        player = {
            charData: cd,
            x: 3.5*TILE, y: 3.5*TILE, r: 18,
            speed: Math.round(bs.spd * 1.14),
            hp: bs.maxHp, maxHp: bs.maxHp,
            mp: bs.maxMp, maxMp: bs.maxMp,
            atk:  bs.atk,  matk: bs.matk,
            def:  bs.def,  crit: bs.crit,
            level:1, exp:0, expMax:120,
            facing:1,
            state:'idle', stateTimer:0,
            invincible:0, hitFlash:0,
            mpRegenTimer:0,
            buffAtk:1.0, buffTimer:0,   // 공격력 버프
            poisoned:0,  poisonTimer:0,  // 독 상태
        };
    }

    /* ═══════════════════════════════════════════════════════
       몬스터
    ═══════════════════════════════════════════════════════ */
    function initStage(number) {
        stage = {
            number,
            targetKills: 18 + number * 4,
            kills: 0,
            completed: false,
            clearShown: false,
            bossSpawnKills: 14 + number * 4,
            bossSpawned: false,
            bossDefeated: false,
        };
        generateMap();
        player.x = 3.5 * TILE;
        player.y = 3.5 * TILE;
        player.state = 'idle';
        player.stateTimer = 0;
        player.invincible = 0.4;
        monsters = [];
        projectiles = [];
        particles = [];
        effects = [];
        spawnMonsters(14 + number * 2);
    }

    function goToNextStage() {
        if (!player || !stage) return;
        const nextNumber = stage.number + 1;
        initStage(nextNumber);
        showDamage(player.x, player.y - 80, `Stage ${nextNumber}`, 'critical');
        spawnParticles(player.x, player.y, '#8be9fd', 24);
        gameState = 'playing';
        document.getElementById('stage-clear-overlay')?.remove();
        updateHUD();
    }

    function spawnMonsters(n) { monsters=[]; for(let i=0;i<n;i++) spawnOne(); }

    function getBossTemplate() {
        return {
            name:'Abyss Warden',
            emoji:'👹',
            color:'#ff4d6d',
            hp:2600,
            atk:72,
            def:28,
            spd:82,
            r:34,
            exp:240,
            behavior:'boss',
            chargeTelegraph:0.55,
            chargeSpd:420,
            preferDist:220,
            projEmoji:'🔥',
            projSpd:360,
            aggroRange:420,
        };
    }

    function spawnOne(typeOverride) {
        if (!player || !stage || stage.completed) return;
        const t = typeOverride || MON_TYPES[Math.floor(Math.random()*MON_TYPES.length)];
        let mx,my,tries=0;
        do {
            mx=(5+Math.random()*(MAP_W-10))*TILE;
            my=(5+Math.random()*(MAP_H-10))*TILE;
        } while(++tries<80 && (wouldCollide(mx,my,t.r)||dist(mx,my,player.x,player.y)<280));
        monsters.push({
            ...t, x:mx, y:my,
            maxHp:t.hp, hp:t.hp,
            aggro:false, aggroRange:230,
            attackRange:t.r+28, attackCd:0,
            hitFlash:0, id:Math.random(),
            // AI 전용 상태
            chargePhase:'idle', chargeTelegraph:0, chargeTarget:{x:0,y:0},
            zigzagAngle:Math.random()*Math.PI*2, zigzagTimer:0,
            tpTimer: t.tpInterval||0,
        });
    }

    function spawnBoss() {
        if (!stage || stage.bossSpawned) return;
        stage.bossSpawned = true;
        const boss = getBossTemplate();
        spawnOne(boss);
        const spawned = monsters[monsters.length - 1];
        if (spawned) {
            spawned.isBoss = true;
            spawned.aggro = true;
            spawned.aggroRange = boss.aggroRange;
            showDamage(spawned.x, spawned.y - 60, 'BOSS', 'critical');
            spawnParticles(spawned.x, spawned.y, boss.color, 24);
        }
    }

    /* ═══════════════════════════════════════════════════════
       메인 루프
    ═══════════════════════════════════════════════════════ */
    function loop(ts) {
        const dt = Math.min((ts-lastTime)/1000, 0.05);
        lastTime = ts;
        if (gameState==='playing') update(dt);
        renderFrame();
        animId = requestAnimationFrame(loop);
    }

    /* ═══════════════════════════════════════════════════════
       업데이트
    ═══════════════════════════════════════════════════════ */
    function update(dt) {
        updatePlayer(dt);
        updateMonsters(dt);
        updateProjectiles(dt);
        updateParticles(dt);
        updateEffects(dt);
        updateCamera();
        updateHUD();
        for (const k in skillCooldowns)
            if (skillCooldowns[k]>0) skillCooldowns[k]=Math.max(0,skillCooldowns[k]-dt);
        updateSkillUI();
        if (!stage.completed && !stage.bossSpawned && stage.kills >= stage.bossSpawnKills) spawnBoss();
        if (!stage.completed && !stage.bossSpawned && monsters.filter(m => !m.isBoss).length < 12) spawnOne();
    }

    /* ── 플레이어 업데이트 ── */
    function updatePlayer(dt) {
        if (!player||player.state==='dead') return;
        if (player.invincible>0) player.invincible-=dt;
        if (player.hitFlash>0)   player.hitFlash-=dt;
        if (player.stateTimer>0) player.stateTimer-=dt;
        if (player.state==='attack' && player.stateTimer<=0) player.state='idle';

        // 버프 타이머
        if (player.buffTimer>0) {
            player.buffTimer-=dt;
            if (player.buffTimer<=0) player.buffAtk=1.0;
        }
        // 독 상태
        if (player.poisoned>0) {
            player.poisonTimer+=dt;
            if (player.poisonTimer>=1) {
                player.poisonTimer=0;
                const dmg=player.poisoned;
                player.hp=Math.max(1,player.hp-dmg);
                showDamage(player.x,player.y-35,`☠️${dmg}`,'magic');
                player.poisoned=Math.max(0,player.poisoned-0.3);
            }
        }
        // MP 재생
        player.mpRegenTimer+=dt;
        if (player.mpRegenTimer>=1.5) {
            player.mpRegenTimer=0;
            player.mp=Math.min(player.maxMp, player.mp+Math.ceil(player.maxMp*0.015));
        }
        // 이동
        let mx=0,my=0;
        if (player.stateTimer<=0.08 || player.state!=='attack') {
            if (keys['ArrowLeft'] ||keys['a']||keys['A']) mx-=1;
            if (keys['ArrowRight']||keys['d']||keys['D']) mx+=1;
            if (keys['ArrowUp']   ||keys['w']||keys['W']) my-=1;
            if (keys['ArrowDown'] ||keys['s']||keys['S']) my+=1;
        }
        if (mx!==0||my!==0) {
            const len=Math.sqrt(mx*mx+my*my); mx/=len; my/=len;
            if (mx!==0) player.facing=mx>0?1:-1;
            if (player.state!=='attack') player.state='run';
        } else {
            if (player.state==='run') player.state='idle';
        }
        const spd=player.speed;
        const nx=player.x+mx*spd*dt, ny=player.y+my*spd*dt;
        if (!wouldCollide(nx,player.y,player.r)) player.x=nx;
        if (!wouldCollide(player.x,ny,player.r)) player.y=ny;
    }

    /* ── 몬스터 업데이트 ── */
    function updateMonsters(dt) {
        monsters.forEach(m=>{
            if (m.hp<=0||!player||player.state==='dead') return;
            if (m.hitFlash>0) m.hitFlash-=dt;
            if (m.attackCd>0) m.attackCd-=dt;

            const dx=player.x-m.x, dy=player.y-m.y, d=Math.sqrt(dx*dx+dy*dy);
            if (d<m.aggroRange) m.aggro=true;
            if (m.aggro&&d>m.aggroRange*2.8) m.aggro=false;

            if (m.aggro) runAI(m, dx, dy, d, dt);

            // HP 재생 (트롤)
            if (m.behavior==='regen' && m.hp<m.maxHp) {
                m.hp=Math.min(m.maxHp, m.hp+(m.regenPerSec||8)*dt);
            }
        });

        // 죽은 몬스터 처리
        monsters = monsters.filter(m=>{
            if (m.hp<=0) { onMonsterDie(m); return false; }
            return true;
        });
    }

    function runAI(m, dx, dy, d, dt) {
        switch(m.behavior) {
            case 'split':
            case 'flee':
            case 'tank':
                // 기본 추격
                if (d > m.attackRange) moveToward(m, dx, dy, d, m.spd, dt);
                else tryMeleeAttack(m, dx, dy, d, dt);
                // 도망 (goblin)
                if (m.behavior==='flee' && m.hp/m.maxHp < (m.fleeHpPct||0.25)) {
                    moveToward(m, -dx, -dy, d, m.spd*1.2, dt);
                }
                break;

            case 'charge':
                runChargeAI(m, dx, dy, d, dt);
                break;

            case 'ranged':
                runRangedAI(m, dx, dy, d, dt);
                break;

            case 'swarm':
                runSwarmAI(m, dx, dy, d, dt);
                break;

            case 'regen':
                if (d > m.attackRange) moveToward(m, dx, dy, d, m.spd, dt);
                else tryMeleeAttack(m, dx, dy, d, dt);
                break;

            case 'teleport':
                runTeleportAI(m, dx, dy, d, dt);
                break;
            case 'boss':
                runBossAI(m, dx, dy, d, dt);
                break;
        }
    }

    function runBossAI(m, dx, dy, d, dt) {
        if (m.hp / m.maxHp < 0.45) {
            if (d > m.attackRange * 1.2) moveToward(m, dx, dy, d, m.spd * 1.15, dt);
            if (m.attackCd <= 0 && d < 320) {
                const angle = Math.atan2(player.y - m.y, player.x - m.x);
                for (let i = -2; i <= 2; i++) {
                    const spread = angle + i * 0.18;
                    projectiles.push({
                        x:m.x, y:m.y,
                        vx:Math.cos(spread)*(m.projSpd||320),
                        vy:Math.sin(spread)*(m.projSpd||320),
                        r:14, atk:m.atk*1.05,
                        color:m.color, emoji:m.projEmoji||'🔥',
                        isEnemy:true, pierce:false, life:2.2
                    });
                }
                m.attackCd = 0.95;
            }
            return;
        }

        if (d > 170) moveToward(m, dx, dy, d, m.spd * 1.08, dt);
        else if (m.attackCd <= 0) {
            runChargeAI(m, dx, dy, d, dt);
            if (m.chargePhase === 'idle') m.attackCd = 1.35;
        } else if (d < 300 && m.attackCd < 0.9) {
            runRangedAI(m, dx, dy, d, dt);
        }
    }

    function moveToward(m, dx, dy, d, spd, dt) {
        if (d===0) return;
        const nx=m.x+(dx/d)*spd*dt, ny=m.y+(dy/d)*spd*dt;
        if (!wouldCollide(nx,m.y,m.r)) m.x=nx;
        if (!wouldCollide(m.x,ny,m.r)) m.y=ny;
    }

    function tryMeleeAttack(m, dx, dy, d, dt) {
        if (m.attackCd>0||player.invincible>0) return;
        const dmg=Math.max(1, m.atk * (m.isBoss ? 1.28 : 1) - player.def*0.3);
        player.hp=Math.max(0,player.hp-dmg);
        player.hitFlash=0.15; player.invincible=0.55;
        showDamage(player.x,player.y-40,Math.floor(dmg),'normal');
        // 독 (좀비)
        if (m.behavior==='tank'&&m.poisonDmg) {
            player.poisoned=m.poisonDmg;
            player.poisonTimer=0;
        }
        // 넉백
        const angle=Math.atan2(player.y-m.y, player.x-m.x);
        pushEntity(player, angle, m.isBoss ? 120 : 70);
        m.attackCd=m.isBoss ? 1.1 : 1.4;
        if (m.isBoss) shakeCanvas(6, 0.22);
        if (player.hp<=0) { player.state='dead'; setTimeout(showGameOver,1200); }
    }

    function runChargeAI(m, dx, dy, d, dt) {
        if (m.chargePhase==='idle') {
            if (d>m.attackRange) moveToward(m,dx,dy,d,m.spd,dt);
            else if (m.attackCd<=0) {
                // 돌진 예고
                m.chargePhase='telegraph';
                m.chargeTelegraph=m.chargeTelegraph||0.8;
                m.chargeTarget={ x:player.x, y:player.y };
                addEffect({ type:'telegraph', x:m.x,y:m.y, tx:m.chargeTarget.x, ty:m.chargeTarget.y,
                    color:m.color, life:m.chargeTelegraph, maxLife:m.chargeTelegraph });
            }
        } else if (m.chargePhase==='telegraph') {
            m.chargeTelegraph-=dt;
            if (m.chargeTelegraph<=0) { m.chargePhase='charging'; m.attackCd=2.5; }
        } else if (m.chargePhase==='charging') {
            const tx=m.chargeTarget.x-m.x, ty=m.chargeTarget.y-m.y;
            const td=Math.sqrt(tx*tx+ty*ty);
            if (td<12 || wouldCollide(m.x+(tx/td)*20,m.y+(ty/td)*20,m.r)) {
                m.chargePhase='idle';
                spawnParticles(m.x,m.y,m.color,12);
            } else {
                const spd=m.chargeSpd||280;
                const nx=m.x+(tx/td)*spd*dt, ny=m.y+(ty/td)*spd*dt;
                if (!wouldCollide(nx,m.y,m.r)) m.x=nx; else m.chargePhase='idle';
                if (!wouldCollide(m.x,ny,m.r)) m.y=ny; else m.chargePhase='idle';
                // 돌진 중 플레이어 접촉
                if (dist(m.x,m.y,player.x,player.y)<m.r+player.r+5 && player.invincible<=0) {
                    const dmg=Math.max(1,m.atk*1.5-player.def*0.3);
                    player.hp=Math.max(0,player.hp-dmg);
                    player.hitFlash=0.2; player.invincible=0.8;
                    showDamage(player.x,player.y-40,Math.floor(dmg),'critical');
                    pushEntity(player, Math.atan2(player.y-m.y,player.x-m.x), 130);
                    m.chargePhase='idle';
                    if (player.hp<=0) { player.state='dead'; setTimeout(showGameOver,1200); }
                }
            }
        }
    }

    function runRangedAI(m, dx, dy, d, dt) {
        const pref = m.preferDist||200;
        if (d < pref*0.7) {
            // 너무 가까우면 후퇴
            moveToward(m,-dx,-dy,d,m.spd,dt);
        } else if (d > pref*1.3) {
            moveToward(m,dx,dy,d,m.spd,dt);
        }
        // 원거리 공격
        if (m.attackCd<=0 && d<350) {
            const angle=Math.atan2(player.y-m.y,player.x-m.x);
            projectiles.push({
                x:m.x, y:m.y,
                vx:Math.cos(angle)*(m.projSpd||260),
                vy:Math.sin(angle)*(m.projSpd||260),
                r:10, atk:m.atk*0.8,
                color:m.color, emoji:m.projEmoji||'💀',
                isEnemy:true, pierce:false, life:2.0
            });
            m.attackCd=1.8;
        }
    }

    function runSwarmAI(m, dx, dy, d, dt) {
        // 지그재그 이동
        m.zigzagTimer-=dt;
        if (m.zigzagTimer<=0) { m.zigzagAngle+=((Math.random()-0.5)*Math.PI); m.zigzagTimer=0.4+Math.random()*0.4; }
        const baseAngle=Math.atan2(dy,dx);
        const moveAngle=baseAngle+Math.sin(m.zigzagAngle)*0.9;
        const nx=m.x+Math.cos(moveAngle)*m.spd*dt, ny=m.y+Math.sin(moveAngle)*m.spd*dt;
        if (!wouldCollide(nx,m.y,m.r)) m.x=nx;
        if (!wouldCollide(m.x,ny,m.r)) m.y=ny;
        if (d<=m.attackRange) tryMeleeAttack(m,dx,dy,d,dt);
    }

    function runTeleportAI(m, dx, dy, d, dt) {
        m.tpTimer-=dt;
        if (m.tpTimer<=0) {
            // 플레이어 주변으로 순간이동
            const angle=Math.random()*Math.PI*2;
            const tpDist=100+Math.random()*80;
            const tx=player.x+Math.cos(angle)*tpDist;
            const ty=player.y+Math.sin(angle)*tpDist;
            if (!wouldCollide(tx,ty,m.r)) {
                spawnParticles(m.x,m.y,m.color,8);
                m.x=tx; m.y=ty;
                spawnParticles(m.x,m.y,'#fff',8);
            }
            m.tpTimer=m.tpInterval||3.0;
        }
        // 원거리 마법 공격
        if (m.attackCd<=0 && d<300) {
            const angle=Math.atan2(player.y-m.y,player.x-m.x);
            projectiles.push({
                x:m.x, y:m.y,
                vx:Math.cos(angle)*(m.projSpd||250),
                vy:Math.sin(angle)*(m.projSpd||250),
                r:12, atk:m.atk,
                color:m.color, emoji:m.projEmoji||'🔥',
                isEnemy:true, pierce:false, life:1.8
            });
            m.attackCd=1.5;
        }
    }

    function onMonsterDie(m) {
        if (!player) return;
        if (stage) stage.kills++;
        if (m.isBoss && stage) stage.bossDefeated = true;
        player.exp+=m.exp;
        showDamage(m.x,m.y-28,`+${m.exp} EXP`,'heal');
        addEffect({ type:'explosion', x:m.x, y:m.y, color:m.color, radius:m.r*2.5, life:0.4, maxLife:0.4 });
        spawnParticles(m.x,m.y,m.color,14);
        spawnParticles(m.x,m.y,'#fff',5);
        if (m.isBoss) {
            showDamage(m.x, m.y - 52, 'BOSS DOWN', 'critical');
            spawnParticles(m.x, m.y, '#fff', 20);
            setTimeout(() => {
                if (stage && !stage.completed) completeStage();
            }, 220);
        }

        // 슬라임 분열
        if (m.behavior==='split' && m.maxHp===m.hp_original_for_split) {
            // 소형 슬라임 2마리 소환
        }

        if (m.behavior==='split' && m.maxHp===m.hp && !stage.completed) {
            for (let i=0;i<(m.splitCount||2);i++) {
                const angle=(Math.PI*2*i)/(m.splitCount||2);
                monsters.push({
                    ...m,
                    x:m.x+Math.cos(angle)*22,
                    y:m.y+Math.sin(angle)*22,
                    hp:m.splitHp||45,
                    maxHp:m.splitHp||45,
                    r:Math.max(10, Math.floor(m.r*0.75)),
                    atk:Math.max(4, Math.floor(m.atk*0.8)),
                    def:Math.max(0, Math.floor(m.def*0.5)),
                    spd:m.spd*1.15,
                    exp:Math.max(1, Math.floor(m.exp*0.5)),
                    splitCount:0,
                    behavior:'flee',
                    attackCd:0.2,
                    aggro:true,
                    id:Math.random(),
                });
            }
        }

        while (player.exp>=player.expMax) {
            player.exp-=player.expMax;
            player.level++;
            player.expMax=Math.floor(player.expMax*1.4);
            onLevelUp();
        }
    }

    function onLevelUp() {
        player.maxHp =Math.floor(player.maxHp*1.10); player.hp=player.maxHp;
        player.maxMp =Math.floor(player.maxMp*1.08); player.mp=player.maxMp;
        player.atk   =Math.floor(player.atk*1.08);
        player.matk  =Math.floor(player.matk*1.08);
        player.def   =Math.floor(player.def*1.06);
        showDamage(player.x,player.y-70,`⬆ LEVEL UP! Lv.${player.level}`,'critical');
        addEffect({ type:'shockwave', x:player.x, y:player.y, color:'#f39c12', radius:0, maxRadius:120, life:0.6, maxLife:0.6 });
        spawnParticles(player.x,player.y,'#f39c12',28);
    }

    function completeStage() {
        stage.completed = true;
        gameState = 'stage-clear';
        showDamage(player.x, player.y - 90, 'Stage Clear!', 'critical');
        spawnParticles(player.x, player.y, '#f1c40f', 32);
        addEffect({ type:'shockwave', x:player.x, y:player.y, color:'#f1c40f', radius:0, maxRadius:220, life:0.8, maxLife:0.8 });
        showStageClearOverlay();
    }

    function showStageClearOverlay() {
        if (stage.clearShown) return;
        stage.clearShown = true;
        const prev=document.getElementById('stage-clear-overlay');
        if (prev) prev.remove();
        const ov=document.createElement('div');
        ov.id='stage-clear-overlay';
        ov.className='game-modal-overlay';
        ov.innerHTML=`
            <div class="game-modal">
                <div class="game-modal-title">Stage Cleared</div>
                <div class="game-modal-desc">You defeated the stage boss and cleared Stage ${stage.number}. Total enemies defeated: ${stage.kills}.</div>
                <div class="game-modal-actions">
                    <button class="game-modal-btn game-modal-btn-primary" data-action="next">Next Stage</button>
                    <button class="game-modal-btn game-modal-btn-secondary" data-action="select">Character Select</button>
                    <button class="game-modal-btn game-modal-btn-secondary" data-action="title">Title Screen</button>
                </div>
            </div>
        `;
        ov.addEventListener('click', (event) => {
            const action = event.target.dataset.action;
            if (action === 'next') {
                ov.remove();
                goToNextStage();
            }
            if (action === 'select') {
                ov.remove();
                GameManager.showCharacterSelect();
            }
            if (action === 'title') {
                ov.remove();
                GameManager.showTitle();
            }
        });
        const sc=document.getElementById('screen-game');
        if(sc) sc.appendChild(ov);
    }

    /* ═══════════════════════════════════════════════════════
       이펙트 시스템
    ═══════════════════════════════════════════════════════ */
    function addEffect(e) { effects.push(e); }

    function updateEffects(dt) {
        effects = effects.filter(e=>{ e.life-=dt; return e.life>0; });
    }

    /* ═══════════════════════════════════════════════════════
       입력 처리
    ═══════════════════════════════════════════════════════ */
    function onKeyDown(e) {
        keys[e.key]=true;
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
        if (gameState!=='playing'||!player||player.state==='dead') return;
        const sk = {z:0,x:1,c:2,v:3}[e.key.toLowerCase()];
        if (sk!==undefined) useSkill(sk);
    }
    function onKeyUp(e) { keys[e.key]=false; }

    /* ═══════════════════════════════════════════════════════
       스킬 시스템
    ═══════════════════════════════════════════════════════ */
    function useSkill(idx) {
        const k=['Z','X','C','V'][idx];
        if (skillCooldowns[k]>0) return;
        skillCooldowns[k]=skillMaxCDs[k];

        const char=player.charData;
        const angle=getBestAngle();
        const isMagic=['magic','dark','support','tech'].includes(char.type);
        const skillMeta = getSkillDisplayData(char, idx);

        switch(idx) {
            case 0: doBasicAttack(char, angle, isMagic); break;
            case 1: doSkill2(char, angle, isMagic);      break;
            case 2: doSkill3(char, angle, isMagic);      break;
            case 3: doUltimate(char, angle, isMagic);    break;
        }
        player.state='attack'; player.stateTimer=0.24;
        player.lastSkillName = skillMeta?.name || '';
    }

    /* ── 기본 공격 (Z) ── */
    function doBasicAttack(char, angle, isMagic) {
        if (isMagic) {
            if (!useMp(8)) return;
            fireProjectile(angle, player.matk*1.1, char.color, char.skills[0].icon, false);
            addEffect({ type:'magic_ring', x:player.x, y:player.y, color:char.color,
                radius:20, maxRadius:55, life:0.35, maxLife:0.35, thick:3 });
        } else {
            meleeHit(angle, 88, 1.0, false);
            addEffect({ type:'slash', x:player.x, y:player.y, angle, facing:player.facing,
                color:char.color, life:0.28, maxLife:0.28, radius:75 });
        }
    }

    /* ── 스킬 2 (X) ── */
    function doSkill2(char, angle, isMagic) {
        if (!useMp(25)) return;
        if (isMagic) {
            [-0.4,0,0.4].forEach(off=>
                fireProjectile(angle+off, player.matk*1.4, char.color, char.skills[1].icon, false)
            );
            addEffect({ type:'magic_ring', x:player.x, y:player.y, color:char.color,
                radius:15, maxRadius:80, life:0.45, maxLife:0.45, thick:5 });
        } else {
            // 돌진
            const dashX=Math.cos(angle)*105, dashY=Math.sin(angle)*105;
            if (!wouldCollide(player.x+dashX,player.y,player.r)) player.x+=dashX;
            if (!wouldCollide(player.x,player.y+dashY,player.r)) player.y+=dashY;
            addEffect({ type:'dash_trail', x:player.x-dashX*0.5, y:player.y-dashY*0.5,
                angle, color:char.color, life:0.4, maxLife:0.4 });
            spawnParticles(player.x,player.y,char.color,14);
            meleeHit(angle, 100, 2.2, false);
            addEffect({ type:'slash', x:player.x, y:player.y, angle, facing:player.facing,
                color:char.color, life:0.4, maxLife:0.4, radius:95, thick:6 });
        }
    }

    /* ── 스킬 3 (C) ── */
    function doSkill3(char, angle, isMagic) {
        if (!useMp(40)) return;
        if (isMeleeStyleCharacter(char)) {
            player.invincible=0.8;
            const comboAngles = [-0.32, -0.12, 0.14, 0.38];
            comboAngles.forEach((offset, i)=>{
                setTimeout(()=>{
                    if (!player || gameState!=='playing') return;
                    const slashAngle = angle + offset * player.facing;
                    meleeHit(slashAngle, 122 + i*8, 1.2 + i*0.38, false);
                    addEffect({ type:'slash', x:player.x, y:player.y, angle:slashAngle, facing:player.facing,
                        color:char.color, life:0.22, maxLife:0.22, radius:96 + i*8, thick:6 + i });
                    spawnParticles(
                        player.x + Math.cos(slashAngle) * 52,
                        player.y + Math.sin(slashAngle) * 52,
                        i % 2 === 0 ? '#ffffff' : char.color,
                        8 + i*2
                    );
                }, i*75);
            });
            showDamage(player.x,player.y-55,`${getSkillDisplayData(char, 2).name}!`,'critical');
            return;
        }
        if (char.type==='support'||char.type==='hybrid') {
            const heal=Math.ceil(player.maxHp*0.18);
            player.hp=Math.min(player.maxHp,player.hp+heal);
            showDamage(player.x,player.y-60,`+${heal} 회복!`,'heal');
            addEffect({ type:'heal_burst', x:player.x, y:player.y, color:'#2ecc71',
                life:0.6, maxLife:0.6, radius:60 });
            spawnParticles(player.x,player.y,'#2ecc71',20);
        } else if (isMagic) {
            // 번개 사슬 or 원소 폭발
            monsters.slice(0,3).forEach((m,i)=>{
                setTimeout(()=>{
                    if (m.hp>0) {
                        dealDamage(m, player.matk*1.8, true);
                        addEffect({ type:'explosion', x:m.x, y:m.y, color:char.color,
                            radius:30, life:0.4, maxLife:0.4 });
                    }
                },i*80);
            });
        } else {
            // 무적 + 광역
            player.invincible=1.0;
            showDamage(player.x,player.y-55,'BURST!','critical');
            showDamage(player.x,player.y-55,'⚡ 방어!','heal');
            meleeHit(0, 150, 1.6, true);
            addEffect({ type:'shockwave', x:player.x, y:player.y, color:char.color,
                radius:0, maxRadius:155, life:0.45, maxLife:0.45 });
        }
    }

    /* ── 궁극기 (V) ── */
    function doUltimate(char, angle, isMagic) {
        if (!useMp(80)) return;
        shakeCanvas(8, 0.4);

        if (isMagic) {
            // 8방향 대형 마법탄
            for (let i=0;i<8;i++) {
                const a=(i/8)*Math.PI*2;
                fireProjectile(a, player.matk*3.0, char.color, char.skills[3].icon, true);
            }
            addEffect({ type:'magic_ring', x:player.x, y:player.y, color:char.color,
                radius:10, maxRadius:200, life:0.7, maxLife:0.7, thick:8 });
            addEffect({ type:'explosion', x:player.x, y:player.y, color:char.color,
                radius:60, life:0.6, maxLife:0.6 });
        } else {
            meleeHit(0, 240, 4.0, true);
            for (let i=0;i<3;i++) {
                addEffect({ type:'slash', x:player.x, y:player.y,
                    angle: angle+(i-1)*0.7, facing:player.facing,
                    color:char.color, life:0.55, maxLife:0.55, radius:130, thick:7 });
            }
            addEffect({ type:'shockwave', x:player.x, y:player.y, color:char.color,
                radius:0, maxRadius:240, life:0.5, maxLife:0.5 });
            spawnParticles(player.x,player.y,char.color,40);
            spawnParticles(player.x,player.y,'#fff',18);
        }
        showDamage(player.x,player.y-80,`💥 ${char.skills[3].name}!!`,'critical');
    }

    /* ── 유틸 ── */
    function useMp(cost) {
        if (player.mp<cost) { showDamage(player.x,player.y-40,'MP 부족!','miss'); return false; }
        player.mp-=cost; return true;
    }

    function getBestAngle() {
        let best=null,bd=Infinity;
        monsters.forEach(m=>{ const d=dist(player.x,player.y,m.x,m.y); if(d<bd){bd=d;best=m;} });
        if (best&&bd<460) return Math.atan2(best.y-player.y,best.x-player.x);
        return player.facing>0?0:Math.PI;
    }

    function fireProjectile(angle, atk, color, emoji, pierce) {
        projectiles.push({
            x:player.x, y:player.y,
            vx:Math.cos(angle)*390, vy:Math.sin(angle)*390,
            r:12, atk, color, emoji, pierce, life:2.4, isEnemy:false,
            trail:[]
        });
    }

    function meleeHit(angle, range, mult, aoe) {
        let anyHit=false;
        monsters.forEach(m=>{
            if (m.hp<=0) return;
            const d=dist(player.x,player.y,m.x,m.y);
            let inRange = aoe ? d<range :
                (d<range && Math.abs(normAngle(Math.atan2(m.y-player.y,m.x-player.x)-angle))<1.15);
            if (inRange) { dealDamage(m, player.atk*player.buffAtk*mult, false); anyHit=true; }
        });
        if (anyHit) spawnParticles(
            player.x+Math.cos(angle)*55, player.y+Math.sin(angle)*55,'#fff',7);
    }

    function dealDamage(m, rawAtk, isMagic) {
        let dmg=Math.max(1, rawAtk - m.def*0.3);
        const crit=Math.random()<player.crit;
        if (crit) dmg*=2.3;
        m.hp-=dmg; m.hitFlash=0.13;
        showDamage(m.x,m.y-30,Math.floor(dmg), crit?'critical':(isMagic?'magic':'normal'));
        const a=Math.atan2(m.y-player.y,m.x-player.x);
        pushEntity(m,a,50);
        spawnParticles(m.x,m.y,'#fff',3);
        if (crit) {
            spawnParticles(m.x,m.y,'#ff6b35',9);
            spawnParticles(m.x,m.y,player.charData.color,5);
        }
    }

    function pushEntity(ent, angle, force) {
        const nx=ent.x+Math.cos(angle)*force;
        const ny=ent.y+Math.sin(angle)*force;
        if (!wouldCollide(nx,ent.y,ent.r)) ent.x=nx;
        if (!wouldCollide(ent.x,ny,ent.r)) ent.y=ny;
    }

    /* ═══════════════════════════════════════════════════════
       투사체
    ═══════════════════════════════════════════════════════ */
    function updateProjectiles(dt) {
        projectiles = projectiles.filter(p=>{
            // 궤적 저장
            if (!p.isEnemy) {
                if (!p.trail) p.trail=[];
                p.trail.unshift({x:p.x,y:p.y});
                if (p.trail.length>8) p.trail.pop();
            }
            p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
            if (p.life<=0||wouldCollide(p.x,p.y,p.r)) {
                addEffect({ type:'explosion', x:p.x, y:p.y, color:p.color, radius:p.r*1.8, life:0.3, maxLife:0.3 });
                spawnParticles(p.x,p.y,p.color,6);
                return false;
            }
            if (p.isEnemy) {
                // 플레이어에게 피해
                if (dist(p.x,p.y,player.x,player.y)<p.r+player.r && player.invincible<=0) {
                    const dmg=Math.max(1,p.atk-player.def*0.3);
                    player.hp=Math.max(0,player.hp-dmg);
                    player.hitFlash=0.15; player.invincible=0.55;
                    showDamage(player.x,player.y-40,Math.floor(dmg),'normal');
                    pushEntity(player, Math.atan2(player.y-p.y,player.x-p.x),55);
                    if (player.hp<=0) { player.state='dead'; setTimeout(showGameOver,1200); }
                    return false;
                }
            } else {
                let hit=false;
                monsters.forEach(m=>{
                    if (m.hp<=0) return;
                    if (dist(p.x,p.y,m.x,m.y)<p.r+m.r) {
                        dealDamage(m,p.atk,true);
                        if (!p.pierce) hit=true;
                    }
                });
                if (hit) return false;
            }
            return true;
        });
    }

    /* ═══════════════════════════════════════════════════════
       파티클
    ═══════════════════════════════════════════════════════ */
    function spawnParticles(x,y,color,n) {
        for (let i=0;i<n;i++) {
            const a=Math.random()*Math.PI*2, spd=65+Math.random()*140;
            particles.push({ x,y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd,
                r:2+Math.random()*4, color, life:0.3+Math.random()*0.55, maxLife:0.85 });
        }
    }

    function updateParticles(dt) {
        particles = particles.filter(p=>{
            p.x+=p.vx*dt; p.y+=p.vy*dt;
            p.vx*=0.88; p.vy*=0.88; p.vy+=90*dt;
            p.life-=dt; return p.life>0;
        });
    }

    /* ═══════════════════════════════════════════════════════
       카메라
    ═══════════════════════════════════════════════════════ */
    function updateCamera() {
        camera.x+=(player.x-W/2-camera.x)*0.13;
        camera.y+=(player.y-H/2-camera.y)*0.13;
    }

    /* ═══════════════════════════════════════════════════════
       HUD
    ═══════════════════════════════════════════════════════ */
    function updateHUD() {
        if (!player) return;
        const p=player;
        setEl('hp-bar',   e=>e.style.width=(p.hp/p.maxHp*100)+'%');
        setEl('mp-bar',   e=>e.style.width=(p.mp/p.maxMp*100)+'%');
        setEl('hp-value', e=>e.textContent=`${Math.ceil(p.hp)}/${p.maxHp}`);
        setEl('mp-value', e=>e.textContent=`${Math.ceil(p.mp)}/${p.maxMp}`);
        setEl('level-badge', e=>e.textContent=`Lv.${p.level}`);
        setEl('exp-bar', e=>e.style.width=(p.exp/p.expMax*100)+'%');
        setEl('hud-name',   e=>e.textContent=p.charData.name);
        setEl('hud-avatar', e=>e.textContent=`S${stage?.number || 1}`);
        setEl('hud-stage', e=>{
            const objective = stage?.bossSpawned
                ? (stage?.bossDefeated ? 'Boss Down' : 'Boss Live')
                : `Boss ${Math.min(stage?.kills || 0, stage?.bossSpawnKills || 0)}/${stage?.bossSpawnKills || 0}`;
            e.textContent=`Stage ${stage?.number || 1}  ${objective}`;
        });
        p.charData.skills.forEach((sk,i)=>{
            const skill = getSkillDisplayData(p.charData, i);
            setEl(`skill-icon-${i}`,e=>e.textContent=skill.icon);
        });
    }

    function updateSkillUI() {
        ['Z','X','C','V'].forEach((k,i)=>{
            const cd=skillCooldowns[k];
            const el=document.getElementById(`skill-cd-${i}`);
            if (!el) return;
            if (cd>0) { el.style.opacity='1'; el.textContent=cd.toFixed(1); }
            else      { el.style.opacity='0'; el.textContent=''; }
        });
    }

    function setEl(id,fn) { const e=document.getElementById(id); if(e) fn(e); }

    function bindHudUI() {
        if (uiBound) return;
        uiBound = true;
        document.querySelectorAll('.skill-slot').forEach((slot) => {
            slot.addEventListener('mouseenter', () => {
                if (!player) return;
                const index = Number(slot.dataset.skillIndex);
                const skill = getSkillDisplayData(player.charData, index);
                if (!skill) return;
                const tooltip = document.getElementById('skill-tooltip');
                if (!tooltip) return;
                tooltip.innerHTML = `<strong>[${skill.key}] ${skill.name}</strong><br>${skill.desc}`;
                tooltip.classList.add('visible');
            });
            slot.addEventListener('mouseleave', () => {
                document.getElementById('skill-tooltip')?.classList.remove('visible');
            });
        });
    }

    function getSkillDisplayData(char, index) {
        const skill = char?.skills?.[index];
        if (!skill) return null;
        if (index === 2 && isMeleeStyleCharacter(char)) {
            return {
                ...skill,
                name: 'Blade Rush',
                desc: 'Rushes through a chained four-hit melee combo with brief invulnerability.',
            };
        }
        return skill;
    }

    function isMeleeStyleCharacter(char) {
        return ['swordsman','berserker','paladin','darkknight','fighter','assassin','ninja','bladedancer'].includes(char.id);
    }

    /* ═══════════════════════════════════════════════════════
       렌더링
    ═══════════════════════════════════════════════════════ */
    function render() {
        ctx.clearRect(0,0,W,H);
        ctx.save();
        ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));
        renderMap();
        renderEffectsBehind();  // 바닥 이펙트
        renderParticles();
        renderMonsters();
        renderProjectiles();
        renderPlayerV2();
        renderEffectsFront();   // 전면 이펙트
        ctx.restore();
    }

    /* ── 맵 렌더링 ── */
    function renderMap() {
        for (let y=0;y<MAP_H;y++) {
            for (let x=0;x<MAP_W;x++) {
                const wx=x*TILE, wy=y*TILE;
                if (wx+TILE<camera.x||wx>camera.x+W||wy+TILE<camera.y||wy>camera.y+H) continue;
                if (mapTiles[y][x]===1) {
                    // 벽
                    ctx.fillStyle='#243255'; ctx.fillRect(wx,wy,TILE,TILE);
                    ctx.fillStyle='#32446b'; ctx.fillRect(wx+2,wy+2,TILE-4,TILE-4);
                    ctx.fillStyle='rgba(255,255,255,0.10)'; ctx.fillRect(wx+3,wy+3,TILE-6,5);
                    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fillRect(wx+2,wy+TILE-6,TILE-4,4);
                } else {
                    // 바닥 - 약간의 색상 변화로 깊이감
                    const shade=((x+y)%2)?'#1a2540':'#223050';
                    ctx.fillStyle=shade; ctx.fillRect(wx,wy,TILE,TILE);
                    // 격자 선
                    ctx.strokeStyle='rgba(255,255,255,0.06)';
                    ctx.lineWidth=0.5; ctx.strokeRect(wx,wy,TILE,TILE);
                    // 데칼 (장식)
                    const dec=mapDecals[y]?.[x];
                    if (dec) {
                        ctx.font='22px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
                        ctx.globalAlpha=0.35;
                        ctx.fillText(dec,wx+TILE/2,wy+TILE/2);
                        ctx.globalAlpha=1;
                    }
                }
            }
        }
        // 가장자리 어둠 효과
        const edgGrad=ctx.createRadialGradient(
            player.x,player.y,100, player.x,player.y,420);
        edgGrad.addColorStop(0,'transparent');
        edgGrad.addColorStop(1,'rgba(6,10,24,0.34)');
        ctx.fillStyle=edgGrad;
        ctx.fillRect(camera.x,camera.y,W,H);
    }

    /* ── 이펙트 (바닥층) ── */
    function renderEffectsBehind() {
        effects.forEach(e=>{
            if (e.type==='slash'||e.type==='magic_ring'||e.type==='shockwave') return; // 전면
            renderEffect(e);
        });
    }

    /* ── 이펙트 (전면층) ── */
    function renderEffectsFront() {
        effects.forEach(e=>{
            if (e.type==='explosion') return; // 이미 뒤에서 처리됨
            renderEffect(e);
        });
    }

    function renderEffect(e) {
        const t=e.life/e.maxLife; // 1→0
        ctx.save();
        ctx.translate(e.x,e.y);

        switch(e.type) {
            case 'slash': {
                // 호 베기 이펙트
                const prog=1-t; // 0→1
                const r=e.radius||80;
                const arc=1.4;
                const startA=e.angle - arc/2;
                const endA  =e.angle + arc/2;
                // 외곽 호
                ctx.strokeStyle=e.color;
                ctx.lineWidth=(e.thick||5)*(1-prog*0.5);
                ctx.lineCap='round';
                ctx.globalAlpha=t*0.95;
                ctx.shadowColor=e.color; ctx.shadowBlur=18;
                ctx.beginPath(); ctx.arc(0,0,r*(0.6+prog*0.4),startA,endA); ctx.stroke();
                // 내부 호 (흰색 코어)
                ctx.strokeStyle='#ffffff';
                ctx.lineWidth=(e.thick||5)*0.4*(1-prog*0.6);
                ctx.globalAlpha=t*0.7;
                ctx.beginPath(); ctx.arc(0,0,r*(0.5+prog*0.4),startA,endA); ctx.stroke();
                break;
            }
            case 'magic_ring': {
                const prog=1-t;
                const r=(e.radius||20)+(e.maxRadius-e.radius)*prog;
                ctx.strokeStyle=e.color;
                ctx.lineWidth=(e.thick||4)*t;
                ctx.globalAlpha=t*0.8;
                ctx.shadowColor=e.color; ctx.shadowBlur=20;
                ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
                // 내부 반짝임
                ctx.strokeStyle='#fff';
                ctx.lineWidth=(e.thick||4)*0.4*t;
                ctx.globalAlpha=t*0.4;
                ctx.beginPath(); ctx.arc(0,0,r*0.9,0,Math.PI*2); ctx.stroke();
                break;
            }
            case 'explosion': {
                const prog=1-t;
                const r=(e.radius||40)*(1+prog*0.8);
                // 불꽃 방사
                const grad=ctx.createRadialGradient(0,0,0,0,0,r);
                grad.addColorStop(0,'rgba(255,255,255,'+t*0.9+')');
                grad.addColorStop(0.3,hexAlpha(e.color,t*0.7));
                grad.addColorStop(1,'transparent');
                ctx.fillStyle=grad;
                ctx.globalAlpha=t;
                ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
                break;
            }
            case 'shockwave': {
                const prog=1-t;
                const r=(e.maxRadius||150)*prog;
                ctx.strokeStyle=e.color;
                ctx.lineWidth=6*t;
                ctx.globalAlpha=t*0.7;
                ctx.shadowColor=e.color; ctx.shadowBlur=15;
                ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
                ctx.strokeStyle='#fff';
                ctx.lineWidth=3*t;
                ctx.globalAlpha=t*0.3;
                ctx.beginPath(); ctx.arc(0,0,r*0.85,0,Math.PI*2); ctx.stroke();
                break;
            }
            case 'heal_burst': {
                const prog=1-t;
                const r=(e.radius||60)*prog;
                const grad=ctx.createRadialGradient(0,0,0,0,0,r);
                grad.addColorStop(0,'rgba(46,204,113,'+t*0.5+')');
                grad.addColorStop(1,'transparent');
                ctx.fillStyle=grad;
                ctx.globalAlpha=t;
                ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
                break;
            }
            case 'dash_trail': {
                ctx.strokeStyle=e.color;
                ctx.lineWidth=8*t;
                ctx.globalAlpha=t*0.6;
                ctx.shadowColor=e.color; ctx.shadowBlur=12;
                ctx.lineCap='round';
                ctx.beginPath();
                const len=50*t;
                ctx.moveTo(0,0);
                ctx.lineTo(-Math.cos(e.angle)*len, -Math.sin(e.angle)*len);
                ctx.stroke();
                break;
            }
            case 'telegraph': {
                // 돌진 예고 선
                ctx.setLineDash([8,6]);
                ctx.strokeStyle=e.color;
                ctx.lineWidth=3*(e.life/e.maxLife);
                ctx.globalAlpha=(e.life/e.maxLife)*0.8;
                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.lineTo(e.tx-e.x, e.ty-e.y);
                ctx.stroke();
                ctx.setLineDash([]);
                break;
            }
        }
        ctx.restore();
    }

    /* ── 플레이어 렌더링 (몸체 + 무기 분리) ── */
    function renderPlayer() {
        if (!player) return;
        const p=player;
        const char=p.charData;
        ctx.save();
        ctx.translate(p.x, p.y);

        // 그림자
        ctx.fillStyle='rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(0,p.r*0.78,p.r*0.82,p.r*0.32,0,0,Math.PI*2); ctx.fill();

        // 달리기 바운스
        const t = performance.now()*0.001;
        const bounce = p.state==='run' ? Math.sin(t*14)*2.5 : 0;

        // 무적 점멸
        if (p.invincible>0 && Math.floor(p.invincible*10)%2===0) ctx.globalAlpha=0.45;

        // 캐릭터 오라 (색상 광원)
        if (p.state==='attack'||p.buffAtk>1.0) {
            ctx.shadowColor = char.color;
            ctx.shadowBlur  = p.state==='attack' ? 30 : 18;
        }

        // ─── 몸체 이모지 ───
        ctx.save();
        ctx.translate(0, bounce);
        if (p.facing < 0) ctx.scale(-1,1);
        ctx.font = `${p.r*2.3}px serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';

        // 히트 플래시
        if (p.hitFlash>0) { ctx.shadowColor='#fff'; ctx.shadowBlur=25; }

        const bodyEmoji = char.bodyEmoji || char.emoji;
        ctx.fillText(bodyEmoji, 0, 0);
        ctx.restore();

        // ─── 무기 이모지 ───
        const weaponEmoji = char.weaponEmoji;
        if (weaponEmoji) {
            ctx.save();
            const isAttacking = p.state==='attack';
            // 공격 시 무기 스윙 애니메이션
            if (isAttacking) {
                const swingProgress = Math.max(0, 1 - p.stateTimer/0.24); // 0→1
                const swingAngle = p.facing * (1.1 - swingProgress * 2.2); // 뒤→앞으로 스윙
                const wx = p.facing * p.r * 0.65;
                const wy = -p.r * 0.2;
                ctx.translate(wx*0.7+bounce*0.3, wy+bounce);
                ctx.rotate(swingAngle);
                ctx.shadowColor = char.color;
                ctx.shadowBlur  = 22;
            } else {
                // 대기 시: 살짝 기울여 옆에 표시
                const idleBob = Math.sin(t*4)*1.5;
                ctx.translate(p.facing*p.r*0.6, bounce+idleBob);
                ctx.rotate(p.facing*0.55);
            }
            ctx.font = `${p.r*1.55}px serif`;
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(weaponEmoji, 0, 0);
            ctx.restore();
        }

        // 버프 파티클
        if (p.buffAtk>1.0) {
            ctx.globalAlpha=0.5+0.5*Math.sin(t*8);
            ctx.font='14px serif'; ctx.textAlign='center';
            ctx.fillText('✨', p.facing*p.r*0.9, -p.r*1.6);
        }
        // 독 상태
        if (p.poisoned>0) {
            ctx.globalAlpha=0.6;
            ctx.font='12px serif';
            ctx.fillText('☠️', -p.facing*p.r*0.9, -p.r*1.6);
        }

        ctx.restore();

        // HP 바 (플레이어 위)
        renderHpBar(p.x, p.y-p.r-15, p.hp, p.maxHp, 52, 5, '#e74c3c');
    }

    /* ── 몬스터 렌더링 ── */
    function renderPlayerV2() {
        if (!player) return;
        const p=player;
        const char=p.charData;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle='rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(0,p.r*0.78,p.r*0.82,p.r*0.32,0,0,Math.PI*2); ctx.fill();

        const t = performance.now()*0.001;
        const runCycle = p.state==='run' ? Math.sin(t*14) : 0;
        const bounce = p.state==='run' ? runCycle*2.5 : Math.sin(t*2.8)*0.6;
        const torsoTilt = p.state==='attack' ? -0.18 * p.facing : runCycle * 0.08;
        const attackLift = p.state==='attack' ? (1 - p.stateTimer / 0.24) : 0;
        const isMeleeStyle = isMeleeStyleCharacter(char);
        if (p.invincible>0 && Math.floor(p.invincible*10)%2===0) ctx.globalAlpha=0.45;
        if (p.state==='attack'||p.buffAtk>1.0) {
            ctx.shadowColor = char.color;
            ctx.shadowBlur  = p.state==='attack' ? 30 : 18;
        }

        ctx.save();
        ctx.translate(0, bounce);
        if (p.facing < 0) ctx.scale(-1,1);
        ctx.rotate(torsoTilt);
        if (p.hitFlash>0) { ctx.shadowColor='#fff'; ctx.shadowBlur=25; }
        renderCharacterBody(char, p.r, { runCycle, bounce, torsoTilt, attackLift, time:t });
        ctx.restore();

        if (char.weaponEmoji) {
            ctx.save();
            if (p.state==='attack') {
                const swingProgress = Math.max(0, 1 - p.stateTimer/0.24);
                const swingAngle = isMeleeStyle
                    ? p.facing * (1.75 - swingProgress * 3.6)
                    : p.facing * (1.1 - swingProgress * 2.2);
                ctx.translate(
                    p.facing * p.r * (isMeleeStyle ? (0.58 + attackLift * 0.42) : (0.42 + attackLift * 0.25)),
                    -p.r * (isMeleeStyle ? (0.34 + attackLift * 0.2) : (0.22 + attackLift * 0.12)) + bounce
                );
                ctx.rotate(swingAngle);
                ctx.shadowColor = char.color;
                ctx.shadowBlur  = isMeleeStyle ? 30 : 22;
            } else {
                const idleBob = Math.sin(t*4)*1.5;
                ctx.translate(p.facing*p.r*(0.58 + runCycle*0.04), bounce+idleBob-runCycle*1.2);
                ctx.rotate(p.facing*(0.55 + runCycle*0.12));
            }
            if (p.state==='attack' && isMeleeStyle) {
                const trailProgress = Math.max(0, 1 - p.stateTimer/0.24);
                for (let i=0; i<2; i++) {
                    ctx.save();
                    ctx.rotate(-p.facing * (0.22 + i * 0.18) * (1 - trailProgress));
                    ctx.globalAlpha = 0.18 - i * 0.06;
                    ctx.font = `${p.r*(1.9 - i*0.16)}px serif`;
                    ctx.fillStyle = i === 0 ? '#ffffff' : char.color;
                    ctx.fillText(char.weaponEmoji, -p.facing*(6 + i*4), i*2);
                    ctx.restore();
                }
                ctx.save();
                ctx.strokeStyle = hexAlpha(char.color, 0.52);
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.arc(-p.facing*4, 0, p.r*2.05, -1.1, 1.1);
                ctx.stroke();
                ctx.restore();
            }
            ctx.font = `${p.r*(isMeleeStyle ? 1.72 : 1.55)}px serif`;
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(char.weaponEmoji, 0, 0);
            ctx.restore();
        }

        if (p.buffAtk>1.0) {
            ctx.globalAlpha=0.5+0.5*Math.sin(t*8);
            ctx.font='12px sans-serif'; ctx.textAlign='center';
            ctx.fillText('UP', p.facing*p.r*0.9, -p.r*1.6);
        }
        if (p.poisoned>0) {
            ctx.globalAlpha=0.6;
            ctx.font='11px sans-serif';
            ctx.fillText('PSN', -p.facing*p.r*0.9, -p.r*1.6);
        }

        ctx.restore();
        renderHpBar(p.x, p.y-p.r-15, p.hp, p.maxHp, 52, 5, '#e74c3c');
    }

    function renderCharacterBody(char, size, motion = {}) {
        const primary = char.color;
        const accent = char.gender === 'female' ? '#f6c3d0' : '#c9d8ff';
        const armor = ['physical', 'hybrid', 'dark'].includes(char.type) ? '#d5b46a' : '#7dd3fc';
        const cloak = char.type === 'magic' || char.type === 'support' ? '#3b3563' : '#4a2f2f';
        const runCycle = motion.runCycle || 0;
        const headBob = motion.bounce || 0;
        const attackLift = motion.attackLift || 0;
        const time = motion.time || 0;
        const armSwing = runCycle * size * 0.16;
        const legSwing = runCycle * size * 0.22;
        const headY = -size * 0.95 + headBob * 0.12 - attackLift * 1.4;
        const bodyTop = -size * 0.55;
        const bodyBottom = size * 0.75;

        ctx.fillStyle = cloak;
        ctx.beginPath();
        ctx.moveTo(-size * 0.52, bodyTop + size * 0.02);
        ctx.quadraticCurveTo(-size * 0.18, size * 0.16, -size * 0.36, bodyBottom - Math.abs(legSwing) * 0.2);
        ctx.lineTo(size * 0.36, bodyBottom - Math.abs(legSwing) * 0.2);
        ctx.quadraticCurveTo(size * 0.18, size * 0.18, size * 0.52, bodyTop + size * 0.02);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, headY, size * 0.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = primary;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, headY, size * 0.36, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.roundRect(-size * 0.34, bodyTop, size * 0.68, size * 0.95, size * 0.16);
        ctx.fill();

        ctx.strokeStyle = hexAlpha(primary, 0.9);
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-size * 0.18, bodyTop + size * 0.22);
        ctx.lineTo(-size * 0.48, bodyTop + size * 0.48 + armSwing);
        ctx.moveTo(size * 0.18, bodyTop + size * 0.22);
        ctx.lineTo(size * 0.48, bodyTop + size * 0.48 - armSwing);
        ctx.moveTo(-size * 0.10, bodyBottom - size * 0.02);
        ctx.lineTo(-size * 0.18, bodyBottom + size * 0.42 + legSwing);
        ctx.moveTo(size * 0.10, bodyBottom - size * 0.02);
        ctx.lineTo(size * 0.18, bodyBottom + size * 0.42 - legSwing);
        ctx.stroke();

        ctx.fillStyle = armor;
        ctx.beginPath();
        ctx.moveTo(0, bodyTop + size * 0.08);
        ctx.lineTo(size * 0.2, bodyTop + size * 0.32);
        ctx.lineTo(0, bodyTop + size * 0.56);
        ctx.lineTo(-size * 0.2, bodyTop + size * 0.32);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1a1a26';
        ctx.beginPath();
        ctx.arc(-size * 0.1, headY - size * 0.04, size * 0.03, 0, Math.PI * 2);
        ctx.arc(size * 0.1, headY - size * 0.04, size * 0.03, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#1a1a26';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, headY + size * 0.06, size * 0.09, 0.15, Math.PI - 0.15);
        ctx.stroke();

        ctx.strokeStyle = hexAlpha(accent, 0.55 + Math.sin(time * 3) * 0.08);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size * 0.2, headY - size * 0.22);
        ctx.quadraticCurveTo(0, headY - size * 0.38, size * 0.2, headY - size * 0.22);
        ctx.stroke();
    }

    function renderMonsters() {
        monsters.forEach(m=>{
            if (m.hp<=0) return;
            ctx.save();
            ctx.translate(m.x,m.y);

            // 그림자
            ctx.fillStyle='rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(0,m.r*0.78,m.r*0.75,m.r*0.3,0,0,Math.PI*2); ctx.fill();

            // 히트 플래시
            if (m.hitFlash>0) { ctx.shadowColor=m.color; ctx.shadowBlur=20; }

            // 어그로 / 차지 예고
            if (m.aggro&&m.chargePhase!=='charging') {
                ctx.globalAlpha=0.8;
                ctx.font='bold 11px serif'; ctx.textAlign='center';
                ctx.fillStyle='#e74c3c';
                ctx.fillText(m.chargePhase==='telegraph'?'⚠️':'!',0,-m.r-20);
                ctx.globalAlpha=1;
            }

            // 이동 바운스
            const t=performance.now()*0.001;
            if (m.aggro) ctx.translate(0, Math.sin(t*12+m.id*5)*1.5);

            ctx.font=`${m.r*2.2}px serif`;
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(m.emoji,0,0);
            ctx.restore();

            // HP 바
            renderHpBar(m.x,m.y-m.r-10,m.hp,m.maxHp,44,4,m.color);

            // 트롤 HP 재생 표시
            if (m.behavior==='regen'&&m.hp<m.maxHp) {
                ctx.save();
                ctx.font='12px serif'; ctx.textAlign='center';
                ctx.globalAlpha=0.6+(Math.sin(t*5)*0.3);
                ctx.fillText('♻️',m.x+m.r,m.y-m.r-10);
                ctx.restore();
            }
        });
    }

    function renderHpBar(x,y,hp,max,w,h,color) {
        const pct=Math.max(0,hp/max);
        ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(x-w/2,y,w,h);
        // 색상: HP 30% 이하면 깜박이는 빨강
        let barColor=color;
        if (pct<0.3) barColor=`hsl(${0+pct*120},90%,55%)`;
        ctx.fillStyle=barColor; ctx.fillRect(x-w/2,y,w*pct,h);
    }

    /* ── 투사체 렌더링 ── */
    function renderProjectiles() {
        projectiles.forEach(p=>{
            ctx.save();
            // 궤적 (플레이어 투사체만)
            if (!p.isEnemy && p.trail?.length>1) {
                for (let i=1;i<p.trail.length;i++) {
                    const alpha=(1-i/p.trail.length)*0.5;
                    const sz=p.r*(1-i/p.trail.length);
                    ctx.globalAlpha=alpha;
                    ctx.fillStyle=p.color;
                    ctx.beginPath();
                    ctx.arc(p.trail[i].x,p.trail[i].y,Math.max(1,sz),0,Math.PI*2);
                    ctx.fill();
                }
            }
            ctx.restore();
            ctx.save();
            ctx.translate(p.x,p.y);
            ctx.shadowColor=p.color; ctx.shadowBlur=p.isEnemy?10:18;
            ctx.font=`${p.r*2.2}px serif`;
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(p.emoji,0,0);
            ctx.restore();
        });
    }

    /* ── 파티클 렌더링 ── */
    function renderParticles() {
        particles.forEach(p=>{
            const a=p.life/p.maxLife;
            ctx.globalAlpha=a*0.9;
            ctx.shadowColor=p.color; ctx.shadowBlur=6;
            ctx.fillStyle=p.color;
            ctx.beginPath(); ctx.arc(p.x,p.y,p.r*a,0,Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha=1; ctx.shadowBlur=0;
    }

    /* ═══════════════════════════════════════════════════════
       데미지 텍스트
    ═══════════════════════════════════════════════════════ */
    function showDamage(x,y,text,type) {
        const c=document.getElementById('damage-container');
        if (!c) return;
        const el=document.createElement('div');
        el.className=`damage-text ${type}`;
        el.textContent=text;
        const sx=x-camera.x+(Math.random()-0.5)*34;
        const sy=y-camera.y;
        el.style.left=sx+'px'; el.style.top=sy+'px';
        c.appendChild(el);
        setTimeout(()=>el.remove(),1000);
    }

    function renderFrame() {
        ctx.clearRect(0,0,W,H);
        ctx.save();
        ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));
        renderMap();
        renderEffectsBehind();
        renderParticles();
        renderMonsters();
        renderProjectiles();
        renderPlayerV2();
        renderEffectsFront();
        ctx.restore();
        drawMinimap();
    }

    function drawMinimap() {
        if (!minimapCtx || !player) return;
        const mm = minimapCtx;
        const size = minimapCanvas.width;
        const scaleX = size / (MAP_W * TILE);
        const scaleY = size / (MAP_H * TILE);

        mm.clearRect(0, 0, size, size);
        const bg = mm.createLinearGradient(0, 0, 0, size);
        bg.addColorStop(0, '#1a2745');
        bg.addColorStop(1, '#0d1528');
        mm.fillStyle = bg;
        mm.fillRect(0, 0, size, size);

        for (let y=0; y<MAP_H; y++) {
            for (let x=0; x<MAP_W; x++) {
                mm.fillStyle = mapTiles[y][x] === 1 ? 'rgba(119,145,187,0.95)' : (((x+y)%2) ? 'rgba(69,96,145,0.86)' : 'rgba(51,75,120,0.86)');
                mm.fillRect(x * TILE * scaleX, y * TILE * scaleY, TILE * scaleX + 0.6, TILE * scaleY + 0.6);
            }
        }

        monsters.forEach((monster) => {
            if (monster.hp <= 0) return;
            mm.fillStyle = monster.isBoss ? '#ffd166' : (monster.behavior === 'charge' ? '#ff8f4d' : '#ff6b6b');
            mm.beginPath();
            mm.arc(monster.x * scaleX, monster.y * scaleY, monster.isBoss ? 5.5 : Math.max(2.5, monster.r * scaleX * 0.45), 0, Math.PI * 2);
            mm.fill();
        });

        mm.fillStyle = '#6cf0ff';
        mm.beginPath();
        mm.arc(player.x * scaleX, player.y * scaleY, 4.5, 0, Math.PI * 2);
        mm.fill();

        mm.strokeStyle = 'rgba(255,255,255,0.55)';
        mm.lineWidth = 1.5;
        mm.beginPath();
        mm.moveTo(player.x * scaleX, player.y * scaleY);
        mm.lineTo(
            player.x * scaleX + Math.cos(player.facing > 0 ? 0 : Math.PI) * 8,
            player.y * scaleY
        );
        mm.stroke();

        mm.strokeStyle = 'rgba(240,240,255,0.65)';
        mm.lineWidth = 1;
        mm.strokeRect(camera.x * scaleX, camera.y * scaleY, W * scaleX, H * scaleY);
    }

    /* ═══════════════════════════════════════════════════════
       화면 흔들기 / 게임오버
    ═══════════════════════════════════════════════════════ */
    function shakeCanvas(strength=8, duration=0.4) {
        const el=document.getElementById('screen-game');
        if (!el) return;
        let t=0, prev={x:0,y:0};
        const interval=setInterval(()=>{
            t+=0.016;
            if (t>duration) { el.style.transform=''; clearInterval(interval); return; }
            const decay=1-t/duration;
            const sx=(Math.random()-0.5)*strength*2*decay;
            const sy=(Math.random()-0.5)*strength*2*decay;
            el.style.transform=`translate(${sx}px,${sy}px)`;
        },16);
    }

    function showGameOver() {
        gameState='gameover';
        const prev=document.getElementById('gameover-overlay');
        if (prev) prev.remove();
        const ov=document.createElement('div');
        ov.id='gameover-overlay';
        ov.style.cssText=`position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
            align-items:center;justify-content:center;z-index:100;font-family:inherit;`;
        ov.innerHTML=`
            <div style="color:#e74c3c;font-size:52px;font-weight:900;letter-spacing:4px;
                margin-bottom:16px;text-shadow:0 0 30px rgba(231,76,60,0.6)">GAME OVER</div>
            <div style="color:#666;font-size:16px;margin-bottom:10px;">
                캐릭터: ${player.charData.bodyEmoji} ${player.charData.name}
            </div>
            <div style="color:#888;font-size:14px;margin-bottom:40px;">
                Lv.${player.level} · ${player.charData.engName}
            </div>
            <button onclick="document.getElementById('gameover-overlay').remove();GameManager.showCharacterSelect();"
                style="padding:14px 44px;background:#c8a84b;color:#000;border:none;border-radius:8px;
                font-size:16px;font-weight:bold;cursor:pointer;letter-spacing:1px;font-family:inherit;">
                ← 캐릭터 재선택
            </button>`;
        const sc=document.getElementById('screen-game');
        if(sc) sc.appendChild(ov);
    }

    /* ═══════════════════════════════════════════════════════
       유틸
    ═══════════════════════════════════════════════════════ */
    function dist(x1,y1,x2,y2) { return Math.sqrt((x2-x1)**2+(y2-y1)**2); }
    function normAngle(a) { while(a>Math.PI)a-=Math.PI*2; while(a<-Math.PI)a+=Math.PI*2; return a; }
    function hexAlpha(hex,a) {
        const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
        return `rgba(${r},${g},${b},${a})`;
    }

    function stop() {
        if (animId) { cancelAnimationFrame(animId); animId=null; }
        window.removeEventListener('resize', resize);
        window.removeEventListener('keydown',onKeyDown);
        window.removeEventListener('keyup',  onKeyUp);
        gameState='idle'; player=null; stage=null;
        monsters=[]; projectiles=[]; particles=[]; effects=[];
        const dc=document.getElementById('damage-container');
        if (dc) dc.innerHTML='';
        const sc=document.getElementById('screen-game');
        if (sc) sc.style.transform='';
        document.getElementById('gameover-overlay')?.remove();
        document.getElementById('stage-clear-overlay')?.remove();
        document.getElementById('skill-tooltip')?.classList.remove('visible');
    }

    return { init, stop };
})();
