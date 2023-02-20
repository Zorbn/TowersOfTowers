import { Texture, Sprite, Container, BitmapText } from "pixi.js";
import { Tower, TowerStats } from "./tower";

const STARTING_MONEY = 100;

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
    towerStats: TowerStats;
    isActive(money: number): boolean;
}

class InventoryItem implements Item {
    public towerStats: TowerStats;
    public owned: number;
    public used: number;

    constructor(towerStats: TowerStats, owned: number, used: number) {
        this.towerStats = towerStats;
        this.owned = owned;
        this.used = used;
    }

    isActive(_money: number): boolean {
        return this.used < this.owned;
    }
}

class ShopItem implements Item {
    public towerStats: TowerStats;
    public cost: number;

    constructor(towerStats: TowerStats, cost: number) {
        this.towerStats = towerStats;
        this.cost = cost;
    }

    isActive(money: number): boolean {
        return money >= this.cost;
    }
}

interface ITab {
    draw(towerTextures: Texture[], slotItemSprites: Sprite[], money: number): void;
    selectSlot(i: number): void;
    getSelectedSlot(): number;
}

const ITEM_ACTIVE_COLOR = 0xffffff;
const ITEM_INACTIVE_COLOR = 0xaaaaaa;

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

    draw = (towerTextures: Texture[], slotItemSprites: Sprite[], money: number): void => {
        for (let i = 0; i < this.slots.length; i++) {
            let slotItem = this.slots[i];

            slotItemSprites[i].texture = towerTextures[slotItem.towerStats.textureIndex];
            slotItemSprites[i].tint = slotItem.isActive(money) ? ITEM_ACTIVE_COLOR : ITEM_INACTIVE_COLOR;
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
            if (!this.slots[i].towerStats.empty) {
                continue;
            }

            this.slots[i] = item;
            break;
        }
    }

    getItem = (towerStats: TowerStats): T | null => {
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].towerStats == towerStats) {
                return this.slots[i];
            }
        }

        return null;
    }
}

class Inventory {
    public readonly tab: Tab<InventoryItem>;
    private footer: Container;
    private labelText: BitmapText;

    constructor(width: number, height: number, tileSize: number, container: Container) {
        this.tab = new Tab(width, height, new InventoryItem(TowerStats.empty, 0, 0));
        this.footer = new Container();
        this.footer.y = tileSize * height;
        container.addChild(this.footer);

        this.labelText = new BitmapText('', { fontName: 'DefaultFont' });
        this.labelText.x = tileSize * 0.25;
        this.labelText.y = tileSize * 0.3;
        this.labelText.scale.x = 0.2;
        this.labelText.scale.y = 0.2;
        this.footer.addChild(this.labelText);
    }

    addTower = (towerStats: TowerStats, quantity: number) => {
        let item = this.tab.getItem(towerStats);

        if (item == null) {
            this.tab.addItem(new InventoryItem(towerStats, quantity, 0));
            return;
        }

        item.owned += quantity;
    }

    startUsingTower = (towerStats: TowerStats, quantity: number): boolean => {
        let item = this.tab.getItem(towerStats);

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

    stopUsingTower = (towerStats: TowerStats, quantity: number) => {
        let item = this.tab.getItem(towerStats);

        if (item == null) {
            return;
        }

        item.used -= quantity;

        if (item.used < 0) {
            item.used = 0;
        }
    }

    draw = (selectedTab: TabType) => {
        this.footer.visible = false;

        if (selectedTab != TabType.INVENTORY) {
            return;
        }

        const selectedItem = this.tab.getSelectedItem();

        if (selectedItem.towerStats.empty) {
            return;
        }

        this.footer.visible = true;
        const remainingTowers = selectedItem.owned - selectedItem.used;
        this.labelText.text = `The ${selectedItem.towerStats.name} ${remainingTowers}/${selectedItem.owned}`;
    }
}

class Shop {
    public readonly tab: Tab<ShopItem>;
    private footer: Container;
    private buyButton: Sprite;
    private labelText: BitmapText;

    constructor(width: number, height: number, tileSize: number, container: Container, textures: UiTextures) {
        this.tab = new Tab(width, height, new ShopItem(TowerStats.empty, 0));
        this.tab.addItem(new ShopItem(TowerStats.singleShot, 50));
        this.tab.addItem(new ShopItem(TowerStats.doubleShot, 100));

        this.footer = new Container();
        this.footer.y = tileSize * height;
        container.addChild(this.footer);

        this.buyButton = new Sprite(textures.buyButton);
        this.buyButton.y = tileSize * 0.25;
        this.buyButton.x = tileSize * 0.25;
        this.footer.addChild(this.buyButton);

        this.labelText = new BitmapText('', { fontName: 'DefaultFont' });
        this.labelText.x = tileSize * 1.5;
        this.labelText.y = tileSize * 0.3;
        this.labelText.scale.x = 0.2;
        this.labelText.scale.y = 0.2;
        this.footer.addChild(this.labelText);
    }

    draw = (selectedTab: TabType) => {
        this.footer.visible = false;

        if (selectedTab != TabType.SHOP) {
            return;
        }

        const selectedItem = this.tab.getSelectedItem();

        if (selectedItem.towerStats.empty) {
            return;
        }

        this.footer.visible = true;
        this.labelText.text = `The ${selectedItem.towerStats.name} $${selectedItem.cost}`;
    }

    isBuyButtonHovered = (mouseX: number, mouseY: number) => {
        const buyButtonBounds = this.buyButton.getBounds();
        return buyButtonBounds.contains(mouseX, mouseY);
    }
}

export class Ui {
    public inventory: Inventory;
    public shop: Shop;

    private money: number;
    private moneyText: BitmapText;

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

        this.money = STARTING_MONEY;
        this.moneyText = new BitmapText("", { fontName: 'DefaultFont' });
        this.moneyText.x = (this.slotsWidth + this.tabsWidth + 0.125) * tileSize;
        this.moneyText.y = tileSize * 0.1;
        this.moneyText.scale.x = 0.2;
        this.moneyText.scale.y = 0.2;
        container.addChild(this.moneyText);

        this.inventory = new Inventory(width, height, tileSize, container);
        this.shop = new Shop(width, height, tileSize, container, textures);
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
        this.moneyText.text = `$${this.money}`;

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

        tab.draw(towerTextures, this.slotItemSprites, this.money);

        this.shop.draw(this.selectedTab);
        this.inventory.draw(this.selectedTab);
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

        const selectedItem = this.shop.tab.getSelectedItem();

        if (selectedItem.towerStats.empty || selectedItem.cost > this.money) {
            return;
        }

        this.money -= selectedItem.cost;
        this.inventory.addTower(selectedItem.towerStats, 1);
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