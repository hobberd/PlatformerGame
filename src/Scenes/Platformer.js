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
        this.PARTICLE_VELOCITY = 50;
        this.MAX_SPEED = 400;
        this.goingLeft = false;
        this.grappleCooldown = false;
        this.inRange = false;
        this.offsetX = 16.5;
        this.offsetY = 23;
        
        this.grappleLocations1 = [16,4, 40,11, 64,5, 75,25, 92,13, 115,10, 123,22, 135,19, 144,9];
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
        this.worldX = 5280;
        this.worldY = 960;
        this.checkpointX = 70;
        this.checkpointY = 816;
        this.playFall = false;
        this.gemCount = 0;
        this.screen = 1;
        this.furthest = 0;
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

        // set up player avatar 40, 750, 1800, 240,
        my.sprite.player = this.physics.add.sprite(40, 750, "platformer_characters", "tile_0281.png").setScale(SCALE);
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

        // Text
        this.t.text.title = this.add.text(400, 200, "UMBRA", {
            fontSize: 25
        });
        this.t.text.title.setScale(4);
        this.t.text.title.visible = true;
        this.t.text.controls = this.add.text(400, 300, "WASD or arrow keys to move\nHold space for grapple hook\nR to restart at checkpoint", {
            fontSize: 15
        });
        this.t.text.controls.setScale(1.5);
        this.t.text.controls.visible = true;

        this.t.text.lose = this.add.text(400, 250, "YOU FAILED");
        this.t.text.lose.setDepth(1);
        this.t.text.lose.setScale(3);
        this.t.text.lose.visible = false;
        this.t.text.restart = this.add.text(400, 300, "Press r to restart");
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

        this.t.text.gemsCollected = this.add.text(765, 15, "Gems Collected: " + this.gemCount + "/" + 3);
        this.t.text.gemsCollected.setScale(1.3);

        this.t.text.hint1 = this.add.text(1800, 150, "Tip: Move right and \nkeep holding right \nafter grappling!");
        this.t.text.hint2 = this.add.text(3000, 800, "Tip: Jump then grapple!");
        
        

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
                this.checkpointY = 816;
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
                this.checkpointY = 240;
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
        }
        else
        {
            this.t.text.lose.visible = false;
            this.t.text.restart.visible = false;
        }
        if(this.r.isDown)
        {
            my.sprite.player.visible = true;
            my.sprite.player.x = this.checkpointX;
            my.sprite.player.y = this.checkpointY;
            my.sprite.player.body.setVelocityX(0);
            my.sprite.player.body.setVelocityY(0);
            my.sprite.player.body.setAccelerationX(0);
            this.gameEnd = false;

            this.t.text.win.visible = false;
            this.t.text.k.visible = false;
        }

        // Grapple
        let closestCoords = [0, 0];
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
            this.grappleSound.play();
        }
        if(my.sprite.player.body.blocked.down)
        {
            this.grappleCooldown = false;
            this.flying = false;
            
        }
        if(!this.flying)
        {
            my.vfx.dashing.stop();
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
        else if(this.a.isDown || cursors.left.isDown) 
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
        if(!this.gameEnd && my.sprite.player.body.blocked.down && (Phaser.Input.Keyboard.JustDown(cursors.up) || Phaser.Input.Keyboard.JustDown(this.w))) {
            // TODO: set a Y velocity to have the player "jump" upwards (negative Y direction)
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            this.jumpSound.play();
            
        }

        if(this.m.isDown)
        {
            my.sprite.player.x = 1800;
            my.sprite.player.y = 100;
        }
        
    }
}