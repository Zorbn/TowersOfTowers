import { Sprite, Texture } from "pixi.js";
import { TowerStats } from "../entities/tower";

export const ACTIVE_COLOR = 0xffffff;
export const INACTIVE_COLOR = 0x888888;

export enum TabType {
    INVENTORY,
    SHOP,
}

export interface Item {
    towerStats: TowerStats;
    isActive: (money: number) => boolean;
}

export interface ITab {
    draw: (towerTextures: Texture[], slotItemSprites: Sprite[], money: number) => void;
    selectSlot: (i: number) => void;
    getSelectedSlot: () => number;
}

export class Tab<T extends Item> {
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