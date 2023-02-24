import { Texture, Sprite, Container, BitmapText } from "pixi.js";
import { ICleanable } from "./cleanable";
import { EnemySpawner } from "./enemySpawner";
import { Input } from "./input";
import { Network } from "./network";
import { namedUiTextures, towerTextures } from "./textureSheet";
import { TowerStats } from "./tower";
import { TowerMap } from "./towerMap";
import towerStatsData from "./towers.json";

const STARTING_MONEY = 100;
const SAVE_IDENTIFIER = "saveData";
const ACTIVE_COLOR = 0xffffff;
const INACTIVE_COLOR = 0x888888;
const MAX_ROOM_CODE_LENGTH = 6;

enum TabType {
    INVENTORY,
    SHOP,
}

interface Item {
    towerStats: TowerStats;
    isActive: (money: number) => boolean;
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
    draw: (towerTextures: Texture[], slotItemSprites: Sprite[], money: number) => void;
    selectSlot: (i: number) => void;
    getSelectedSlot: () => number;
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
            slotItemSprites[i].tint = slotItem.isActive(money) ? ACTIVE_COLOR : INACTIVE_COLOR;
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

class Inventory implements ICleanable {
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

    constructor(width: number, height: number, tileSize: number, container: Container) {
        this.tab = new Tab(width, height, new ShopItem(TowerStats.empty, 0));

        // Skip the empty tower
        for (let i = 0; i < TowerStats.loadedTowerStats.length; i++) {
            this.tab.addItem(new ShopItem(
                TowerStats.loadedTowerStats[i],
                towerStatsData[i].cost,
            ));
        }

        this.footer = new Container();
        this.footer.y = tileSize * height;
        container.addChild(this.footer);

        this.buyButtonSprite = new Sprite(namedUiTextures.buyButton);
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

class Bank implements ICleanable {
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

    private networkButtonSprite: Sprite;
    private networkButtonSelectedSprite: Sprite;
    private networkPanelContainer: Container;
    private connectButtonSprite: Sprite;
    private roomCodeInputSpriteLeft: Sprite;
    private roomCodeInputSpriteMiddle: Sprite;
    private roomCodeInputSpriteRight: Sprite;
    private isRoomCodeInputFocused: boolean;
    private roomCodeText: BitmapText;
    private roomCode: string;

    // Todo: Can these be constructed in multiple parts,
    // ie: tabbed ui, top right control panel, etc.
    constructor(tileSize: number, slotsWidth: number, slotsHeight: number, viewWidth: number, _viewHeight: number, container: Container) {
        const slotCount = slotsWidth * slotsHeight;
        this.slotBackgroundSprites = new Array(slotCount);
        this.slotItemSprites = new Array(slotCount);
        this.slotsWidth = slotsWidth;
        this.slotsHeight = slotsHeight;

        for (let y = 0; y < slotsHeight; y++) {
            for (let x = 0; x < slotsWidth; x++) {
                const slotBackgroundSprite = new Sprite(namedUiTextures.slotBackground);
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

        this.selectedSlotSprite = new Sprite(namedUiTextures.slotSelected);
        this.selectedSlotSprite.zIndex = 1;
        container.addChild(this.selectedSlotSprite);

        const tabCount = 2;
        this.tabsWidth = 1;
        this.tabsHeight = 2;
        this.tabSprites = new Array(tabCount);

        const tabStartX = this.slotsWidth * tileSize;
        this.tabSprites[0] = new Sprite(namedUiTextures.tabInventory);
        this.tabSprites[0].x = tabStartX;
        container.addChild(this.tabSprites[0]);
        this.tabSprites[1] = new Sprite(namedUiTextures.tabShop);
        this.tabSprites[1].x = tabStartX;
        this.tabSprites[1].y = tileSize;
        container.addChild(this.tabSprites[1]);

        this.selectedTab = 0;
        this.selectedTabSprite = new Sprite(namedUiTextures.tabSelected);
        this.selectedTabSprite.zIndex = 1;
        this.selectedTabSprite.x = tabStartX;
        container.addChild(this.selectedTabSprite);

        this.startButtonSprite = new Sprite(namedUiTextures.startButton);
        this.startButtonSprite.x = tabStartX;
        this.startButtonSprite.y = tileSize * 2;
        container.addChild(this.startButtonSprite);

        this.selectedStartButtonSprite = new Sprite(namedUiTextures.buttonSelected);
        this.selectedStartButtonSprite.x = this.startButtonSprite.x;
        this.selectedStartButtonSprite.y = this.startButtonSprite.y;
        this.selectedStartButtonSprite.zIndex = 1;
        container.addChild(this.selectedStartButtonSprite);

        this.networkButtonSprite = new Sprite(namedUiTextures.networkButton);
        this.networkButtonSprite.x = viewWidth - tileSize;
        container.addChild(this.networkButtonSprite);

        this.networkButtonSelectedSprite = new Sprite(namedUiTextures.buttonSelected);
        this.networkButtonSelectedSprite.x = this.networkButtonSprite.x;
        this.networkButtonSelectedSprite.zIndex = 1;
        this.networkButtonSelectedSprite.visible = false;
        container.addChild(this.networkButtonSelectedSprite);

        this.saveButtonSprite = new Sprite(namedUiTextures.saveButton);
        this.saveButtonSprite.x = this.networkButtonSprite.x - tileSize;
        container.addChild(this.saveButtonSprite);

        this.selectedSaveButtonSprite = new Sprite(namedUiTextures.buttonSelected);
        this.selectedSaveButtonSprite.x = this.saveButtonSprite.x;
        this.selectedSaveButtonSprite.y = this.saveButtonSprite.y;
        this.selectedSaveButtonSprite.zIndex = 1;
        container.addChild(this.selectedSaveButtonSprite);

        this.uploadButtonSprite = new Sprite(namedUiTextures.uploadButton);
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

        this.downloadButtonSprite = new Sprite(namedUiTextures.downloadButton);
        this.downloadButtonSprite.x = this.uploadButtonSprite.x - tileSize;
        container.addChild(this.downloadButtonSprite);

        this.networkPanelContainer = new Container();
        this.networkPanelContainer.x = this.networkButtonSprite.x;
        this.networkPanelContainer.y = this.networkButtonSprite.y + tileSize;
        this.networkPanelContainer.visible = false;
        container.addChild(this.networkPanelContainer);

        this.connectButtonSprite = new Sprite(namedUiTextures.connectButton);
        this.networkPanelContainer.addChild(this.connectButtonSprite);

        this.roomCodeInputSpriteLeft = new Sprite(namedUiTextures.inputFieldLeft);
        this.roomCodeInputSpriteLeft.x = -tileSize * 3;
        this.networkPanelContainer.addChild(this.roomCodeInputSpriteLeft);
        this.roomCodeInputSpriteMiddle = new Sprite(namedUiTextures.inputFieldMiddle);
        this.roomCodeInputSpriteMiddle.x = -tileSize * 2;
        this.networkPanelContainer.addChild(this.roomCodeInputSpriteMiddle);
        this.roomCodeInputSpriteRight = new Sprite(namedUiTextures.inputFieldRight);
        this.roomCodeInputSpriteRight.x = -tileSize;
        this.networkPanelContainer.addChild(this.roomCodeInputSpriteRight);
        this.isRoomCodeInputFocused = false;

        this.roomCode = "";
        this.roomCodeText = new BitmapText("", { fontName: "DefaultFont" });
        this.roomCodeText.scale.x = 0.15;
        this.roomCodeText.scale.y = 0.15;
        this.roomCodeText.x = this.roomCodeInputSpriteLeft.x + tileSize * 0.3;
        this.roomCodeText.y = tileSize * 0.15;
        this.roomCodeText.zIndex = 1;
        this.networkPanelContainer.addChild(this.roomCodeText);

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
        this.shop = new Shop(slotsWidth, slotsHeight, tileSize, container);
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

    // TODO: Network panel should be it's own class like shop/inv.
    drawNetworkPanel = () => {
        if (!this.networkPanelContainer.visible) {
            return;
        }

        if (this.roomCode.length == 0) {
            this.roomCodeText.text = "Room Code";
            this.roomCodeText.tint = INACTIVE_COLOR;
        } else {
            this.roomCodeText.text = this.roomCode;
            this.roomCodeText.tint = ACTIVE_COLOR;
        }

        if (this.isRoomCodeInputFocused) {
            this.roomCodeText.text += "|";
        }
    }

    draw = (enemySpawner: EnemySpawner, tileSize: number) => {
        this.moneyText.text = `$${this.bank.getMoney()}`;

        if (enemySpawner.isActive()) {
            this.selectedStartButtonSprite.visible = false;
            this.waveText.text = `Wave ${enemySpawner.getWave()}`;
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

        tab.draw(towerTextures, this.slotItemSprites, this.bank.getMoney());

        this.shop.draw(this.selectedTab);
        this.inventory.draw(this.selectedTab);
        this.drawNetworkPanel();
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

    start = (enemySpawner: EnemySpawner) => {
        enemySpawner.start();
    }

    interactWithStartButton = (mouseX: number, mouseY: number, enemySpawner: EnemySpawner, network: Network) => {
        if (enemySpawner.isActive()) {
            return;
        }

        const startButtonBounds = this.startButtonSprite.getBounds();
        if (!startButtonBounds.contains(mouseX, mouseY)) {
            return;
        }

        if (network.isConnected()) {
            network.syncStart();
        } else {
            this.start(enemySpawner);
        }
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

    enableNetworkPanel = (enabled: boolean) => {
        this.networkPanelContainer.visible = enabled;
        this.networkButtonSelectedSprite.visible = enabled;
    }

    // TODO: Make network button show a disconnect icon if already connected.
    interactWithNetworkButton = (network: Network, mouseX: number, mouseY: number) => {
        if (!Ui.isInSpriteBounds(this.networkButtonSprite, mouseX, mouseY)) {
            return;
        }

        if (network.isConnected()) {
            network.disconnect();
            console.log("Disconnecting");
        } else {
            this.enableNetworkPanel(!this.networkPanelContainer.visible);
        }
    }

    interactWithRoomCodeInput = (mouseX: number, mouseY: number) => {
        this.isRoomCodeInputFocused =
            Ui.isInSpriteBounds(this.roomCodeInputSpriteLeft, mouseX, mouseY) ||
            Ui.isInSpriteBounds(this.roomCodeInputSpriteMiddle, mouseX, mouseY) ||
            Ui.isInSpriteBounds(this.roomCodeInputSpriteRight, mouseX, mouseY);
    }

    interactWithNetworkPanel = (network: Network, mouseX: number, mouseY: number) => {
        this.interactWithRoomCodeInput(mouseX, mouseY);

        if (!Ui.isInSpriteBounds(this.connectButtonSprite, mouseX, mouseY) || this.roomCode.trim().length == 0) {
            return;
        }

        network.connect(this.roomCode);
        this.enableNetworkPanel(false);

    }

    isAlphaNumeric = (char: string) => {
        if (char.length != 1) {
            return false;
        }

        const charCode = char.charCodeAt(0);
        return (charCode > 47 && charCode < 58) || // 0-9
            (charCode > 64 && charCode < 91) || // A-Z
            (charCode > 96 && charCode < 123); // a-z
    }

    updateRoomCodeInput = (input: Input) => {
        for (let key of input.keyStream) {
            if (key == "Backspace") {
                this.roomCode = this.roomCode.substring(0, this.roomCode.length - 1);
                continue;
            }

            if (key == "Escape") {
                this.roomCode = "";
            }

            if (!this.isAlphaNumeric(key)) {
                continue;
            }

            if (this.roomCode.length >= MAX_ROOM_CODE_LENGTH) {
                continue;
            }

            this.roomCode += key;
        }
    }

    updateNetworkPanel = (input: Input) => {
        if (!this.networkPanelContainer.visible) {
            this.isRoomCodeInputFocused = false;
            return;
        }

        if (this.isRoomCodeInputFocused) {
            this.updateRoomCodeInput(input);
        }
    }

    update = (input: Input) => {
        this.updateNetworkPanel(input);
    }

    interact = (mouseWorldX: number, mouseWorldY: number, mouseX: number, mouseY: number, towerMap: TowerMap, enemySpawner: EnemySpawner, network: Network) => {
        const mouseTileX = mouseWorldX / towerMap.tileSize;
        const mouseTileY = mouseWorldY / towerMap.tileSize;

        this.selectSlot(mouseTileX, mouseTileY);
        this.selectTab(mouseTileX, mouseTileY);

        this.interactWithBuyButton(mouseX, mouseY);
        this.interactWithStartButton(mouseX, mouseY, enemySpawner, network);
        this.interactWithSaveButton(mouseX, mouseY);
        this.interactWithDownloadButton(mouseX, mouseY);
        this.interactWithUploadButton(mouseX, mouseY);
        this.interactWithNetworkButton(network, mouseX, mouseY);
        this.interactWithNetworkPanel(network, mouseX, mouseY);
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