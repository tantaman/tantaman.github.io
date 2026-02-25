export interface Post {
    title: string;
    url: string;
    date: string;
    description: string;
    subjects: string[];
    concerns: string[];
    form: string;
    image?: string;
    sentimentColor?: string;
    wordCount?: number;
}
export interface FacetFilters {
    subject?: Set<string> | string[];
    concern?: Set<string> | string[];
    form?: Set<string> | string[];
}
export interface FacetCounts {
    subject: Record<string, number>;
    concern: Record<string, number>;
    form: Record<string, number>;
}
export declare function tagId(s: string): string;
export declare function inferForm(collection: string, meta: Record<string, any>): string;
/** AND across facets, AND within subject/concern, OR within form */
export declare function filterPosts(posts: Post[], filters: FacetFilters): Post[];
export declare function countFacetValues(posts: Post[]): FacetCounts;
