import { Sprite, Container, BitmapText } from "pixi.js";
import { EnemySpawner } from "../entities/enemySpawner";
import { Input } from "../input";
import { Network } from "../network";
import { namedUiTextures, towerTextures } from "../textureSheet";
import { TowerStats } from "../entities/tower";
import { TowerMap } from "../map/towerMap";
import { ITab, TabType } from "./tab";
import { Bank } from "./bank";
import { SaveInventoryItem, Inventory, InventoryItem } from "./inventory";
import { Shop } from "./shop";
import { NetworkPanel } from "./networkPanel";

const STARTING_MONEY = 100;
const SAVE_IDENTIFIER = "saveData";

type SaveData = {
    money: number,
    items: SaveInventoryItem[],
};

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
    private networkPanel: NetworkPanel;

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

        this.networkPanel = new NetworkPanel(
            tileSize,
            this.networkButtonSprite.x,
            this.networkButtonSprite.y + tileSize,
            container
        );

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

    draw = (enemySpawner: EnemySpawner, tileSize: number, network: Network) => {
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

        this.networkPanel.draw(network, this.networkButtonSprite, this.networkButtonSelectedSprite);
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

    interactWithNetworkButton = (network: Network, mouseX: number, mouseY: number) => {
        if (!Ui.isInSpriteBounds(this.networkButtonSprite, mouseX, mouseY)) {
            return;
        }

        if (network.isConnected()) {
            network.disconnect();
        } else {
            this.networkPanel.enable(!this.networkPanel.isEnabled());
        }
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
        this.networkPanel.interact(network, mouseX, mouseY);
    }

    update = (input: Input) => {
        this.networkPanel.update(input);
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