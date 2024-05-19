class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
        this.t = {text: {}};
    }

    init() {
        // variables and settings
        this.ACCELERATION = 1500;
        this.DRAG = 2500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 2500;
        this.JUMP_VELOCITY = -925;
        this.MAX_SPEED = 400;
        this.goingLeft = false;
        this.grappleCooldown = false;
        this.inRange = false;
        this.offsetX = 16.5;
        this.offsetY = 23;
        
        this.grappleLocations1 = [16,4, 40,11, 64,5, 75,25];
        for(let i = 0; i < this.grappleLocations1.length; i+=2) // find grapple locations
        {
            this.grappleLocations1[i] = this.grappleLocations1[i] * 32 + this.offsetX;
            this.grappleLocations1[i+1] = this.grappleLocations1[i+1] * 32 + this.offsetY;
        }

        this.level = 1;
        this.grappleSpeed = 1400;
        this.vx = 0;
        this.vy = 0;
        this.flying = false;
        this.grappleRange = 400;
        this.gameEnd = false;
        this.gemAnimUp = false;
        this.worldX = 5280;
        this.worldY = 960;
    }

    create() {
        // Create a new tilemap game object which uses 16x16 pixel tiles, and is
        // 165 tiles wide and 30 tiles tall.
        this.map = this.add.tilemap("level", 16, 16, 165, 30);
        this.physics.world.setBounds(0, 0, this.worldX, this.worldY+40);
        this.cameras.main.setBounds(0, 0, this.worldX, this.worldY);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("one_bit", "tiles");


        // Create layers
        this.platformLayer = this.map.createLayer("Platforms", this.tileset, 0, 0);
        this.platformLayer.setScale(2.0);
        this.grappleLayer = this.map.createLayer("Grapple", this.tileset, 0, 0);
        this.grappleLayer.setScale(2.0);
        this.detailsLayer = this.map.createLayer("Details", this.tileset, 0, 0);
        this.detailsLayer.setScale(2.0);

        // set up player avatar 40 750
        my.sprite.player = this.physics.add.sprite(1800, 240, "platformer_characters", "tile_0281.png").setScale(SCALE);
        my.sprite.player.setCollideWorldBounds(true);
        
        // Collectible objects
        this.gems = this.map.createFromObjects("Collectibles", {
            name: "gem",
            key: "tilemap_sheet",
            frame: 82
        });

        this.gems.forEach(gem => {
            gem.setScale(2); 
            gem.x += 71;
            gem.y += 180;
            //animation for the gem to float up and down
            this.tweens.add({
                targets: gem,
                y: '+=8',
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                duration: 1000 // Duration for the tween to complete (1 second)
            });

        });

        this.physics.world.enable(this.gems, Phaser.Physics.Arcade.STATIC_BODY);
        
        this.gemGroup = this.add.group(this.gems);
        
        this.physics.add.overlap(my.sprite.player, this.gemGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
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

        // Text
        this.t.text.lose = this.add.text(310, 250, "GAME OVER");
        this.t.text.lose.setDepth(1);
        this.t.text.lose.setScale(2);
        this.t.text.lose.visible = false;
        this.t.text.restart = this.add.text(312, 300, "Press r to restart");
        this.t.text.restart.visible = false;
        this.t.text.restart.setDepth(1);

        my.vfx.dashing = this.add.particles(0, 0, "tilemap_sheet", {
            frame: ['tile_0141.png'],
            // TODO: Try: add random: true
            scale: {start: 0.03, end: 0.1},
            // TODO: Try: maxAliveParticles: 8,
            lifespan: 350,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.dashing.stop();

    }

    update() {
        //console.log(my.sprite.player.x, my.sprite.player.y);
        if (my.sprite.player.y + my.sprite.player.height / 2 >= this.sys.game.config.height) {
            this.gameEnd = true;
        }

        if(this.gameEnd)
        {
            this.t.text.lose.visible = true;
            this.t.text.restart.visible = true;
        }

        // Camera
        this.cameras.main.setBounds(0, 0, this.worldX, this.worldY);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);

        // Grapple
        let closestCoords = [0, 0];
        
        if(this.level == 1)
        {
            var closest = 1000000000;
            for(let i = 0; i < this.grappleLocations1.length; i+=2) // find grapple locations
            {
                var dx = my.sprite.player.x - this.grappleLocations1[i];
                var dy = my.sprite.player.y - this.grappleLocations1[i+1];
                var dist = Math.sqrt(dx*dx + dy*dy);
                //console.log(closest);
                if(dist < closest)
                {
                    closest = dist;
                    closestCoords[0] = this.grappleLocations1[i];
                    closestCoords[1] = this.grappleLocations1[i+1];
                }
            }
            this.line.setTo(my.sprite.player.x, my.sprite.player.y, closestCoords[0], closestCoords[1]); // create line 
            
        }
        
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
            this.flying = true;
            my.vfx.dashing.start();
            my.vfx.dashing.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            my.vfx.dashing.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
        }
        if(my.sprite.player.body.blocked.down)
        {
            this.grappleCooldown = false;
            my.vfx.dashing.stop();
        }
        // Movement 
        if(this.a.isDown || cursors.left.isDown) 
        {
            // the player accelerates to the left.
            if(!this.goingLeft && (my.sprite.player.body.blocked.down || this.flying))
            {
                if(my.sprite.player.body.blocked.down)
                    my.sprite.player.body.setVelocityX(0);
                this.goingLeft = true;
                this.flying = false;
            }
            //console.log(my.sprite.player.body.velocity.x);
            if(this.grappleCooldown && this.flying)
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

        } else if(this.d.isDown || cursors.right.isDown) {
            // TODO: have the player accelerate to the right
            if(this.goingLeft && (my.sprite.player.body.blocked.down || this.flying))
            {
                if(my.sprite.player.body.blocked.down)
                    my.sprite.player.body.setVelocityX(0);
                this.goingLeft = false;
                this.flying = false;
            }
            //console.log(my.sprite.player.body.velocity.x);
            if(this.grappleCooldown && this.flying)
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

        } else {
            // TODO: set acceleration and velocity to 0 
            my.sprite.player.body.setAccelerationX(0);
            if(!my.sprite.player.body.blocked.down)
            {
                my.sprite.player.body.setDragX(this.DRAG);
                this.flying = false;
            }
            else
            {
                my.sprite.player.body.setVelocityX(0);
            }
            my.sprite.player.anims.play('idle');
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && (Phaser.Input.Keyboard.JustDown(cursors.up) || Phaser.Input.Keyboard.JustDown(this.w))) {
            // TODO: set a Y velocity to have the player "jump" upwards (negative Y direction)
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);

        }

        
        
    }
}