import { BitmapText, Container, Sprite } from "pixi.js";
import { TowerStats } from "../entities/tower";
import { namedUiTextures } from "../textureSheet";
import towerStatsData from "../towers.json";
import { Item, Tab, TabType } from "./tab";
import { Ui } from "./ui";

export class ShopItem implements Item {
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

export class Shop {
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