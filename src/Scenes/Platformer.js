class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 1000;
        this.DRAG = 1500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 2500;
        this.JUMP_VELOCITY = -1000;
        this.MAX_SPEED = 600;
        this.goingLeft = false;
        this.grappleCooldown = false;
    }

    create() {
        // Create a new tilemap game object which uses 16x16 pixel tiles, and is
        // 55 tiles wide and 30 tiles tall.
        this.map = this.add.tilemap("level1", 16, 16, 55, 30);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("one_bit", "tiles");

        // Create layers
        this.platformLayer = this.map.createLayer("Platforms", this.tileset, 0, 0);
        this.platformLayer.setScale(2.0);
        this.obstaclesLayer = this.map.createLayer("Obstacles", this.tileset, 0, 0);
        this.obstaclesLayer.setScale(2.0);
        this.grappleLayer = this.map.createLayer("Grapple", this.tileset, 0, 0);
        this.grappleLayer.setScale(2.0);
        this.detailsLayer = this.map.createLayer("Details", this.tileset, 0, 0);
        this.detailsLayer.setScale(2.0);
        

        // Make platforms collidable
        this.platformLayer.setCollisionByProperty({
            collides: true
        });

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(100, 750, "platformer_characters", "tile_0281.png").setScale(SCALE)
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.platformLayer);

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

    }

    update() {
        if(this.a.isDown || cursors.left.isDown) {
            // TODO: have the player accelerate to the left.
            if(!this.goingLeft && my.sprite.player.body.blocked.down)
            {
                my.sprite.player.body.setVelocityX(0);
                this.goingLeft = true;
            }
            console.log(my.sprite.player.body.velocity.x);
            if(my.sprite.player.body.velocity.x > -this.MAX_SPEED)
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
            if(this.goingLeft && my.sprite.player.body.blocked.down)
            {
                my.sprite.player.body.setVelocityX(0);
                this.goingLeft = false;
            }
            console.log(my.sprite.player.body.velocity.x);
            if(my.sprite.player.body.velocity.x < this.MAX_SPEED)
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

        if(!my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(this.space) && !this.grappleCooldown) 
        {
            // TODO: set a Y velocity to have the player "jump" upwards (negative Y direction)
            if(this.a.isDown || cursors.left.isDown)
            {
                my.sprite.player.body.setVelocityX(my.sprite.player.body.velocity.x + this.JUMP_VELOCITY);
            }
            if(this.d.isDown || cursors.right.isDown)
            {
                my.sprite.player.body.setVelocityX(my.sprite.player.body.velocity.x - this.JUMP_VELOCITY);
            }
            this.grappleCooldown = true;
        
        }
        if(my.sprite.player.body.blocked.down)
        {
            this.grappleCooldown = false;
        }
    }
}