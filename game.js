const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game states
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameover'
};

// Load images
const playerRunImage = new Image();
const playerJumpImage = new Image();
const backgroundImage = new Image();
const attackImage = new Image();
const barrelImage = new Image();
const chestImage = new Image();
const crateImage = new Image();

// Set image sources
playerRunImage.src = 'assets/sprites/piraterun.png';
playerJumpImage.src = 'assets/sprites/piratejump.png';
backgroundImage.src = 'assets/sprites/background.png';
attackImage.src = 'assets/sprites/attack.png';
barrelImage.src = 'assets/sprites/barrel.png';
chestImage.src = 'assets/sprites/chest.png';
crateImage.src = 'assets/sprites/crate.png';

// Game variables
let currentGameState = GameState.MENU;
let score = 0;
let highScore = localStorage.getItem('pirateHighScore') || 0;
let obstacles = [];

// Animation constants
const SPRITE_FRAMES = 6;  // Number of frames in sprite sheets
const FRAME_SPEED = 5;    // Speed of animation (lower = faster)

// Game configuration
const gameConfig = {
    floorY: canvas.height - 100,
    initialGameSpeed: 1.0,
    baseMovementSpeed: 5.1,
    minObstacleDistance: 350,
    lastSpeedIncrease: 0,
    speedIncreaseInterval: 2000,
    pathHeight: 120,      // Minimum height for a jump path
    minPathOptions: 3,    // Minimum number of viable paths required
    pathCheckPoints: 5,    // Number of points to check along potential path
    ceilingY: 40  // New ceiling height
};

// Player object with all necessary properties
const player = {
    x: canvas.width / 2 - 40,
    y: gameConfig.floorY - 80,
    width: 80,
    height: 80,
    gravity: 0.8,
    velocity: 0,
    jumpForce: -18,
    skyWalkJumpForce: -9,  // New: Half the regular jump force for sky walking
    isJumping: false,
    groundY: gameConfig.floorY - 80,
    jumpsRemaining: 2,
    maxJumps: 2,
    currentAnimation: 'RUN',
    currentFrame: 0,    // Make sure this is initialized
    frameCount: 0,      // Make sure this is initialized
    opacity: 1,         // Make sure this is initialized
    isPhasing: false,    // Make sure this is initialized
    skyWalkGravity: 0.6,   // New: Reduced gravity for sky walking
};

// Background setup (similar to Blahaj Runner)
const BG_WIDTH = backgroundImage.width || canvas.width;
const EXTRA_BG_SPACE = 2;
const backgrounds = [
    { x: 0, speed: 1 },
    { x: BG_WIDTH - EXTRA_BG_SPACE, speed: 1 },
    { x: (BG_WIDTH * 2) - (EXTRA_BG_SPACE * 2), speed: 1 }
];

// Add active perk tracking
const gameState = {
    activePerk: null,
    perkTimeLeft: 0,
    perkEndTime: 0,
    perkBufferEndTime: 0,  // New: track buffer period
    isInPerkBuffer: false, // New: track if we're in buffer period
    portalPosition: 0,
    exitPortalVisible: false,
    skyWalkActive: false,
    skyWalkTimeout: null,
    portalOpacity: 0,  // Track portal opacity for fade effect
    showPiratesBlessing: false, // Track if we should show the blessing message
    blessingMessageEndTime: 0,   // Track when to stop showing the message
    showPerkText: false,
    perkText: '',
    perkTextEndTime: 0,
    blessingUsed: false,  // Track if blessing has been used for current perk end
    spawnPaused: false,
    spawnPauseEndTime: 0,
    originalSpeed: null,
    originalSpawnDistance: null,
    blessingActive: false,
    blessingEndTime: 0,
    gameStartTime: 0,
    gameEndTime: 0,
    isGameRunning: false,
    tutorialMessages: [
        "Ahoy, landlubber! Welcome to NO SEAS!\n\n" +
        "Ye be runnin' from the ghostly crew, see?\n\n" +
        "Tap the SPACE key to make yer leap, like a dolphin off the bow!\n\n" +
        "Got some sea legs? Tap SPACE twice for a mighty double jump!\n\n" +
        "Them glowing chests be holdin' magical powers, grab 'em if ye dare!\n\n" +
        "Dodge them nasty spirits or ye'll be joining their crew!\n\n" +
        "The Pirate's Blessing will save ye in the nick of time!\n\n" +
        "Ready to set sail? Press SPACE to begin yer adventure!"
    ],
    tutorialOpacity: 0,
    tutorialFading: false,
    currentTutorialMessage: 0,
    fadeSpeed: 0.02,
    showingMenu: false,
    scrollPosition: -canvas.height/2,
    scrollSpeed: 1.215,
    hasPlayedBefore: localStorage.getItem('hasPlayedBefore') === 'true',
    deathTime: 0,
    canRestartAfterDeath: false
};

// Simplified PERKS system with only sky walk
const PERKS = {
    PHASE: {
        name: "PHASE",
        duration: 6000,
        activate: (player) => {
            if (gameState.activePerk) return;
            
            player.isPhasing = true;
            gameState.activePerk = "PHASE";
            player.opacity = 0.5;
            gameState.perkEndTime = Date.now() + 6000;
            
            setTimeout(() => {
                player.isPhasing = false;
                player.opacity = 1;
                endPerk();
            }, 6000);
        }
    },
    SKY_WALK: {
        name: "SKY_WALK",
        duration: 6000,
        activate: (player) => {
            if (gameState.activePerk) return;
            
            gameState.activePerk = "SKY_WALK";
            gameState.perkEndTime = Date.now() + 6000;
            
            setTimeout(() => {
                player.isInverted = true;
                player.y = gameConfig.ceilingY;
                player.groundY = gameConfig.ceilingY;
                gameState.skyWalkActive = true;
            }, 500);
            
            setTimeout(() => {
                endSkyWalk(player);
                endPerk();
            }, 6000);
        }
    },
    SHRINK: {
        name: "SHRINK",
        duration: 6000,
        activate: (player) => {
            if (gameState.activePerk) return;
            
            gameState.activePerk = "SHRINK";
            gameState.perkEndTime = Date.now() + 6000;
            
            // Store original dimensions
            player.originalWidth = player.width;
            player.originalHeight = player.height;
            
            // Calculate new position to keep feet on ground
            const heightDifference = player.height * 0.5; // Since we're shrinking by 50%
            
            // Shrink player
            player.width *= 0.5;
            player.height *= 0.5;
            
            // Adjust Y position to keep feet on ground
            player.groundY = gameConfig.floorY - player.height;
            player.y = player.groundY;
            
            setTimeout(() => {
                // Restore original size
                player.width = player.originalWidth;
                player.height = player.originalHeight;
                // Readjust position for original size
                player.groundY = gameConfig.floorY - player.height;
                player.y = player.groundY;
                endPerk();
            }, 6000);
        }
    },
    SLOW_SPAWN: {
        name: "SLOW_SPAWN",
        duration: 10000,  // 10 seconds
        activate: (player) => {
            if (gameState.activePerk) return;
            
            gameState.activePerk = "SLOW SPAWN";
            gameState.perkEndTime = Date.now() + 10000;
            
            // Store original spawn distance
            gameState.originalSpawnDistance = gameConfig.minObstacleDistance;
            
            // Double the minimum distance between obstacles
            gameConfig.minObstacleDistance *= 2;
            
            setTimeout(() => {
                // Restore original spawn distance
                gameConfig.minObstacleDistance = gameState.originalSpawnDistance;
                endPerk();
            }, 10000);
        }
    }
};

function activateSkyWalk(player) {
    if (gameState.skyWalkActive) return;
    
    // Flip player and move to ceiling after brief delay
    setTimeout(() => {
        player.isInverted = true;
        player.y = gameConfig.ceilingY; // Move to ceiling
        player.groundY = gameConfig.ceilingY;
        gameState.skyWalkActive = true;
        gameState.activePerk = "SKY_WALK";
    }, 500);
    
    // End sky walk after duration
    setTimeout(() => {
        endSkyWalk(player);
    }, 6000);
}

function endSkyWalk(player) {
    player.isInverted = false;
    player.groundY = gameConfig.floorY - player.height;
    player.y = player.groundY;
    gameState.skyWalkActive = false;
    gameState.activePerk = null;
}

function animatePortal(callback) {
    const PORTAL_ANIMATION_DURATION = 500; // milliseconds
    const startTime = Date.now();
    
    function updatePortal() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / PORTAL_ANIMATION_DURATION, 1);
        
        gameState.portalOpacity = Math.sin(progress * Math.PI) * 0.8; // Max opacity 0.8
        
        if (progress < 1) {
            requestAnimationFrame(updatePortal);
        } else {
            if (callback) callback();
        }
    }
    
    requestAnimationFrame(updatePortal);
}

// Add fade effect for collected treasures
class FadingTreasure {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.opacity = 1;
    }

    update() {
        this.opacity -= 0.05;
        return this.opacity > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.drawImage(chestImage, this.x, this.y, this.width, this.height);
        ctx.restore();
    }
}

// Add array to track fading treasures
let fadingTreasures = [];

// Update obstacle types with text effect properties
const obstacleTypes = {
    BARREL: {
        width: 50,
        height: 50,
        speed: 3,
        image: barrelImage,
        dangerous: true
    },
    CRATE: {
        width: 50,
        height: 50,
        speed: 3,
        image: crateImage,
        dangerous: true
    },
    CHEST: {
        width: 50,
        height: 50,
        speed: 3,
        image: chestImage,
        dangerous: false,
        isPerk: true
    },
    ATTACK: {
        width: 60,
        height: 76,
        speed: 3,
        image: attackImage,
        dangerous: true,
        bobAmount: 3,
        bobSpeed: 0.015,
        textEffects: ["Boo!", "Gyat!", "Arrrr!", "I don't have a booty!"],
        textChance: 0.1
    }
};

// Define shake variables
let shakeDuration = 0;
let shakeMagnitude = 0;
let shakeTime = 0;

// Function to trigger screen shake
function triggerShake(duration, magnitude) {
    shakeDuration = duration;
    shakeMagnitude = magnitude;
    shakeTime = 0;
}

// Game loop function
function gameLoop() {
    // Clear canvas once at the start of each frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply screen shake effect
    if (shakeDuration > 0) {
        const shakeX = (Math.random() - 0.5) * shakeMagnitude;
        const shakeY = (Math.random() - 0.5) * shakeMagnitude;
        ctx.translate(shakeX, shakeY);

        shakeTime++;
        if (shakeTime >= shakeDuration) {
            shakeDuration = 0; // Reset shake
        }
    }

    switch(currentGameState) {
        case GameState.MENU:
            updateTutorial();
            drawMenu();
            drawTutorialOverlay();
            break;
        case GameState.PLAYING:
            updateGame();
            drawGame();
            break;
        case GameState.GAME_OVER:
            drawGameOver();
            break;
    }

    // Always update animation regardless of game state
    updatePlayerAnimation();
    requestAnimationFrame(gameLoop);

    // Reset translation after drawing
    if (shakeDuration > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    }
}

function updatePlayerAnimation() {
    player.frameCount++;
    if (player.frameCount >= FRAME_SPEED) {
        player.frameCount = 0;
        player.currentFrame = (player.currentFrame + 1) % SPRITE_FRAMES;
    }
}

function drawGame() {
    // Draw background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw floor and ceiling lines
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';

    // Floor line
    ctx.beginPath();
    ctx.moveTo(0, gameConfig.floorY);
    ctx.lineTo(canvas.width, gameConfig.floorY);
    ctx.stroke();

    // Ceiling line
    ctx.beginPath();
    ctx.moveTo(0, gameConfig.ceilingY);
    ctx.lineTo(canvas.width, gameConfig.ceilingY);
    ctx.stroke();

    // Draw score centered
    ctx.font = '24px GameFont';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(score, canvas.width / 2, gameConfig.ceilingY + 30);
    
    // Draw speed on the right with "Speed:" prefix
    ctx.textAlign = 'right';
    ctx.fillText(`Speed: ${gameConfig.initialGameSpeed.toFixed(1)}`, canvas.width - 20, gameConfig.ceilingY + 30);
    
    // Draw perk status on the left
    ctx.textAlign = 'left';
    if (gameState.activePerk && gameState.perkEndTime) {
        const timeLeft = Math.max(0, gameState.perkEndTime - Date.now());
        const seconds = Math.floor(timeLeft / 1000);
        const milliseconds = timeLeft % 1000;
        
        if (timeLeft > 0) {
            // Replace underscores with spaces for display
            const perkDisplayName = gameState.activePerk.replace(/_/g, ' ');
            ctx.fillText(`${perkDisplayName}: ${seconds}.${milliseconds.toString().padStart(3, '0')}s`, 20, gameConfig.ceilingY + 30);
        } else {
            ctx.fillText('No Perks Active', 20, gameConfig.ceilingY + 30);
        }
    } else {
        ctx.fillText('No Perks Active', 20, gameConfig.ceilingY + 30);
    }

    // Draw player with blessing effect
    const currentImage = player.currentAnimation === 'RUN' ? playerRunImage : playerJumpImage;
    const frameWidth = currentImage.width / SPRITE_FRAMES;
    
    ctx.save();
    
    if (player.isPhasing) {
        ctx.globalAlpha = player.opacity;
    }
    
    // Apply blessing effect
    if (gameState.blessingActive && Date.now() <= gameState.blessingEndTime) {
        // Create shimmering effect using sine wave
        const shimmerIntensity = Math.abs(Math.sin(Date.now() * 0.01)) * 0.3 + 0.7; // Values between 0.7 and 1.0
        
        // Apply golden tint
        ctx.globalCompositeOperation = 'source-atop';
        ctx.filter = `brightness(${shimmerIntensity * 130}%) sepia(50%) saturate(200%) hue-rotate(5deg)`;
    }
    
    // Apply vertical flip if sky walking
    if (player.isInverted) {
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        ctx.scale(1, -1);
        ctx.translate(-(player.x + player.width / 2), -(player.y + player.height / 2));
    }
    
    ctx.drawImage(
        currentImage,
        player.currentFrame * frameWidth,
        0,
        frameWidth,
        currentImage.height,
        player.x,
        player.y,
        player.width,
        player.height
    );
    
    // Add golden glow effect when blessing is active
    if (gameState.blessingActive && Date.now() <= gameState.blessingEndTime) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255, 215, 0, 0.5)'; // Golden glow
        ctx.drawImage(
            currentImage,
            player.currentFrame * frameWidth,
            0,
            frameWidth,
            currentImage.height,
            player.x,
            player.y,
            player.width,
            player.height
        );
        ctx.shadowBlur = 0;
    }
    
    ctx.restore();

    // Draw obstacles with animation support
    obstacles.forEach(obstacle => {
        if (obstacle && obstacle.image) {
            try {
                ctx.save();
                
                if (obstacle.isPerk && gameState.activePerk) {
                    ctx.globalAlpha = 0.3;
                }
                
                ctx.drawImage(
                    obstacle.image,
                    obstacle.x,
                    obstacle.y,
                    obstacle.width,
                    obstacle.height
                );

                // Draw text effect if applicable
                if (obstacle.showText && obstacle.x < canvas.width / 2) {
                    ctx.font = '20px GameFont';
                    ctx.fillStyle = '#FF0000';  // Red color for text
                    ctx.textAlign = 'center';
                    ctx.fillText(obstacle.text, obstacle.x + obstacle.width / 2, obstacle.y - 10);
                }
                
                ctx.restore();
            } catch (error) {
                console.error('Error drawing obstacle:', error);
                console.log('Obstacle data:', obstacle);
            }
        }
    });

    // Draw blessing message if active
    if (gameState.showPiratesBlessing) {
        const timeLeft = Math.max(0, gameState.blessingEndTime - Date.now());
        const seconds = Math.floor(timeLeft / 1000);
        const milliseconds = timeLeft % 1000;

        ctx.font = '24px GameFont';
        ctx.fillStyle = '#FFD700';  // Gold color
        ctx.textAlign = 'center';

        if (timeLeft > 0) {
            ctx.fillText(`Pirate's Blessing: ${seconds}.${milliseconds.toString().padStart(3, '0')}s`, canvas.width / 2, gameConfig.floorY + 50);
        } else {
            ctx.fillText("Pirate's Blessing!", canvas.width / 2, gameConfig.floorY + 50);
        }
    }

    // Draw portal effects if active
    if (gameState.portalOpacity > 0) {
        const portalWidth = 100;
        const portalHeight = 150;
        const portalX = player.x - portalWidth / 2 + player.width / 2;
        
        // Create gradient for portal effect
        const gradient = ctx.createLinearGradient(
            portalX, 
            gameState.portalPosition - portalHeight / 2,
            portalX, 
            gameState.portalPosition + portalHeight / 2
        );
        
        // Set gradient colors based on portal type (entry or exit)
        if (gameState.exitPortalVisible) {
            gradient.addColorStop(0, `rgba(255, 0, 0, ${gameState.portalOpacity})`);
            gradient.addColorStop(0.5, `rgba(255, 100, 0, ${gameState.portalOpacity})`);
            gradient.addColorStop(1, `rgba(255, 0, 0, ${gameState.portalOpacity})`);
        } else {
            gradient.addColorStop(0, `rgba(0, 255, 255, ${gameState.portalOpacity})`);
            gradient.addColorStop(0.5, `rgba(0, 150, 255, ${gameState.portalOpacity})`);
            gradient.addColorStop(1, `rgba(0, 255, 255, ${gameState.portalOpacity})`);
        }
        
        // Draw portal
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(
            portalX + portalWidth / 2,
            gameState.portalPosition,
            portalWidth / 2,
            portalHeight / 2,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Add glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = gameState.exitPortalVisible ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 255, 255, 0.5)';
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow
    }

    // Draw sky walk transition line if active
    if (gameState.skyWalkActive || (gameState.activePerk === "SKY_WALK")) {
        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 2, gameConfig.ceilingY);  // Start at ceiling
        ctx.lineTo(player.x + player.width / 2, gameConfig.floorY);    // End at floor
        ctx.strokeStyle = gameState.skyWalkActive ? '#0000FF' : '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawMenu() {
    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw floor line
    ctx.beginPath();
    ctx.moveTo(0, gameConfig.floorY);
    ctx.lineTo(canvas.width, gameConfig.floorY);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title with new name
    ctx.font = '72px GameFont';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText('NO SEAS', canvas.width / 2, 150);

    // Start instruction
    ctx.font = '36px GameFont';
    ctx.fillText('PRESS SPACE TO START', canvas.width / 2, 220);

    // Draw animated player
    const frameWidth = playerRunImage.width / SPRITE_FRAMES;
    ctx.drawImage(
        playerRunImage,
        player.currentFrame * frameWidth,
        0,
        frameWidth,
        playerRunImage.height,
        canvas.width / 2 - player.width / 2,
        gameConfig.floorY - player.height,
        player.width,
        player.height
    );

    // Credit and high score
    ctx.font = '24px GameFont';
    ctx.fillText('by ashfelloff', canvas.width / 2, gameConfig.floorY + 30);
    ctx.fillText(`HIGH SCORE: ${highScore}`, canvas.width / 2, canvas.height - 50);
}

function updateGame() {
    if (currentGameState !== GameState.PLAYING) return;

    // Update speed every 2 seconds
    const currentTime = Date.now();
    if (currentTime - gameConfig.lastSpeedIncrease >= gameConfig.speedIncreaseInterval) {
        gameConfig.initialGameSpeed += 0.1;
        gameConfig.lastSpeedIncrease = currentTime;
    }

    // Update player
    if (player.isJumping) {
        // Use different gravity based on sky walk state
        const gravity = gameState.skyWalkActive ? player.skyWalkGravity : player.gravity;
        const gravityDirection = gameState.skyWalkActive ? -1 : 1;
        
        player.velocity += gravity * gravityDirection;
        player.y += player.velocity;

        // Handle ground/ceiling collision based on sky walk state
        if (gameState.skyWalkActive) {
            if (player.y <= player.groundY) {
                player.y = player.groundY;
                player.velocity = 0;
                player.isJumping = false;
                player.currentAnimation = 'RUN';
                player.jumpsRemaining = player.maxJumps;
            }
        } else {
            if (player.y >= player.groundY) {
                player.y = player.groundY;
                player.velocity = 0;
                player.isJumping = false;
                player.currentAnimation = 'RUN';
                player.jumpsRemaining = player.maxJumps;
            }
        }
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.x -= gameConfig.baseMovementSpeed * gameConfig.initialGameSpeed;
        
        // Update bobbing animation for ATTACK type
        if (obstacle.bobAmount) {
            obstacle.bobOffset = Math.sin(Date.now() * obstacle.bobSpeed) * obstacle.bobAmount;
            obstacle.y = obstacle.startY + obstacle.bobOffset;
        }
        
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
            score++;
            continue;
        }

        if (checkCollision(player, obstacle)) {
            if (obstacle.dangerous) {
                if (!gameState.isInPerkBuffer) {
                    currentGameState = GameState.GAME_OVER;
                    if (score > highScore) {
                        highScore = score;
                    }
                }
            } else if (obstacle.isPerk) {
                handlePerkCollision(obstacle, i);
            }
        }
    }

    // Spawn new obstacles
    if (obstacles.length === 0 || 
        canvas.width - obstacles[obstacles.length - 1].x >= gameConfig.minObstacleDistance) {
        spawnObstacle();
    }

    // Update perk buffer status
    if (gameState.isInPerkBuffer && Date.now() > gameState.perkBufferEndTime) {
        gameState.isInPerkBuffer = false;
    }

    // Update blessing message
    if (gameState.showPiratesBlessing && Date.now() > gameState.blessingMessageEndTime) {
        gameState.showPiratesBlessing = false;
    }

    // Update obstacle animations
    obstacles.forEach(obstacle => {
        if (obstacle.animated) {
            obstacle.animationCounter++;
            if (obstacle.animationCounter >= obstacle.frameSpeed) {
                obstacle.animationCounter = 0;
                obstacle.currentFrame = (obstacle.currentFrame + 1) % obstacle.frameCount;
            }
        }
    });
}

function spawnObstacle() {
    if (gameState.spawnPaused) return;
    
    const random = Math.random();
    let type;
    
    if (random < 0.3) {
        type = 'BARREL';
    } else if (random < 0.5) {
        type = 'CRATE';
    } else if (random < 0.7) {
        type = 'ATTACK';
    } else {
        type = 'CHEST';
    }
    
    const newObstacle = {
        x: canvas.width,
        y: gameConfig.floorY - obstacleTypes[type].height,
        width: obstacleTypes[type].width,
        height: obstacleTypes[type].height,
        image: obstacleTypes[type].image,
        dangerous: obstacleTypes[type].dangerous,
        isPerk: obstacleTypes[type].isPerk || false,
        startY: gameConfig.floorY - obstacleTypes[type].height,
        bobOffset: 0,
        bobAmount: type === 'ATTACK' ? obstacleTypes[type].bobAmount : 0,
        bobSpeed: type === 'ATTACK' ? obstacleTypes[type].bobSpeed : 0,
        showText: type === 'ATTACK' && Math.random() < obstacleTypes[type].textChance,
        text: type === 'ATTACK' ? 
            obstacleTypes[type].textEffects[
                Math.floor(Math.random() * obstacleTypes[type].textEffects.length)
            ] : ''
    };
    
    obstacles.push(newObstacle);
}

function validatePaths(obstacleList) {
    // Get relevant obstacles (ones that are ahead of the player)
    const relevantObstacles = obstacleList.filter(obs => 
        obs.x > player.x && 
        obs.x < player.x + canvas.width
    );
    
    if (relevantObstacles.length === 0) return true;
    
    // Define possible vertical paths
    const paths = [
        gameConfig.floorY - player.height,  // Ground level
        gameConfig.floorY - gameConfig.pathHeight - player.height,  // Single jump height
        gameConfig.floorY - (gameConfig.pathHeight * 2) - player.height  // Double jump height
    ];
    
    // Check each path
    let viablePaths = 0;
    
    paths.forEach(pathY => {
        if (isPathViable(pathY, relevantObstacles)) {
            viablePaths++;
        }
    });
    
    return viablePaths >= gameConfig.minPathOptions;
}

function isPathViable(pathY, obstacles) {
    // Calculate points along the path to check
    const pathPoints = [];
    const pathLength = canvas.width;
    const stepSize = pathLength / gameConfig.pathCheckPoints;
    
    for (let x = player.x; x < player.x + pathLength; x += stepSize) {
        pathPoints.push({ x, y: pathY });
    }
    
    // Check if any point collides with obstacles
    for (const point of pathPoints) {
        for (const obstacle of obstacles) {
            if (point.x >= obstacle.x && 
                point.x <= obstacle.x + obstacle.width &&
                point.y >= obstacle.y && 
                point.y <= obstacle.y + obstacle.height) {
                return false;
            }
        }
    }
    
    return true;
}

function handleInput(event) {
    if (event.code === 'Space') {
        event.preventDefault();
        
        if (currentGameState === GameState.GAME_OVER) {
            // Only allow restart after 1 second delay
            if (Date.now() - gameState.deathTime >= 1000) {
                currentGameState = GameState.MENU;
                gameState.tutorialStep = 0;
            }
            return;
        }
        
        if (gameState.firstTimePlayer && !gameState.showingMenu) {
            // Only allow proceeding if the text has finished scrolling
            const lines = gameState.tutorialMessages[0].split('\n');
            const totalHeight = lines.length * 40 + 200;
            
            if (gameState.scrollPosition >= totalHeight) {
                gameState.showingMenu = true;
                gameState.firstTimePlayer = false;
                localStorage.setItem('hasPlayedBefore', 'true');
                currentGameState = GameState.MENU;
            }
            return;
        }
        
        if (currentGameState === GameState.MENU) {
            currentGameState = GameState.PLAYING;
            resetGame();
        } else if (currentGameState === GameState.PLAYING) {
            console.log("Attempting jump...");
            if (player.jumpsRemaining > 0) {
                // Use different jump force based on sky walk state
                const jumpForce = gameState.skyWalkActive ? player.skyWalkJumpForce : player.jumpForce;
                player.velocity = gameState.skyWalkActive ? -jumpForce : jumpForce;
                player.isJumping = true;
                player.currentAnimation = 'JUMP';
                player.jumpsRemaining--;
            }
        } else if (currentGameState === GameState.GAME_OVER) {
            currentGameState = GameState.MENU;
            gameState.tutorialStep = 0;
        }
    } 
    else if (event.code === 'KeyJ' && currentGameState === GameState.MENU) {
        // Hidden tutorial trigger
        event.preventDefault();
        gameState.firstTimePlayer = true;
        gameState.showingMenu = false;
        gameState.scrollPosition = -canvas.height/2;
        console.log('Tutorial triggered via hidden J key');
    }
}

function checkCollision(player, obstacle) {
    const hasCollided = (
        player.x < obstacle.x + obstacle.width &&
        player.x + player.width > obstacle.x &&
        player.y < obstacle.y + obstacle.height &&
        player.y + player.height > obstacle.y
    );

    if (!hasCollided) return false;

    // If player is phasing, ignore collisions
    if (player.isPhasing) {
        return false;
    }

    // Handle chest/perk collisions first
    if (obstacle.isPerk) {
        const index = obstacles.indexOf(obstacle);
        handlePerkCollision(obstacle, index);
        return false;
    }

    // Handle dangerous obstacles
    if (obstacle.dangerous) {
        if (gameState.blessingActive && Date.now() <= gameState.blessingEndTime) {
            return false;  // Immune to collision during blessing
        }
        // Stop the clock when player dies and set death time
        if (gameState.isGameRunning) {
            gameState.gameEndTime = Date.now();
            gameState.deathTime = Date.now(); // Record time of death
            gameState.isGameRunning = false;
        }
        return true; // Fatal collision
    }

    return false;
}

function resetGame() {
    console.log("Resetting game...");
    score = 0;
    obstacles = [];
    player.x = canvas.width / 2 - 40;
    player.y = player.groundY;
    player.velocity = 0;
    player.isJumping = false;
    player.currentAnimation = 'RUN';
    player.jumpsRemaining = player.maxJumps;  // Reset jumps
    gameConfig.initialGameSpeed = 1.0;
    gameConfig.lastSpeedIncrease = Date.now();
    gameState.activePerk = null;
    gameState.exitPortalVisible = false;
    gameState.skyWalkActive = false;
    gameState.portalPosition = 0;
    gameState.portalOpacity = 0;
    clearTimeout(gameState.skyWalkTimeout);
    player.isPhasing = false;
    if (player.phaseBlinkInterval) {
        clearInterval(player.phaseBlinkInterval);
        player.phaseBlinkInterval = null;
    }
    player.phaseBlinkState = true;
    player.jumpsRemaining = 0;
    gameState.isInPerkBuffer = false;
    gameState.perkBufferEndTime = 0;
    gameState.showPiratesBlessing = false;
    gameState.blessingMessageEndTime = 0;
    gameState.showPerkText = false;
    gameState.perkText = '';
    gameState.perkTextEndTime = 0;
    gameState.perkEndTime = 0;
    gameState.blessingUsed = false;
    gameState.spawnPaused = false;
    gameState.spawnPauseEndTime = 0;
    gameState.blessingActive = false;
    gameState.blessingEndTime = 0;
    gameState.gameStartTime = Date.now();  // Record when game starts
    gameState.isGameRunning = true;        // Start tracking time
    gameState.gameEndTime = 0;             // Reset end time
    
    // Reset all perk-related states
    gameState.activePerk = null;
    gameState.perkEndTime = 0;
    gameState.skyWalkActive = false;
    gameState.blessingActive = false;
    gameState.blessingEndTime = 0;
    gameState.showPiratesBlessing = false;
    gameState.blessingMessageEndTime = 0;
    gameState.blessingUsed = false;
    gameState.spawnPaused = false;
    gameState.spawnPauseEndTime = 0;
    
    // Reset player states
    player.x = canvas.width / 2 - 40;
    player.y = player.groundY;
    player.velocity = 0;
    player.isJumping = false;
    player.currentAnimation = 'RUN';
    player.jumpsRemaining = player.maxJumps;
    player.currentFrame = 0;
    player.frameCount = 0;
    player.opacity = 1;
    player.isPhasing = false;
    player.isInverted = false;
    
    // Reset player size
    if (player.originalWidth) {
        player.width = player.originalWidth;
        player.height = player.originalHeight;
    }
    
    // Reset spawn distance
    if (gameState.originalSpawnDistance) {
        gameConfig.minObstacleDistance = gameState.originalSpawnDistance;
    }
    
    player.groundY = gameConfig.floorY - player.height;
    player.y = player.groundY;
    
    // Reset player phase properties
    player.isPhasing = false;
    player.opacity = 1;
    if (player.phaseBlinkInterval) {
        clearInterval(player.phaseBlinkInterval);
        player.phaseBlinkInterval = null;
    }
}

function drawBackground() {
    backgrounds.forEach(bg => {
        ctx.drawImage(backgroundImage, bg.x, 0, BG_WIDTH, canvas.height);
    });
}

function updateBackground() {
    backgrounds.forEach(bg => {
        bg.x -= bg.speed;
        if (bg.x <= -BG_WIDTH) {
            bg.x = Math.max(...backgrounds.map(b => b.x)) + BG_WIDTH - EXTRA_BG_SPACE;
        }
    });
}

// Add event listener for space bar
document.addEventListener('keydown', handleInput);

// Make sure images are properly loaded before starting the game
const gameImages = {
    playerRun: playerRunImage,
    playerJump: playerJumpImage,
    barrel: barrelImage,
    crate: crateImage,
    chest: chestImage,
    attack: attackImage,
    background: backgroundImage
};

// Add image loading error handlers
Object.entries(gameImages).forEach(([key, image]) => {
    image.onerror = () => console.error(`Failed to load ${key} image`);
});

// Start game only when all images are loaded
Promise.all([
    new Promise(resolve => playerRunImage.onload = resolve),
    new Promise(resolve => playerJumpImage.onload = resolve),
    new Promise(resolve => backgroundImage.onload = resolve),
    new Promise(resolve => attackImage.onload = resolve),
    new Promise(resolve => barrelImage.onload = resolve),
    new Promise(resolve => chestImage.onload = resolve),
    new Promise(resolve => crateImage.onload = resolve)
]).then(() => {
    console.log('All images loaded successfully');
    currentGameState = GameState.MENU;
    gameLoop();
}).catch(error => {
    console.error('Error loading images:', error);
});

// Add game over screen
function drawGameOver() {
    // Draw white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw "GAME OVER"
    ctx.font = '72px GameFont';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 3);

    // Draw score
    ctx.font = '36px GameFont';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);

    // Calculate and display time alive
    const timeAlive = gameState.gameEndTime - gameState.gameStartTime;
    const aliveSeconds = Math.floor(timeAlive / 1000);
    const aliveMilliseconds = timeAlive % 1000;
    ctx.fillText(
        `Time Alive: ${aliveSeconds}.${aliveMilliseconds.toString().padStart(3, '0')}s`, 
        canvas.width / 2, 
        canvas.height / 2 + 50  // Moved up since we removed high score
    );

    // Calculate time since death with milliseconds
    const timeSinceDeath = Date.now() - gameState.deathTime;
    const delayTime = 1000; // 1 second delay
    
    // Position for the countdown/restart text
    ctx.font = '24px GameFont';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    
    if (timeSinceDeath < delayTime) {
        // Show countdown with milliseconds
        const timeLeft = Math.max(0, delayTime - timeSinceDeath);
        const seconds = Math.floor(timeLeft / 1000);
        const milliseconds = timeLeft % 1000;
        ctx.fillText(
            `${seconds}.${milliseconds.toString().padStart(3, '0')}`, 
            canvas.width / 2, 
            canvas.height - 100
        );
    } else {
        // Show restart prompt
        ctx.fillText('Press SPACE to restart', canvas.width / 2, canvas.height - 100);
    }
}

// Debug function to visualize hitboxes (optional)
function drawHitboxes() {
    // Draw player hitbox
    ctx.strokeStyle = 'red';
    ctx.strokeRect(
        player.x + player.hitbox.xOffset,
        player.y + player.hitbox.yOffset,
        player.hitbox.width,
        player.hitbox.height
    );

    // Draw obstacle hitboxes
    obstacles.forEach(obstacle => {
        ctx.strokeRect(
            obstacle.x + obstacle.hitbox.xOffset,
            obstacle.y + obstacle.hitbox.yOffset,
            obstacle.hitbox.width,
            obstacle.hitbox.height
        );
    });
}

// Optional: Add debug visualization to see collision boxes
function drawDebugCollisionBoxes() {
    // Draw player hitbox
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.strokeRect(
        player.x + player.hitbox.xOffset,
        player.y + player.hitbox.yOffset,
        player.hitbox.width,
        player.hitbox.height
    );

    // Draw obstacle hitboxes
    obstacles.forEach(obstacle => {
        ctx.strokeRect(
            obstacle.x + 10,
            obstacle.y + 10,
            obstacle.width - 20,
            obstacle.height - 20
        );
    });
}

// Add buffer period function
function startPerkBuffer() {
    gameState.isInPerkBuffer = true;
    gameState.perkBufferEndTime = Date.now() + 2000;  // 2 second buffer

    setTimeout(() => {
        gameState.isInPerkBuffer = false;
        gameState.perkBufferEndTime = 0;
    }, 2000);
}

// Simplified path counting function
function countViablePaths(obstacleList) {
    try {
        const relevantObstacles = obstacleList.filter(obs => 
            obs.x > player.x && 
            obs.x < player.x + canvas.width
        );
        
        if (relevantObstacles.length === 0) return "MAX PATH";
        
        // Check for immediate danger
        const hasImmediateThreat = relevantObstacles.some(obs => 
            obs.x - player.x < 100 && // Immediate danger zone
            obs.dangerous
        );
        
        if (hasImmediateThreat) return "ZERO";
        
        // Count basic paths
        let paths = 0;
        
        // Ground path
        if (!relevantObstacles.some(obs => 
            obs.y > gameConfig.floorY - player.height - 20 && 
            obs.dangerous
        )) {
            paths++;
        }
        
        // Jump path
        if (!relevantObstacles.some(obs => 
            obs.y > gameConfig.floorY - 150 && 
            obs.dangerous
        )) {
            paths++;
        }
        
        // High jump path
        if (!relevantObstacles.some(obs => 
            obs.y > gameConfig.floorY - 250 && 
            obs.dangerous
        )) {
            paths++;
        }
        
        return paths === 0 ? "ZERO" : (paths > 3 ? "MAX PATH" : paths);
        
    } catch (error) {
        console.error('Error in path counting:', error);
        return "MAX PATH"; // Default to safe value
    }
}

function calculateSignalLineSegments() {
    try {
        const segments = [];
        const stepSize = 20;
        let currentX = 0; // Start from left edge of canvas
        let currentSegment = {
            start: currentX,
            safe: true
        };
        
        while (currentX < canvas.width) {
            // Simple safety check
            const isSafe = !obstacles.some(obs => 
                obs.x > currentX && 
                obs.x < currentX + 200 && // Look ahead distance
                obs.dangerous
            );
            
            // If safety status changes, end current segment and start new one
            if (isSafe !== currentSegment.safe) {
                currentSegment.end = currentX;
                segments.push({...currentSegment});
                currentSegment = {
                    start: currentX,
                    safe: isSafe
                };
            }
            
            currentX += stepSize;
        }
        
        // End final segment
        currentSegment.end = canvas.width;
        segments.push({...currentSegment});
        
        return segments;
        
    } catch (error) {
        console.error('Error in signal line calculation:', error);
        return [{
            start: 0,
            end: canvas.width,
            safe: true
        }];
    }
}

function handlePerkCollision(obstacle, index) {
    console.log("Perk collision detected!"); // Debug log
    
    // Remove the chest
    obstacles.splice(index, 1);
    
    // Select and activate a random perk
    const perkKeys = Object.keys(PERKS);
    const randomPerk = perkKeys[Math.floor(Math.random() * perkKeys.length)];
    console.log("Activating perk:", randomPerk); // Debug log
    
    PERKS[randomPerk].activate(player);
}

// Reset blessing state when perk ends
function endPerk() {
    gameState.activePerk = null;
    
    // Start Pirate's Blessing immunity period
    gameState.blessingActive = true;
    gameState.blessingEndTime = Date.now() + 2000; // 2 seconds of immunity
    gameState.showPiratesBlessing = true;
    gameState.blessingMessageEndTime = Date.now() + 2000;
    
    // Pause spawning during blessing
    gameState.spawnPaused = true;
    setTimeout(() => {
        gameState.spawnPaused = false;
        gameState.blessingActive = false;
        gameState.showPiratesBlessing = false;
    }, 2000);
}

// Add tutorial overlay drawing
function drawTutorialOverlay() {
    if (!gameState.firstTimePlayer) return;

    // Draw white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameState.showingMenu) {
        // Draw tutorial text with 10% smaller font (25px instead of 28px)
        ctx.font = '25px GameFont';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        
        // Split all text into lines
        const lines = gameState.tutorialMessages[0].split('\n');
        
        // Draw each line
        lines.forEach((line, index) => {
            if (line.trim() !== '') {
                ctx.fillText(
                    line, 
                    canvas.width / 2, 
                    canvas.height/2 - gameState.scrollPosition + (index * 30) // Adjusted spacing for smaller font
                );
            }
        });

        // Calculate when text is halfway off screen
        const totalTextHeight = lines.length * 30;
        const halfwayPoint = totalTextHeight / 2;
        
        if (gameState.scrollPosition > halfwayPoint) {
            // Calculate position for "Press SPACE" text
            let spaceTextY = canvas.height/2 - gameState.scrollPosition + (lines.length * 30) + 50;
            
            // Clamp the Y position to not go above middle of screen
            spaceTextY = Math.max(canvas.height/2, spaceTextY);
            
            ctx.font = '22px GameFont'; // Slightly smaller than tutorial text
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillText('Press SPACE to continue', canvas.width / 2, spaceTextY);
        }
    }
}

// Update tutorial state
function updateTutorial() {
    if (!gameState.firstTimePlayer) return;

    if (!gameState.showingMenu) {
        gameState.scrollPosition += gameState.scrollSpeed;
        
        // Calculate total height of text
        const lines = gameState.tutorialMessages[0].split('\n');
        const totalHeight = lines.length * 40 + 400; // Add extra space for smooth scrolling
        
        // Stop scrolling when all text is visible
        if (gameState.scrollPosition >= totalHeight) {
            gameState.scrollPosition = totalHeight;
        }
    }
}

// Make sure tutorial starts for new players
function initGame() {
    if (!gameState.hasPlayedBefore) {
        gameState.firstTimePlayer = true;
        gameState.showingMenu = false;
        gameState.scrollPosition = -canvas.height/2;
    }
}

// Call initGame when the game starts
window.addEventListener('load', initGame);

