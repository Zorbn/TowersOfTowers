import { ICleanable } from "./cleanable";

export class Bank implements ICleanable {
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