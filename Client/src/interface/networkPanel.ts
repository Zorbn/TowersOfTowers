import { Sprite, Container, BitmapText } from "pixi.js";
import { Input } from "../input";
import { Network } from "../network";
import { namedUiTextures } from "../textureSheet";
import { INACTIVE_COLOR, ACTIVE_COLOR } from "./tab";
import { Ui } from "./ui";

const MAX_ROOM_CODE_LENGTH = 6;

export class NetworkPanel {
    private panelContainer: Container;
    private connectButtonSprite: Sprite;

    private roomCodeInputSpriteLeft: Sprite;
    private roomCodeInputSpriteMiddle: Sprite;
    private roomCodeInputSpriteRight: Sprite;

    private isRoomCodeInputFocused: boolean;
    private roomCodeText: BitmapText;
    private roomCode: string;

    constructor(tileSize: number, x: number, y: number, container: Container) {
        this.panelContainer = new Container();
        this.panelContainer.x = x;
        this.panelContainer.y = y;
        this.panelContainer.visible = false;
        container.addChild(this.panelContainer);

        this.connectButtonSprite = new Sprite(namedUiTextures.connectButton);
        this.panelContainer.addChild(this.connectButtonSprite);

        this.roomCodeInputSpriteLeft = new Sprite(namedUiTextures.inputFieldLeft);
        this.roomCodeInputSpriteLeft.x = -tileSize * 3;
        this.panelContainer.addChild(this.roomCodeInputSpriteLeft);
        this.roomCodeInputSpriteMiddle = new Sprite(namedUiTextures.inputFieldMiddle);
        this.roomCodeInputSpriteMiddle.x = -tileSize * 2;
        this.panelContainer.addChild(this.roomCodeInputSpriteMiddle);
        this.roomCodeInputSpriteRight = new Sprite(namedUiTextures.inputFieldRight);
        this.roomCodeInputSpriteRight.x = -tileSize;
        this.panelContainer.addChild(this.roomCodeInputSpriteRight);
        this.isRoomCodeInputFocused = false;

        this.roomCode = "";
        this.roomCodeText = new BitmapText("", { fontName: "DefaultFont" });
        this.roomCodeText.scale.x = 0.15;
        this.roomCodeText.scale.y = 0.15;
        this.roomCodeText.x = this.roomCodeInputSpriteLeft.x + tileSize * 0.3;
        this.roomCodeText.y = tileSize * 0.15;
        this.roomCodeText.zIndex = 1;
        this.panelContainer.addChild(this.roomCodeText);
    }

    draw = (network: Network, networkButtonSprite: Sprite, networkButtonSelectedSprite: Sprite) => {
        if (network.isConnected()) {
            networkButtonSprite.texture = namedUiTextures.disconnectButton;
        } else {
            networkButtonSprite.texture = namedUiTextures.networkButton;
        }

        if (!this.isEnabled()) {
            networkButtonSelectedSprite.visible = false;
            return;
        } else {
            networkButtonSelectedSprite.visible = true;
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

    isEnabled = (): boolean => {
        return this.panelContainer.visible;
    }

    enable = (enabled: boolean) => {
        this.panelContainer.visible = enabled;
    }

    interactWithRoomCodeInput = (mouseX: number, mouseY: number) => {
        this.isRoomCodeInputFocused =
            Ui.isInSpriteBounds(this.roomCodeInputSpriteLeft, mouseX, mouseY) ||
            Ui.isInSpriteBounds(this.roomCodeInputSpriteMiddle, mouseX, mouseY) ||
            Ui.isInSpriteBounds(this.roomCodeInputSpriteRight, mouseX, mouseY);
    }

    interact = (network: Network, mouseX: number, mouseY: number) => {
        this.interactWithRoomCodeInput(mouseX, mouseY);

        if (!Ui.isInSpriteBounds(this.connectButtonSprite, mouseX, mouseY) || this.roomCode.trim().length == 0) {
            return;
        }

        network.connect(this.roomCode);
        this.enable(false);

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

    update = (input: Input) => {
        if (!this.panelContainer.visible) {
            this.isRoomCodeInputFocused = false;
            return;
        }

        if (this.isRoomCodeInputFocused) {
            this.updateRoomCodeInput(input);
        }
    }
}