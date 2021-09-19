/**
 * Heap priority queue.
 */
export class PriorityQueue<T> {
    private comparator: (a: T, b: T) => number;

    private heap: T[] = [];

    constructor(comparator: (a: T, b: T) => number) {
        this.comparator = comparator;
    }

    public isEmpty(): boolean {
        return this.heap.length == 0;
    }

    public size(): number {
        return this.heap.length;
    }

    public add(item: T): void {
        this.heap.push(item);

        let i = this.heap.length - 1;

        while (i > 0 && this.comparator(this.heap[i], this.heap[this.parent(i)]) < 0) {
            this.swap(i, this.parent(i));
            i = this.parent(i);
        }
    }

    public peek(): T | null {
        return this.heap.length == 0 ? null : this.heap[0];
    }

    public poll(): T | null {
        if (this.heap.length == 0) {
            return null;
        }

        this.swap(0, this.heap.length - 1);
        const item = this.heap.pop();

        this.heapify(0);

        return item;
    }

    public clear(): void {
        this.heap = [];
    }

    private heapify(i: number): void {
        while(this.hasLeftChild(i)) {
            let iHigherPriorityChild = this.leftChild(i);

            if (this.hasRightChild(i) &&
                this.comparator(this.heap[iHigherPriorityChild], this.heap[this.rightChild(i)]) > 0) {
                iHigherPriorityChild = this.rightChild(i);
            }

            if (this.comparator(this.heap[iHigherPriorityChild], this.heap[i]) > 0) {
                break;
            }

            this.swap(i, iHigherPriorityChild);
            i = iHigherPriorityChild;
        }
    }

    /**
     * @return Parent index.
     */
    private parent(index: number): number {
        return Math.floor((index - 1) / 2);
    }

    /**
     * @return Child index.
     */
    private leftChild(index: number): number {
        return index * 2 + 1;
    }

    /**
     * @return Child index.
     */
    private rightChild(index: number): number {
        return index * 2 + 2;
    }

    private hasLeftChild(index: number): boolean {
        return this.leftChild(index) < this.heap.length;
    }

    private hasRightChild(index: number): boolean {
        return this.rightChild(index) < this.heap.length;
    }

    private swap(indexA: number, indexB: number): void {
        const temp = this.heap[indexA];
        this.heap[indexA] = this.heap[indexB];
        this.heap[indexB] = temp;
    }
}