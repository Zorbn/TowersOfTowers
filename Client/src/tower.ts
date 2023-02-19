export class Tower {
    public readonly textureIndex: number;
    public readonly empty: boolean;

    constructor(textureIndex: number, empty: boolean = false) {
        this.textureIndex = textureIndex;
        this.empty = empty;
    }

    public static readonly empty = new Tower(-1, true);
    public static readonly singleShot = new Tower(0);
    public static readonly doubleShot = new Tower(1);
}