import { State } from './state';

export class Input {
    private pressedKeys: Set<string>;
    private pressedMouseButtons: Set<number>;
    private keyWasPressed: Set<string>;
    private mouseButtonWasPressed: Set<number>;
    private mouseX: number;
    private mouseY: number;
    private keyDownListener?: (ev: KeyboardEvent) => any;
    private keyUpListener?: (ev: KeyboardEvent) => any;
    private mouseDownListener?: (ev: MouseEvent) => any;
    private mouseUpListener?: (ev: MouseEvent) => any;
    private mouseMoveListener?: (ev: MouseEvent) => any;

    constructor() {
        this.pressedKeys = new Set();
        this.pressedMouseButtons = new Set();
        this.keyWasPressed = new Set();
        this.mouseButtonWasPressed = new Set();
        this.mouseX = 0;
        this.mouseY = 0;
    }

    isKeyPressed = (key: string) => {
        return this.pressedKeys.has(key);
    }

    wasKeyPressed = (key: string) => {
        return this.keyWasPressed.has(key);
    }

    wasMouseButtonPressed = (button: number) => {
        return this.mouseButtonWasPressed.has(button);
    }

    isMouseButtonPressed = (button: number) => {
        return this.pressedMouseButtons.has(button);
    }

    getMouseX = (state: State) => {
        return (this.mouseX - state.view.x) / state.scaledView.scale.x;
    }

    getMouseY = (state: State) => {
        return (this.mouseY - state.view.y) / state.scaledView.scale.y;
    }

    update = () => {
        this.keyWasPressed.clear();
        this.mouseButtonWasPressed.clear();
    }

    addListeners = () => {
        this.keyDownListener = (event: KeyboardEvent) => {
            if (!this.pressedKeys.has(event.code)) {
                this.keyWasPressed.add(event.code);
            }

            this.pressedKeys.add(event.code);
        }
        document.addEventListener('keydown', this.keyDownListener);

        this.keyUpListener = (event: KeyboardEvent) => {
            this.pressedKeys.delete(event.code);
        }
        document.addEventListener('keyup', this.keyUpListener);

        this.mouseDownListener = (event: MouseEvent) => {
            if (!this.pressedMouseButtons.has(event.button)) {
                this.mouseButtonWasPressed.add(event.button);
            }

            this.pressedMouseButtons.add(event.button);
        }
        document.addEventListener('mousedown', this.mouseDownListener)
        this.mouseUpListener = (event) => {
            this.pressedMouseButtons.delete(event.button);
        };
        document.addEventListener('mouseup', this.mouseUpListener);

        this.mouseMoveListener = (event: MouseEvent) => {
            this.mouseX = event.clientX;
            this.mouseY = event.clientY;
        }
        document.addEventListener('mousemove', this.mouseMoveListener);
    }

    removeListeners = () => {
        document.removeEventListener('keydown', this.keyDownListener!);
        document.removeEventListener('keyup', this.keyUpListener!);
        document.removeEventListener('mousedown', this.mouseDownListener!)
        document.removeEventListener('mouseup', this.mouseUpListener!);

        this.pressedKeys.clear();
        this.pressedMouseButtons.clear();
        this.keyWasPressed.clear();
        this.mouseButtonWasPressed.clear();
    }
}