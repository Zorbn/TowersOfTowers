import { Texture, Sprite, Container } from "pixi.js";
import { Tower } from "./tower";

export type InventoryItem = {
    tower: Tower,
    quantity: number,
}

export type ShopItem = {
    tower: Tower,
    cost: number,
}

export type UiTextures = {
    slotBackground: Texture,
    slotSelected: Texture,
    tabInventory: Texture,
    tabShop: Texture,
    tabSelected: Texture,
}

enum TabType {
    INVENTORY,
    SHOP,
}

export class Ui {
    private slotBackgroundSprites: Sprite[];
    private slotItemSprites: Sprite[];
    private selectedSlotSprite: Sprite;
    private readonly slotsWidth: number;
    private readonly slotsHeight: number;

    private tabSprites: Sprite[];
    private tabs: TabType[];
    private selectedTabSprite: Sprite;
    private selectedTab: number;
    private readonly tabsWidth: number;
    private readonly tabsHeight: number;

    private inventory: InventoryItem[];
    private selectedInventorySlot: number;
    private shop: ShopItem[];
    private selectedShopSlot: number;

    // TODO: Darken inventory sprites that have 0 quantity, and shop
    // sprites that cost more than the player can afford.

    constructor(tileSize: number, width: number, height: number, textures: UiTextures, container: Container) {
        const slotCount = width * height;
        this.slotBackgroundSprites = new Array(slotCount);
        this.slotItemSprites = new Array(slotCount);
        this.slotsWidth = width;
        this.slotsHeight = height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const slotBackgroundSprite = new Sprite(textures.slotBackground);
                slotBackgroundSprite.x = x * tileSize;
                slotBackgroundSprite.y = y * tileSize;

                const slotItemSprite = new Sprite();
                slotItemSprite.x = slotBackgroundSprite.x;
                slotItemSprite.y = slotBackgroundSprite.y;

                const i = x + y * width;
                this.slotBackgroundSprites[i] = slotBackgroundSprite;
                this.slotItemSprites[i] = slotItemSprite;

                container.addChild(slotBackgroundSprite);
                container.addChild(slotItemSprite);
            }
        }

        this.selectedInventorySlot = 0;
        this.selectedSlotSprite = new Sprite(textures.slotSelected);
        this.selectedSlotSprite.zIndex = 1;
        container.addChild(this.selectedSlotSprite);

        const tabCount = 2;
        this.tabsWidth = 1;
        this.tabsHeight = 2;
        this.tabSprites = new Array(tabCount);

        const tabStartX = this.slotsWidth * tileSize;
        this.tabSprites[0] = new Sprite(textures.tabInventory);
        this.tabSprites[0].x = tabStartX;
        container.addChild(this.tabSprites[0]);
        this.tabSprites[1] = new Sprite(textures.tabShop);
        this.tabSprites[1].x = tabStartX;
        this.tabSprites[1].y = tileSize;
        container.addChild(this.tabSprites[1]);

        this.selectedTab = 0;
        this.selectedTabSprite = new Sprite(textures.tabSelected);
        this.selectedTabSprite.zIndex = 1;
        this.selectedTabSprite.x = tabStartX;
        container.addChild(this.selectedTabSprite);

        this.tabs = [TabType.INVENTORY, TabType.SHOP];

        this.inventory = new Array(slotCount);
        this.inventory.fill({ tower: Tower.empty, quantity: 0 });

        this.shop = new Array(slotCount);
        this.shop.fill({ tower: Tower.empty, cost: 0 });
        this.shop[0] = {
            tower: Tower.singleShot,
            cost: 50,
        };
        this.shop[1] = {
            tower: Tower.doubleShot,
            cost: 100,
        };
    }

    draw = (towerTextures: Texture[]) => {
        switch (this.tabs[this.selectedTab]) {
            case TabType.INVENTORY:
                this.drawInventory(towerTextures);
                break;
            case TabType.SHOP:
                this.drawShop(towerTextures);
                break;
        }
    }

    drawInventory = (towerTextures: Texture[]) => {
        for (let i = 0; i < this.inventory.length; i++) {
            let slotItem = this.inventory[i];

            this.slotItemSprites[i].texture = towerTextures[slotItem.tower.textureIndex];
        }
    }

    drawShop = (towerTextures: Texture[]) => {
        for (let i = 0; i < this.shop.length; i++) {
            let slotItem = this.shop[i];

            this.slotItemSprites[i].texture = towerTextures[slotItem.tower.textureIndex];
        }
    }

    addItem = (tower: Tower, quantity: number) => {
        for (let i = 0; i < this.inventory.length; i++) {
            let slotItem = this.inventory[i];

            if (slotItem.tower.empty) {
                this.inventory[i] = {
                    tower,
                    quantity,
                };
                break;
            }

            if (slotItem.tower == tower) {
                slotItem.quantity += quantity;
                break;
            }
        }
    }

    selectSlot = (tileX: number, tileY: number, tileSize: number) => {
        tileX = Math.floor(tileX);
        tileY = Math.floor(tileY);

        if (tileX < 0 || tileX >= this.slotsWidth || tileY < 0 || tileY >= this.slotsHeight) {
            return;
        }

        const i = tileX + tileY * this.slotsWidth;
        this.selectedInventorySlot = i;
        this.selectedSlotSprite.x = tileX * tileSize;
        this.selectedSlotSprite.y = tileY * tileSize;
    }

    selectTab = (tileX: number, tileY: number, tileSize: number) => {
        tileX = Math.floor(tileX) - this.slotsWidth;
        tileY = Math.floor(tileY);

        if (tileX < 0 || tileX >= this.tabsWidth || tileY < 0 || tileY >= this.tabsHeight) {
            return;
        }

        const i = tileX + tileY * this.tabsWidth;
        this.selectedTab = i;
        this.selectedTabSprite.x = (this.slotsWidth + tileX) * tileSize;
        this.selectedTabSprite.y = tileY * tileSize;
    }

    getSelectedItem(): InventoryItem {
        return this.inventory[this.selectedInventorySlot];
    }
}