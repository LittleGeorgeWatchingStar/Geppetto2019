/**
 * For querying designs from the server.
 */
export interface FetchDesignParams {
    public?: boolean;
    endorsement?: Endorsement; // Fetch designs in categories such as Made by Gumstix.
    owner?: string; // Fetch designs that the user owns.
    collaborator?: string; // Fetch designs shared with the user.
    limit?: number; // Limit the amount of designs to fetch.
}

export type Endorsement = 'gumstix' | 'community' | 'adlink_community' | 'raspberry_pi';
