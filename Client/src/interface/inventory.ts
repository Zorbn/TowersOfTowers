import { Container, BitmapText } from "pixi.js";
import { TowerStats } from "../entities/tower";
import { ICleanable } from "./cleanable";
import { Item, Tab, TabType } from "./tab";

export type SaveInventoryItem = {
    name: string,
    owned: number,
};

export class InventoryItem implements Item {
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

export class Inventory implements ICleanable {
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