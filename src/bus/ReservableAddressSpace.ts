export type Address = number;

function valid(address: Address): boolean {
    if (null == address) return false;
    return !isNaN(address);
}

/**
 * Helper class representing a set of 0 or more Addresses.
 */
export class AddressSpace {
    private readonly domain: Set<Address>;

    constructor(addresses: Address[]) {
        this.domain = new Set(addresses.filter(valid));
    }

    static empty(): AddressSpace {
        return new AddressSpace([]);
    }

    static fromDelimitedString(delimitedString: string,
                                      delimiter: string = ','): AddressSpace {
        if (!delimitedString) {
            return AddressSpace.empty();
        }

        return delimitedString.split(delimiter)
            .map(range => AddressSpace.fromRangeString(range))
            .reduce((a: AddressSpace, b: AddressSpace) => a.add(b));
    }

    static fromRangeString(rangeString: string): AddressSpace {
        if (!rangeString) {
            return AddressSpace.empty();
        }

        const available = [];
        const range = rangeString.split('-')
            .map(value => parseInt(value, 10));
        if (range.length === 1) {
            available.push(range[0]);
        } else if (range.length === 2) {
            const start = range[0];
            const end = range[1];
            for (let key = start; key <= end; key++) {
                available.push(key);
            }
        }
        return new AddressSpace(available);
    }

    get size(): number {
        return this.domain.size;
    }

    get addresses(): Address[] {
        return Array.from(this.domain);
    }

    contains(address: Address): boolean {
        return this.domain.has(address);
    }

    intersects(addressSpace: AddressSpace): boolean {
        if (!addressSpace) {
            return false;
        }
        return addressSpace.addresses.some(address => this.contains(address));
    }

    isSupersetOf(addressSpace: AddressSpace): boolean {
        if (!addressSpace) {
            return true;
        }
        return addressSpace.addresses.every(address => this.contains(address))
    }

    add(addressSpace: AddressSpace): AddressSpace {
        return new AddressSpace([
            ...this.addresses,
            ...addressSpace.addresses
        ]);
    }

    subtract(addressSpace: AddressSpace): AddressSpace {
        return new AddressSpace(this.addresses.filter(a => !addressSpace.contains(a)));
    }
}

/**
 * For managing the addresses of a provide bus.
 *
 * Some provide buses, such as I2C, can take many connections, but each
 * connection uses a set of logical addresses. This class keeps track of the
 * connections available and used.
 */
export class ReservableAddressSpace {
    private available: AddressSpace;
    private used: AddressSpace;

    constructor(addressString: string) {
        this.used = AddressSpace.empty();
        this.available = addressString
            ? AddressSpace.fromDelimitedString(addressString)
            : AddressSpace.empty();
    }

    /**
     * Marks the given address space as in use and unavailable.
     */
    reserve(addressSpace: AddressSpace): void {
        if (!addressSpace) {
            return;
        }
        if (this.isAvailable(addressSpace)) {
            this.available = this.available.subtract(addressSpace);
            this.used = this.used.add(addressSpace);
        } else {
            /* Should we do something more drastic here, like prevent
             * the connection? */
            console.warn("Address space is not available: ", addressSpace);
        }
    }

    /**
     * Makes the given address space available again.
     */
    release(addressSpace: AddressSpace): void {
        if (!addressSpace || addressSpace.size < 1) {
            return;
        }
        if (this.used.intersects(addressSpace)) {
            this.used = this.used.subtract(addressSpace);
            this.available = this.available.add(addressSpace);
        } else {
            console.warn("Address space is not in use: ", addressSpace);
        }
    }

    /**
     * The number of available addresses.
     */
    numAvailable(): number {
        return this.available.size;
    }

    /**
     * Whether the addresses in `addressSpace` are available.
     */
    isAvailable(addressSpace: AddressSpace): boolean {
        if (!addressSpace) {
            return true;
        }
        return this.available.isSupersetOf(addressSpace);
    }
}
