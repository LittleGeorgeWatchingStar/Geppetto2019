/**
 * Describes the requirements of a clear routing path between
 * two connected buses.
 */
export interface PathSpec {
    /**
     * How wide the path must be.
     */
    width: number;

    /**
     * The minimum length of the path.
     */
    minLength: number;

    /**
     * The maximum length of the path.
     */
    maxLength: number;
}
