export interface ICleanable {
    isDirty: () => boolean;
    markClean: () => void;
}