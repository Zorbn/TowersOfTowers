import { Texture, Sprite, Container, BitmapText } from "pixi.js";
import { Tower } from "./tower";

export type UiTextures = {
    slotBackground: Texture,
    slotSelected: Texture,
    tabInventory: Texture,
    tabShop: Texture,
    tabSelected: Texture,
    buyButton: Texture,
}

enum TabType {
    INVENTORY,
    SHOP,
}

interface Item {
    tower: Tower;
}

export interface InventoryItem extends Item {
    tower: Tower,
    owned: number,
    used: number,
}

export interface ShopItem extends Item {
    tower: Tower,
    cost: number,
}

interface ITab {
    draw(towerTextures: Texture[], slotItemSprites: Sprite[]): void;
    selectSlot(i: number): void;
    getSelectedSlot(): number;
}

class Tab<T extends Item> {
    private slots: T[];
    private width: number;
    private height: number;
    private selectedSlot: number;

    constructor(width: number, height: number, defaultItem: T) {
        this.width = width;
        this.height = height;
        this.slots = new Array(width * height);
        this.slots.fill(defaultItem);
        this.selectedSlot = 0;
    }

    draw = (towerTextures: Texture[], slotItemSprites: Sprite[]): void => {
        for (let i = 0; i < this.slots.length; i++) {
            let slotItem = this.slots[i];

            slotItemSprites[i].texture = towerTextures[slotItem.tower.textureIndex];
        }
    }

    selectSlot = (i: number) => {
        if (i < 0 || i >= this.width * this.height) {
            return;
        }

        this.selectedSlot = i;
    }

    getSelectedSlot = (): number => {
        return this.selectedSlot;
    }

    getSelectedItem = (): T => {
        return this.slots[this.selectedSlot];
    }

    addItem = (item: T) => {
        for (let i = 0; i < this.slots.length; i++) {
            if (!this.slots[i].tower.empty) {
                continue;
            }

            this.slots[i] = item;
            break;
        }
    }

    getItem = (tower: Tower): T | null => {
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].tower == tower) {
                return this.slots[i];
            }
        }

        return null;
    }
}

class Inventory {
    public readonly tab: Tab<InventoryItem>;

    constructor(width: number, height: number) {
        this.tab = new Tab(width, height, { tower: Tower.empty, owned: 0, used: 0 });
    }

    addTower = (tower: Tower, quantity: number) => {
        let item = this.tab.getItem(tower);

        if (item == null) {
            this.tab.addItem({
                tower,
                owned: quantity,
                used: 0,
            });
            return;
        }

        item.owned += quantity;
    }

    startUsingTower = (tower: Tower, quantity: number): boolean => {
        let item = this.tab.getItem(tower);

        if (item == null) {
            return false;
        }

        const freeTowers = item.owned - item.used;

        if (freeTowers < quantity) {
            return false;
        }

        item.used += quantity;
        return true;
    }

    stopUsingTower = (tower: Tower, quantity: number) => {
        let item = this.tab.getItem(tower);

        if (item == null) {
            return;
        }

        item.used -= quantity;

        if (item.used < 0) {
            item.used = 0;
        }
    }
}

class Shop {
    public readonly tab: Tab<ShopItem>;
    private footer: Container;
    private buyButton: Sprite;

    constructor(width: number, height: number, tileSize: number, container: Container, textures: UiTextures) {
        this.tab = new Tab(width, height, { tower: Tower.empty, cost: 0 });
        this.tab.addItem({
            tower: Tower.singleShot,
            cost: 50,
        });
        this.tab.addItem({
            tower: Tower.doubleShot,
            cost: 100,
        });

        this.footer = new Container();
        this.footer.y = tileSize * height;
        container.addChild(this.footer);

        this.buyButton = new Sprite(textures.buyButton);
        this.buyButton.y = tileSize * 0.25;
        this.footer.addChild(this.buyButton);

        const testText = new BitmapText('The towerinator $5', { fontName: 'DefaultFont' });
        testText.x = tileSize * 1.25;
        testText.y = tileSize * 0.3;
        testText.scale.x = 0.2;
        testText.scale.y = 0.2;
        this.footer.addChild(testText);
    }

    draw = (selectedTab: TabType) => {
        if (selectedTab != TabType.SHOP) {
            this.footer.visible = false;
            return;
        }

        this.footer.visible = true;
    }

    isBuyButtonHovered = (mouseX: number, mouseY: number) => {
        const buyButtonBounds = this.buyButton.getBounds();
        console.log(buyButtonBounds);
        return buyButtonBounds.contains(mouseX, mouseY);
    }
}

export class Ui {
    public inventory: Inventory;
    public shop: Shop;

    private money: number;

    private slotBackgroundSprites: Sprite[];
    private slotItemSprites: Sprite[];
    private selectedSlotSprite: Sprite;
    private readonly slotsWidth: number;
    private readonly slotsHeight: number;

    private tabSprites: Sprite[];
    private selectedTabSprite: Sprite;
    private selectedTab: TabType;
    private readonly tabsWidth: number;
    private readonly tabsHeight: number;

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

        this.inventory = new Inventory(width, height);
        this.shop = new Shop(width, height, tileSize, container, textures);
        this.money = 0;
    }

    private getSelectedTab = (): ITab => {
        let tab;

        switch (this.selectedTab) {
            case TabType.INVENTORY:
                tab = this.inventory.tab;
                break;
            case TabType.SHOP:
                tab = this.shop.tab;
                break;
        }

        return tab;
    }

    draw = (towerTextures: Texture[], tileSize: number) => {
        let tab = this.getSelectedTab();

        const selectedSlot = tab.getSelectedSlot();
        const selectedSlotX = selectedSlot % this.slotsWidth;
        const selectedSlotY = Math.floor(selectedSlot / this.slotsWidth);
        this.selectedSlotSprite.x = selectedSlotX * tileSize;
        this.selectedSlotSprite.y = selectedSlotY * tileSize;

        const selectedTab = this.selectedTab;
        const selectedTabX = selectedTab % this.tabsWidth;
        const selectedTabY = Math.floor(selectedTab / this.tabsWidth);
        this.selectedTabSprite.x = (this.slotsWidth + selectedTabX) * tileSize;
        this.selectedTabSprite.y = selectedTabY * tileSize;

        tab.draw(towerTextures, this.slotItemSprites);

        this.shop.draw(this.selectedTab);
    }

    addMoney = (amount: number) => {
        this.money += amount;
    }

    interact = (mouseWorldX: number, mouseWorldY: number, mouseX: number, mouseY: number, tileSize: number) => {
        const mouseTileX = mouseWorldX / tileSize;
        const mouseTileY = mouseWorldY / tileSize;

        this.selectSlot(mouseTileX, mouseTileY);
        this.selectTab(mouseTileX, mouseTileY);

        if (this.selectedTab != TabType.SHOP) {
            return;
        }


        if (!this.shop.isBuyButtonHovered(mouseX, mouseY)) {
            return;
        }

        console.log(this.money);

        const selectedItem = this.shop.tab.getSelectedItem();

        if (selectedItem.tower.empty || selectedItem.cost > this.money) {
            return;
        }

        this.money -= selectedItem.cost;
        this.inventory.addTower(selectedItem.tower, 1);
    }

    selectSlot = (tileX: number, tileY: number) => {
        tileX = Math.floor(tileX);
        tileY = Math.floor(tileY);

        if (tileX < 0 || tileX >= this.slotsWidth || tileY < 0 || tileY >= this.slotsHeight) {
            return;
        }

        const i = tileX + tileY * this.slotsWidth;
        this.getSelectedTab().selectSlot(i);
    }

    selectTab = (tileX: number, tileY: number) => {
        tileX = Math.floor(tileX) - this.slotsWidth;
        tileY = Math.floor(tileY);

        if (tileX < 0 || tileX >= this.tabsWidth || tileY < 0 || tileY >= this.tabsHeight) {
            return;
        }

        const i = tileX + tileY * this.tabsWidth;
        this.selectedTab = i;
    }

    getSelectedItem(): InventoryItem {
        return this.inventory.tab.getSelectedItem();
    }
}