import Cart from 'model/Cart'
import {DesignRevisionBuilder} from "../design/DesignRevisionBuilder";

describe('Cart', function () {
    it('generates the correct JSON', function () {
        const designRev = new DesignRevisionBuilder().build();
        const cart = new Cart({designRevision: designRev});

        expect(cart.toJSON()).toEqual({
            revision: designRev.id,
            permalink: designRev.getDesignPermalink()
        })
    })
});
