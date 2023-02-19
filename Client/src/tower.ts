export class Tower {
    public readonly name: string;
    public readonly textureIndex: number;
    public readonly empty: boolean;

    constructor(name: string, textureIndex: number, empty: boolean = false) {
        this.name = name;
        this.textureIndex = textureIndex;
        this.empty = empty;
    }

    public static readonly empty = new Tower('Empty', -1, true);
    public static readonly singleShot = new Tower('Single Shot', 0);
    public static readonly doubleShot = new Tower('Double Shot', 1);
}