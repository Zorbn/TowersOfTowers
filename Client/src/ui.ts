import { Texture, Sprite, Container, BitmapText } from "pixi.js";
import { State } from "./state";
import { TowerStats } from "./tower";
import towerStatsData from "./towers.json";

const STARTING_MONEY = 100;
const SAVE_IDENTIFIER = "saveData";
const ITEM_ACTIVE_COLOR = 0xffffff;
const ITEM_INACTIVE_COLOR = 0x888888;

export type UiTextures = {
    slotBackground: Texture,
    slotSelected: Texture,
    tabInventory: Texture,
    tabShop: Texture,
    tabSelected: Texture,
    buyButton: Texture,
    startButton: Texture,
    buttonSelected: Texture,
    saveButton: Texture,
    downloadButton: Texture,
    uploadButton: Texture,
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

    public static readonly empty = new InventoryItem(TowerStats.empty, 0, 0);
}

type SaveInventoryItem = {
    name: string,
    owned: number,
};

type SaveData = {
    money: number,
    items: SaveInventoryItem[],
};

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

class Tab<T extends Item> {
    private slots: T[];
    private width: number;
    private height: number;
    private selectedSlot: number;

    constructor(width: number, height: number, defaultItem: T) {
        this.width = width;
        this.height = height;
        this.slots = new Array(width * height);
        this.clear(defaultItem);
        this.selectedSlot = 0;
    }

    clear = (defaultItem: T) => {
        this.slots.fill(defaultItem);
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

    getSlot = (i: number): T => {
        return this.slots[i];
    }

    getSlotCount = (): number => {
        return this.slots.length;
    }
}

// TODO: Consider making interface for isDirty, markClean?
// is there value to that?
class Inventory {
    public readonly tab: Tab<InventoryItem>;
    private footer: Container;
    private labelText: BitmapText;
    private dirty: boolean;

    constructor(width: number, height: number, tileSize: number, container: Container) {
        this.tab = new Tab(width, height, InventoryItem.empty);
        this.footer = new Container();
        this.footer.y = tileSize * height;
        container.addChild(this.footer);

        this.labelText = new BitmapText("", { fontName: "DefaultFont" });
        this.labelText.x = tileSize * 0.25;
        this.labelText.y = tileSize * 0.3;
        this.labelText.scale.x = 0.2;
        this.labelText.scale.y = 0.2;
        this.footer.addChild(this.labelText);

        this.dirty = false;
    }

    clear = () => {
        this.tab.clear(InventoryItem.empty);
    }

    addTower = (towerStats: TowerStats, quantity: number) => {
        this.dirty = true;

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

    isDirty = () => {
        return this.dirty;
    }

    markClean = () => {
        this.dirty = false;
    }
}

class Shop {
    public readonly tab: Tab<ShopItem>;
    private footer: Container;
    private buyButtonSprite: Sprite;
    private labelText: BitmapText;

    constructor(width: number, height: number, tileSize: number, container: Container, textures: UiTextures) {
        this.tab = new Tab(width, height, new ShopItem(TowerStats.empty, 0));

        for (let i = 0; i < TowerStats.loadedTowerStats.length; i++) {
            this.tab.addItem(new ShopItem(
                TowerStats.loadedTowerStats[i],
                towerStatsData[i].cost,
            ));
        }

        this.footer = new Container();
        this.footer.y = tileSize * height;
        container.addChild(this.footer);

        this.buyButtonSprite = new Sprite(textures.buyButton);
        this.buyButtonSprite.y = tileSize * 0.25;
        this.buyButtonSprite.x = tileSize * 0.25;
        this.footer.addChild(this.buyButtonSprite);

        this.labelText = new BitmapText("", { fontName: "DefaultFont" });
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
        return Ui.isInSpriteBounds(this.buyButtonSprite, mouseX, mouseY);
    }
}

class Bank {
    private money: number;
    private dirty: boolean;

    constructor(money: number) {
        this.money = money;
        this.dirty = false;
    }

    addMoney = (amount: number) => {
        this.setMoney(this.money + amount);
    }

    spendMoney = (amount: number): boolean => {
        if (this.money < amount) {
            return false;
        }

        this.setMoney(this.money - amount);
        return true;
    }

    getMoney = (): number => {
        return this.money;
    }

    setMoney = (amount: number) => {
        this.money = amount;
        this.dirty = true;
    }

    isDirty = (): boolean => {
        return this.dirty;
    }

    markClean = () => {
        this.dirty = false;
    }
}

export class Ui {
    public readonly inventory: Inventory;
    public readonly shop: Shop;
    public readonly bank: Bank;

    private moneyText: BitmapText;
    private waveText: BitmapText;

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

    private startButtonSprite: Sprite;
    private selectedStartButtonSprite: Sprite;

    private saveButtonSprite: Sprite;
    private selectedSaveButtonSprite: Sprite;

    private downloadButtonSprite: Sprite;
    private uploadButtonSprite: Sprite;

    private saveInput: HTMLInputElement;

    constructor(tileSize: number, slotsWidth: number, slotsHeight: number, viewWidth: number, _viewHeight: number, textures: UiTextures, container: Container) {
        const slotCount = slotsWidth * slotsHeight;
        this.slotBackgroundSprites = new Array(slotCount);
        this.slotItemSprites = new Array(slotCount);
        this.slotsWidth = slotsWidth;
        this.slotsHeight = slotsHeight;

        for (let y = 0; y < slotsHeight; y++) {
            for (let x = 0; x < slotsWidth; x++) {
                const slotBackgroundSprite = new Sprite(textures.slotBackground);
                slotBackgroundSprite.x = x * tileSize;
                slotBackgroundSprite.y = y * tileSize;

                const slotItemSprite = new Sprite();
                slotItemSprite.x = slotBackgroundSprite.x;
                slotItemSprite.y = slotBackgroundSprite.y;

                const i = x + y * slotsWidth;
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

        this.startButtonSprite = new Sprite(textures.startButton);
        this.startButtonSprite.x = tabStartX;
        this.startButtonSprite.y = tileSize * 2;
        container.addChild(this.startButtonSprite);

        this.selectedStartButtonSprite = new Sprite(textures.buttonSelected);
        this.selectedStartButtonSprite.x = this.startButtonSprite.x;
        this.selectedStartButtonSprite.y = this.startButtonSprite.y;
        this.selectedStartButtonSprite.zIndex = 1;
        container.addChild(this.selectedStartButtonSprite);

        this.saveButtonSprite = new Sprite(textures.saveButton);
        this.saveButtonSprite.x = viewWidth - tileSize;
        container.addChild(this.saveButtonSprite);

        this.selectedSaveButtonSprite = new Sprite(textures.buttonSelected);
        this.selectedSaveButtonSprite.x = this.saveButtonSprite.x;
        this.selectedSaveButtonSprite.y = this.saveButtonSprite.y;
        this.selectedSaveButtonSprite.zIndex = 1;
        container.addChild(this.selectedSaveButtonSprite);

        this.uploadButtonSprite = new Sprite(textures.uploadButton);
        this.uploadButtonSprite.x = this.saveButtonSprite.x - tileSize;
        container.addChild(this.uploadButtonSprite);

        this.saveInput = document.getElementById("saveInput") as HTMLInputElement;
        this.saveInput.onchange = async () => {
            if (this.saveInput.files != null && this.saveInput.files.length > 0) {
                const file = this.saveInput.files[0];
                const text = await file.text();
                this.load(text);
            }
        }

        this.downloadButtonSprite = new Sprite(textures.downloadButton);
        this.downloadButtonSprite.x = this.uploadButtonSprite.x - tileSize;
        container.addChild(this.downloadButtonSprite);

        this.moneyText = new BitmapText("", { fontName: "DefaultFont" });
        this.moneyText.x = (this.slotsWidth + this.tabsWidth + 0.125) * tileSize;
        this.moneyText.y = tileSize * 0.1;
        this.moneyText.scale.x = 0.2;
        this.moneyText.scale.y = 0.2;
        container.addChild(this.moneyText);

        this.waveText = new BitmapText("", { fontName: "DefaultFont" });
        this.waveText.x = this.moneyText.x;
        this.waveText.y = this.moneyText.y + tileSize;
        this.waveText.scale.x = this.moneyText.scale.x;
        this.waveText.scale.y = this.moneyText.scale.y;
        container.addChild(this.waveText);

        this.inventory = new Inventory(slotsWidth, slotsHeight, tileSize, container);
        this.shop = new Shop(slotsWidth, slotsHeight, tileSize, container, textures);
        this.bank = new Bank(STARTING_MONEY);

        const savedData = localStorage.getItem(SAVE_IDENTIFIER);
        if (savedData != null) {
            this.load(savedData);
            this.inventory.markClean();
            this.bank.markClean();
        }
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

    draw = (state: State, tileSize: number) => {
        this.moneyText.text = `$${this.bank.getMoney()}`;

        if (state.enemySpawner.isActive()) {
            this.selectedStartButtonSprite.visible = false;
            this.waveText.text = `Wave ${state.enemySpawner.getWave()}`;
        } else {
            this.selectedStartButtonSprite.visible = true;
            this.waveText.text = "Get ready...";
        }

        this.selectedSaveButtonSprite.visible = this.inventory.isDirty() || this.bank.isDirty();

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

        tab.draw(state.towerTextures, this.slotItemSprites, this.bank.getMoney());

        this.shop.draw(this.selectedTab);
        this.inventory.draw(this.selectedTab);
    }

    interactWithBuyButton = (mouseX: number, mouseY: number) => {
        if (this.selectedTab != TabType.SHOP) {
            return;
        }


        if (!this.shop.isBuyButtonHovered(mouseX, mouseY)) {
            return;
        }

        const selectedItem = this.shop.tab.getSelectedItem();

        if (selectedItem.towerStats.empty || !this.bank.spendMoney(selectedItem.cost)) {
            return;
        }

        this.inventory.addTower(selectedItem.towerStats, 1);
    }

    interactWithStartButton = (mouseX: number, mouseY: number, state: State) => {
        if (state.enemySpawner.isActive()) {
            return;
        }

        const startButtonBounds = this.startButtonSprite.getBounds();
        if (!startButtonBounds.contains(mouseX, mouseY)) {
            return;
        }

        state.enemySpawner.start();
    }

    interactWithSaveButton = (mouseX: number, mouseY: number) => {
        if (!Ui.isInSpriteBounds(this.saveButtonSprite, mouseX, mouseY)) {
            return;
        }

        const saveData = this.save();
        localStorage.setItem(SAVE_IDENTIFIER, saveData);

        this.inventory.markClean();
        this.bank.markClean();
    }

    interactWithDownloadButton = (mouseX: number, mouseY: number) => {
        if (!Ui.isInSpriteBounds(this.downloadButtonSprite, mouseX, mouseY)) {
            return;
        }

        const saveData = this.save();

        // Create an element that handles downloading, then remove it
        // once the download has completed.
        const element = document.createElement("a");
        element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(saveData));
        element.setAttribute("download", "save.json");
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    interactWithUploadButton = (mouseX: number, mouseY: number) => {
        if (!Ui.isInSpriteBounds(this.uploadButtonSprite, mouseX, mouseY)) {
            return;
        }

        this.saveInput.click();
    }

    interact = (mouseWorldX: number, mouseWorldY: number, mouseX: number, mouseY: number, state: State) => {
        const mouseTileX = mouseWorldX / state.map.tileSize;
        const mouseTileY = mouseWorldY / state.map.tileSize;

        this.selectSlot(mouseTileX, mouseTileY);
        this.selectTab(mouseTileX, mouseTileY);

        this.interactWithBuyButton(mouseX, mouseY);
        this.interactWithStartButton(mouseX, mouseY, state);
        this.interactWithSaveButton(mouseX, mouseY);
        this.interactWithDownloadButton(mouseX, mouseY);
        this.interactWithUploadButton(mouseX, mouseY);
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

    save = (): string => {
        const inventoryItems = [];

        for (let i = 0; i < this.inventory.tab.getSlotCount(); i++) {
            const slot = this.inventory.tab.getSlot(i);

            if (slot.towerStats.empty) {
                continue;
            }

            inventoryItems.push({
                name: slot.towerStats.name,
                owned: slot.owned,
            });
        }

        return JSON.stringify({
            money: this.bank.getMoney(),
            items: inventoryItems,
        });
    }

    load = (json: string) => {
        let saveData: SaveData;

        try {
            saveData = JSON.parse(json);
        } catch {
            console.log("User supplied invalid save.json");
            return;
        }

        this.inventory.clear();

        for (let item of saveData.items) {
            if (item.owned < 1) {
                continue;
            }

            let itemTowerStats: TowerStats | null = null;

            for (let towerStats of TowerStats.loadedTowerStats) {
                if (towerStats.name == item.name) {
                    itemTowerStats = towerStats;
                    break;
                }
            }

            if (itemTowerStats == null) {
                continue;
            }

            this.inventory.tab.addItem(new InventoryItem(itemTowerStats, item.owned, 0));
        }

        this.bank.setMoney(saveData.money);
    }

    static isInSpriteBounds(sprite: Sprite, x: number, y: number): boolean {
        const bounds = sprite.getBounds();
        return bounds.contains(x, y);
    }
}