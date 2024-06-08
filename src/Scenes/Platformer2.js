class Platformer2 extends Phaser.Scene {
    constructor() {
        super("Platformer2Scene");
        this.t = {text: {}};
    }

    init() {
        // variables and settings
        // World
        this.gameEnd = false;
        this.worldX = 5280;
        this.worldY = 960;
        this.checkpointX = 70;
        this.checkpointY = 816;
        this.keyRestart = false;
        this.gemCount = 0;
        this.screen = 1;
        this.furthest = 0;
        this.level = 1;

        // Player
        this.ACCELERATION = 2000;
        this.DRAG = 2500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 2500;
        this.JUMP_VELOCITY = -925;
        this.PARTICLE_VELOCITY = 50;
        this.MAX_SPEED = 400;
        this.goingLeft = false;
        this.playFall = false;
        this.coyoteTime = 0;
        
        // Grapple
        this.grappleLocations = [];
        this.grappleRange = 400;
        this.inRange = false;
        this.grappleCooldown = false;
        this.grappleSpeed = 1400;
        this.vx = 0;
        this.vy = 0;
        this.flying = false;

        // Spring
        this.springTiles = [];
        this.springCooldown = 0;
        this.springVX = 0;
        this.springVY = 0;
    }

    create() {
        // Create a new tilemap game object which uses 16x16 pixel tiles, and is
        // 165 tiles wide and 30 tiles tall.
        //this.map = this.add.tilemap("level1", 16, 16, 165, 30);
        this.map = this.add.tilemap("level2", 16, 16, 165, 30);
        this.physics.world.setBounds(0, 0, this.worldX, this.worldY+40);
        this.cameras.main.setBounds(0, 0, this.worldX, this.worldY);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("one_bit", "tiles");

        // Sound effects
        this.jumpSound = this.sound.add('jumpFX', {
            volume: 0.4,
            loop: false
        });

        this.grappleSound = this.sound.add('grappleFX', {
            volume: 0.5,
            loop: false
        });
        
        this.collectSound = this.sound.add('collectFX', {
            volume: 1,
            loop: false
        });
        this.fallSound = this.sound.add('fallFX', {
            volume: 0.5,
            loop: false
        });

        // Create layers
        this.platformLayer = this.map.createLayer("Platforms", this.tileset, 0, 0);
        this.platformLayer.setScale(2.0);
        this.grappleLayer = this.map.createLayer("Grapple", this.tileset, 0, 0);
        this.grappleLayer.setScale(2.0);
        this.detailsLayer = this.map.createLayer("Details", this.tileset, 0, 0);
        this.detailsLayer.setScale(2.0);

        // find grapple locations
        this.grappleLayer.forEachTile(tile => {
            if (tile.index !== -1) { // Check if the tile is not empty
                const grappleX = tile.getCenterX();
                const grappleY = tile.getCenterY();
                this.grappleLocations.push(grappleX);
                this.grappleLocations.push(grappleY);
            }
        });
        
        for(let i = 0; i < this.grappleLocations.length; i+=2) // find grapple locations
        {
            this.grappleLocations[i] = this.grappleLocations[i];
            this.grappleLocations[i+1] = this.grappleLocations[i+1] + 10;
        }

        // set up player avatar 40, 750, 1800, 240,
        my.sprite.player = this.physics.add.sprite(40, 750-100, "platformer_characters", "tile_0281.png").setScale(SCALE);
        my.sprite.player.setCollideWorldBounds(true);
        
        // Collectible objects
        this.gems = this.map.createFromObjects("Collectibles", {
            name: "gem",
            key: "tilemap_sheet",
            frame: 82
        });

        this.gems.forEach(gem => {
            gem.setScale(2); 
            gem.x = gem.x*2;
            gem.y = gem.y*2 - 8;
            //animation for the gem to float up and down
            this.tweens.add({
                targets: gem,
                y: '+=10',
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                duration: 500 // Duration for the tween to complete (1 second)
            });

        });

        this.physics.world.enable(this.gems, Phaser.Physics.Arcade.STATIC_BODY);
        this.gemGroup = this.add.group(this.gems);
        
        this.physics.add.overlap(my.sprite.player, this.gemGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            this.gemCount++;
            this.collectSound.play();
        });

        // Spring objects
        this.springs = this.map.createFromObjects("Springs", {
            name: "spring",
            key: "tilemap_sheet",
            frame: 163
        });

        this.springs.forEach(spring => {
            spring.setScale(2); 
            spring.x = spring.x*2;
            spring.y = spring.y*2;
        });

        this.physics.world.enable(this.springs, Phaser.Physics.Arcade.STATIC_BODY);
        this.springGroup = this.add.group(this.springs);

        this.physics.add.overlap(my.sprite.player, this.springGroup, (obj1, obj2) => 
        {
            if(this.springCooldown <= 0)
            {
                //console.log(obj2.data.list.facing);
                obj2.play("springAnim");
                //my.sprite.player.y -= 5;
                this.springCooldown = 2;
                // Perform actions based on the facing direction
                if(obj2.data.list.facing == 'up')
                    this.springVY = this.JUMP_VELOCITY*1.2;

                else if(obj2.data.list.facing == 'down')
                    this.springVY = -this.JUMP_VELOCITY*1.2;

                else if(obj2.data.list.facing =='left')
                    this.springVX = this.JUMP_VELOCITY*1.2;

                else if(obj2.data.list.facing =='right') 
                    this.springVX = -this.JUMP_VELOCITY*1.2;
                else
                    return;
            }
        });

        // Make platforms collidable
        this.platformLayer.setCollisionByProperty({collides: true});


        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.platformLayer);
        this.physics.world.TILE_BIAS = 32;

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();
        this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.r = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.m = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.k = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
        this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // debug key listener (assigned to P key)
        this.physics.world.drawDebug = false;
        this.input.keyboard.on('keydown-P', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        // Grapple 
        this.line = this.add.line(0, 0, my.sprite.player.x, my.sprite.player.y, my.sprite.player.x, my.sprite.player.y, 0xff0000, 1);
        this.line.setLineWidth(2);
        this.line.visible = false;

        // Spring
        this.physics.world.overlapTiles(my.sprite.player, this.springTiles, this.hitSpring, null, this);

        // Text
        this.t.text.title = this.add.text(50, 200, "Level 2", {
            fontSize: 20
        });
        this.t.text.title.setScale(4);
        this.t.text.title.visible = true;

        this.t.text.lose = this.add.text(400, 250, "YOU FAILED");
        this.t.text.lose.setDepth(1);
        this.t.text.lose.setScale(3);
        this.t.text.lose.visible = false;
        this.t.text.restart = this.add.text(400, 300, "Press any key to restart");
        this.t.text.restart.visible = false;
        this.t.text.restart.setDepth(1);
        
        this.t.text.win = this.add.text(4750, 200, "YOU WIN!", {
            fontSize: 30
        });
        this.t.text.win.setDepth(1);
        this.t.text.win.setScale(3);
        this.t.text.win.visible = false;
        this.t.text.k = this.add.text(4750, 300, "Press k to restart from the beginning");
        this.t.text.k.visible = false;
        this.t.text.k.setDepth(1);

        this.t.text.gemsCollected = this.add.text(765, 7, "Gems Collected: " + this.gemCount + "/" + 3);
        this.t.text.gemsCollected.setScale(1.3);

        //this.t.text.hint1 = this.add.text(1350, 160, "Tip: Hold down space! \nRelease when the line is white!");
        
        
        this.anims.create({
            key: 'springAnim',
            frames: this.anims.generateFrameNumbers('tilemap_sheet', { start: 165, end: 163}), // Adjust start and end frame indices
            frameRate: 10, // Adjust frame rate
            repeat: 0 // Do not loop the animation
        });

        my.vfx.dashing = this.add.particles(0, 0, "tilemap_sheet", {
            frame: [ 139, 194, 174, 154, 179],
            // TODO: Try: add random: true
            scale: {start: 1, end: 0.1},
            // TODO: Try: maxAliveParticles: 8,
            lifespan: 350,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.dashing.stop();

        this.input.keyboard.on('keydown', () => {
            this.tweens.add({
                targets: [this.t.text.title, this.t.text.controls],
                alpha: 0, // Target alpha value (fully transparent)
                duration: 2000, // Duration of the tween in milliseconds
                ease: 'Power2'
            });
        })

        }

    update() {

        // Restart game
        if(this.k.isDown)
        {
            this.scene.restart();
        }

        // Screens and checkpoints
        this.t.text.gemsCollected.setText("Gems Collected: " + this.gemCount + "/" + 3);
        if(my.sprite.player.x <= 1760)
        {
            this.screen = 1;
            if(this.screen > this.furthest)
            {
                this.checkpointX = 70;
                this.checkpointY = 600;
                this.furthest = this.screen;
            }
            this.cameraPointX = 40;
            this.cameraPointY = 816;
            this.cameras.main.pan(0, 0, 1000, 'Power2');
            this.t.text.lose.x = 400;
            this.t.text.restart.x = 400;
            this.t.text.gemsCollected.x = 765;

        }
        if(my.sprite.player.x > 1760 && my.sprite.player.x < 3520)
        {
            this.screen = 2;
            if(this.screen > this.furthest)
            {
                this.checkpointX = 1790;
                this.checkpointY = 850;
                this.furthest = this.screen;
            }
            this.cameraPointX = 1760;
            this.cameraPointY = 240;
            this.t.text.lose.x = this.cameraPointX + 800;
            this.t.text.restart.x = this.cameraPointX + 800;
            this.t.text.gemsCollected.x = this.cameraPointX + 800;
            this.cameras.main.pan(this.cameraPointX+this.cameraPointX/2, 0, 1000, 'Power2');
            
            
        }
        if(my.sprite.player.x > 3520)
        {
            this.screen = 3;
            if(this.screen > this.furthest)
            {
                this.checkpointX = 3550;
                this.checkpointY = 528;
                this.furthest = this.screen;
            }
            this.cameraPointX = 3520;
            this.cameraPointY = 528;
            this.t.text.lose.x = this.cameraPointX + 900;
            this.t.text.restart.x = this.cameraPointX + 900;
            this.t.text.lose.y = this.cameraPointY-100;
            this.t.text.restart.y = this.cameraPointY-100+50;
            this.t.text.gemsCollected.x = this.cameraPointX + 700;
            this.cameras.main.pan(this.cameraPointX+this.cameraPointX/2, 0, 1000, 'Power2');
        }

        //console.log(my.sprite.player.x, my.sprite.player.y);
        if (my.sprite.player.y + my.sprite.player.height / 2 >= this.sys.game.config.height) {
            this.gameEnd = true;
            if(!this.playFall)
            {
                this.playFall = true;
                this.fallSound.play();
            }
        }
        if(this.playFall)
        {
            if(this.r.isDown)
            {
                this.playFall = false;
            }
        }

        if(this.gameEnd)
        {
            this.t.text.lose.visible = true;
            this.t.text.restart.visible = true;
            my.sprite.player.visible = false;
            my.sprite.player.body.setVelocityX(0);
            my.sprite.player.body.setVelocityY(0);
            my.sprite.player.body.setAccelerationX(0);
            this.grappleCooldown = true;
            this.input.keyboard.on('keydown', () => {
                this.keyRestart = true;
            })
        }
        else
        {
            this.t.text.lose.visible = false;
            this.t.text.restart.visible = false;
            this.keyRestart = false;
        }
        if(this.r.isDown || this.keyRestart)
        {
            my.sprite.player.visible = true;
            my.sprite.player.x = this.checkpointX;
            my.sprite.player.y = this.checkpointY;
            my.sprite.player.body.setVelocityX(0);
            my.sprite.player.body.setVelocityY(0);
            my.sprite.player.body.setAccelerationX(0);
            this.gameEnd = false;
            this.keyRestart = false;

            this.t.text.win.visible = false;
            this.t.text.k.visible = false;
        }

        // Grapple
        let closestCoords = [0, 0];
        var closest = 1000000000;
        for(let i = 0; i < this.grappleLocations.length; i+=2) // find grapple locations
        {
            var dx = my.sprite.player.x - this.grappleLocations[i];
            var dy = my.sprite.player.y - this.grappleLocations[i+1];
            var dist = Math.sqrt(dx*dx + dy*dy);
            //console.log(closest);
            if(dist < closest)
            {
                closest = dist;
                closestCoords[0] = this.grappleLocations[i];
                closestCoords[1] = this.grappleLocations[i+1];
            }
        }
        this.line.setTo(my.sprite.player.x, my.sprite.player.y, closestCoords[0], closestCoords[1]); // create line 
        
        if(this.space.isDown && !this.grappleCooldown) // if space is pressed, show line
        {
            this.line.visible = true;  
            var dx = my.sprite.player.x - closestCoords[0];
            var dy = my.sprite.player.y - closestCoords[1];
            var dist = Math.sqrt(dx*dx + dy*dy); 
            if(dist < this.grappleRange)
            {
                this.line.strokeColor = 0xffffff;
                this.inRange = true;
            }
            else
            {
                this.line.strokeColor = 0xff0000;
                this.inRange = false;
            }
        }
        else
        {
            this.line.visible = false;
        }
        
        if(Phaser.Input.Keyboard.JustUp(this.space) && this.inRange && !this.grappleCooldown) // when space is let go, launch player
        {
            my.sprite.player.body.blocked.down = false;
            this.line.visible = false;
            var dx = my.sprite.player.x - closestCoords[0];
            var dy = my.sprite.player.y - closestCoords[1];
            var theta = Math.atan2(dy, dx);
            this.vx = -this.grappleSpeed*Math.cos(theta);
            this.vy = -this.grappleSpeed*Math.sin(theta);
            my.sprite.player.body.setVelocityX(this.vx);
            my.sprite.player.body.setVelocityY(this.vy);
            this.grappleCooldown = true;
            this.grappleSound.play();
            my.sprite.player.alpha = 0.5;
            my.vfx.dashing.start();
            my.vfx.dashing.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            my.vfx.dashing.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            if(Math.abs(this.vx) > this.MAX_SPEED)
            {
                this.flying = true;
                
            }
            
        }
        if(my.sprite.player.body.blocked.down || Math.abs(this.springVX) > 0 || Math.abs(this.springVY) > 0)
        {
            this.grappleCooldown = false;
            this.flying = false;
            my.sprite.player.alpha = 1;
        }
        if(!this.flying)
        {
            my.vfx.dashing.stop();
        }

        // Spring
        if(this.springCooldown > 0)
        {
            this.springCooldown--;
            //console.log(this.springCooldown);
        }
        if(Math.abs(this.springVX) > 0)
        {
            my.sprite.player.body.setVelocityX(this.springVX);
            this.springVX = 0;
        }
        if(Math.abs(this.springVY) > 0)
        {
            //console.log(this.springVY);
            my.sprite.player.body.setVelocityY(this.springVY);
            this.springVY = 0;
        }
        

        // Win
        if(my.sprite.player.x <= 5110  && my.sprite.player.x > 5101 && my.sprite.player.y == 624) // Win door
        {
            this.t.text.win.visible = true;
            this.t.text.k.visible = true;
            my.sprite.player.body.setVelocityX(0);
            my.sprite.player.body.setVelocityY(0);
            my.sprite.player.body.setAccelerationX(0);
            this.grappleCooldown = true;
        }

        // Movement 
        else if(this.a.isDown || cursors.left.isDown) // Going left
        {
            if(my.sprite.player.body.blocked.down && my.sprite.player.body.velocity.x > 0 && (this.a.isDown || cursors.left.isDown)) // going left but right key down
            {
                my.sprite.player.body.setVelocityX(0);
            }
            if(!this.goingLeft && (my.sprite.player.body.blocked.down || this.flying))
            {
                if(my.sprite.player.body.blocked.down)
                    my.sprite.player.body.setVelocityX(0);
                this.goingLeft = true;
                this.flying = false;
            }
            if(this.flying && my.sprite.player.body.velocity.x > 0)
            {
                this.flying = false;
            }
            if(my.sprite.player.body.blocked.left && (!this.grappleCooldown || this.springCooldown <= 0))
            {
                my.sprite.player.body.setVelocityX(0);
                this.flying = false;
            }
            //console.log(my.sprite.player.body.velocity.x);
            else if(this.grappleCooldown && this.flying)
            {
                my.sprite.player.body.setVelocityX(this.vx);
            }
            else if(my.sprite.player.body.velocity.x > -this.MAX_SPEED)
            {
                my.sprite.player.body.setAccelerationX(-this.ACCELERATION);
            }
            else
            {
                my.sprite.player.body.setAccelerationX(0);
            }
            
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            this.goingLeft = true;

        } 
        else if(this.d.isDown || cursors.right.isDown) // Going right
        { 
            if(my.sprite.player.body.blocked.down && my.sprite.player.body.velocity.x < 0) // going left but right key down
            {
                my.sprite.player.body.setVelocityX(0);
            }
            if(this.goingLeft && (my.sprite.player.body.blocked.down || this.flying))
            {
                if(my.sprite.player.body.blocked.down)
                    my.sprite.player.body.setVelocityX(0);
                this.goingLeft = false;
                this.flying = false;
            }
            if(this.flying && my.sprite.player.body.velocity.x < 0)
            {
                this.flying = false;
            }
            //console.log(my.sprite.player.body.velocity.x);
            if(my.sprite.player.body.blocked.right && (!this.grappleCooldown || this.springCooldown <= 0))
            {
                my.sprite.player.body.setVelocityX(0);
                this.flying = false;
            }
            else if(this.grappleCooldown && this.flying)
            {
                my.sprite.player.body.setVelocityX(this.vx);
            }
            else if(my.sprite.player.body.velocity.x < this.MAX_SPEED)
            {
                my.sprite.player.body.setAccelerationX(this.ACCELERATION);
            }
            else
            {
                my.sprite.player.body.setAccelerationX(0);
            }
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            this.goingLeft = false;

        } else {
            // TODO: set acceleration and velocity to 0 
            my.sprite.player.body.setAccelerationX(0);
            if(!my.sprite.player.body.blocked.down)
            {
                my.sprite.player.body.setDragX(this.DRAG);
                this.flying = false;
            }
            else // on ground
            {
                my.sprite.player.body.setVelocityX(0);
            }
            my.sprite.player.anims.play('idle');
        }

        // player jump
        // coyote time
        if(my.sprite.player.body.blocked.down)
        {
            this.coyoteTime = 15;
        }
        else if(this.coyoteTime > 0)
        {
            this.coyoteTime--;
        }
        else 
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(!this.gameEnd && (my.sprite.player.body.blocked.down || this.coyoteTime > 0) && (Phaser.Input.Keyboard.JustDown(cursors.up) || Phaser.Input.Keyboard.JustDown(this.w))) {
            // TODO: set a Y velocity to have the player "jump" upwards (negative Y direction)
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            this.jumpSound.play();
            
        }

        if(this.m.isDown)
        {   
            let px = 142;
            let py = 8;
            my.sprite.player.x = px * 32;
            my.sprite.player.y = py * 32;
        }
        
    }
}