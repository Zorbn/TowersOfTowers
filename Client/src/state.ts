import { Container, Sprite, Texture } from "pixi.js";
import { Input } from "./input";
import { Tower } from "./tower";
import { Ui } from "./ui";

export type State = {
    view: Container,
    scaledView: Container,
    input: Input,
    ui: Ui,
    towers: Tower[],
    towerTextures: Texture[],
    towerSprites: Sprite[],
    towerSpriteContainer: Container,
}