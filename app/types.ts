/** One concrete `@font-face`: a single weight x style backed by a single file. */
export interface FontVariant {
    name: string;
    format: string;
    url: string;
    weight: string;
    style: string;
    referer?: string;
}

/**
 * One typeface family with every discovered variant collapsed into it.
 * This is the shape the extract API returns and the grid renders.
 */
export interface FontFamily {
    family: string;
    variants: FontVariant[];
    /** Preview + default download target: an upright 400 where available. */
    representative: FontVariant;
    formats: string[];
    /** True when any variant is a variable font spanning a weight range. */
    isVariable: boolean;
    alternatives?: FontAlternative[];
}

/** Scan results extract lifecycle (UI state machine). */
export type ExtractStatus = 'loading' | 'success' | 'empty' | 'error';

export interface FontAlternative {
    family: string;
    category?: string;
    variants?: string[];
    downloadUrl: string;
    previewUrl?: string;
    reason?: string;
    similarity?: number;
}
