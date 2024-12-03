# NO SEAS

A fast-paced endless runner game where you play as a pirate escaping from ghostly pursuers. Jump, dodge, and use magical powers to survive as long as you can!

## Game Features

### Core Mechanics
- **Double Jump**: Press SPACE twice to perform a double jump
- **Score System**: Distance-based scoring
- **Progressive Difficulty**: Game speed increases as you progress
- **Path Detection**: Game tracks your vertical position to identify successful path navigation

### Path System
- **Multiple Valid Paths**: Game always ensures at least two valid paths through obstacles
- **Vertical Layering**: Paths exist at different heights:
  - Ground level navigation
  - Mid-height platforms
  - Upper level routes
  - Sky walk opportunities
- **Path Validation**: Obstacle spawning algorithm validates path availability
- **Dynamic Generation**: Real-time path creation and validation
- **Fairness System**: If a path becomes blocked, alternate routes are guaranteed
- **Adaptive Difficulty**: 
  - Path complexity increases with score
  - More intricate path combinations at higher levels
  - Multiple escape routes maintained even at high difficulty
- **Path Recognition**: Game detects when player follows intended paths
- **Reward System**: Following paths increases chance of Pirate's Blessing
- **Path Variety**: Different types of paths:
  - Speed runs (ground level)
  - Platform hopping
  - Aerial routes
  - Mixed height combinations

### Power-Ups & Perks
1. **Pirate's Blessing**
   - Earned through skillful path navigation
   - Higher chance when following optimal routes
   - Golden immunity shield
   - Temporary invincibility from all obstacles
   - Can be triggered by collecting other perks

2. **Phase**
   - Semi-transparent effect
   - Pass through obstacles
   - Blinks when about to expire
   - Can trigger Pirate's Blessing

3. **Sky Walk**
   - Run on the ceiling!
   - Smooth transition animations
   - Orange tint effect
   - Immunity during transitions
   - Can trigger Pirate's Blessing

4. **Shrink**
   - Reduce size by 50%
   - Smooth shrink/grow animations
   - Makes dodging easier
   - Can trigger Pirate's Blessing

5. **Slow Spawn**
   - Increases gap between obstacles
   - Orange shimmer effect on right side
   - Visual warning when about to expire
   - Can trigger Pirate's Blessing

### Perk System
- **Chest Collection**: Perks obtained through magical chests
- **Blessing Chance**: Each perk has a chance to trigger Pirate's Blessing
- **Combo System**: Path following increases blessing chances
- **Visual Feedback**: Clear indicators for perk activation and duration

### Obstacles
- **Ghosts**
  - Display random taunting messages
  - Haunting red glow effect
  - Various movement patterns

- **Haunted Objects**
  - Barrels and crates with ghostly effects
  - Subtle floating animations
  - Eerie red tint

### Visual Effects
- Power-up specific visual indicators
- Smooth transitions and animations
- Dynamic lighting and particle effects
- Responsive visual feedback
- Path success indicators

## Controls
- **SPACE**: Jump/Double Jump
- **X**: Skip Tutorial (when available)

## Development
Built using vanilla JavaScript and HTML5 Canvas.

### Key Features
- Smooth animation system
- Collision detection
- Particle effects
- Power-up management
- Progressive difficulty scaling
- Path detection algorithm
- Perk reward system

