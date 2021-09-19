import {PriorityQueue} from "../../../src/core/data-structures/PriorityQueue";

describe('PriorityQueue', () => {
    it('adds and polls in correct order', () => {
        const pq = new PriorityQueue<number>((a, b) => {
           return b - a;
        });

        expect(pq.peek()).toBeNull();

        pq.add(2);
        expect(pq.peek()).toEqual(2);
        expect(pq.size()).toEqual(1);

        pq.add(10);
        expect(pq.peek()).toEqual(10);
        expect(pq.size()).toEqual(2);

        pq.add(9);
        expect(pq.peek()).toEqual(10);
        expect(pq.size()).toEqual(3);

        pq.add(8);
        expect(pq.peek()).toEqual(10);
        expect(pq.size()).toEqual(4);

        pq.add(7);
        expect(pq.peek()).toEqual(10);
        expect(pq.size()).toEqual(5);

        pq.add(20);
        expect(pq.peek()).toEqual(20);
        expect(pq.size()).toEqual(6);

        pq.add(1);
        expect(pq.peek()).toEqual(20);
        expect(pq.size()).toEqual(7);

        expect(pq.poll()).toEqual(20);
        expect(pq.poll()).toEqual(10);
        expect(pq.poll()).toEqual(9);
        expect(pq.poll()).toEqual(8);
        expect(pq.poll()).toEqual(7);
        expect(pq.poll()).toEqual(2);
        expect(pq.poll()).toEqual(1);
        expect(pq.size()).toEqual(0);
        expect(pq.isEmpty()).toEqual(true);

    });
});