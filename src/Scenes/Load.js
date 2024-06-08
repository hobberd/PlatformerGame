class Load extends Phaser.Scene {
    constructor() {
        super("loadScene");
    }

    preload() {
        this.load.setPath("./assets/");

        // Load characters spritesheet
        this.load.atlas("platformer_characters", "characters.png", "characters.json");

        // Load tilemap information
        this.load.image("tiles", "monochrome_tilemap_transparent_packed.png");
        this.load.image("tiles_black", "monochrome_tilemap_packed.png");
        this.load.tilemapTiledJSON("level1", "umbra.tmj");   // Tilemap in JSON
        this.load.tilemapTiledJSON("level2", "umbraSpring.tmj");   // Tilemap in JSON
        
        this.load.spritesheet("tilemap_sheet", "monochrome_tilemap_transparent_packed.png", {
            frameWidth: 16,
            frameHeight: 16
        });

        // Load sounds
        this.load.audio('jumpFX', 'jump_01.wav');
        this.load.audio('collectFX', 'impactGlass_heavy_000.mp3');
        this.load.audio('grappleFX', 'qubodupImpactWood.ogg');
        this.load.audio('fallFX', 'impactPlate_light_003.ogg');
}

    create() {
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNames('platformer_characters', {
                prefix: "tile_",
                start: 282,
                end: 283,
                suffix: ".png",
                zeroPad: 4
            }),
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'idle',
            defaultTextureKey: "platformer_characters",
            frames: [
                { frame: "tile_0281.png" }
            ],
            repeat: -1
        });

        this.anims.create({
            key: 'jump',
            defaultTextureKey: "platformer_characters",
            frames: [
                { frame: "tile_0284.png" }
            ],
        });

         // ...and pass to the next Scene
         this.scene.start("platformerScene");
    }

    // Never get here since a new scene is started in create()
    update() {
    }
}